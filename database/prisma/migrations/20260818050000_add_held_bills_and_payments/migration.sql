-- AlterTable: a held bill has no invoice number yet — only allocated once
-- sales-service's checkout actually pays it. Postgres treats multiple NULLs
-- as distinct under the existing (storeId, invoiceNumber) unique index, same
-- reasoning already used for idempotencyKey.
ALTER TABLE "invoices" ALTER COLUMN "invoiceNumber" DROP NOT NULL;

-- AlterTable: label + heldDiscountPercent only carry meaning while a bill is
-- HELD — discarded once recalled and actually checked out.
ALTER TABLE "invoices" ADD COLUMN     "label" TEXT,
ADD COLUMN     "heldDiscountPercent" DECIMAL(5,2);

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('CREATED', 'CAPTURED', 'FAILED');

-- CreateTable
CREATE TABLE "payments" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "gateway" "PaymentGateway" NOT NULL DEFAULT 'RAZORPAY',
    "gatewayOrderId" TEXT,
    "gatewayPaymentId" TEXT,
    "amount" DECIMAL(12,2) NOT NULL,
    "status" "PaymentStatus" NOT NULL DEFAULT 'CREATED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "payments_gatewayOrderId_key" ON "payments"("gatewayOrderId");

-- CreateIndex
CREATE UNIQUE INDEX "payments_gatewayPaymentId_key" ON "payments"("gatewayPaymentId");

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "invoices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
