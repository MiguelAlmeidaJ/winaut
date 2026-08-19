-- CreateTable
CREATE TABLE `agent_enrollments` (
    `id` CHAR(36) NOT NULL,
    `agent_id` CHAR(36) NOT NULL,
    `code_hash` CHAR(64) NOT NULL,
    `expires_at` DATETIME(3) NOT NULL,
    `consumed_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `agent_enrollments_code_hash_key`(`code_hash`),
    INDEX `agent_enrollments_agent_status_idx`(`agent_id`, `consumed_at`, `expires_at`),
    INDEX `agent_enrollments_expiry_idx`(`expires_at`, `consumed_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `agent_enrollments`
ADD CONSTRAINT `agent_enrollments_agent_id_fkey`
FOREIGN KEY (`agent_id`) REFERENCES `agents`(`id`)
ON DELETE CASCADE ON UPDATE CASCADE;
