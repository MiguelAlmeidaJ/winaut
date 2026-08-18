/*
  Warnings:

  - You are about to drop the column `active` on the `agent_credentials` table. All the data in the column will be lost.
  - You are about to drop the column `expires_at` on the `agent_credentials` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE `agent_credentials` DROP FOREIGN KEY `agent_credentials_agent_id_fkey`;

-- DropIndex
DROP INDEX `agent_credentials_agent_id_active_idx` ON `agent_credentials`;

-- AlterTable
ALTER TABLE `agent_credentials` DROP COLUMN `active`,
    DROP COLUMN `expires_at`,
    ADD COLUMN `revoked_at` DATETIME(3) NULL;

-- CreateIndex
CREATE INDEX `agent_credentials_agent_id_revoked_at_idx` ON `agent_credentials`(`agent_id`, `revoked_at`);

-- AddForeignKey
ALTER TABLE `winthor_instances` ADD CONSTRAINT `winthor_instances_company_id_fkey` FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
