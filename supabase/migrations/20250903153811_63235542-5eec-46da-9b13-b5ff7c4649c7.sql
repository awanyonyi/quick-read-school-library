-- Fix critical security vulnerability: Remove public access to admin credentials
-- The current policy allows anyone to read admin usernames and password hashes

-- Drop the existing overly permissive policy
DROP POLICY IF EXISTS "Admins can view admin records" ON public.admins;

-- Create a secure policy that blocks all direct access to admin table
-- Admin authentication should only happen through the secure verify_admin_password function
CREATE POLICY "Block all direct admin table access" 
ON public.admins 
FOR ALL 
USING (false);

-- Add a comment explaining the security design
COMMENT ON TABLE public.admins IS 'Admin table access is restricted for security. Use verify_admin_password() function for authentication.';