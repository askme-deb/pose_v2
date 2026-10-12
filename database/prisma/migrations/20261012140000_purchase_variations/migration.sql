-- Variation-aware purchasing: which option a PO line / receipt / return refers to
ALTER TABLE "purchase_order_items" ADD COLUMN "optionId" TEXT, ADD COLUMN "optionName" TEXT;
ALTER TABLE "goods_received_note_items" ADD COLUMN "optionId" TEXT, ADD COLUMN "optionName" TEXT;
ALTER TABLE "purchase_return_items" ADD COLUMN "optionId" TEXT, ADD COLUMN "optionName" TEXT;
