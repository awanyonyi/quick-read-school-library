-- MySQL Database Schema for School Library Management System
-- Run this script to create the database and tables

-- Create database
CREATE DATABASE school_library;
USE school_library;

-- Students table
CREATE TABLE students (
  id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  name VARCHAR(255) NOT NULL,
  admission_number VARCHAR(50) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE,
  class VARCHAR(100),
  blacklisted BOOLEAN DEFAULT FALSE,
  blacklist_until DATETIME NULL,
  blacklist_reason TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_admission_number (admission_number),
  INDEX idx_email (email),
  INDEX idx_blacklisted (blacklisted)
);

-- Books table
CREATE TABLE books (
  id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  title VARCHAR(500) NOT NULL,
  author VARCHAR(255) NOT NULL,
  isbn VARCHAR(20) UNIQUE,
  category VARCHAR(100),
  total_copies INT NOT NULL DEFAULT 1,
  available_copies INT NOT NULL DEFAULT 1,
  due_period_value INT DEFAULT 24,
  due_period_unit VARCHAR(20) DEFAULT 'hours' CHECK (due_period_unit IN ('hours', 'days', 'weeks', 'months', 'years')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_title (title),
  INDEX idx_author (author),
  INDEX idx_isbn (isbn),
  INDEX idx_category (category),
  INDEX idx_available_copies (available_copies),
  CONSTRAINT chk_available_copies CHECK (available_copies >= 0)
);

-- Borrow records table
CREATE TABLE borrow_records (
  id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  book_id VARCHAR(36) NOT NULL,
  student_id VARCHAR(36) NOT NULL,
  borrow_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  due_date TIMESTAMP NOT NULL,
  return_date TIMESTAMP NULL,
  status VARCHAR(20) DEFAULT 'borrowed' CHECK (status IN ('borrowed', 'returned', 'overdue')),
  fine_amount DECIMAL(10,2) DEFAULT 0,
  fine_paid BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE,
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
  INDEX idx_book_id (book_id),
  INDEX idx_student_id (student_id),
  INDEX idx_status (status),
  INDEX idx_due_date (due_date),
  INDEX idx_borrow_date (borrow_date)
);

-- Biometric verification logs table
CREATE TABLE biometric_verification_logs (
  id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  student_id VARCHAR(36) NOT NULL,
  book_id VARCHAR(36) NULL,
  verification_type VARCHAR(20) NOT NULL CHECK (verification_type IN ('book_issue', 'book_return', 'enrollment', 'verification')),
  verification_method VARCHAR(20) NOT NULL CHECK (verification_method IN ('fingerprint', 'face', 'card')),
  verification_status VARCHAR(20) NOT NULL CHECK (verification_status IN ('success', 'failed')),
  verified_by VARCHAR(255),
  verification_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  borrow_record_id VARCHAR(36) NULL,
  additional_data JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
  FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE SET NULL,
  FOREIGN KEY (borrow_record_id) REFERENCES borrow_records(id) ON DELETE SET NULL,
  INDEX idx_student_id (student_id),
  INDEX idx_book_id (book_id),
  INDEX idx_verification_type (verification_type),
  INDEX idx_verification_status (verification_status),
  INDEX idx_verification_timestamp (verification_timestamp),
  INDEX idx_borrow_record (borrow_record_id)
);

-- User roles and permissions (for future admin features)
CREATE TABLE user_roles (
  id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  name VARCHAR(100) UNIQUE NOT NULL,
  description TEXT,
  permissions JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- System settings table
CREATE TABLE system_settings (
  id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  setting_key VARCHAR(255) UNIQUE NOT NULL,
  setting_value JSON,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_setting_key (setting_key)
);

-- Insert default system settings
INSERT IGNORE INTO system_settings (setting_key, setting_value, description) VALUES
('library_name', '"Maryland School Library"', 'Name of the library'),
('default_borrow_period', '{"value": 24, "unit": "hours"}', 'Default borrowing period'),
('fine_per_day', '10.00', 'Fine amount per overdue day in KES'),
('max_borrow_limit', '3', 'Maximum books a student can borrow'),
('biometric_required', 'true', 'Whether biometric verification is required');

-- Insert default user roles
INSERT IGNORE INTO user_roles (name, description, permissions) VALUES
('admin', 'System Administrator', '{"all": true}'),
('librarian', 'Library Staff', '{"manage_books": true, "manage_students": true, "issue_books": true, "return_books": true}'),
('student', 'Student User', '{"borrow_books": true, "view_history": true}');

-- Create triggers for automatic timestamps
DELIMITER //

CREATE TRIGGER update_students_timestamp
BEFORE UPDATE ON students
FOR EACH ROW
BEGIN
  SET NEW.updated_at = CURRENT_TIMESTAMP;
END;
//

CREATE TRIGGER update_books_timestamp
BEFORE UPDATE ON books
FOR EACH ROW
BEGIN
  SET NEW.updated_at = CURRENT_TIMESTAMP;
END;
//

CREATE TRIGGER update_borrow_records_timestamp
BEFORE UPDATE ON borrow_records
FOR EACH ROW
BEGIN
  SET NEW.updated_at = CURRENT_TIMESTAMP;
END;
//

CREATE TRIGGER update_biometric_logs_timestamp
BEFORE UPDATE ON biometric_verification_logs
FOR EACH ROW
BEGIN
  SET NEW.updated_at = CURRENT_TIMESTAMP;
END;
//

DELIMITER ;

-- Create triggers for stock control
DELIMITER //

CREATE TRIGGER before_borrow_check_stock
BEFORE INSERT ON borrow_records
FOR EACH ROW
BEGIN
  IF NEW.status = 'borrowed' THEN
    DECLARE avail INT;
    SELECT available_copies INTO avail FROM books WHERE id = NEW.book_id;
    IF avail <= 0 THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'No available copies for this book';
    END IF;
    UPDATE books SET available_copies = available_copies - 1 WHERE id = NEW.book_id;
  END IF;
END;
//

CREATE TRIGGER after_borrow_return_stock
AFTER UPDATE ON borrow_records
FOR EACH ROW
BEGIN
  IF OLD.status != 'returned' AND NEW.status = 'returned' THEN
    UPDATE books SET available_copies = available_copies + 1 WHERE id = NEW.book_id;
  END IF;
END;
//

DELIMITER ;

-- Create stored procedure for auto-blacklisting overdue students
DELIMITER //

CREATE PROCEDURE auto_blacklist_overdue_students()
BEGIN
  -- Update students who have overdue books
  UPDATE students
  SET
    blacklisted = TRUE,
    blacklist_until = DATE_ADD(CURRENT_DATE, INTERVAL 7 DAY),
    blacklist_reason = 'Automatic blacklist due to overdue books'
  WHERE id IN (
    SELECT DISTINCT br.student_id
    FROM borrow_records br
    WHERE br.status = 'borrowed'
    AND br.due_date < CURRENT_TIMESTAMP
    AND br.student_id NOT IN (
      SELECT id FROM students WHERE blacklisted = TRUE
    )
  );

  -- Update borrow records status to overdue
  UPDATE borrow_records
  SET status = 'overdue'
  WHERE status = 'borrowed'
  AND due_date < CURRENT_TIMESTAMP;
END;
//

DELIMITER ;

-- Create event to run auto-blacklist procedure daily
-- CREATE EVENT daily_auto_blacklist
-- ON SCHEDULE EVERY 1 DAY STARTS '2024-01-01 00:00:00'
-- DO CALL auto_blacklist_overdue_students();

-- Enable event scheduler
-- SET GLOBAL event_scheduler = ON;