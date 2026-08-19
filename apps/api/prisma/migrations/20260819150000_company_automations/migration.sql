-- CreateTable
CREATE TABLE `company_automations` (
    `id` CHAR(36) NOT NULL,
    `company_id` CHAR(36) NOT NULL,
    `automation_code` VARCHAR(50) NOT NULL,
    `enabled` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `company_automations_company_code_key`(`company_id`, `automation_code`),
    INDEX `company_automations_code_enabled_idx`(`automation_code`, `enabled`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Existing companies keep the behavior they had before company-level
-- automation activation existed. New companies start with no rows and,
-- therefore, no automations enabled.
INSERT INTO `company_automations`
    (`id`, `company_id`, `automation_code`, `enabled`, `created_at`, `updated_at`)
SELECT
    UUID(),
    companies.`id`,
    catalog.`automation_code`,
    true,
    CURRENT_TIMESTAMP(3),
    CURRENT_TIMESTAMP(3)
FROM `companies`
CROSS JOIN (
    SELECT '507' AS `automation_code`
    UNION ALL
    SELECT '552' AS `automation_code`
) catalog;

-- AddForeignKey
ALTER TABLE `company_automations`
ADD CONSTRAINT `company_automations_company_id_fkey`
FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`)
ON DELETE CASCADE ON UPDATE CASCADE;
