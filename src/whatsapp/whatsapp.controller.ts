import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Query,
  Res,
} from '@nestjs/common';

import type { Response } from 'express';

import { AiService } from '../ai/ai.service';
import { ConversationsService } from '../conversations/conversations.service';
import { UsersService } from '../users/users.service';
import { WhatsappService } from './whatsapp.service';
import { DocumentService } from './document.service';

@Controller('whatsapp')
export class WhatsappController {
  constructor(
    private readonly aiService: AiService,
    private readonly whatsappService: WhatsappService,
    private readonly usersService: UsersService,
    private readonly conversationsService: ConversationsService,
    private readonly documentService: DocumentService,
  ) {}

  // ================================
  // WhatsApp Webhook Verification
  // ================================

  @Get('webhook')
  verifyWebhook(
    @Query('hub.mode') mode: string,
    @Query('hub.verify_token') token: string,
    @Query('hub.challenge') challenge: string,
    @Res() res: Response,
  ) {
    const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN;

    console.log('Webhook verification request');
    console.log('Mode:', mode);

    if (
      mode === 'subscribe' &&
      token === verifyToken
    ) {
      console.log('Webhook verification successful');

      return res
        .status(200)
        .send(challenge);
    }

    console.log('Webhook verification failed');

    return res.sendStatus(403);
  }

  @Post('webhook')
  @HttpCode(200)
  async receiveMessage(@Body() body: any, @Res() res?: Response) {
    console.log('WEBHOOK RECEIVED');

    const value = body?.entry?.[0]?.changes?.[0]?.value;
    const message = value?.messages?.[0];

    if (!message) {
      console.log('No message found; event acknowledged');
      return { status: 'EVENT_RECEIVED' };
    }

    const from = message.from;
    const messageId = message.id;
    const text = message.text?.body?.trim();
    const isDocument = message.type === 'document';
    const contactName = value?.contacts?.[0]?.profile?.name;
    console.log('FROM:', from);
    console.log('MESSAGE ID:', messageId);
    console.log('TEXT:', text);

    if (!from || !messageId || (!text && !isDocument)) {
      console.log('Non-text or incomplete message ignored');
      return { status: 'EVENT_RECEIVED' };
    }

    // Acknowledge Meta immediately; document parsing and AI work can take longer.
    if (res) {
      res.status(200).json({ status: 'EVENT_RECEIVED' });
    }

    let userMessage = text;
    if (isDocument) {
      const document = message.document;
      if (!document?.id) {
        console.log('Document has no media ID; event acknowledged');
        return { status: 'EVENT_RECEIVED' };
      }
      try {
        console.log('DOCUMENT DOWNLOAD START:', document.filename);
        const media = await this.whatsappService.downloadMedia(document.id);
        userMessage = await this.documentService.extractText(
          media.data,
          media.mimeType || document.mime_type,
          document.filename,
        );
        if (!userMessage) {
          throw new Error('No readable text found in document');
        }
        console.log('DOCUMENT EXTRACTED:', document.filename);
      } catch (error) {
        console.error('DOCUMENT PROCESSING FAILED:', error);
        await this.whatsappService.sendText(
          from,
          'I could not read that document. Please send a PDF, DOCX, XLSX, CSV, or text file.',
        );
        return { status: 'EVENT_RECEIVED' };
      }
    }

    console.log('INCOMING WHATSAPP TEXT:', userMessage);

    let userId;
    let conversationContext = '';
    try {
      const user = await this.usersService.findOrCreate(from, contactName);
      userId = user._id;
      await this.conversationsService.addMessage(userId, 'user', userMessage);
      const history = await this.conversationsService.getRecentMessages(userId);
      conversationContext = history
        .map((item) => `${item.role}: ${item.message}`)
        .join('\n');
    } catch (error) {
      console.error('CONVERSATION PERSISTENCE FAILED:', error);
    }

    try {
      await this.whatsappService.markAsRead(messageId);
      console.log('MARK READ COMPLETE');
    } catch (error) {
      console.error('MARK READ FAILED; continuing to sendText');
    }

    try {
      if (isDocument) {
        await this.aiService.indexDocument(userMessage, {
          from,
          messageId,
          source: 'whatsapp-document',
        });
      }

      const relevantDocuments = await this.aiService.searchRelevantDocuments(
        userMessage,
        3,
      );

      const prompt = isDocument
        ? `A document was uploaded by the user. Read its extracted text below. Give a concise summary and be ready to answer future questions from it.\n\nDocument text:\n${userMessage}`
        : userMessage;

      const aiResponse = await this.aiService.askQuestion(prompt, {
        context: conversationContext || undefined,
        documents: relevantDocuments,
      });

      await this.whatsappService.sendText(from, aiResponse);
      if (userId) {
        await this.conversationsService.addMessage(userId, 'assistant', aiResponse);
      }
      console.log('SEND MESSAGE COMPLETE');
    } catch (error) {
      console.error('SEND MESSAGE FAILED', error);

      const fallbackMessage =
        'I am temporarily unable to answer right now. Please try again in a few minutes.';

      try {
        await this.whatsappService.sendText(from, fallbackMessage);
      } catch (fallbackError) {
        console.error('FALLBACK MESSAGE FAILED', fallbackError);
      }
    }

    return { status: 'EVENT_RECEIVED' };
  }
}