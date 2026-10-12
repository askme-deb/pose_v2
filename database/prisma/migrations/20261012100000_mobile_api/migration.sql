-- Mobile (FoodApp) API support
ALTER TABLE "users" ADD COLUMN "phone" TEXT;
CREATE INDEX "users_phone_idx" ON "users"("phone");

ALTER TABLE "stores"
  ADD COLUMN "purchaseEnabled" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "posAppKey" TEXT,
  ADD COLUMN "posMerchantName" TEXT,
  ADD COLUMN "posNumber" TEXT,
  ADD COLUMN "posPassword" TEXT,
  ADD COLUMN "lockedByUserId" TEXT,
  ADD COLUMN "lockedDeviceSerial" TEXT,
  ADD COLUMN "lockedAt" TIMESTAMP(3);

ALTER TABLE "invoices"
  ADD COLUMN "billDiscountAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN "complimentaryAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN "isGstSame" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "posTxnId" TEXT,
  ADD COLUMN "cardLastFour" TEXT,
  ADD COLUMN "deviceSerial" TEXT,
  ADD COLUMN "deviceType" TEXT;

ALTER TABLE "invoice_items" ADD COLUMN "discountAmount" DECIMAL(12,2) NOT NULL DEFAULT 0;

CREATE TABLE "store_seats" (
  "id" TEXT NOT NULL,
  "storeId" TEXT NOT NULL,
  "groupName" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  CONSTRAINT "store_seats_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "store_seats_storeId_name_key" ON "store_seats"("storeId", "name");
ALTER TABLE "store_seats" ADD CONSTRAINT "store_seats_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "mobile_cart_lines" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "storeId" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "quantity" INTEGER NOT NULL,
  "discountAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "mobile_cart_lines_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "mobile_cart_lines_userId_storeId_productId_key" ON "mobile_cart_lines"("userId", "storeId", "productId");
ALTER TABLE "mobile_cart_lines" ADD CONSTRAINT "mobile_cart_lines_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "login_logs" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "storeId" TEXT,
  "deviceType" TEXT,
  "deviceSerial" TEXT,
  "model" TEXT,
  "loginAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "logoutAt" TIMESTAMP(3),
  CONSTRAINT "login_logs_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "login_logs_tenantId_userId_loginAt_idx" ON "login_logs"("tenantId", "userId", "loginAt");
