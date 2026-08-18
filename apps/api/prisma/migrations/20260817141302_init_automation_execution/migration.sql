-- CreateTable
CREATE TABLE `automation_runs` (
    `id` CHAR(36) NOT NULL,
    `automation_code` VARCHAR(50) NOT NULL,
    `deduplication_key` VARCHAR(150) NOT NULL,
    `status` ENUM('PENDING', 'RUNNING', 'SUCCEEDED', 'FAILED', 'CANCELLED') NOT NULL DEFAULT 'PENDING',
    `scheduled_at` DATETIME(3) NULL,
    `started_at` DATETIME(3) NULL,
    `finished_at` DATETIME(3) NULL,
    `error_code` VARCHAR(100) NULL,
    `error_message` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `automation_runs_deduplication_key_key`(`deduplication_key`),
    INDEX `automation_runs_automation_code_status_idx`(`automation_code`, `status`),
    INDEX `automation_runs_status_scheduled_at_idx`(`status`, `scheduled_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `automation_steps` (
    `id` CHAR(36) NOT NULL,
    `run_id` CHAR(36) NOT NULL,
    `code` VARCHAR(100) NOT NULL,
    `name` VARCHAR(150) NOT NULL,
    `sequence_number` INTEGER NOT NULL,
    `status` ENUM('PENDING', 'RUNNING', 'SUCCEEDED', 'FAILED', 'SKIPPED') NOT NULL DEFAULT 'PENDING',
    `payload` JSON NULL,
    `result` JSON NULL,
    `started_at` DATETIME(3) NULL,
    `finished_at` DATETIME(3) NULL,
    `error_code` VARCHAR(100) NULL,
    `error_message` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `automation_steps_run_id_status_idx`(`run_id`, `status`),
    UNIQUE INDEX `automation_steps_run_id_code_key`(`run_id`, `code`),
    UNIQUE INDEX `automation_steps_run_id_sequence_number_key`(`run_id`, `sequence_number`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `automation_steps` ADD CONSTRAINT `automation_steps_run_id_fkey` FOREIGN KEY (`run_id`) REFERENCES `automation_runs`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
