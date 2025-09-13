-- Create biometric verification logs table
CREATE TABLE biometric_verification_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  book_id UUID REFERENCES books(id) ON DELETE SET NULL,
  verification_type TEXT NOT NULL CHECK (verification_type IN ('book_issue', 'book_return', 'enrollment', 'verification')),
  verification_method TEXT NOT NULL CHECK (verification_method IN ('fingerprint', 'face', 'card')),
  verification_status TEXT NOT NULL CHECK (verification_status IN ('success', 'failed')),
  verified_by TEXT,
  verification_timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  borrow_record_id UUID REFERENCES borrow_records(id) ON DELETE SET NULL,
  additional_data JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_biometric_logs_student_id ON biometric_verification_logs(student_id);
CREATE INDEX idx_biometric_logs_book_id ON biometric_verification_logs(book_id);
CREATE INDEX idx_biometric_logs_verification_type ON biometric_verification_logs(verification_type);
CREATE INDEX idx_biometric_logs_verification_status ON biometric_verification_logs(verification_status);
CREATE INDEX idx_biometric_logs_timestamp ON biometric_verification_logs(verification_timestamp);
CREATE INDEX idx_biometric_logs_borrow_record ON biometric_verification_logs(borrow_record_id);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_biometric_verification_logs_updated_at
  BEFORE UPDATE ON biometric_verification_logs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add RLS (Row Level Security) policies
ALTER TABLE biometric_verification_logs ENABLE ROW LEVEL SECURITY;

-- Policy to allow authenticated users to read verification logs
CREATE POLICY "Allow authenticated users to read biometric logs"
  ON biometric_verification_logs
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy to allow authenticated users to insert verification logs
CREATE POLICY "Allow authenticated users to insert biometric logs"
  ON biometric_verification_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Add comments for documentation
COMMENT ON TABLE biometric_verification_logs IS 'Logs all biometric verification events in the library system';
COMMENT ON COLUMN biometric_verification_logs.student_id IS 'Reference to the student who was verified';
COMMENT ON COLUMN biometric_verification_logs.book_id IS 'Reference to the book involved (if applicable)';
COMMENT ON COLUMN biometric_verification_logs.verification_type IS 'Type of verification event (book_issue, book_return, enrollment, verification)';
COMMENT ON COLUMN biometric_verification_logs.verification_method IS 'Method used for verification (fingerprint, face, card)';
COMMENT ON COLUMN biometric_verification_logs.verification_status IS 'Result of the verification (success, failed)';
COMMENT ON COLUMN biometric_verification_logs.verified_by IS 'User/system that performed the verification';
COMMENT ON COLUMN biometric_verification_logs.additional_data IS 'Additional context data in JSON format';