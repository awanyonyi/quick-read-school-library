-- Admin Security Enhancements for School Library Management System
-- This script adds secure admin authentication with password hashing and rate limiting

USE school_library;

-- Admin users table with secure password storage
CREATE TABLE IF NOT EXISTS admin_users (
  id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  username VARCHAR(50) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  salt VARCHAR(64) NOT NULL,
  role VARCHAR(20) DEFAULT 'admin' CHECK (role IN ('admin', 'librarian')),
  is_active BOOLEAN DEFAULT TRUE,
  last_login TIMESTAMP NULL,
  login_attempts INT DEFAULT 0,
  locked_until TIMESTAMP NULL,
  password_changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_username (username),
  INDEX idx_email (email),
  INDEX idx_is_active (is_active),
  INDEX idx_locked_until (locked_until)
);

-- Login attempts tracking for rate limiting
CREATE TABLE IF NOT EXISTS login_attempts (
  id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  username VARCHAR(50) NOT NULL,
  ip_address VARCHAR(45) NOT NULL,
  user_agent TEXT,
  attempt_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  success BOOLEAN DEFAULT FALSE,
  INDEX idx_username_time (username, attempt_time),
  INDEX idx_ip_time (ip_address, attempt_time)
);

-- Admin sessions table for secure session management
CREATE TABLE IF NOT EXISTS admin_sessions (
  id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  admin_id VARCHAR(36) NOT NULL,
  session_token VARCHAR(255) UNIQUE NOT NULL,
  ip_address VARCHAR(45) NOT NULL,
  user_agent TEXT,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (admin_id) REFERENCES admin_users(id) ON DELETE CASCADE,
  INDEX idx_session_token (session_token),
  INDEX idx_admin_id (admin_id),
  INDEX idx_expires_at (expires_at)
);

-- Security audit log
CREATE TABLE IF NOT EXISTS security_audit_log (
  id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  admin_id VARCHAR(36) NULL,
  action VARCHAR(100) NOT NULL,
  details JSON,
  ip_address VARCHAR(45) NOT NULL,
  user_agent TEXT,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (admin_id) REFERENCES admin_users(id) ON DELETE SET NULL,
  INDEX idx_action (action),
  INDEX idx_timestamp (timestamp),
  INDEX idx_admin_id (admin_id)
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
  TRUE
);

-- Insert security settings
-- System settings table
CREATE TABLE IF NOT EXISTS system_settings (
  id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  setting_key VARCHAR(255) UNIQUE NOT NULL,
  setting_value JSON,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_setting_key (setting_key)
);
INSERT IGNORE INTO system_settings (setting_key, setting_value, description) VALUES
('max_login_attempts', '5', 'Maximum login attempts before account lockout'),
('lockout_duration_minutes', '30', 'Account lockout duration in minutes'),
('session_timeout_hours', '8', 'Admin session timeout in hours'),
('password_min_length', '8', 'Minimum password length'),
('password_require_uppercase', 'true', 'Require uppercase letters in password'),
('password_require_lowercase', 'true', 'Require lowercase letters in password'),
('password_require_numbers', 'true', 'Require numbers in password'),
('password_require_special', 'true', 'Require special characters in password'),
('rate_limit_attempts', '10', 'Maximum login attempts per hour per IP'),
('rate_limit_window_minutes', '60', 'Rate limiting window in minutes');

-- Create triggers for automatic timestamps
DELIMITER //

CREATE TRIGGER update_admin_users_timestamp
BEFORE UPDATE ON admin_users
FOR EACH ROW
BEGIN
  SET NEW.updated_at = CURRENT_TIMESTAMP;
END;
//

CREATE TRIGGER update_admin_sessions_timestamp
BEFORE UPDATE ON admin_sessions
FOR EACH ROW
BEGIN
  SET NEW.updated_at = CURRENT_TIMESTAMP;
END;
//

-- Procedure to clean up expired sessions
CREATE PROCEDURE cleanup_expired_sessions()
BEGIN
  DELETE FROM admin_sessions WHERE expires_at < CURRENT_TIMESTAMP;
END;
//

-- Procedure to unlock accounts after lockout period
CREATE PROCEDURE unlock_expired_accounts()
BEGIN
  UPDATE admin_users
  SET login_attempts = 0, locked_until = NULL
  WHERE locked_until IS NOT NULL AND locked_until < CURRENT_TIMESTAMP;
END;
//

-- Procedure to clean up old login attempts (keep last 24 hours)
CREATE PROCEDURE cleanup_old_login_attempts()
BEGIN
  DELETE FROM login_attempts WHERE attempt_time < DATE_SUB(NOW(), INTERVAL 24 HOUR);
END;
//

DELIMITER ;

-- Create event to run cleanup procedures hourly
-- Uncomment these lines if you want automatic cleanup
-- CREATE EVENT hourly_security_cleanup
-- ON SCHEDULE EVERY 1 HOUR STARTS NOW()
-- DO
-- BEGIN
--   CALL cleanup_expired_sessions();
--   CALL unlock_expired_accounts();
--   CALL cleanup_old_login_attempts();
-- END;

-- Enable event scheduler (uncomment if needed)
-- SET GLOBAL event_scheduler = ON;