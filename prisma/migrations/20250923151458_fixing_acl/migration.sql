/*
  Warnings:

  - You are about to drop the column `actionId` on the `Acl` table. All the data in the column will be lost.
  - You are about to drop the column `featureId` on the `Acl` table. All the data in the column will be lost.
  - You are about to drop the column `featureId` on the `Actions` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[featureName,actionName,userLevelId]` on the table `Acl` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[featureName,name]` on the table `Actions` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `actionName` to the `Acl` table without a default value. This is not possible if the table is not empty.
  - Added the required column `featureName` to the `Acl` table without a default value. This is not possible if the table is not empty.
  - Added the required column `featureName` to the `Actions` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE `Acl` DROP FOREIGN KEY `Acl_featureId_fkey`;

-- DropForeignKey
ALTER TABLE `Actions` DROP FOREIGN KEY `Actions_featureId_fkey`;

-- DropIndex
DROP INDEX `Acl_featureId_actionId_userLevelId_key` ON `Acl`;

-- DropIndex
DROP INDEX `Actions_featureId_name_key` ON `Actions`;

-- DropIndex
DROP INDEX `HistoryKepalaLab_kepalaLabId_fkey` ON `HistoryKepalaLab`;

-- AlterTable
ALTER TABLE `Acl` DROP COLUMN `actionId`,
    DROP COLUMN `featureId`,
    ADD COLUMN `actionName` VARCHAR(191) NOT NULL,
    ADD COLUMN `featureName` VARCHAR(191) NOT NULL;

-- AlterTable
ALTER TABLE `Actions` DROP COLUMN `featureId`,
    ADD COLUMN `featureName` VARCHAR(191) NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX `Acl_featureName_actionName_userLevelId_key` ON `Acl`(`featureName`, `actionName`, `userLevelId`);

-- CreateIndex
CREATE UNIQUE INDEX `Actions_featureName_name_key` ON `Actions`(`featureName`, `name`);

-- AddForeignKey
ALTER TABLE `Actions` ADD CONSTRAINT `Actions_featureName_fkey` FOREIGN KEY (`featureName`) REFERENCES `Features`(`name`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Acl` ADD CONSTRAINT `Acl_featureName_fkey` FOREIGN KEY (`featureName`) REFERENCES `Features`(`name`) ON DELETE CASCADE ON UPDATE CASCADE;
