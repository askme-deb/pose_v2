-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('UPI', 'CARD', 'CASH');

-- AlterTable
ALTER TABLE "invoices" ADD COLUMN     "customerName" TEXT NOT NULL DEFAULT 'Walk-in Customer',
ADD COLUMN     "paymentMethod" "PaymentMethod" NOT NULL DEFAULT 'CASH';
