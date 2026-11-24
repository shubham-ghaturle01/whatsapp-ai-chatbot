export type AuthUser = {
  sub: string;
  tenantId: string;
  role: 'SUPER_ADMIN' | 'BUSINESS_ADMIN' | 'BUSINESS_AGENT';
  email: string;
  name: string;
};

export type AuthResponse = {
  accessToken: string;
  tokenType: 'Bearer';
  expiresIn: number;
  user: AuthUser;
};

const TOKEN_KEY = 'whatsapp_ai_access_token';
const USER_KEY = 'whatsapp_ai_user';

export function getAccessToken(): string | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

export function getStoredUser(): AuthUser | null {
  if (typeof window === 'undefined') return null;
  try {
    const value = window.localStorage.getItem(USER_KEY);
    return value ? (JSON.parse(value) as AuthUser) : null;
  } catch {
    return null;
  }
}

export function saveAuth(response: AuthResponse) {
  window.localStorage.setItem(TOKEN_KEY, response.accessToken);
  window.localStorage.setItem(USER_KEY, JSON.stringify(response.user));
}

export function clearAuth() {
  window.localStorage.removeItem(TOKEN_KEY);
  window.localStorage.removeItem(USER_KEY);
}

export async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = getAccessToken();
  const headers = new Headers(options.headers);
  if (token) headers.set('Authorization', `Bearer ${token}`);
  if (options.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(`/api${path}`, {
    ...options,
    headers,
  });

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const message =
      payload && typeof payload.message === 'string'
        ? payload.message
        : `Request failed (${response.status})`;
    throw new Error(Array.isArray(payload?.message) ? payload.message.join(', ') : message);
  }
  return payload as T;
}
