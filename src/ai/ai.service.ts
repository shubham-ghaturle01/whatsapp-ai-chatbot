import {
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';

import OpenAI from 'openai';

@Injectable()
export class AiService {
  private readonly openai: OpenAI;

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  async askQuestion(question: string): Promise<string> {
    try {
      const response = await this.openai.responses.create({
        model: 'gpt-5.4-mini',
        input: [
          {
            role: 'system',
            content:
              'You are a helpful WhatsApp AI assistant. Answer user questions clearly and concisely.',
          },
          {
            role: 'user',
            content: question,
          },
        ],
      });

      return response.output_text;
    } catch (error) {
      console.error('OpenAI Error:', error);

      throw new InternalServerErrorException(
        'Unable to get AI response',
      );
    }
  }
}