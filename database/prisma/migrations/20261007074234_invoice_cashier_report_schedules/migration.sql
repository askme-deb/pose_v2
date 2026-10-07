-- CreateEnum
CREATE TYPE "ReportFrequency" AS ENUM ('DAILY', 'WEEKLY', 'MONTHLY');

-- CreateEnum
CREATE TYPE "ReportFormat" AS ENUM ('PDF', 'XLSX');

-- AlterTable
ALTER TABLE "invoices" ADD COLUMN     "createdById" TEXT;

-- CreateTable
CREATE TABLE "report_schedules" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "frequency" "ReportFrequency" NOT NULL,
    "format" "ReportFormat" NOT NULL DEFAULT 'PDF',
    "modules" TEXT[],
    "storeId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastRunAt" TIMESTAMP(3),
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "report_schedules_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "report_schedules_tenantId_idx" ON "report_schedules"("tenantId");

-- CreateIndex
CREATE INDEX "invoices_storeId_createdAt_idx" ON "invoices"("storeId", "createdAt");

-- AddForeignKey
ALTER TABLE "report_schedules" ADD CONSTRAINT "report_schedules_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
