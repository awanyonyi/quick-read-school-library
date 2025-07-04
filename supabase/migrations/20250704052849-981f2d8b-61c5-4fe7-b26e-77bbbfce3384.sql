-- Drop the existing restrictive policy
DROP POLICY "Only admins can modify students" ON public.students;

-- Create a new policy that allows authenticated users to insert students
-- This assumes you're logged in as an admin when doing bulk uploads
CREATE POLICY "Authenticated users can insert students" ON public.students
FOR INSERT 
TO authenticated
WITH CHECK (true);

-- Create a policy to allow authenticated users to update students
CREATE POLICY "Authenticated users can update students" ON public.students
FOR UPDATE 
TO authenticated
USING (true);

-- Create a policy to allow authenticated users to delete students  
CREATE POLICY "Authenticated users can delete students" ON public.students
FOR DELETE 
TO authenticated
USING (true);