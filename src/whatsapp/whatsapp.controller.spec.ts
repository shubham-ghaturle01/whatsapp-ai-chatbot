import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { AiService } from '../ai/ai.service';
import { ConversationsService } from '../conversations/conversations.service';
import { UsersService } from '../users/users.service';
import { WhatsappController } from './whatsapp.controller';
import { WhatsappService } from './whatsapp.service';
import { DocumentService } from './document.service';

describe('WhatsappController', () => {
  let controller: WhatsappController;
  const whatsappService = {
    markAsRead: jest.fn<(messageId: string) => Promise<unknown>>(),
    sendText: jest.fn<(to: string, text: string) => Promise<unknown>>(),
  };
  const aiService = {
    askQuestion: jest.fn<(question: string) => Promise<string>>(),
  };
  const usersService = {
    findOrCreate: jest.fn<() => Promise<{ _id: string }>>(),
  };
  const conversationsService = {
    addMessage: jest.fn(),
    getRecentMessages: jest.fn<() => Promise<unknown[]>>(),
  };
  const documentService = {
    extractText: jest.fn<() => Promise<string>>(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [WhatsappController],
      providers: [
        {
          provide: AiService,
          useValue: aiService,
        },
        {
          provide: WhatsappService,
          useValue: whatsappService,
        },
        {
          provide: UsersService,
          useValue: usersService,
        },
        {
          provide: ConversationsService,
          useValue: conversationsService,
        },
        {
          provide: DocumentService,
          useValue: documentService,
        },
      ],
    }).compile();

    controller = module.get<WhatsappController>(WhatsappController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('sends a reply even when marking the message as read fails', async () => {
    whatsappService.markAsRead.mockRejectedValueOnce(new Error('read failed'));
    aiService.askQuestion.mockResolvedValueOnce('GST is a goods and services tax.');
    usersService.findOrCreate.mockResolvedValueOnce({ _id: 'user-id' });
    conversationsService.getRecentMessages.mockResolvedValueOnce([]);

    await controller.receiveMessage({
      entry: [
        {
          changes: [
            {
              value: {
                messages: [
                  {
                    from: '919730327322',
                    id: 'wamid.test',
                    type: 'text',
                    text: { body: 'hello' },
                  },
                ],
              },
            },
          ],
        },
      ],
    });

    expect(whatsappService.markAsRead).toHaveBeenCalledWith('wamid.test');
    expect(aiService.askQuestion).toHaveBeenCalledWith('hello');
    expect(whatsappService.sendText).toHaveBeenCalledWith(
      '919730327322',
      'GST is a goods and services tax.',
    );
  });
});
