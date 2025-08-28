-- Update admin password directly
UPDATE public.admins 
SET password_hash = extensions.crypt('@Allanware321@', extensions.gen_salt('bf'))
WHERE username = 'admin';