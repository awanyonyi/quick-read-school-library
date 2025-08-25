-- Enable RLS on all tables to fix security warnings
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.borrow_records ENABLE ROW LEVEL SECURITY; 
ALTER TABLE public.admins ENABLE ROW LEVEL SECURITY;