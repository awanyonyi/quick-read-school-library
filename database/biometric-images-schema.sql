-- Biometric Images Storage Schema
-- Run this to create the biometric verification images table

CREATE TABLE biometric_verification_images (
  id VARCHAR(36) PRIMARY KEY,
  verification_log_id VARCHAR(36),
  student_id VARCHAR(36) NOT NULL,
  image_type VARCHAR(20) NOT NULL,
  image_data LONGBLOB NOT NULL,
  image_format VARCHAR(10) DEFAULT 'png',
  image_quality INT DEFAULT 90,
  capture_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  verification_status VARCHAR(20) DEFAULT 'pending',
  device_info TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes separately
CREATE INDEX idx_verification_log ON biometric_verification_images(verification_log_id);
CREATE INDEX idx_student_capture ON biometric_verification_images(student_id, capture_timestamp);
CREATE INDEX idx_image_type ON biometric_verification_images(image_type);
CREATE INDEX idx_verification_status ON biometric_verification_images(verification_status);

-- Add check constraints (if supported by your MySQL version)
-- ALTER TABLE biometric_verification_images
-- ADD CONSTRAINT chk_image_type CHECK (image_type IN ('fingerprint', 'face', 'verification'));

-- ALTER TABLE biometric_verification_images
-- ADD CONSTRAINT chk_verification_status CHECK (verification_status IN ('success', 'failed', 'pending'));

-- Add foreign key constraints (run after biometric_verification_logs table exists)
-- ALTER TABLE biometric_verification_images
-- ADD CONSTRAINT fk_verification_log
-- FOREIGN KEY (verification_log_id) REFERENCES biometric_verification_logs(id) ON DELETE SET NULL;

-- ALTER TABLE biometric_verification_images
-- ADD CONSTRAINT fk_student_biometric
-- FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE;