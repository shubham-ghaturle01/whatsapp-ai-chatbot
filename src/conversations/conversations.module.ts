import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import {
  Conversation,
  ConversationSchema,
} from './schemas/conversation.schema';
import { User, UserSchema } from '../users/schemas/user.schema';

import { ConversationsController } from './conversations.controller';
import { ConversationsService } from './conversations.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    AuthModule,
    MongooseModule.forFeature([
      {
        name: Conversation.name,
        schema: ConversationSchema,
      },
      {
        name: User.name,
        schema: UserSchema,
      },
    ]),
  ],

  controllers: [ConversationsController],

  providers: [ConversationsService],

  exports: [ConversationsService],
})
export class ConversationsModule {}