import {
  Body,
  Controller,
  Get,
  HttpCode,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthenticatedUser } from './auth.types';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { Roles } from './decorators/roles.decorator';
import { UpdateTenantProfileDto } from './dto/update-tenant-profile.dto';

type AuthenticatedRequest = { user: AuthenticatedUser };

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @HttpCode(201)
  register(@Body() body: RegisterDto) {
    return this.authService.register(body);
  }

  @Post('login')
  @HttpCode(200)
  login(@Body() body: LoginDto) {
    return this.authService.login(body);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'BUSINESS_ADMIN', 'BUSINESS_AGENT')
  getCurrentUser(@Req() request: AuthenticatedRequest) {
    return { user: request.user };
  }

  @Get('profile')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'BUSINESS_ADMIN', 'BUSINESS_AGENT')
  getTenantProfile(@Req() request: AuthenticatedRequest) {
    return this.authService.getTenantProfile(request.user.tenantId);
  }

  @Patch('profile')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'BUSINESS_ADMIN')
  updateTenantProfile(
    @Req() request: AuthenticatedRequest,
    @Body() body: UpdateTenantProfileDto,
  ) {
    return this.authService.updateTenantProfile(request.user.tenantId, body);
  }
}
