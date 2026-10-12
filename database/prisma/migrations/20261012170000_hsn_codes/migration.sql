-- HSN / SAC master: GST rates are managed per HSN code
CREATE TABLE "hsn_codes" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "gstRate" DECIMAL(5,2) NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "hsn_codes_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "hsn_codes_tenantId_code_key" ON "hsn_codes"("tenantId", "code");

-- Carry over any HSN codes products already use (with the rate those products charge).
INSERT INTO "hsn_codes" ("id", "tenantId", "code", "description", "gstRate", "updatedAt")
SELECT md5(random()::text || clock_timestamp()::text || p."tenantId" || p."hsnCode"), p."tenantId", p."hsnCode", 'Imported from products', MAX(p."gstRate"), CURRENT_TIMESTAMP
FROM "products" p
WHERE p."hsnCode" IS NOT NULL AND btrim(p."hsnCode") <> ''
GROUP BY p."tenantId", p."hsnCode";
