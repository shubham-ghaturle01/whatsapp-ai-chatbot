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

@Controller('whatsapp')
export class WhatsappController {
  constructor(
    private readonly aiService: AiService,
    private readonly whatsappService: WhatsappService,
    private readonly usersService: UsersService,
    private readonly conversationsService: ConversationsService,
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
  async receiveMessage(@Body() body: any) {
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
    const contactName = value?.contacts?.[0]?.profile?.name;
    console.log('FROM:', from);
    console.log('MESSAGE ID:', messageId);
    console.log('TEXT:', text);

    if (message.type !== 'text' || !from || !messageId || !text) {
      console.log('Non-text or incomplete message ignored');
      return { status: 'EVENT_RECEIVED' };
    }

    console.log('INCOMING WHATSAPP TEXT:', text);

    let userId;
    let conversationContext = '';
    try {
      const user = await this.usersService.findOrCreate(from, contactName);
      userId = user._id;
      await this.conversationsService.addMessage(userId, 'user', text);
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
      const prompt = conversationContext
        ? `Conversation history:\n${conversationContext}\n\nUser's latest message: ${text}`
        : text;
      const aiResponse = await this.aiService.askQuestion(prompt);
      await this.whatsappService.sendText(from, aiResponse);
      if (userId) {
        await this.conversationsService.addMessage(userId, 'assistant', aiResponse);
      }
      console.log('SEND MESSAGE COMPLETE');
    } catch (error) {
      console.error('SEND MESSAGE FAILED');
    }

    return { status: 'EVENT_RECEIVED' };
  }
}