/*
  Warnings:

  - You are about to alter the column `hari` on the `Jadwal` table. The data in that column could be lost. The data in that column will be cast from `Enum(EnumId(5))` to `VarChar(191)`.

*/
-- AlterTable
ALTER TABLE `Jadwal` MODIFY `hari` VARCHAR(191) NOT NULL;

-- AlterTable
ALTER TABLE `Meeting` MODIFY `tanggal` VARCHAR(191) NOT NULL;
