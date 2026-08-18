-- Existing development runs are attached to a legacy instance so this migration
-- can be applied without discarding test history.
CREATE TABLE `companies` (
    `id` CHAR(36) NOT NULL,
    `name` VARCHAR(150) NOT NULL,
    `document` VARCHAR(30) NULL,
    `active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    INDEX `companies_active_name_idx`(`active`, `name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `winthor_instances` (
    `id` CHAR(36) NOT NULL,
    `company_id` CHAR(36) NOT NULL,
    `name` VARCHAR(150) NOT NULL,
    `active` BOOLEAN NOT NULL DEFAULT true,
    `time_zone` VARCHAR(100) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    INDEX `winthor_instances_active_idx`(`active`),
    UNIQUE INDEX `winthor_instances_company_id_name_key`(`company_id`, `name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `agents` (
    `id` CHAR(36) NOT NULL,
    `winthor_instance_id` CHAR(36) NOT NULL,
    `name` VARCHAR(150) NOT NULL,
    `hostname` VARCHAR(255) NOT NULL,
    `version` VARCHAR(50) NULL,
    `status` ENUM('ONLINE', 'OFFLINE', 'DISABLED') NOT NULL DEFAULT 'OFFLINE',
    `last_seen_at` DATETIME(3) NULL,
    `registered_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `enabled` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    INDEX `agents_winthor_instance_id_enabled_idx`(`winthor_instance_id`, `enabled`),
    INDEX `agents_last_seen_at_idx`(`last_seen_at`),
    UNIQUE INDEX `agents_winthor_instance_id_hostname_key`(`winthor_instance_id`, `hostname`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `agent_credentials` (
    `id` CHAR(36) NOT NULL,
    `agent_id` CHAR(36) NOT NULL,
    `token_hash` CHAR(64) NOT NULL,
    `active` BOOLEAN NOT NULL DEFAULT true,
    `last_used_at` DATETIME(3) NULL,
    `expires_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    UNIQUE INDEX `agent_credentials_token_hash_key`(`token_hash`),
    INDEX `agent_credentials_agent_id_active_idx`(`agent_id`, `active`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `automation_schedules` (
    `id` CHAR(36) NOT NULL,
    `winthor_instance_id` CHAR(36) NOT NULL,
    `automation_code` VARCHAR(50) NOT NULL,
    `name` VARCHAR(150) NOT NULL,
    `enabled` BOOLEAN NOT NULL DEFAULT true,
    `time_zone` VARCHAR(100) NOT NULL,
    `cron_expression` VARCHAR(100) NOT NULL,
    `next_run_at` DATETIME(3) NOT NULL,
    `last_run_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    INDEX `automation_schedules_enabled_next_run_at_idx`(`enabled`, `next_run_at`),
    INDEX `automation_schedules_winthor_instance_id_enabled_idx`(`winthor_instance_id`, `enabled`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

INSERT INTO `companies` (`id`, `name`, `active`, `updated_at`)
VALUES ('00000000-0000-4000-8000-000000000001', 'Dados legados', true, CURRENT_TIMESTAMP(3));

INSERT INTO `winthor_instances` (`id`, `company_id`, `name`, `active`, `time_zone`, `updated_at`)
VALUES ('00000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-000000000001', 'WinThor legado', true, 'America/Sao_Paulo', CURRENT_TIMESTAMP(3));

ALTER TABLE `automation_runs`
    ADD COLUMN `winthor_instance_id` CHAR(36) NULL,
    ADD COLUMN `schedule_id` CHAR(36) NULL,
    CHANGE COLUMN `scheduled_at` `scheduled_for` DATETIME(3) NULL,
    MODIFY COLUMN `deduplication_key` VARCHAR(255) NOT NULL;

UPDATE `automation_runs`
SET `winthor_instance_id` = '00000000-0000-4000-8000-000000000002'
WHERE `winthor_instance_id` IS NULL;

ALTER TABLE `automation_runs`
    MODIFY COLUMN `winthor_instance_id` CHAR(36) NOT NULL,
    DROP INDEX `automation_runs_automation_code_status_idx`,
    DROP INDEX `automation_runs_status_scheduled_at_idx`,
    ADD INDEX `automation_runs_winthor_instance_id_status_idx`(`winthor_instance_id`, `status`),
    ADD INDEX `automation_runs_schedule_id_scheduled_for_idx`(`schedule_id`, `scheduled_for`),
    ADD INDEX `automation_runs_status_scheduled_for_idx`(`status`, `scheduled_for`);

-- Old ad-hoc agent identifiers cannot be safely converted into authenticated
-- Agent foreign keys. Expired/in-flight test claims are released deliberately.
UPDATE `automation_steps`
SET `status` = 'PENDING',
    `claimed_by_agent_id` = NULL,
    `claim_token` = NULL,
    `claimed_at` = NULL,
    `lease_expires_at` = NULL,
    `started_at` = NULL
WHERE `claim_token` IS NOT NULL;

ALTER TABLE `automation_steps`
    MODIFY COLUMN `claimed_by_agent_id` CHAR(36) NULL,
    ADD INDEX `automation_steps_claimed_by_agent_id_status_idx`(`claimed_by_agent_id`, `status`);

ALTER TABLE `winthor_instances` ADD CONSTRAINT `winthor_instances_company_id_fkey`
    FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `agents` ADD CONSTRAINT `agents_winthor_instance_id_fkey`
    FOREIGN KEY (`winthor_instance_id`) REFERENCES `winthor_instances`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `agent_credentials` ADD CONSTRAINT `agent_credentials_agent_id_fkey`
    FOREIGN KEY (`agent_id`) REFERENCES `agents`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `automation_schedules` ADD CONSTRAINT `automation_schedules_winthor_instance_id_fkey`
    FOREIGN KEY (`winthor_instance_id`) REFERENCES `winthor_instances`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `automation_runs` ADD CONSTRAINT `automation_runs_winthor_instance_id_fkey`
    FOREIGN KEY (`winthor_instance_id`) REFERENCES `winthor_instances`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `automation_runs` ADD CONSTRAINT `automation_runs_schedule_id_fkey`
    FOREIGN KEY (`schedule_id`) REFERENCES `automation_schedules`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `automation_steps` ADD CONSTRAINT `automation_steps_claimed_by_agent_id_fkey`
    FOREIGN KEY (`claimed_by_agent_id`) REFERENCES `agents`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
