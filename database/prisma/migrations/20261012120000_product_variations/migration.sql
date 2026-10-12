-- Product variations (options with own price/stock) and addons / complementary items
ALTER TABLE "products" ADD COLUMN "variationName" TEXT;

ALTER TABLE "invoice_items"
  ADD COLUMN "optionId" TEXT,
  ADD COLUMN "optionName" TEXT;

ALTER TABLE "mobile_cart_lines"
  ADD COLUMN "optionId" TEXT,
  ADD COLUMN "optionKey" TEXT NOT NULL DEFAULT '';
DROP INDEX "mobile_cart_lines_userId_storeId_productId_key";
CREATE UNIQUE INDEX "mobile_cart_lines_userId_storeId_productId_optionKey_key" ON "mobile_cart_lines"("userId", "storeId", "productId", "optionKey");

CREATE TYPE "ProductAddonKind" AS ENUM ('ADDON', 'COMPLEMENTARY');

CREATE TABLE "product_options" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "sku" TEXT,
  "barcode" TEXT,
  "price" DECIMAL(12,2) NOT NULL,
  "mrp" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "costPrice" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "stockQty" INTEGER NOT NULL DEFAULT 0,
  "position" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "product_options_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "product_options_productId_name_key" ON "product_options"("productId", "name");
CREATE INDEX "product_options_tenantId_barcode_idx" ON "product_options"("tenantId", "barcode");
ALTER TABLE "product_options" ADD CONSTRAINT "product_options_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "product_addons" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "addonProductId" TEXT NOT NULL,
  "kind" "ProductAddonKind" NOT NULL DEFAULT 'ADDON',
  "price" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "position" INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "product_addons_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "product_addons_productId_addonProductId_key" ON "product_addons"("productId", "addonProductId");
ALTER TABLE "product_addons" ADD CONSTRAINT "product_addons_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "product_addons" ADD CONSTRAINT "product_addons_addonProductId_fkey" FOREIGN KEY ("addonProductId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;
