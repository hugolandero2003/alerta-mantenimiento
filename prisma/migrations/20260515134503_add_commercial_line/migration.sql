/*
  Warnings:

  - Added the required column `cargoBodyType` to the `Vehicle` table without a default value. This is not possible if the table is not empty.
  - Added the required column `commercialLine` to the `Vehicle` table without a default value. This is not possible if the table is not empty.
  - Added the required column `driverName` to the `Vehicle` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Vehicle" ADD COLUMN     "cargoBodyType" TEXT NOT NULL,
ADD COLUMN     "commercialLine" TEXT NOT NULL,
ADD COLUMN     "driverName" TEXT NOT NULL;
