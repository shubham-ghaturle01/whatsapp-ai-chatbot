import { ConfigService } from '@nestjs/config';
import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Model } from 'mongoose';
import { JwtAuthGuard } from './jwt-auth.guard';
import { AccountDocument } from '../schemas/account.schema';
import { TenantDocument } from '../../tenants/schemas/tenant.schema';

describe('JwtAuthGuard', () => {
  const payload = {
    sub: '507f1f77bcf86cd799439011',
    tenantId: 'tenant-test',
    role: 'BUSINESS_ADMIN' as const,
  };
  let verifyAsync: jest.Mock;
  let configService: { get: jest.Mock };
  let accountModel: { findOne: jest.Mock };
  let tenantModel: { exists: jest.Mock };
  let request: { headers: { authorization?: string }; user?: unknown };
  let guard: JwtAuthGuard;

  beforeEach(() => {
    verifyAsync = jest.fn().mockResolvedValue(payload);
    configService = { get: jest.fn().mockReturnValue('a'.repeat(40)) };
    accountModel = {
      findOne: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue({
          _id: payload.sub,
          tenantId: payload.tenantId,
          role: payload.role,
          email: 'owner@example.com',
          name: 'Owner',
        }),
      }),
    };
    tenantModel = { exists: jest.fn().mockResolvedValue({ _id: 'tenant' }) };
    request = { headers: { authorization: 'Bearer access-token' } };
    guard = new JwtAuthGuard(
      { verifyAsync } as unknown as JwtService,
      configService as unknown as ConfigService,
      accountModel as unknown as Model<AccountDocument>,
      tenantModel as unknown as Model<TenantDocument>,
    );
  });

  const context = () =>
    ({
      switchToHttp: () => ({ getRequest: () => request }),
    }) as unknown as ExecutionContext;

  it('attaches the current tenant-scoped account to the request', async () => {
    await expect(guard.canActivate(context())).resolves.toBe(true);
    expect(accountModel.findOne).toHaveBeenCalledWith({
      _id: payload.sub,
      tenantId: payload.tenantId,
      role: payload.role,
    });
    expect(request.user).toMatchObject({
      tenantId: payload.tenantId,
      role: payload.role,
      email: 'owner@example.com',
    });
  });

  it('rejects invalid bearer tokens', async () => {
    verifyAsync.mockRejectedValueOnce(new Error('expired'));

    await expect(guard.canActivate(context())).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    expect(accountModel.findOne).not.toHaveBeenCalled();
  });

  it('rejects accounts from suspended tenants', async () => {
    tenantModel.exists.mockResolvedValueOnce(null);

    await expect(guard.canActivate(context())).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });
});
