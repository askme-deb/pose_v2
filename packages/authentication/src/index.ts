import jwt from 'jsonwebtoken';

export interface SessionUser {
  userId: string;
  tenantId: string;
  role: string;
}

export const verifyAccessToken = (token: string, secret: string): SessionUser =>
  jwt.verify(token, secret) as SessionUser;

export const signAccessToken = (user: SessionUser, secret: string, expiresIn = '15m'): string =>
  jwt.sign(user, secret, { expiresIn } as jwt.SignOptions);
