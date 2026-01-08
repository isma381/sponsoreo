import jwt from 'jsonwebtoken';

const SECRET = process.env.JWT_SECRET || 'cambiar-en-produccion';

export function signToken(userId: string): string {
  return jwt.sign({ userId }, SECRET, { expiresIn: '30d' });
}

export function verifyToken(token: string): { userId: string } | null {
  try {
    return jwt.verify(token, SECRET) as { userId: string };
  } catch {
    return null;
  }
}

