-- Existing environments are safely treated as local/on-premise until an
-- administrator explicitly configures another access strategy.
ALTER TABLE `winthor_instances`
    ADD COLUMN `hosting_type` ENUM('ON_PREMISE', 'TOTVS_CLOUD', 'OTHER') NOT NULL DEFAULT 'ON_PREMISE',
    ADD COLUMN `execution_mode` ENUM('LOCAL_WINDOWS', 'GO_GLOBAL', 'RDP', 'CITRIX', 'API') NOT NULL DEFAULT 'LOCAL_WINDOWS';

CREATE TABLE `winthor_access_profiles` (
    `id` CHAR(36) NOT NULL,
    `winthor_instance_id` CHAR(36) NOT NULL,
    `type` ENUM('LOCAL_WINDOWS', 'GO_GLOBAL', 'RDP', 'CITRIX', 'API') NOT NULL,
    `endpoint` VARCHAR(500) NULL,
    `application_name` VARCHAR(150) NULL,
    `username` VARCHAR(255) NULL,
    `secret_reference` VARCHAR(500) NULL,
    `enabled` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `winthor_access_profiles_winthor_instance_id_enabled_type_idx`(`winthor_instance_id`, `enabled`, `type`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `winthor_access_profiles`
    ADD CONSTRAINT `winthor_access_profiles_winthor_instance_id_fkey`
    FOREIGN KEY (`winthor_instance_id`) REFERENCES `winthor_instances`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE;
