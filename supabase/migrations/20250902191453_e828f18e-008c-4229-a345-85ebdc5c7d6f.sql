-- Create function to store biometric template as Base64
CREATE OR REPLACE FUNCTION public.store_biometric_template(
  student_id_param UUID,
  template_data TEXT,
  biometric_type TEXT DEFAULT 'fingerprint'
)
RETURNS TABLE(success BOOLEAN, message TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
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
$$;

-- Create function to verify biometric template
CREATE OR REPLACE FUNCTION public.verify_biometric_template(
  template_data TEXT,
  biometric_type TEXT DEFAULT 'fingerprint'
)
RETURNS TABLE(
  success BOOLEAN, 
  student_id UUID, 
  student_name TEXT,
  admission_number TEXT,
  message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
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
$$;