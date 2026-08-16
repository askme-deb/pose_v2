-- CreateEnum
CREATE TYPE "CustomerTier" AS ENUM ('STANDARD', 'SILVER', 'GOLD', 'VIP_DIAMOND');

-- AlterTable
ALTER TABLE "customers" ADD COLUMN     "tier" "CustomerTier" NOT NULL DEFAULT 'STANDARD';
