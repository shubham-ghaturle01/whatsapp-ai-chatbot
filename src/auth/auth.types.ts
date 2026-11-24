import type { UserRole } from './schemas/account.schema';

export type AuthTokenPayload = {
  sub: string;
  tenantId: string;
  role: UserRole;
};

export type AuthenticatedUser = AuthTokenPayload & {
  email: string;
  name: string;
};
