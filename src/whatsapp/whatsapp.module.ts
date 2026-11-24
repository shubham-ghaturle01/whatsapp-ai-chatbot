import { Module } from '@nestjs/common';

import { HttpModule } from '@nestjs/axios';
import { WhatsappController } from './whatsapp.controller';
import { WhatsappService } from './whatsapp.service';
import { AiModule } from '../ai/ai.module';
import { UsersModule } from '../users/users.module';
import { ConversationsModule } from '../conversations/conversations.module';
import { DocumentService } from './document.service';
import { TenantsModule } from '../tenants/tenants.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [HttpModule, AiModule, UsersModule, ConversationsModule, TenantsModule, AuthModule],
  controllers: [WhatsappController],
  providers: [WhatsappService, DocumentService]
})
export class WhatsappModule {}
