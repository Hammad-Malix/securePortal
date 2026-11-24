CREATE DATABASE IF NOT EXISTS aegis_secure_portal;
USE aegis_secure_portal;

-- 1. ROLES TABLE (Role-Based Access Control - RBAC)
CREATE TABLE roles (
    role_id INT AUTO_INCREMENT PRIMARY KEY,
    role_name VARCHAR(30) UNIQUE NOT NULL, -- 'SUPER_ADMIN', 'MANAGER', 'STAFF'
    description VARCHAR(255) NOT NULL
);

INSERT INTO roles (role_name, description) VALUES
('SUPER_ADMIN', 'Full system access, user management, and security audit inspection'),
('MANAGER', 'Department oversight, record approval (Separation of Duties), and audit view'),
('STAFF', 'Create records and view personal submissions (Least Privilege & Need-to-Know)')
ON DUPLICATE KEY UPDATE description = VALUES(description);

-- 2. USERS TABLE (Authentication, MFA & Account Lockout)
CREATE TABLE users (
    user_id INT AUTO_INCREMENT PRIMARY KEY,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(120) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    department VARCHAR(100) NOT NULL DEFAULT 'General',
    role_id INT NOT NULL,
    mfa_enabled BOOLEAN DEFAULT TRUE,
    failed_attempts INT DEFAULT 0,
    is_locked BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (role_id) REFERENCES roles(role_id)
);

-- 3. SECURE RECORDS TABLE (Confidentiality, Integrity & Separation of Duties)
CREATE TABLE records (
    record_id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(150) NOT NULL,
    classification ENUM('INTERNAL', 'CONFIDENTIAL', 'SECRET', 'TOP_SECRET') DEFAULT 'CONFIDENTIAL',
    amount DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    details TEXT NULL,
    integrity_hash CHAR(64) NULL,
    status ENUM('PENDING', 'APPROVED', 'REJECTED') DEFAULT 'PENDING',
    created_by INT NOT NULL,
    approved_by INT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(user_id),
    FOREIGN KEY (approved_by) REFERENCES users(user_id)
);

-- 4. APPEND-ONLY AUDIT LOGS TABLE (Accountability, Non-Repudiation & Hash Chaining)
CREATE TABLE audit_logs (
    log_id INT AUTO_INCREMENT PRIMARY KEY,
    actor_email VARCHAR(120) NOT NULL,
    actor_role VARCHAR(30) NOT NULL,
    action_type VARCHAR(60) NOT NULL,
    target_resource VARCHAR(150) NOT NULL,
    details TEXT NULL,
    ip_address VARCHAR(45) NOT NULL,
    status ENUM('SUCCESS', 'BLOCKED', 'ALERT') NOT NULL,
    prev_hash VARCHAR(64) NOT NULL,
    current_hash VARCHAR(64) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Initial Genesis Audit Log Entry
INSERT INTO audit_logs (actor_email, actor_role, action_type, target_resource, ip_address, status, prev_hash, current_hash)
VALUES (
    'system@aegis.local',
    'SYSTEM',
    'GENESIS_BLOCK_INIT',
    'audit_logs_ledger',
    '127.0.0.1',
    'SUCCESS',
    '0000000000000000000000000000000000000000000000000000000000000000',
    SHA2('0000000000000000000000000000000000000000000000000000000000000000|system@aegis.local|SYSTEM|GENESIS_BLOCK_INIT|audit_logs_ledger|SUCCESS', 256)
);