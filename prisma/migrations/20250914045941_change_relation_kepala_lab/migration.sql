-- DropForeignKey
ALTER TABLE `HistoryKepalaLab` DROP FOREIGN KEY `HistoryKepalaLab_kepalaLabId_fkey`;

-- AlterTable
ALTER TABLE `HistoryKepalaLab` ADD COLUMN `dosenId` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `RuanganLaboratorium` ADD COLUMN `dosenId` VARCHAR(191) NULL;

-- AddForeignKey
ALTER TABLE `HistoryKepalaLab` ADD CONSTRAINT `HistoryKepalaLab_dosenId_fkey` FOREIGN KEY (`dosenId`) REFERENCES `Dosen`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
