import { cookies } from 'next/headers';
import { verifyToken, TokenPayload } from './jwt';

const TOKEN_NAME = 'auth_token';

// Get current user from token
export async function getCurrentUser(): Promise<TokenPayload | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(TOKEN_NAME)?.value;

    if (!token) {
      return null;
    }

    const payload = verifyToken(token);
    return payload;
  } catch (error) {
    return null;
  }
}

// Check if user is admin
export async function isUserAdmin(): Promise<boolean> {
  const user = await getCurrentUser();
  console.log(user)
  return user?.role === 'admin' || false;
}

// Set auth token in cookie
export async function setAuthToken(token: string) {
  const cookieStore = await cookies();
  cookieStore.set(TOKEN_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60, // 7 days
  });
}

// Clear auth token
export async function clearAuthToken() {
  const cookieStore = await cookies();
  cookieStore.delete(TOKEN_NAME);
}
