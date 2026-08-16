-- CreateEnum
CREATE TYPE "GstFormType" AS ENUM ('GSTR1', 'GSTR3B');

-- CreateEnum
CREATE TYPE "GstFilingStatus" AS ENUM ('PENDING', 'FILED');

-- CreateTable
CREATE TABLE "gst_returns" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "formType" "GstFormType" NOT NULL,
    "periodMonth" TIMESTAMP(3) NOT NULL,
    "billedTurnover" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "taxLiability" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "arn" TEXT,
    "status" "GstFilingStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "gst_returns_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "gst_returns_tenantId_formType_periodMonth_key" ON "gst_returns"("tenantId", "formType", "periodMonth");

-- AddForeignKey
ALTER TABLE "gst_returns" ADD CONSTRAINT "gst_returns_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
