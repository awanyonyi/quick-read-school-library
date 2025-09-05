
ALTER TABLE public.students ADD COLUMN biometric_enrolled BOOLEAN DEFAULT FALSE;
ALTER TABLE public.students ADD COLUMN biometric_id TEXT;
ALTER TABLE public.students ADD COLUMN biometric_data JSONB;

-- index for faster biometric lookups
CREATE INDEX idx_students_biometric_id ON public.students(biometric_id);

-- Add a unique constraint for biometric_id when it's not null
CREATE UNIQUE INDEX idx_students_biometric_id_unique 
ON public.students(biometric_id) 
WHERE biometric_id IS NOT NULL;