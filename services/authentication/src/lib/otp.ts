import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import type { AuthOtpPurpose } from '@prisma/client';
import { prisma } from './prisma';

const MAX_ATTEMPTS = 5;

export const OTP_TTL_MINUTES: Record<AuthOtpPurpose | 'INVITE', number> = {
  PASSWORD_RESET: 15,
  EMAIL_VERIFY: 30,
  // An invite is a PASSWORD_RESET code with a longer life.
  INVITE: 72 * 60,
};

/** Issues a fresh 6-digit code, invalidating any earlier unused ones for the same purpose. */
export async function createOtp(userId: string, purpose: AuthOtpPurpose, ttlMinutes = OTP_TTL_MINUTES[purpose]): Promise<string> {
  const code = crypto.randomInt(0, 1_000_000).toString().padStart(6, '0');
  await prisma.$transaction([
    prisma.authOtp.updateMany({ where: { userId, purpose, consumedAt: null }, data: { consumedAt: new Date() } }),
    prisma.authOtp.create({
      data: { userId, purpose, codeHash: await bcrypt.hash(code, 10), expiresAt: new Date(Date.now() + ttlMinutes * 60_000) },
    }),
  ]);
  return code;
}

/**
 * Checks and consumes the latest live code. Each wrong guess counts against
 * the code; after MAX_ATTEMPTS it's burned and a new one must be requested,
 * so a 6-digit code can't be brute-forced.
 */
export async function consumeOtp(userId: string, purpose: AuthOtpPurpose, code: string): Promise<boolean> {
  const otp = await prisma.authOtp.findFirst({
    where: { userId, purpose, consumedAt: null, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: 'desc' },
  });
  if (!otp || otp.attempts >= MAX_ATTEMPTS) return false;

  if (!(await bcrypt.compare(code, otp.codeHash))) {
    const attempts = otp.attempts + 1;
    await prisma.authOtp.update({
      where: { id: otp.id },
      data: { attempts, ...(attempts >= MAX_ATTEMPTS ? { consumedAt: new Date() } : {}) },
    });
    return false;
  }

  // Conditional update so two concurrent correct submissions can't both win.
  const { count } = await prisma.authOtp.updateMany({ where: { id: otp.id, consumedAt: null }, data: { consumedAt: new Date() } });
  return count === 1;
}
