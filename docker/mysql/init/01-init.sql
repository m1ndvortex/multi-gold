-- Initialize database for jewelry SaaS platform
-- This script runs when MySQL container starts for the first time

-- Create database if not exists
CREATE DATABASE IF NOT EXISTS jewelry_saas CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Use the database
USE jewelry_saas;

-- Create user if not exists
CREATE USER IF NOT EXISTS 'jewelry_user'@'%' IDENTIFIED BY 'jewelry_password';

-- Grant privileges
GRANT ALL PRIVILEGES ON jewelry_saas.* TO 'jewelry_user'@'%';

-- Flush privileges
FLUSH PRIVILEGES;

-- Set timezone
SET time_zone = '+00:00';