-- AlterTable
ALTER TABLE `admin` ADD COLUMN `resetToken` VARCHAR(191) NULL,
    ADD COLUMN `role` VARCHAR(191) NOT NULL DEFAULT 'admin',
    ADD COLUMN `tokenExpiry` DATETIME(3) NULL;
