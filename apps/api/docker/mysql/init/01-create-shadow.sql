CREATE DATABASE IF NOT EXISTS `winaut_shadow`
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_0900_ai_ci;

GRANT ALL PRIVILEGES
    ON `winaut_shadow`.*
    TO 'winaut_db'@'%';

FLUSH PRIVILEGES;