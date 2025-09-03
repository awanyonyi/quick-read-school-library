-- Fix critical RLS issues detected by security linter

-- Enable RLS on all tables that need it
ALTER TABLE public.admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.books ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.borrow_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.library_settings ENABLE ROW LEVEL SECURITY;

-- Fix function search paths for security definer functions
CREATE OR REPLACE FUNCTION public.auto_blacklist_overdue_students()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.store_biometric_template(student_id_param uuid, template_data text, biometric_type text DEFAULT 'fingerprint'::text)
RETURNS TABLE(success boolean, message text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  -- Update student with biometric template
  UPDATE public.students 
  SET 
    biometric_enrolled = TRUE,
    biometric_data = jsonb_build_object(
      'template', template_data,
      'type', biometric_type,
      'enrolled_at', NOW()
    ),
    biometric_id = 'bio_' || student_id_param::text
  WHERE id = student_id_param;
  
  IF FOUND THEN
    RETURN QUERY SELECT TRUE, 'Biometric template stored successfully'::TEXT;
  ELSE
    RETURN QUERY SELECT FALSE, 'Student not found'::TEXT;
  END IF;
END;
$function$;

CREATE OR REPLACE FUNCTION public.verify_biometric_template(template_data text, biometric_type text DEFAULT 'fingerprint'::text)
RETURNS TABLE(success boolean, student_id uuid, student_name text, admission_number text, message text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  matching_student RECORD;
  stored_template TEXT;
BEGIN
  -- Find student with matching biometric template
  -- Note: In a real implementation, this would use proper biometric matching algorithms
  -- For now, we'll do a simple string comparison
  
  FOR matching_student IN 
    SELECT s.id, s.name, s.admission_number, s.biometric_data
    FROM public.students s
    WHERE s.biometric_enrolled = TRUE 
    AND s.biometric_data->>'type' = biometric_type
  LOOP
    stored_template := matching_student.biometric_data->>'template';
    
    -- Simple template matching (in production, use proper biometric SDK)
    IF stored_template = template_data THEN
      RETURN QUERY SELECT 
        TRUE, 
        matching_student.id, 
        matching_student.name,
        matching_student.admission_number,
        'Biometric verification successful'::TEXT;
      RETURN;
    END IF;
  END LOOP;
  
  -- No match found
  RETURN QUERY SELECT 
    FALSE, 
    NULL::UUID, 
    NULL::TEXT,
    NULL::TEXT,
    'Biometric verification failed - no matching template found'::TEXT;
END;
$function$;