import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Conversation, ConversationDocument } from './schemas/conversation.schema';
import { User, UserDocument } from '../users/schemas/user.schema';

@Injectable()
export class ConversationsService {
  constructor(
    @InjectModel(Conversation.name)
    private readonly conversationModel: Model<ConversationDocument>,
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
  ) {}

	async addMessage(
		tenantId: string,
		userId: Types.ObjectId,
		role: Conversation['role'],
		message: string,
	): Promise<ConversationDocument> {
		return this.conversationModel.create({ tenantId, userId, role, message });
	}

	async getRecentMessages(
		tenantId: string,
		userId: Types.ObjectId,
		limit = 20,
	): Promise<ConversationDocument[]> {
		return this.conversationModel
			.find({ tenantId, userId })
			.sort({ createdAt: -1 })
			.limit(limit)
			.exec()
			.then((messages) => messages.reverse());
	}

  async listTenantConversations(tenantId: string) {
    const users = await this.userModel
      .find({ tenantId })
      .sort({ updatedAt: -1 })
      .limit(100)
      .exec();

    return Promise.all(
      users.map(async (user) => {
        const [latestMessage] = await this.getRecentMessages(
          tenantId,
          user._id,
          1,
        );
        return {
          id: String(user._id),
          name: user.name || user.phoneNumber,
          phoneNumber: user.phoneNumber,
          lastMessage: latestMessage?.message || '',
          lastMessageAt: latestMessage?.createdAt || user.updatedAt,
        };
      }),
    );
  }

  async findTenantUser(
    tenantId: string,
    userId: Types.ObjectId,
  ): Promise<UserDocument | null> {
    return this.userModel.findOne({ _id: userId, tenantId }).exec();
  }
}
