import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';

import { AppController } from './app.controller';
import { AppService } from './app.service';

import { WhatsappModule } from './whatsapp/whatsapp.module';
import { AiModule } from './ai/ai.module';
import { ConversationsModule } from './conversations/conversations.module';
import { UsersModule } from './users/users.module';
import { HealthModule } from './health/health.module';

import { validateConfiguration } from './config/validation';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      validate: validateConfiguration,
    }),

    MongooseModule.forRoot(
      process.env.MONGODB_URI!,
    ),

    WhatsappModule,
    AiModule,
    ConversationsModule,
    UsersModule,
    HealthModule,
  ],

  controllers: [AppController],

  providers: [AppService],
})
export class AppModule {}