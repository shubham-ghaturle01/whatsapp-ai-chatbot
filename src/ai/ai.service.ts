import { Injectable } from '@nestjs/common';

import { GoogleGenAI } from '@google/genai';
import OpenAI from 'openai';

export type AiProvider = 'gemini' | 'openai' | 'local';

export type AskQuestionOptions = {
  context?: string;
  documents?: string[];
};

@Injectable()
export class AiService {
  private provider: AiProvider;
  private readonly gemini: GoogleGenAI | null;
  private readonly openai: OpenAI | null;
  private readonly localBaseUrl: string;

  constructor() {
    this.provider = this.normalizeProvider(
      process.env.AI_PROVIDER ||
        (this.hasGeminiKey()
          ? 'gemini'
          : this.hasOpenAIKey()
            ? 'openai'
            : 'local'),
    );
    this.localBaseUrl = (
      process.env.LOCAL_LLM_BASE_URL || 'http://localhost:8000'
    ).replace(/\/$/, '');
    this.gemini = this.hasGeminiKey()
      ? new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! })
      : null;
    this.openai = this.hasOpenAIKey()
      ? new OpenAI({
          apiKey: process.env.OPENAI_API_KEY!,
        })
      : null;
  }

  setProvider(provider: string): AiProvider {
    this.provider = this.normalizeProvider(provider);
    process.env.AI_PROVIDER = this.provider;
    return this.provider;
  }

  getProvider(): AiProvider {
    return this.provider;
  }

  getSettings() {
    return {
      provider: this.provider,
      geminiConfigured: this.hasGeminiKey(),
      geminiEnabled: this.provider === 'gemini' && this.hasGeminiKey(),
      openAiConfigured: this.hasOpenAIKey(),
      openAiEnabled: this.provider === 'openai' && this.hasOpenAIKey(),
      localEnabled:
        this.provider === 'local' ||
        (!this.hasGeminiKey() && !this.hasOpenAIKey()),
      localLlmBaseUrl: this.localBaseUrl,
      availableProviders: ['gemini', 'openai', 'local'],
    };
  }

  async askQuestion(
    question: string,
    options: AskQuestionOptions = {},
  ): Promise<string> {
    const documents = options.documents?.filter(Boolean) ?? [];

    if (this.provider === 'local') {
      return this.callLocalModel(
        question,
        options.context || 'Local provider selected.',
        documents,
      );
    }

    try {
      if (this.provider === 'gemini') {
        if (!this.hasGeminiKey()) {
          throw new Error('Gemini API key is not configured.');
        }
        return await this.callGemini(question, options);
      }

      if (!this.hasOpenAIKey()) {
        throw new Error('OpenAI API key is not configured.');
      }
      return await this.callOpenAI(question, options);
    } catch (error: any) {
      const status = error?.status ?? error?.response?.status;
      const details = error?.message ?? `Unknown ${this.provider} error`;

      console.warn(
        `${this.provider} unavailable. Falling back to local AI provider.`,
        {
          status,
          details,
        },
      );
      return this.callLocalModel(
        question,
        `${this.provider} is unavailable${status ? ` (status ${status})` : ''}. Using the local AI provider instead.`,
        documents,
      );
    }
  }

  async indexDocument(
    text: string,
    metadata: Record<string, any> = {},
  ): Promise<{ status: string; count: number }> {
    return this.storeDocument(text, metadata);
  }

  async storeDocument(
    text: string,
    metadata: Record<string, any> = {},
    fileContent?: string,
    fileType?: string,
  ): Promise<{ status: string; count: number }> {
    try {
      const payload: any = {
        metadata,
      };

      if (fileContent && fileType) {
        payload.file_content = fileContent;
        payload.file_type = fileType;
      } else if (text) {
        payload.text = text;
      }

      const response = await fetch(`${this.localBaseUrl}/documents`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const textResponse = await response.text();
        throw new Error(
          `Document indexing failed: ${response.status} ${textResponse}`,
        );
      }

      return (await response.json()) as { status: string; count: number };
    } catch (error) {
      console.error('Document index error:', error);
      return { status: 'not-indexed', count: 0 };
    }
  }

  async listDocuments(): Promise<
    Array<{ text: string; metadata: Record<string, any> }>
  > {
    try {
      const response = await fetch(`${this.localBaseUrl}/documents`, {
        method: 'GET',
      });

      if (!response.ok) {
        return [];
      }

      const payload = await response.json();
      return Array.isArray(payload.documents) ? payload.documents : [];
    } catch (error) {
      console.error('Document listing error:', error);
      return [];
    }
  }

  async clearDocuments(): Promise<{ status: string; count: number }> {
    try {
      const response = await fetch(`${this.localBaseUrl}/documents`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(`Document clear failed: ${response.status} ${text}`);
      }

      return (await response.json()) as { status: string; count: number };
    } catch (error) {
      console.error('Document clear error:', error);
      return { status: 'not-cleared', count: 0 };
    }
  }

  async deleteDocument(
    documentId: string,
  ): Promise<{ status: string; count: number }> {
    try {
      const response = await fetch(
        `${this.localBaseUrl}/documents/${documentId}`,
        {
          method: 'DELETE',
        },
      );

      if (!response.ok) {
        const text = await response.text();
        throw new Error(`Document delete failed: ${response.status} ${text}`);
      }

      return (await response.json()) as { status: string; count: number };
    } catch (error) {
      console.error('Document delete error:', error);
      return { status: 'not-deleted', count: 0 };
    }
  }

  async queryDocuments(
    query: string,
    topK = 3,
  ): Promise<
    Array<{ text: string; metadata: Record<string, any>; score: number }>
  > {
    try {
      const response = await fetch(`${this.localBaseUrl}/query`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query, top_k: topK }),
      });

      if (!response.ok) {
        return [];
      }

      const payload = await response.json();
      return Array.isArray(payload.results) ? payload.results : [];
    } catch (error) {
      console.error('Vector search error:', error);
      return [];
    }
  }

  async searchRelevantDocuments(query: string, topK = 3): Promise<string[]> {
    const results = await this.queryDocuments(query, topK);
    return results.map((result) => result.text).filter(Boolean);
  }

  async callGemini(
    question: string,
    options: AskQuestionOptions = {},
  ): Promise<string> {
    if (!this.gemini) {
      throw new Error('Gemini API key is not configured.');
    }

    const model = process.env.GEMINI_MODEL || 'gemini-flash-lite-latest';
    const contextText = options.context
      ? `Context:\n${options.context}\n\n`
      : '';
    const documentText = options.documents?.length
      ? `Relevant document context:\n${options.documents.join('\n\n')}\n\n`
      : '';

    const response = await this.gemini.models.generateContent({
      model,
      contents:
        `You are a helpful WhatsApp AI assistant. Answer user questions clearly and concisely. Use the document context when relevant.\n\n` +
        `${contextText}${documentText}User question:\n${question}`,
    });

    if (!response.text?.trim()) {
      throw new Error('Gemini returned an empty response.');
    }

    return response.text;
  }

  async callOpenAI(
    question: string,
    options: AskQuestionOptions = {},
  ): Promise<string> {
    if (!this.openai) {
      throw new Error('OpenAI API key is not configured.');
    }

    const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';
    const contextText = options.context
      ? `Context:\n${options.context}\n\n`
      : '';
    const documentText = options.documents?.length
      ? `Relevant document context:\n${options.documents.join('\n\n')}\n\n`
      : '';

    const response = await this.openai.responses.create({
      model,
      input: [
        {
          role: 'system',
          content:
            'You are a helpful WhatsApp AI assistant. Answer user questions clearly and concisely. Use the document context when relevant.',
        },
        {
          role: 'user',
          content: `${contextText}${documentText}User question:\n${question}`,
        },
      ],
    });

    return response.output_text;
  }

  async callLocalModel(
    question: string,
    context?: string,
    documents: string[] = [],
  ): Promise<string> {
    try {
      const response = await fetch(`${this.localBaseUrl}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: question,
          context: context || 'Local fallback model selected.',
          documents,
        }),
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(
          `Local model request failed: ${response.status} ${text}`,
        );
      }

      const payload = await response.json();
      return (
        payload.answer ||
        payload.response ||
        payload.message ||
        payload.output_text ||
        'I am currently using the local AI fallback and could not generate a response.'
      );
    } catch (error) {
      console.error('Local AI Error:', error);
      return 'The local AI service is not available right now. Please switch to Gemini or OpenAI, or try again later.';
    }
  }

  private normalizeProvider(provider?: string): AiProvider {
    const normalized = (provider || '').toLowerCase().trim();
    if (
      normalized === 'local' ||
      normalized === 'openai' ||
      normalized === 'gemini'
    ) {
      return normalized;
    }
    return 'openai';
  }

  private hasGeminiKey(): boolean {
    return (
      !!process.env.GEMINI_API_KEY &&
      process.env.GEMINI_API_KEY.trim().length > 0
    );
  }

  private hasOpenAIKey(): boolean {
    return (
      !!process.env.OPENAI_API_KEY &&
      process.env.OPENAI_API_KEY.trim().length > 0
    );
  }
}
