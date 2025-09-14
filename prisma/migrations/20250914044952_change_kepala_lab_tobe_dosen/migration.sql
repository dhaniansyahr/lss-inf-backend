/*
  Warnings:

  - You are about to drop the `KepalaLab` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE `HistoryKepalaLab` DROP FOREIGN KEY `HistoryKepalaLab_kepalaLabId_fkey`;

-- DropForeignKey
ALTER TABLE `RuanganLaboratorium` DROP FOREIGN KEY `RuanganLaboratorium_kepalaLabId_fkey`;

-- DropTable
DROP TABLE `KepalaLab`;

-- AddForeignKey
ALTER TABLE `RuanganLaboratorium` ADD CONSTRAINT `RuanganLaboratorium_kepalaLabId_fkey` FOREIGN KEY (`kepalaLabId`) REFERENCES `Dosen`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `HistoryKepalaLab` ADD CONSTRAINT `HistoryKepalaLab_kepalaLabId_fkey` FOREIGN KEY (`kepalaLabId`) REFERENCES `Dosen`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
