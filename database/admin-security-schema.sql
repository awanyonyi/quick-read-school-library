-- Admin Security Enhancements for School Library Management System
-- This script adds secure admin authentication with password hashing

USE school_library;

-- Admin users table with secure password storage
CREATE TABLE IF NOT EXISTS admin_users (
  id VARCHAR(36) PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  salt VARCHAR(64) NOT NULL,
  role VARCHAR(20) DEFAULT 'admin',
  is_active TINYINT(1) DEFAULT 1,
  last_login TIMESTAMP NULL,
  login_attempts INT DEFAULT 0,
  locked_until TIMESTAMP NULL,
  password_changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default admin user with secure password
-- Default password: AdminSecure123! (hashed with bcrypt)
INSERT IGNORE INTO admin_users (
  id, username, email, password_hash, salt, role, is_active
) VALUES (
  'admin-default-1',
  'admin',
  'admin@school.edu',
  '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPjYLC7TkZK.',
  '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8',
  'admin',
  1
);