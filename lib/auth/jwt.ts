import jwt from 'jsonwebtoken';
import { jwtVerify } from 'jose';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const ENCRYPTION_KEY = new TextEncoder().encode(JWT_SECRET.substring(0, 32).padEnd(32, '0'));

export interface TokenPayload {
  userId: string;
  email: string;
  fullName: string;
  role: 'user' | 'admin';
  iat: number;
  exp: number;
}

// Generate JWT token
export function generateToken(userId: string, email: string, role: 'user' | 'admin', fullName: string) {
  return jwt.sign(
    { userId, email, role, fullName }, // Add fullName here
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

// Verify JWT token (for server-side)
export function verifyToken(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as TokenPayload;
  } catch (error) {
    return null;
  }
}

// Verify JWT token (for middleware)
export async function verifyTokenMiddleware(token: string): Promise<TokenPayload | null> {
  try {
    const verified = await jwtVerify(token, ENCRYPTION_KEY);
    return verified.payload as unknown as TokenPayload;
  } catch (error) {
    return null;
  }
}

export async function verifyAuth(token: string): Promise<TokenPayload | null> {
  return verifyToken(token);
}
