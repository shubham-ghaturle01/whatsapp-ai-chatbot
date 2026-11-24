import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { ConversationsService } from './conversations.service';
import { Conversation } from './schemas/conversation.schema';
import { User } from '../users/schemas/user.schema';
import { Types } from 'mongoose';

describe('ConversationsService', () => {
  let service: ConversationsService;
  const conversationModel = { find: jest.fn() };
  const userModel = { find: jest.fn() };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConversationsService,
        {
          provide: getModelToken(Conversation.name),
          useValue: conversationModel,
        },
        {
          provide: getModelToken(User.name),
          useValue: userModel,
        },
      ],
    }).compile();

    service = module.get<ConversationsService>(ConversationsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('lists only the requested tenant contacts and their latest message', async () => {
    const userId = new Types.ObjectId();
    const updatedAt = new Date('2026-11-24T05:00:00.000Z');
    const message = {
      message: 'Hello',
      createdAt: new Date('2026-11-24T05:01:00.000Z'),
    };
    const userQuery = {
      sort: jest.fn(),
      limit: jest.fn(),
      exec: jest.fn().mockResolvedValue([
        {
          _id: userId,
          name: 'Customer',
          phoneNumber: '15551234567',
          updatedAt,
        },
      ]),
    };
    userQuery.sort.mockReturnValue(userQuery);
    userQuery.limit.mockReturnValue(userQuery);
    userModel.find.mockReturnValue(userQuery);

    const messageQuery = {
      sort: jest.fn(),
      limit: jest.fn(),
      exec: jest.fn().mockResolvedValue([message]),
    };
    messageQuery.sort.mockReturnValue(messageQuery);
    messageQuery.limit.mockReturnValue(messageQuery);
    conversationModel.find.mockReturnValue(messageQuery);

    await expect(service.listTenantConversations('tenant-a')).resolves.toEqual([
      {
        id: String(userId),
        name: 'Customer',
        phoneNumber: '15551234567',
        lastMessage: 'Hello',
        lastMessageAt: message.createdAt,
      },
    ]);
    expect(userModel.find).toHaveBeenCalledWith({ tenantId: 'tenant-a' });
  });
});
