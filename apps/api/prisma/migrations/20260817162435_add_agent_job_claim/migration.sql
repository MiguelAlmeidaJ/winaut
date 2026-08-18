/*
  Warnings:

  - A unique constraint covering the columns `[claim_token]` on the table `automation_steps` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE `automation_steps` ADD COLUMN `attempt_count` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `claim_token` CHAR(36) NULL,
    ADD COLUMN `claimed_at` DATETIME(3) NULL,
    ADD COLUMN `claimed_by_agent_id` VARCHAR(100) NULL,
    ADD COLUMN `lease_expires_at` DATETIME(3) NULL;

-- CreateIndex
CREATE UNIQUE INDEX `automation_steps_claim_token_key` ON `automation_steps`(`claim_token`);

-- CreateIndex
CREATE INDEX `automation_steps_status_lease_expires_at_idx` ON `automation_steps`(`status`, `lease_expires_at`);
