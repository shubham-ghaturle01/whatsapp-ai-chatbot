import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  NotFoundException,
  Param,
  Post,
  Query,
  Res,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Types } from 'mongoose';

import type { Response } from 'express';

import { AiService } from '../ai/ai.service';
import { ConversationsService } from '../conversations/conversations.service';
import { UsersService } from '../users/users.service';
import { WhatsappService } from './whatsapp.service';
import { DocumentService } from './document.service';
import { TenantsService } from '../tenants/tenants.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { AuthenticatedUser } from '../auth/auth.types';
import { CreateMessageDto } from '../conversations/dto/create-message.dto';

type AuthenticatedRequest = { user: AuthenticatedUser };

type WhatsAppWebhookMessage = {
  from?: string;
  id?: string;
  type?: string;
  text?: { body?: string };
  document?: { id?: string; filename?: string; mime_type?: string };
};

type WhatsAppWebhookValue = {
  metadata?: { phone_number_id?: string };
  contacts?: Array<{ profile?: { name?: string } }>;
  messages?: WhatsAppWebhookMessage[];
  statuses?: unknown[];
};

type WhatsAppWebhookDiagnostics = {
  lastVerificationAt: string | null;
  lastEventAt: string | null;
  fields: string[];
  messageCount: number;
  lastMessageAt: string | null;
  readReceiptStatus: 'not_attempted' | 'pending' | 'accepted' | 'failed';
  replyStatus:
    | 'not_attempted'
    | 'pending'
    | 'sent'
    | 'fallback_sent'
    | 'failed';
  errors: string[];
};

@Controller('whatsapp')
export class WhatsappController {
  private readonly webhookDiagnostics: WhatsAppWebhookDiagnostics = {
    lastVerificationAt: null,
    lastEventAt: null,
    fields: [],
    messageCount: 0,
    lastMessageAt: null,
    readReceiptStatus: 'not_attempted',
    replyStatus: 'not_attempted',
    errors: [],
  };

  constructor(
    private readonly aiService: AiService,
    private readonly whatsappService: WhatsappService,
    private readonly usersService: UsersService,
    private readonly conversationsService: ConversationsService,
    private readonly documentService: DocumentService,
    private readonly tenantsService: TenantsService,
  ) {}

  @Get('status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'BUSINESS_ADMIN', 'BUSINESS_AGENT')
  getConnectionStatus() {
    return this.whatsappService.getConnectionStatus();
  }

  @Post('check')
  @HttpCode(200)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'BUSINESS_ADMIN')
  checkConnection() {
    return this.whatsappService.checkConnection();
  }

