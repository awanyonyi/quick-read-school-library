-- Add biometric columns to existing students table
-- Run this if you already have the database created

ALTER TABLE students ADD biometric_enrolled BOOLEAN DEFAULT FALSE;
ALTER TABLE students ADD biometric_id VARCHAR(255);
ALTER TABLE students ADD CONSTRAINT uk_biometric_id UNIQUE (biometric_id);
ALTER TABLE students ADD biometric_data TEXT;

-- Add index for biometric_id for better performance
CREATE INDEX idx_students_biometric_id ON students(biometric_id);
CREATE INDEX idx_students_biometric_enrolled ON students(biometric_enrolled);