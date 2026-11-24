import { Module } from '@nestjs/common';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';
import { AuthModule } from '../auth/auth.module';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';

@Module({
  imports: [AuthModule],
  controllers: [AiController],
  providers: [AiService, JwtAuthGuard, RolesGuard],
  exports: [AiService],
})
export class AiModule {}
