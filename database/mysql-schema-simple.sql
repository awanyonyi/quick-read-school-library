-- MySQL Database Schema for School Library Management System
-- Run this script to create the database and tables

-- Create database (run this separately if needed)
-- CREATE DATABASE school_library;
-- USE school_library;

-- Students table
CREATE TABLE students (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  admission_number VARCHAR(50) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE,
  class VARCHAR(100),
  blacklisted BOOLEAN DEFAULT FALSE,
  blacklist_until DATETIME NULL,
  blacklist_reason TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Books table
CREATE TABLE books (
  id VARCHAR(36) PRIMARY KEY,
  title VARCHAR(500) NOT NULL,
  author VARCHAR(255) NOT NULL,
  isbn VARCHAR(20) UNIQUE,
  category VARCHAR(100),
  total_copies INT NOT NULL DEFAULT 1,
  available_copies INT NOT NULL DEFAULT 1,
  due_period_value INT DEFAULT 24,
  due_period_unit VARCHAR(20) DEFAULT 'hours',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Borrow records table
CREATE TABLE borrow_records (
  id VARCHAR(36) PRIMARY KEY,
  book_id VARCHAR(36) NOT NULL,
  student_id VARCHAR(36) NOT NULL,
  borrow_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  due_date TIMESTAMP NOT NULL,
  return_date TIMESTAMP NULL,
  status VARCHAR(20) DEFAULT 'borrowed',
  fine_amount DECIMAL(10,2) DEFAULT 0,
  fine_paid BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (book_id) REFERENCES books(id),
  FOREIGN KEY (student_id) REFERENCES students(id)
);

-- Biometric verification logs table
CREATE TABLE biometric_verification_logs (
  id VARCHAR(36) PRIMARY KEY,
  student_id VARCHAR(36) NOT NULL,
  book_id VARCHAR(36) NULL,
  verification_type VARCHAR(20) NOT NULL,
  verification_method VARCHAR(20) NOT NULL,
  verification_status VARCHAR(20) NOT NULL,
  verified_by VARCHAR(255),
  verification_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  borrow_record_id VARCHAR(36) NULL,
  additional_data TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (student_id) REFERENCES students(id),
  FOREIGN KEY (book_id) REFERENCES books(id),
  FOREIGN KEY (borrow_record_id) REFERENCES borrow_records(id)
);

-- User roles table
CREATE TABLE user_roles (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(100) UNIQUE NOT NULL,
  description TEXT,
  permissions TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- System settings table
CREATE TABLE system_settings (
  id VARCHAR(36) PRIMARY KEY,
  setting_key VARCHAR(255) UNIQUE NOT NULL,
  setting_value TEXT,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX idx_students_admission ON students(admission_number);
CREATE INDEX idx_students_email ON students(email);
CREATE INDEX idx_students_blacklisted ON students(blacklisted);

CREATE INDEX idx_books_title ON books(title);
CREATE INDEX idx_books_author ON books(author);
CREATE INDEX idx_books_isbn ON books(isbn);
CREATE INDEX idx_books_category ON books(category);

CREATE INDEX idx_borrow_book_id ON borrow_records(book_id);
CREATE INDEX idx_borrow_student_id ON borrow_records(student_id);
CREATE INDEX idx_borrow_status ON borrow_records(status);
CREATE INDEX idx_borrow_due_date ON borrow_records(due_date);

CREATE INDEX idx_biometric_student ON biometric_verification_logs(student_id);
CREATE INDEX idx_biometric_book ON biometric_verification_logs(book_id);
CREATE INDEX idx_biometric_type ON biometric_verification_logs(verification_type);
CREATE INDEX idx_biometric_status ON biometric_verification_logs(verification_status);

-- Insert default data
INSERT INTO system_settings (id, setting_key, setting_value, description) VALUES
(UUID(), 'library_name', '"Maryland School Library"', 'Name of the library'),
(UUID(), 'default_borrow_period', '{"value": 24, "unit": "hours"}', 'Default borrowing period'),
(UUID(), 'fine_per_day', '10.00', 'Fine amount per overdue day in KES'),
(UUID(), 'max_borrow_limit', '3', 'Maximum books a student can borrow'),
(UUID(), 'biometric_required', 'true', 'Whether biometric verification is required');

INSERT INTO user_roles (id, name, description, permissions) VALUES
(UUID(), 'admin', 'System Administrator', '{"all": true}'),
(UUID(), 'librarian', 'Library Staff', '{"manage_books": true, "manage_students": true, "issue_books": true, "return_books": true}'),
(UUID(), 'student', 'Student User', '{"borrow_books": true, "view_history": true}');