  @Get('webhook/diagnostics')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'BUSINESS_ADMIN', 'BUSINESS_AGENT')
  getWebhookDiagnostics(): WhatsAppWebhookDiagnostics {
    return {
      ...this.webhookDiagnostics,
      fields: [...this.webhookDiagnostics.fields],
      errors: [...this.webhookDiagnostics.errors],
    };
  }

  @Post('conversations/:userId/messages')
  @HttpCode(200)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'BUSINESS_ADMIN', 'BUSINESS_AGENT')
  async sendConversationMessage(
    @Param('userId') userId: string,
    @Body() body: CreateMessageDto,
    @Req() request: AuthenticatedRequest,
  ) {
    if (!Types.ObjectId.isValid(userId)) {
      throw new NotFoundException('Conversation not found.');
    }

    const user = await this.conversationsService.findTenantUser(
      request.user.tenantId,
      new Types.ObjectId(userId),
    );
    if (!user) {
      throw new NotFoundException('Conversation not found.');
    }

    const message = body.message.trim();
    if (!message) {
      throw new BadRequestException('Message cannot be empty.');
    }

    await this.whatsappService.sendText(user.phoneNumber, message);
    const savedMessage = await this.conversationsService.addMessage(
      request.user.tenantId,
      user._id,
      'assistant',
      message,
    );
    return { status: 'sent', message: savedMessage };
  }

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
      this.webhookDiagnostics.lastVerificationAt = new Date().toISOString();
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
  async receiveMessage(
    @Body() body: {
      entry?: Array<{
        changes?: Array<{ field?: string; value?: WhatsAppWebhookValue }>;
      }>;
    },
    @Res() res: Response,
  ): Promise<void> {
    res.status(200).json({ status: 'EVENT_RECEIVED' });
    console.log('[WhatsApp webhook] POST received');

    const changes = (Array.isArray(body?.entry) ? body.entry : []).flatMap(
      (entry) => (Array.isArray(entry?.changes) ? entry.changes : []),
    );
    const messageEvents = changes.flatMap((change) => {
      const value = change?.value;
      return (Array.isArray(value?.messages) ? value.messages : []).map(
        (message) => ({ value, message }),
      );
    });
    console.log('[WhatsApp webhook] event summary', {
      fields: changes.map((change) => change.field || 'unknown'),
      messageCount: messageEvents.length,
    });
    this.webhookDiagnostics.lastEventAt = new Date().toISOString();
    this.webhookDiagnostics.fields = changes.map(
      (change) => change.field || 'unknown',
    );
    this.webhookDiagnostics.messageCount = messageEvents.length;

    if (messageEvents.length === 0) {
      console.log('[WhatsApp webhook] no messages in event');
      return;
    }

    for (const [index, { value, message }] of messageEvents.entries()) {
      this.webhookDiagnostics.lastMessageAt = new Date().toISOString();
      this.webhookDiagnostics.readReceiptStatus = 'pending';
      this.webhookDiagnostics.replyStatus = 'pending';
      this.webhookDiagnostics.errors = [];
      console.log('[WhatsApp webhook] processing message', {
        event: `${index + 1}/${messageEvents.length}`,
        type: message.type || 'unknown',
        hasSender: Boolean(message.from),
        hasMessageId: Boolean(message.id),
      });
      try {
        await this.processIncomingMessage(value, message);
      } catch (error) {
        this.webhookDiagnostics.replyStatus = 'failed';
        this.addWebhookDiagnosticError(
          `Message processing failed: ${this.errorMessage(error)}`,
        );
        console.error(
          '[WhatsApp webhook] message processing failed:',
          this.errorMessage(error),
        );
      }
    }
  }

  private errorMessage(error: unknown): string {
    return error instanceof Error ? error.message : 'Unknown error';
  }

  private addWebhookDiagnosticError(error: string): void {
    this.webhookDiagnostics.errors = [
      ...this.webhookDiagnostics.errors,
      error,
    ].slice(-5);
  }

  private async processIncomingMessage(
    value: WhatsAppWebhookValue | undefined,
    message: WhatsAppWebhookMessage,
  ): Promise<void> {
    const from = message.from;
    const messageId = message.id;
    const text = message.text?.body?.trim();
    const isDocument = message.type === 'document';
    const contactName = value?.contacts?.[0]?.profile?.name;

    if (!from || !messageId || (!text && !isDocument)) {
      this.webhookDiagnostics.replyStatus = 'failed';
      this.addWebhookDiagnosticError('Message is missing sender, ID, or supported content.');
      console.log('[WhatsApp webhook] ignored unsupported or incomplete message');
      return;
    }

    const phoneNumberId =
      value?.metadata?.phone_number_id ||
      process.env.WHATSAPP_PHONE_NUMBER_ID;
    let tenant: Awaited<
      ReturnType<TenantsService['resolveByPhoneNumberId']>
    > = null;
    console.log('[WhatsApp webhook] resolving tenant', {
      hasPhoneNumberId: Boolean(phoneNumberId),
      matchesConfiguredPhoneNumber:
        phoneNumberId === process.env.WHATSAPP_PHONE_NUMBER_ID,
    });
    try {
      tenant = phoneNumberId
        ? await this.tenantsService.resolveByPhoneNumberId(phoneNumberId)
        : null;
      if (
        !tenant &&
        phoneNumberId === process.env.WHATSAPP_PHONE_NUMBER_ID
      ) {
        tenant = await this.tenantsService.ensureDefaultTenant();
      }
    } catch (error) {
      this.webhookDiagnostics.replyStatus = 'failed';
      this.addWebhookDiagnosticError(
        `Tenant lookup failed: ${this.errorMessage(error)}`,
      );
      console.error(
        '[WhatsApp webhook] tenant resolution failed:',
        this.errorMessage(error),
      );
      return;
    }
    if (!tenant) {
      this.webhookDiagnostics.replyStatus = 'failed';
      this.addWebhookDiagnosticError('No active tenant is configured for the incoming phone number.');
      console.error('[WhatsApp webhook] no active tenant found for this number');
      return;
    }
    const tenantId = tenant.tenantId;
    console.log('[WhatsApp webhook] tenant resolved');

    try {
      await this.whatsappService.markAsRead(messageId);
      this.webhookDiagnostics.readReceiptStatus = 'accepted';
      console.log('[WhatsApp webhook] read receipt accepted');
    } catch (error) {
      this.webhookDiagnostics.readReceiptStatus = 'failed';
      this.addWebhookDiagnosticError(
        `Read receipt failed: ${this.errorMessage(error)}`,
      );
      console.error(
        '[WhatsApp webhook] read receipt failed:',
        this.errorMessage(error),
      );
    }

    let userMessage = text || '';
    if (isDocument) {
      const document = message.document;
      if (!document?.id) {
        this.webhookDiagnostics.replyStatus = 'failed';
        this.addWebhookDiagnosticError('Incoming document did not include a media ID.');
        console.log('[WhatsApp webhook] document has no media ID');
        return;
      }
      try {
        console.log('[WhatsApp webhook] downloading document media');
        const media = await this.whatsappService.downloadMedia(document.id);
        userMessage = await this.documentService.extractText(
          media.data,
          media.mimeType || document.mime_type,
          document.filename,
        );
        if (!userMessage) {
          throw new Error('No readable text found in document');
        }
        console.log('[WhatsApp webhook] document text extracted');
      } catch (error) {
        this.webhookDiagnostics.replyStatus = 'failed';
        this.addWebhookDiagnosticError(
          `Document processing failed: ${this.errorMessage(error)}`,
        );
        console.error(
          '[WhatsApp webhook] document processing failed:',
          this.errorMessage(error),
        );
        try {
          await this.whatsappService.sendText(
            from,
            'I could not read that document. Please send a PDF, DOCX, XLSX, CSV, or text file.',
          );
          this.webhookDiagnostics.replyStatus = 'fallback_sent';
        } catch (sendError) {
          this.addWebhookDiagnosticError(
            `Document error reply failed: ${this.errorMessage(sendError)}`,
          );
          console.error(
            '[WhatsApp webhook] document error reply failed:',
            this.errorMessage(sendError),
          );
        }
        return;
      }
    }

    console.log('[WhatsApp webhook] message accepted for processing', {
      isDocument,
      messageLength: userMessage.length,
    });

    let userId;
    let conversationContext = '';
    try {
      const user = await this.usersService.findOrCreate(tenantId, from, contactName);
      userId = user._id;
      await this.conversationsService.addMessage(tenantId, userId, 'user', userMessage);
      const history = await this.conversationsService.getRecentMessages(tenantId, userId);
      conversationContext = history
        .map((item) => `${item.role}: ${item.message}`)
        .join('\n');
    } catch (error) {
      this.addWebhookDiagnosticError(
        `Conversation persistence failed: ${this.errorMessage(error)}`,
      );
      console.error(
        '[WhatsApp webhook] conversation persistence failed:',
        this.errorMessage(error),
      );
    }

    try {
      console.log('[WhatsApp webhook] generating AI response');
      if (isDocument) {
        await this.aiService.indexDocument(userMessage, {
          tenantId,
          from,
          messageId,
          source: 'whatsapp-document',
        });
      }

      const relevantDocuments = await this.aiService.searchRelevantDocuments(
        userMessage,
        3,
        tenantId,
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
        await this.conversationsService.addMessage(tenantId, userId, 'assistant', aiResponse);
      }
      this.webhookDiagnostics.replyStatus = 'sent';
      console.log('[WhatsApp webhook] reply sent and saved');
    } catch (error) {
      this.webhookDiagnostics.replyStatus = 'failed';
      this.addWebhookDiagnosticError(
        `AI reply failed: ${this.errorMessage(error)}`,
      );
      console.error(
        '[WhatsApp webhook] AI reply failed:',
        this.errorMessage(error),
      );

      const fallbackMessage =
        'I am temporarily unable to answer right now. Please try again in a few minutes.';

      try {
        await this.whatsappService.sendText(from, fallbackMessage);
        this.webhookDiagnostics.replyStatus = 'fallback_sent';
        console.log('[WhatsApp webhook] fallback reply sent');
      } catch (fallbackError) {
        this.addWebhookDiagnosticError(
          `Fallback reply failed: ${this.errorMessage(fallbackError)}`,
        );
        console.error(
          '[WhatsApp webhook] fallback reply failed:',
          this.errorMessage(fallbackError),
        );
      }
    }
  }
}