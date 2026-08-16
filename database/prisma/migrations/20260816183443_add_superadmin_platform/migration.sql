-- CreateEnum
CREATE TYPE "TenantRegion" AS ENUM ('MUMBAI', 'VIRGINIA', 'FRANKFURT');

-- CreateEnum
CREATE TYPE "PaymentGateway" AS ENUM ('RAZORPAY', 'STRIPE');

-- CreateEnum
CREATE TYPE "PlatformInvoiceStatus" AS ENUM ('PAID', 'PENDING', 'FAILED');

-- AlterEnum
ALTER TYPE "TenantStatus" ADD VALUE 'PAST_DUE';

-- AlterTable
ALTER TABLE "tenants" ADD COLUMN     "dbInstancePod" TEXT,
ADD COLUMN     "ownerEmail" TEXT,
ADD COLUMN     "ownerName" TEXT,
ADD COLUMN     "region" "TenantRegion" NOT NULL DEFAULT 'MUMBAI',
ADD COLUMN     "storageLimitGB" INTEGER NOT NULL DEFAULT 250,
ADD COLUMN     "storageUsedGB" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "storesLimit" INTEGER NOT NULL DEFAULT 10;

-- CreateTable
CREATE TABLE "tenant_branding" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "appTitle" TEXT,
    "faviconUrl" TEXT,
    "logoUrl" TEXT,
    "accentColor" TEXT NOT NULL DEFAULT '#2563eb',
    "fontFamily" TEXT NOT NULL DEFAULT 'Plus Jakarta Sans',
    "customCss" TEXT,
    "smtpFromLabel" TEXT,
    "smtpHost" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tenant_branding_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cname_domains" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "cnameDomain" TEXT NOT NULL,
    "edgeIngressTarget" TEXT NOT NULL DEFAULT 'ingress-mumbai-01.apexpos.com',
    "sslSlaStatus" TEXT NOT NULL DEFAULT 'Let''s Encrypt TLS 1.3',
    "dnsPropagationStatus" TEXT NOT NULL DEFAULT 'Propagated (5ms)',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cname_domains_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform_invoices" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "plan" "SubscriptionPlan" NOT NULL,
    "gateway" "PaymentGateway" NOT NULL,
    "gatewayRef" TEXT NOT NULL,
    "amountINR" INTEGER NOT NULL,
    "status" "PlatformInvoiceStatus" NOT NULL DEFAULT 'PAID',
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "platform_invoices_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tenant_branding_tenantId_key" ON "tenant_branding"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "cname_domains_cnameDomain_key" ON "cname_domains"("cnameDomain");

-- AddForeignKey
ALTER TABLE "tenant_branding" ADD CONSTRAINT "tenant_branding_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cname_domains" ADD CONSTRAINT "cname_domains_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platform_invoices" ADD CONSTRAINT "platform_invoices_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
