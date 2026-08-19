-- CreateTable
CREATE TABLE `winthor_branches` (
    `id` CHAR(36) NOT NULL,
    `winthor_instance_id` CHAR(36) NOT NULL,
    `code` VARCHAR(30) NOT NULL,
    `name` VARCHAR(150) NOT NULL,
    `active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `winthor_branches_winthor_instance_id_code_key`(`winthor_instance_id`, `code`),
    INDEX `winthor_branches_winthor_instance_id_active_idx`(`winthor_instance_id`, `active`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `automation_configurations` (
    `id` CHAR(36) NOT NULL,
    `winthor_instance_id` CHAR(36) NOT NULL,
    `automation_code` VARCHAR(50) NOT NULL,
    `settings` JSON NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `automation_cfg_instance_code_key`(`winthor_instance_id`, `automation_code`),
    INDEX `automation_configurations_automation_code_idx`(`automation_code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Seed the branches that were previously hardcoded by routine 507.
-- Existing environments therefore keep generating the same 12 steps until
-- an administrator changes the configuration in the panel.
INSERT INTO `winthor_branches`
    (`id`, `winthor_instance_id`, `code`, `name`, `active`, `created_at`, `updated_at`)
SELECT
    UUID(),
    wi.`id`,
    defaults.`code`,
    defaults.`name`,
    true,
    CURRENT_TIMESTAMP(3),
    CURRENT_TIMESTAMP(3)
FROM `winthor_instances` wi
CROSS JOIN (
    SELECT '1' AS `code`, 'Filial 1' AS `name`
    UNION ALL
    SELECT '2' AS `code`, 'Filial 2' AS `name`
) defaults;

-- AddForeignKey
ALTER TABLE `winthor_branches`
ADD CONSTRAINT `winthor_branches_winthor_instance_id_fkey`
FOREIGN KEY (`winthor_instance_id`) REFERENCES `winthor_instances`(`id`)
ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `automation_configurations`
ADD CONSTRAINT `automation_configurations_winthor_instance_id_fkey`
FOREIGN KEY (`winthor_instance_id`) REFERENCES `winthor_instances`(`id`)
ON DELETE CASCADE ON UPDATE CASCADE;
