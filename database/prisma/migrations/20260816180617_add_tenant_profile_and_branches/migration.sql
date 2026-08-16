-- CreateEnum
CREATE TYPE "BranchType" AS ENUM ('FLAGSHIP', 'EXPRESS', 'CENTRAL_WAREHOUSE');

-- AlterTable
ALTER TABLE "stores" ADD COLUMN     "code" TEXT,
ADD COLUMN     "isPrimary" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "manager" TEXT,
ADD COLUMN     "phone" TEXT,
ADD COLUMN     "printers" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "type" "BranchType" NOT NULL DEFAULT 'FLAGSHIP';

-- CreateTable
CREATE TABLE "tenant_profiles" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "registeredName" TEXT NOT NULL,
    "tagline" TEXT,
    "logoUrl" TEXT,
    "retailCategory" TEXT NOT NULL DEFAULT 'supermarket',
    "cin" TEXT,
    "yearEstablished" INTEGER,
    "supportEmail" TEXT,
    "helplinePhone" TEXT,
    "hqAddress" TEXT,
    "gstin" TEXT,
    "pan" TEXT,
    "stateCode" TEXT,
    "defaultTaxSlab" INTEGER NOT NULL DEFAULT 18,
    "invoicePrefix" TEXT NOT NULL DEFAULT 'INV-',
    "nextInvoiceNumber" INTEGER NOT NULL DEFAULT 1,
    "currencySymbol" TEXT NOT NULL DEFAULT '₹',
    "financialYearStart" TEXT NOT NULL DEFAULT 'April',
    "ewayBillThreshold" INTEGER NOT NULL DEFAULT 50000,
    "receiptHeader" TEXT,
    "receiptSubHeader" TEXT,
    "receiptFooter" TEXT,
    "receiptReturnPolicy" TEXT,
    "receiptPaperWidth" TEXT NOT NULL DEFAULT '80mm',
    "receiptShowUpiQr" BOOLEAN NOT NULL DEFAULT true,
    "razorpayKeyId" TEXT,
    "whatsappPhoneId" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tenant_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tenant_profiles_tenantId_key" ON "tenant_profiles"("tenantId");

-- AddForeignKey
ALTER TABLE "tenant_profiles" ADD CONSTRAINT "tenant_profiles_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
