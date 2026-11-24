import {
  ConflictException,
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { JwtService } from '@nestjs/jwt';
import { compare, hash } from 'bcryptjs';
import { Model } from 'mongoose';
import { randomUUID } from 'node:crypto';
import { Tenant, TenantDocument } from '../tenants/schemas/tenant.schema';
import { Account, AccountDocument } from './schemas/account.schema';
import { AuthenticatedUser, AuthTokenPayload } from './auth.types';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { UpdateTenantProfileDto } from './dto/update-tenant-profile.dto';

type AuthResponse = {
  accessToken: string;
  tokenType: 'Bearer';
  expiresIn: number;
  user: AuthenticatedUser;
};

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    @InjectModel(Account.name)
    private readonly accountModel: Model<AccountDocument>,
    @InjectModel(Tenant.name)
    private readonly tenantModel: Model<TenantDocument>,
  ) {}

  async register(input: RegisterDto): Promise<AuthResponse> {
    this.assertPasswordLength(input.password);
    this.assertJwtConfigured();
    const email = input.email.trim().toLowerCase();
    if (await this.accountModel.exists({ email })) {
      throw new ConflictException('An account with this email already exists.');
    }

    const tenantId = `tenant-${randomUUID()}`;
    const passwordHash = await hash(input.password, 12);
    await this.tenantModel.create({
      tenantId,
      name: input.businessName.trim(),
      ownerEmail: email,
      status: 'active',
    });

    try {
      const account = await this.accountModel.create({
        tenantId,
        email,
        passwordHash,
        name: input.ownerName.trim(),
        role: 'BUSINESS_ADMIN',
      });

      return this.createAuthResponse(account);
    } catch (error) {
      await this.tenantModel.deleteOne({ tenantId }).exec();
      if (this.isDuplicateKeyError(error)) {
        throw new ConflictException(
          'An account with this email already exists.',
        );
      }
      throw error;
    }
  }

  async login(input: LoginDto): Promise<AuthResponse> {
    if (Buffer.byteLength(input.password, 'utf8') > 72) {
      throw new UnauthorizedException('Invalid email or password.');
    }
    this.assertJwtConfigured();
    const email = input.email.trim().toLowerCase();
    const account = await this.accountModel
      .findOne({ email })
      .select('+passwordHash')
      .exec();
    if (
      !account?.passwordHash ||
      !(await compare(input.password, account.passwordHash))
    ) {
      throw new UnauthorizedException('Invalid email or password.');
    }

    if (
      account.role !== 'SUPER_ADMIN' &&
      !(await this.tenantModel.exists({
        tenantId: account.tenantId,
        status: 'active',
      }))
    ) {
      throw new ForbiddenException('This business account is not active.');
    }

    return this.createAuthResponse(account);
  }

  async getTenantProfile(tenantId: string) {
    const tenant = await this.tenantModel
      .findOne({ tenantId, status: 'active' })
      .exec();
    if (!tenant) {
      throw new NotFoundException('Workspace not found.');
    }

    return {
      businessName: tenant.name,
      category: tenant.category || '',
      description: tenant.description || '',
      timezone: tenant.timezone || 'UTC',
    };
  }

  async updateTenantProfile(
    tenantId: string,
    input: UpdateTenantProfileDto,
  ) {
    const updates: Record<string, string> = {};
    if (typeof input.businessName === 'string') {
      updates.name = input.businessName.trim();
    }
    if (typeof input.category === 'string') {
      updates.category = input.category.trim();
    }
    if (typeof input.description === 'string') {
      updates.description = input.description.trim();
    }
    if (typeof input.timezone === 'string') {
      updates.timezone = input.timezone.trim();
    }

    const tenant = await this.tenantModel
      .findOneAndUpdate(
        { tenantId, status: 'active' },
        { $set: updates },
        { returnDocument: 'after', runValidators: true },
      )
      .exec();
    if (!tenant) {
      throw new NotFoundException('Workspace not found.');
    }

    return {
      businessName: tenant.name,
      category: tenant.category || '',
      description: tenant.description || '',
      timezone: tenant.timezone || 'UTC',
    };
  }

  private createAuthResponse(account: AccountDocument): AuthResponse {
    const user: AuthenticatedUser = {
      sub: String(account._id),
      tenantId: account.tenantId,
      role: account.role,
      email: account.email,
      name: account.name,
    };
    const payload: AuthTokenPayload = {
      sub: user.sub,
      tenantId: user.tenantId,
      role: user.role,
    };

    return {
      accessToken: this.jwtService.sign(payload),
      tokenType: 'Bearer',
      expiresIn: 3600,
      user,
    };
  }

  private assertJwtConfigured(): void {
    const secret = this.configService.get<string>('JWT_SECRET')?.trim() || '';
    if (Buffer.byteLength(secret, 'utf8') < 32) {
      throw new ServiceUnavailableException(
        'Authentication requires a JWT_SECRET of at least 32 bytes.',
      );
    }
  }

  private isDuplicateKeyError(error: unknown): boolean {
    if (typeof error !== 'object' || error === null || !('code' in error)) {
      return false;
    }

    return (error as Record<string, unknown>).code === 11000;
  }

  private assertPasswordLength(password: string): void {
    if (Buffer.byteLength(password, 'utf8') > 72) {
      throw new BadRequestException(
        'Password must be no more than 72 UTF-8 bytes.',
      );
    }
  }
}
