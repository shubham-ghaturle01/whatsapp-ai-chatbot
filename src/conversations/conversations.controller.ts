import {
  Controller,
  Get,
  NotFoundException,
  Param,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Types } from 'mongoose';
import { AuthenticatedUser } from '../auth/auth.types';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { ConversationsService } from './conversations.service';

type AuthenticatedRequest = { user: AuthenticatedUser };

@Controller('conversations')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SUPER_ADMIN', 'BUSINESS_ADMIN', 'BUSINESS_AGENT')
export class ConversationsController {
  constructor(private readonly conversationsService: ConversationsService) {}

  @Get()
  list(@Req() request: AuthenticatedRequest) {
    return this.conversationsService.listTenantConversations(
      request.user.tenantId,
    );
  }

  @Get(':userId')
  async getMessages(
    @Param('userId') userId: string,
    @Req() request: AuthenticatedRequest,
  ) {
    if (!Types.ObjectId.isValid(userId)) {
      throw new NotFoundException('Conversation not found.');
    }

    const objectId = new Types.ObjectId(userId);
    const user = await this.conversationsService.findTenantUser(
      request.user.tenantId,
      objectId,
    );
    if (!user) {
      throw new NotFoundException('Conversation not found.');
    }

    const messages = await this.conversationsService.getRecentMessages(
      request.user.tenantId,
      objectId,
      100,
    );
    return {
      conversation: {
        id: String(user._id),
        name: user.name || user.phoneNumber,
        phoneNumber: user.phoneNumber,
      },
      messages,
    };
  }
}
