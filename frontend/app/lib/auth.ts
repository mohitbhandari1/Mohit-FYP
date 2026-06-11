export interface User {
  id: number;
  name: string;
  email: string;
  role: string;
  is_admin?: boolean;
  interests?: string;
  bio?: string;
}

export const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';

/**
 * Default fetch options for API calls that include credentials (httpOnly cookies).
 */
export function apiFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const url = `${BACKEND_URL}${path}`;
  return fetch(url, {
    ...options,
    credentials: 'include',
    headers: {
      ...(options.headers || {}),
      ...(options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
    },
  });
}

/**
 * Get the Authorization header from localStorage (for pages that use Bearer tokens).
 * This is kept for backward compatibility — new code should rely on httpOnly cookies.
 */
export function getAuthHeaders(): Record<string, string> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

/**
 * Fetch current user profile using httpOnly cookie (calls /api/auth/me).
 */
export async function fetchCurrentUser(): Promise<User | null> {
  try {
    const res = await apiFetch('/api/auth/me');
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

/**
 * Log out — clears both the httpOnly cookie and localStorage.
 */
export async function logout(): Promise<void> {
  try {
    await apiFetch('/api/auth/logout', { method: 'POST' });
  } catch {
    // Ignore network errors during logout
  }
  localStorage.removeItem('token');
  localStorage.removeItem('user');
}
