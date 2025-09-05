--Blacklist functionality
ALTER TABLE public.students 
ADD COLUMN blacklisted BOOLEAN DEFAULT FALSE,
ADD COLUMN blacklist_until TIMESTAMP WITH TIME ZONE,
ADD COLUMN blacklist_reason TEXT;

-- Add flexible due period settings to books table
ALTER TABLE public.books 
ADD COLUMN due_period_value INTEGER DEFAULT 24,
ADD COLUMN due_period_unit TEXT DEFAULT 'hours' CHECK (due_period_unit IN ('hours', 'days', 'weeks', 'months', 'years'));

--Library settings table for default configurations
CREATE TABLE public.library_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key TEXT UNIQUE NOT NULL,
  setting_value TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on library_settings
ALTER TABLE public.library_settings ENABLE ROW LEVEL SECURITY;

--Policy for library_settings (admins only)
CREATE POLICY "Only admins can manage library settings" 
ON public.library_settings 
FOR ALL 
USING (false);

-- Insert default settings
INSERT INTO public.library_settings (setting_key, setting_value) VALUES 
('default_due_period_value', '24'),
('default_due_period_unit', 'hours'),
('blacklist_duration_days', '14');

--Function to automatically blacklist overdue students
CREATE OR REPLACE FUNCTION public.auto_blacklist_overdue_students()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Update students who have overdue books and aren't already blacklisted
  UPDATE public.students 
  SET 
    blacklisted = TRUE,
    blacklist_until = NOW() + INTERVAL '14 days',
    blacklist_reason = 'Automatic blacklist - book overdue'
  WHERE id IN (
    SELECT DISTINCT br.student_id 
    FROM public.borrow_records br
    WHERE br.status = 'borrowed' 
    AND br.due_date < NOW()
    AND br.student_id NOT IN (
      SELECT s.id FROM public.students s WHERE s.blacklisted = TRUE
    )
  );
END;
$$;