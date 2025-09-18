-- Add biometric columns to existing students table
-- Run this if you already have the database created

-- Basic biometric columns
ALTER TABLE students ADD COLUMN biometric_enrolled BOOLEAN DEFAULT FALSE;
ALTER TABLE students ADD COLUMN biometric_id VARCHAR(255);
ALTER TABLE students ADD COLUMN biometric_data TEXT;

-- Add unique constraint for biometric_id
ALTER TABLE students ADD CONSTRAINT uk_biometric_id UNIQUE (biometric_id);

-- Add biometric image storage columns
ALTER TABLE students ADD COLUMN biometric_fingerprint_image LONGBLOB;
ALTER TABLE students ADD COLUMN biometric_face_image LONGBLOB;
ALTER TABLE students ADD COLUMN biometric_image_format VARCHAR(10) DEFAULT 'png';
ALTER TABLE students ADD COLUMN biometric_image_quality INT DEFAULT 90;
ALTER TABLE students ADD COLUMN biometric_last_capture TIMESTAMP NULL;

-- Add indexes for better performance
CREATE INDEX idx_students_biometric_id ON students(biometric_id);
CREATE INDEX idx_students_biometric_enrolled ON students(biometric_enrolled);
CREATE INDEX idx_students_biometric_last_capture ON students(biometric_last_capture);