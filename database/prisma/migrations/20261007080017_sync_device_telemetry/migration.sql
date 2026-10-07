-- AlterTable
ALTER TABLE "sync_devices" ADD COLUMN     "appVersion" TEXT,
ADD COLUMN     "batteryPercent" INTEGER,
ADD COLUMN     "osVersion" TEXT,
ADD COLUMN     "peripherals" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "platform" TEXT;
