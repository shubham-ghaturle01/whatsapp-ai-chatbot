import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
} from '@nestjs/common';

import { AiService } from './ai.service';

@Controller('ai')
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
  async getStatus() {
    const settings = this.aiService.getSettings();
    const documents = await this.aiService.listDocuments();

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
  async ask(@Body('question') question: string) {
    const relevantDocuments = await this.aiService.searchRelevantDocuments(question, 3);
    return {
      answer: await this.aiService.askQuestion(question, {
        documents: relevantDocuments,
      }),
      provider: this.aiService.getProvider(),
      relevantDocuments,
    };
  }

  @Get('documents')
  async getDocuments() {
    return { documents: await this.aiService.listDocuments() };
  }

  @Delete('documents')
  @HttpCode(200)
  async clearDocuments() {
    return this.aiService.clearDocuments();
  }

  @Delete('documents/:id')
  @HttpCode(200)
  async deleteDocument(@Param('id') id?: string) {
    const documentId = id || '';
    if (!documentId) {
      return { status: 'invalid-request', count: 0 };
    }

    return this.aiService.deleteDocument(documentId);
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
  ) {
    if (body.file_content && body.file_type) {
      return this.aiService.storeDocument(
        '',
        body.metadata || {},
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

    return this.aiService.storeDocument(text, body.metadata || {});
  }

  @Post('query')
  @HttpCode(200)
  async queryDocuments(@Body('query') query: string) {
    return {
      results: await this.aiService.queryDocuments(query || '', 5),
    };
  }

  @Post('documents/query')
  @HttpCode(200)
  async queryStoredDocuments(@Body('query') query: string) {
    return {
      results: await this.aiService.queryDocuments(query || '', 5),
    };
  }
}