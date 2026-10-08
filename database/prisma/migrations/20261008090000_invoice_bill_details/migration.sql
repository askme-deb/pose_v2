-- Bill details captured at the counter and printed on the receipt.
ALTER TABLE "invoices" ADD COLUMN "customerPhone" TEXT;
ALTER TABLE "invoices" ADD COLUMN "location" TEXT;
ALTER TABLE "invoices" ADD COLUMN "seatNo" TEXT;
ALTER TABLE "invoices" ADD COLUMN "paymentReference" TEXT;
