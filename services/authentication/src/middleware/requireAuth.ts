import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthedUser {
  sub: string;
  tenantId: string;
  role: string;
  rbacRoleId: string | null;
}

declare global {
  namespace Express {
    interface Request {
      authUser?: AuthedUser;
    }
  }
}

// Verifies the caller's own access token and attaches who they are. Every
// other route in this service only trusts the x-tenant-id header — this is
// the first real bearer-token check, added because self-service 2FA setup
// genuinely needs to know *which* user is asking, not just which tenant.
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.header('authorization');
  const token = header?.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Missing bearer token' });

  try {
    req.authUser = jwt.verify(token, process.env.JWT_SECRET!) as AuthedUser;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}
