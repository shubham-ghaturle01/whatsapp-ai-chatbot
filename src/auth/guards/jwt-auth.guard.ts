import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { JwtService } from '@nestjs/jwt';
import { Model, Types } from 'mongoose';
import { ConfigService } from '@nestjs/config';
import { Tenant, TenantDocument } from '../../tenants/schemas/tenant.schema';
import { Account, AccountDocument } from '../schemas/account.schema';
import { AuthenticatedUser, AuthTokenPayload } from '../auth.types';

type AuthenticatedRequest = {
  headers: { authorization?: string };
  user?: AuthenticatedUser;
};

const USER_ROLES = ['SUPER_ADMIN', 'BUSINESS_ADMIN', 'BUSINESS_AGENT'] as const;

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    @InjectModel(Account.name)
    private readonly accountModel: Model<AccountDocument>,
    @InjectModel(Tenant.name)
    private readonly tenantModel: Model<TenantDocument>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const secret = this.configService.get<string>('JWT_SECRET')?.trim() || '';
    if (Buffer.byteLength(secret, 'utf8') < 32) {
      throw new UnauthorizedException('Authentication is not configured.');
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const authorization = request.headers.authorization;
    if (!authorization?.startsWith('Bearer ')) {
      throw new UnauthorizedException('A bearer token is required.');
    }

    let payload: AuthTokenPayload;
    try {
      payload = await this.jwtService.verifyAsync<AuthTokenPayload>(
        authorization.slice('Bearer '.length),
      );
    } catch {
      throw new UnauthorizedException('Invalid or expired access token.');
    }

    if (
      !Types.ObjectId.isValid(payload.sub) ||
      typeof payload.tenantId !== 'string' ||
      !USER_ROLES.includes(payload.role)
    ) {
      throw new UnauthorizedException('Invalid access token.');
    }

    const user = await this.accountModel
      .findOne({
        _id: payload.sub,
        tenantId: payload.tenantId,
        role: payload.role,
      })
      .exec();
    if (!user?.email || !user.name || !user.role) {
      throw new UnauthorizedException('Account is no longer available.');
    }

    if (
      payload.role !== 'SUPER_ADMIN' &&
      !(await this.tenantModel.exists({
        tenantId: payload.tenantId,
        status: 'active',
      }))
    ) {
      throw new UnauthorizedException('Tenant is not active.');
    }

    request.user = {
      sub: String(user._id),
      tenantId: user.tenantId,
      role: user.role,
      email: user.email,
      name: user.name,
    };
    return true;
  }
}
