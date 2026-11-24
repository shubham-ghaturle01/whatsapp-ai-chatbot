import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard';

describe('RolesGuard', () => {
  const handler = jest.fn();
  const controller = jest.fn();
  let roles: string[] | undefined;
  const reflector = {
    getAllAndOverride: jest.fn(() => roles),
  } as unknown as Reflector;
  const guard = new RolesGuard(reflector);

  const makeContext = (role?: string) =>
    ({
      getHandler: () => handler,
      getClass: () => controller,
      switchToHttp: () => ({
        getRequest: () => ({
          user: role ? { role } : undefined,
        }),
      }),
    }) as unknown as ExecutionContext;

  beforeEach(() => {
    roles = undefined;
    jest.clearAllMocks();
  });

  it('allows a route without role metadata', () => {
    expect(guard.canActivate(makeContext())).toBe(true);
  });

  it('allows a user whose role is explicitly required', () => {
    roles = ['BUSINESS_ADMIN'];
    expect(guard.canActivate(makeContext('BUSINESS_ADMIN'))).toBe(true);
  });

  it('denies a user whose role is not required', () => {
    roles = ['SUPER_ADMIN'];
    expect(guard.canActivate(makeContext('BUSINESS_AGENT'))).toBe(false);
  });
});
