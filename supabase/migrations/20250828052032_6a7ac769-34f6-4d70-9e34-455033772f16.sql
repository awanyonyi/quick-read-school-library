-- Enable RLS on all tables and fix security issues
ALTER TABLE public.admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.books ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.borrow_records ENABLE ROW LEVEL SECURITY;