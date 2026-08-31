import { Module } from '@nestjs/common';

import { HttpModule } from '@nestjs/axios';
import { WhatsappController } from './whatsapp.controller';
import { WhatsappService } from './whatsapp.service';
import { AiModule } from '../ai/ai.module';
import { UsersModule } from '../users/users.module';
import { ConversationsModule } from '../conversations/conversations.module';

@Module({
  imports: [HttpModule, AiModule, UsersModule, ConversationsModule],
  controllers: [WhatsappController],
  providers: [WhatsappService]
})
export class WhatsappModule {}
