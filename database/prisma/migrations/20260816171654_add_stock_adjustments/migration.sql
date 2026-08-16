-- CreateEnum
CREATE TYPE "AdjustmentAction" AS ENUM ('ADD', 'SUBTRACT');

-- CreateEnum
CREATE TYPE "AdjustmentStatus" AS ENUM ('PENDING', 'APPROVED');

-- CreateTable
CREATE TABLE "stock_adjustments" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "action" "AdjustmentAction" NOT NULL,
    "qty" INTEGER NOT NULL,
    "reasonCode" TEXT NOT NULL,
    "auditor" TEXT NOT NULL,
    "valueImpact" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "status" "AdjustmentStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stock_adjustments_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "stock_adjustments" ADD CONSTRAINT "stock_adjustments_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_adjustments" ADD CONSTRAINT "stock_adjustments_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
