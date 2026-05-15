-- AlterTable
ALTER TABLE "Maintenance"
ADD COLUMN "maintenanceType" TEXT,
ADD COLUMN "pesvSystem" TEXT,
ADD COLUMN "serviceModality" TEXT,
ADD COLUMN "currentKm" INTEGER;
