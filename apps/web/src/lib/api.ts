import {
  AuthResponseData,
  CurrentUserResponse,
  ApiSuccessResponse,
  ApiErrorResponse,
} from '@taskflow/shared';
import { LoginInput, RegisterInput } from '@taskflow/validation';

const API_BASE = '/api/v1';

let accessToken: string | null = null;
let refreshPromise: Promise<string | null> | null = null;

export const setAccessToken = (token: string | null) => {
  accessToken = token;
};

export const getAccessToken = () => accessToken;

/**
 * Single-flight refresh mechanism to prevent duplicate concurrent refresh calls.
 */
const refreshAccessToken = async (): Promise<string | null> => {
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    try {
      const response = await fetch(`${API_BASE}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include', // Include HTTP-only cookie
      });

      if (!response.ok) {
        setAccessToken(null);
        return null;
      }

      const resData = (await response.json()) as ApiSuccessResponse<AuthResponseData>;
      if (resData.success && resData.data.accessToken) {
        setAccessToken(resData.data.accessToken);
        return resData.data.accessToken;
      }

      setAccessToken(null);
      return null;
    } catch {
      setAccessToken(null);
      return null;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
};

/**
 * Fetch wrapper that attaches access token in memory and automatically retries once on 401.
 */
export const apiFetch = async <T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiSuccessResponse<T>> => {
  const url = endpoint.startsWith('http')
    ? endpoint
    : `${API_BASE}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;

  const headers = new Headers(options.headers || {});
  headers.set('Content-Type', 'application/json');

  if (accessToken) {
    headers.set('Authorization', `Bearer ${accessToken}`);
  }

  let response = await fetch(url, {
    ...options,
    headers,
    credentials: 'include',
  });

  // Handle access token expiry (401) with automatic single-retry
  if (
    response.status === 401 &&
    !endpoint.includes('/auth/login') &&
    !endpoint.includes('/auth/register') &&
    !endpoint.includes('/auth/refresh')
  ) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      headers.set('Authorization', `Bearer ${newToken}`);
      response = await fetch(url, {
        ...options,
        headers,
        credentials: 'include',
      });
    }
  }

  const payload = await response.json();

  if (!response.ok || !payload.success) {
    const errorPayload = payload as ApiErrorResponse;
    const err = new Error(errorPayload.error?.message || 'Request failed');
    (err as unknown as { code: string; details?: unknown }).code =
      errorPayload.error?.code || 'API_ERROR';
    (err as unknown as { details?: unknown }).details = errorPayload.error?.details;
    throw err;
  }

  return payload as ApiSuccessResponse<T>;
};

export const api = {
  login: async (credentials: LoginInput) => {
    const res = await apiFetch<AuthResponseData>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
    setAccessToken(res.data.accessToken);
    return res.data;
  },

  register: async (data: RegisterInput) => {
    const res = await apiFetch<AuthResponseData>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    setAccessToken(res.data.accessToken);
    return res.data;
  },

  refresh: async () => {
    const token = await refreshAccessToken();
    return token;
  },

  logout: async () => {
    try {
      await fetch(`${API_BASE}/auth/logout`, {
        method: 'POST',
        credentials: 'include',
      });
    } finally {
      setAccessToken(null);
    }
  },

  getMe: async () => {
    const res = await apiFetch<CurrentUserResponse>('/auth/me');
    return res.data;
  },
};
