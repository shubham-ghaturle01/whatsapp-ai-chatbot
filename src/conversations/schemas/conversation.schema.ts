import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type ConversationDocument =
  HydratedDocument<Conversation>;

@Schema({
  timestamps: true,
})
export class Conversation {
  createdAt!: Date;
  updatedAt!: Date;

  @Prop({
    required: true,
    index: true,
  })
  tenantId!: string;

  @Prop({
    type: Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  })
  userId!: Types.ObjectId;

  @Prop({
    required: true,
    enum: ['user', 'assistant'],
  })
  role!: 'user' | 'assistant';

  @Prop({
    required: true,
  })
  message!: string;
}

export const ConversationSchema =
  SchemaFactory.createForClass(Conversation);
ConversationSchema.index({ tenantId: 1, userId: 1, createdAt: -1 });