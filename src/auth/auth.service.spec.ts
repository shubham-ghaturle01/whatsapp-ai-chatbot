import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Model } from 'mongoose';
import { hash } from 'bcryptjs';
import { AuthService } from './auth.service';
import { AuthTokenPayload } from './auth.types';
import { AccountDocument } from './schemas/account.schema';
import { TenantDocument } from '../tenants/schemas/tenant.schema';

describe('AuthService', () => {
  const account = {
    _id: '507f1f77bcf86cd799439011',
    tenantId: 'tenant-test',
    email: 'owner@example.com',
    passwordHash: '$2a$12$hash',
    name: 'Owner',
    role: 'BUSINESS_ADMIN' as const,
  };
  type AccountInput = {
    tenantId: string;
    email: string;
    passwordHash: string;
    name: string;
    role: 'BUSINESS_ADMIN';
  };
  let service: AuthService;
  let jwtService: {
    sign: jest.MockedFunction<(payload: AuthTokenPayload) => string>;
  };
  let configService: {
    get: jest.MockedFunction<(key: string) => string | undefined>;
  };
  let accountModel: {
    exists: jest.MockedFunction<
      (filter: { email: string }) => Promise<{ _id: string } | null>
    >;
    create: jest.MockedFunction<
      (input: AccountInput) => Promise<typeof account>
    >;
    findOne: jest.MockedFunction<
      (filter: { email: string }) => {
        select: (projection: string) => {
          exec: () => Promise<typeof account | null>;
        };
      }
    >;
  };
  let tenantModel: {
    create: jest.MockedFunction<
      (input: Record<string, unknown>) => Promise<void>
    >;
    exists: jest.MockedFunction<
      (filter: Record<string, unknown>) => Promise<{ _id: string } | null>
    >;
    deleteOne: jest.MockedFunction<
      (filter: { tenantId: string }) => {
        exec: () => Promise<{ deletedCount: number }>;
      }
    >;
  };

  beforeEach(() => {
    jwtService = {
      sign: jest
        .fn<(payload: AuthTokenPayload) => string>()
        .mockReturnValue('signed-token'),
    };
    configService = {
      get: jest
        .fn<(key: string) => string | undefined>()
        .mockReturnValue('a'.repeat(40)),
    };
    accountModel = {
      exists: jest
        .fn<(filter: { email: string }) => Promise<{ _id: string } | null>>()
        .mockResolvedValue(null),
      create: jest
        .fn<(input: AccountInput) => Promise<typeof account>>()
        .mockResolvedValue(account),
      findOne: jest
        .fn<
          (filter: { email: string }) => {
            select: (projection: string) => {
              exec: () => Promise<typeof account | null>;
            };
          }
        >()
        .mockReturnValue({
          select: () => ({ exec: () => Promise.resolve(account) }),
        }),
    };
    tenantModel = {
      create: jest
        .fn<(input: Record<string, unknown>) => Promise<void>>()
        .mockResolvedValue(undefined),
      exists: jest
        .fn<
          (filter: Record<string, unknown>) => Promise<{ _id: string } | null>
        >()
        .mockResolvedValue({ _id: 'tenant' }),
      deleteOne: jest
        .fn<
          (filter: { tenantId: string }) => {
            exec: () => Promise<{ deletedCount: number }>;
          }
        >()
        .mockReturnValue({
          exec: () => Promise.resolve({ deletedCount: 1 }),
        }),
    };
    service = new AuthService(
      jwtService as unknown as JwtService,
      configService as unknown as ConfigService,
      accountModel as unknown as Model<AccountDocument>,
      tenantModel as unknown as Model<TenantDocument>,
    );
  });

  it('creates a tenant-scoped business admin and returns a bearer token', async () => {
    const result = await service.register({
      businessName: ' Example Business ',
      ownerName: ' Owner ',
      email: 'OWNER@EXAMPLE.COM',
      password: 'strong-password',
    });

    const tenantInput = tenantModel.create.mock.calls[0]?.[0];
    expect(tenantInput?.name).toBe('Example Business');
    expect(tenantInput?.ownerEmail).toBe('owner@example.com');

    const accountInput = accountModel.create.mock.calls[0]?.[0];
    expect(accountInput?.email).toBe('owner@example.com');
    expect(accountInput?.name).toBe('Owner');
    expect(accountInput?.role).toBe('BUSINESS_ADMIN');
    expect(accountInput?.tenantId).toMatch(/^tenant-/);
    expect(accountInput?.passwordHash).not.toBe('strong-password');

    expect(jwtService.sign.mock.calls[0]?.[0].role).toBe('BUSINESS_ADMIN');
    expect(result).toMatchObject({
      accessToken: 'signed-token',
      tokenType: 'Bearer',
      expiresIn: 3600,
    });
  });

  it('rejects duplicate email registration before creating a tenant', async () => {
    accountModel.exists.mockResolvedValueOnce({ _id: account._id });

    await expect(
      service.register({
        businessName: 'Business',
        ownerName: 'Owner',
        email: 'owner@example.com',
        password: 'strong-password',
      }),
    ).rejects.toMatchObject({ status: 409 });
    expect(tenantModel.create).not.toHaveBeenCalled();
  });

  it('rejects bcrypt passwords longer than 72 UTF-8 bytes', async () => {
    await expect(
      service.register({
        businessName: 'Business',
        ownerName: 'Owner',
        email: 'owner@example.com',
        password: '😀'.repeat(19),
      }),
    ).rejects.toMatchObject({ status: 400 });
    expect(tenantModel.create).not.toHaveBeenCalled();
  });

  it('rejects login when the password does not match', async () => {
    await expect(
      service.login({ email: 'owner@example.com', password: 'wrong-password' }),
    ).rejects.toMatchObject({ status: 401 });
  });

  it('authenticates an active account with a valid password', async () => {
    const passwordHash = await hash('strong-password', 4);
    accountModel.findOne.mockReturnValueOnce({
      select: () => ({
        exec: () => Promise.resolve({ ...account, passwordHash }),
      }),
    });

    const result = await service.login({
      email: 'OWNER@EXAMPLE.COM',
      password: 'strong-password',
    });

    expect(accountModel.findOne).toHaveBeenCalledWith({
      email: 'owner@example.com',
    });
    expect(tenantModel.exists).toHaveBeenCalledWith({
      tenantId: 'tenant-test',
      status: 'active',
    });
    expect(result.user).toMatchObject({
      tenantId: 'tenant-test',
      role: 'BUSINESS_ADMIN',
    });
  });

  it('does not use authentication when the signing secret is missing', async () => {
    configService.get.mockReturnValueOnce('');

    await expect(
      service.login({ email: 'owner@example.com', password: 'password123' }),
    ).rejects.toMatchObject({ status: 503 });
    expect(accountModel.findOne).not.toHaveBeenCalled();
  });
});
