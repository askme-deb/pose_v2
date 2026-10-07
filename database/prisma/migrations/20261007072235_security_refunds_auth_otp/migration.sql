-- CreateEnum
CREATE TYPE "AuthOtpPurpose" AS ENUM ('PASSWORD_RESET', 'EMAIL_VERIFY');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "PaymentGateway" ADD VALUE 'CASHFREE';
ALTER TYPE "PaymentGateway" ADD VALUE 'PHONEPE';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "PaymentStatus" ADD VALUE 'REFUNDED';
ALTER TYPE "PaymentStatus" ADD VALUE 'PARTIALLY_REFUNDED';

-- AlterEnum
ALTER TYPE "UserRole" ADD VALUE 'SUPER_ADMIN';

-- AlterTable
ALTER TABLE "invoices" ADD COLUMN     "discountTotal" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN     "loyaltyPointsEarned" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "refundedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "payments" ADD COLUMN     "completionAttempts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "gatewayRefundId" TEXT,
ADD COLUMN     "lastCompletionError" TEXT,
ADD COLUMN     "refundedAmount" DECIMAL(12,2) NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "emailVerifiedAt" TIMESTAMP(3),
ADD COLUMN     "failedLoginAttempts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "lockedUntil" TIMESTAMP(3),
ADD COLUMN     "tokenVersion" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "auth_otps" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "purpose" "AuthOtpPurpose" NOT NULL,
    "codeHash" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "auth_otps_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "auth_otps_userId_purpose_idx" ON "auth_otps"("userId", "purpose");

-- AddForeignKey
ALTER TABLE "auth_otps" ADD CONSTRAINT "auth_otps_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill: accounts that existed before email verification are grandfathered in.
UPDATE "users" SET "emailVerifiedAt" = CURRENT_TIMESTAMP WHERE "emailVerifiedAt" IS NULL;

-- Backfill: historical invoices stored total = subtotal + taxTotal - discount.
UPDATE "invoices" SET "discountTotal" = GREATEST("subtotal" + "taxTotal" - "total", 0);
