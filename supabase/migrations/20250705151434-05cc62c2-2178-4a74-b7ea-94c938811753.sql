-- Create a secure admin user with hashed password
-- First, enable the pgcrypto extension for password hashing
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Insert the default admin user with a properly hashed password
INSERT INTO public.admins (username, name, password_hash) 
VALUES (
  'Maryland@library',
  'Library Administrator',
  crypt('Maryland_lib2025', gen_salt('bf'))
) ON CONFLICT (username) DO NOTHING;

-- Create a function to verify admin passwords
CREATE OR REPLACE FUNCTION verify_admin_password(input_username TEXT, input_password TEXT)
RETURNS TABLE(admin_id UUID, admin_name TEXT) AS $$
BEGIN
  RETURN QUERY
  SELECT a.id, a.name
  FROM public.admins a
  WHERE a.username = input_username 
    AND a.password_hash = crypt(input_password, a.password_hash);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;