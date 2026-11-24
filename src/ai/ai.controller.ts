import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';

import { AiService } from './ai.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { AuthenticatedUser } from '../auth/auth.types';

type AuthenticatedRequest = { user: AuthenticatedUser };

@Controller('ai')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SUPER_ADMIN', 'BUSINESS_ADMIN')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Get('provider')
  getProvider() {
    return this.aiService.getSettings();
  }

  @Get('settings')
  getSettings() {
    return this.aiService.getSettings();
  }

  @Get('status')
  async getStatus(@Req() request: AuthenticatedRequest) {
    const settings = this.aiService.getSettings();
    const documents = await this.aiService.listDocuments(
      request.user.tenantId,
    );

    return {
      ...settings,
      documentCount: documents.length,
      vectorDocumentCount: documents.length,
      localServiceHealthy: true,
      lastUpdated: new Date().toISOString(),
    };
  }

  @Post('provider')
  @HttpCode(200)
  setProvider(@Body('provider') provider: string) {
    const currentProvider = this.aiService.setProvider(provider);
    return {
      ...this.aiService.getSettings(),
      provider: currentProvider,
      message: `AI provider set to ${currentProvider}.`,
    };
  }

  @Post('settings')
  @HttpCode(200)
  setSettings(
    @Body()
    body: {
      provider?: string;
      localLlmBaseUrl?: string;
    },
  ) {
    if (body.localLlmBaseUrl) {
      process.env.LOCAL_LLM_BASE_URL = body.localLlmBaseUrl;
    }

    if (body.provider) {
      this.aiService.setProvider(body.provider);
    }

    return {
      ...this.aiService.getSettings(),
      message: 'AI settings updated successfully.',
    };
  }

  @Post('ask')
  @HttpCode(200)
  async ask(
    @Body('question') question: string,
    @Req() request: AuthenticatedRequest,
  ) {
    const relevantDocuments = await this.aiService.searchRelevantDocuments(
      question,
      3,
      request.user.tenantId,
    );
    return {
      answer: await this.aiService.askQuestion(question, {
        documents: relevantDocuments,
      }),
      provider: this.aiService.getProvider(),
      relevantDocuments,
    };
  }

  @Get('documents')
  async getDocuments(@Req() request: AuthenticatedRequest) {
    return {
      documents: await this.aiService.listDocuments(request.user.tenantId),
    };
  }

  @Delete('documents')
  @HttpCode(200)
  async clearDocuments(@Req() request: AuthenticatedRequest) {
    return this.aiService.clearDocuments(request.user.tenantId);
  }

  @Delete('documents/:id')
  @HttpCode(200)
  async deleteDocument(
    @Param('id') id: string,
    @Req() request: AuthenticatedRequest,
  ) {
    const documentId = id || '';
    if (!documentId) {
      return { status: 'invalid-request', count: 0 };
    }

    return this.aiService.deleteDocument(
      documentId,
      request.user.tenantId,
    );
  }

  @Post('documents')
  @HttpCode(200)
  async addDocument(
    @Body()
    body: {
      text?: string;
      file_content?: string;
      file_type?: string;
      metadata?: Record<string, any>;
    },
    @Req() request: AuthenticatedRequest,
  ) {
    const metadata = {
      ...(body.metadata || {}),
      tenantId: request.user.tenantId,
    };
    if (body.file_content && body.file_type) {
      return this.aiService.storeDocument(
        '',
        metadata,
        body.file_content,
        body.file_type,
      );
    }

    const text = body?.text?.trim();
    if (!text) {
      return {
        status: 'invalid-request',
        count: 0,
      };
    }

    return this.aiService.storeDocument(text, metadata);
  }

  @Post('query')
  @HttpCode(200)
  async queryDocuments(
    @Body('query') query: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return {
      results: await this.aiService.queryDocuments(
        query || '',
        5,
        request.user.tenantId,
      ),
    };
  }

  @Post('documents/query')
  @HttpCode(200)
  async queryStoredDocuments(
    @Body('query') query: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return {
      results: await this.aiService.queryDocuments(
        query || '',
        5,
        request.user.tenantId,
      ),
    };
  }
}
