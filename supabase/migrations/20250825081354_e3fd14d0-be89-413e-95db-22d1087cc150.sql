-- Enable pgcrypto extension for password hashing functions
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Recreate the change_admin_password function with proper dependencies
CREATE OR REPLACE FUNCTION public.change_admin_password(admin_username text, current_password text, new_password text)
RETURNS TABLE(success boolean, message text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Verify current password
  IF NOT EXISTS (
    SELECT 1 FROM public.admins 
    WHERE username = admin_username 
    AND password_hash = crypt(current_password, password_hash)
  ) THEN
    RETURN QUERY SELECT false, 'Current password is incorrect'::text;
    RETURN;
  END IF;

  -- Validate new password length
  IF LENGTH(new_password) < 6 THEN
    RETURN QUERY SELECT false, 'New password must be at least 6 characters long'::text;
    RETURN;
  END IF;

  -- Update password with new hash
  UPDATE public.admins 
  SET password_hash = crypt(new_password, gen_salt('bf'))
  WHERE username = admin_username;

  RETURN QUERY SELECT true, 'Password changed successfully'::text;
END;
$$;

-- Recreate the verify_admin_password function with proper dependencies
CREATE OR REPLACE FUNCTION public.verify_admin_password(input_username text, input_password text)
RETURNS TABLE(admin_id uuid, admin_name text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT a.id, a.name
  FROM public.admins a
  WHERE a.username = input_username 
    AND a.password_hash = crypt(input_password, a.password_hash);
END;
$$;