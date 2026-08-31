import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Conversation, ConversationDocument } from './schemas/conversation.schema';

@Injectable()
export class ConversationsService {
	constructor(
		@InjectModel(Conversation.name)
		private readonly conversationModel: Model<ConversationDocument>,
	) {}

	async addMessage(
		userId: Types.ObjectId,
		role: Conversation['role'],
		message: string,
	): Promise<ConversationDocument> {
		return this.conversationModel.create({ userId, role, message });
	}

	async getRecentMessages(
		userId: Types.ObjectId,
		limit = 20,
	): Promise<ConversationDocument[]> {
		return this.conversationModel
			.find({ userId })
			.sort({ createdAt: -1 })
			.limit(limit)
			.exec()
			.then((messages) => messages.reverse());
	}
}
