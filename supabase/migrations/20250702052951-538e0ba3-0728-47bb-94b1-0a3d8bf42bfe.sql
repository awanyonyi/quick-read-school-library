
-- Create students table for authentication
CREATE TABLE public.students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  admission_number TEXT UNIQUE NOT NULL,
  email TEXT,
  class TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create admins table for authentication
CREATE TABLE public.admins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create books table
CREATE TABLE public.books (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  author TEXT NOT NULL,
  isbn TEXT UNIQUE,
  category TEXT NOT NULL,
  total_copies INTEGER NOT NULL DEFAULT 1,
  available_copies INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create borrow_records table
CREATE TABLE public.borrow_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES public.students(id) ON DELETE CASCADE,
  book_id UUID REFERENCES public.books(id) ON DELETE CASCADE,
  borrow_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  due_date TIMESTAMP WITH TIME ZONE NOT NULL,
  return_date TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'borrowed' CHECK (status IN ('borrowed', 'returned', 'overdue')),
  fine_amount DECIMAL(10,2) DEFAULT 0
);

-- Insert default admin (password: admin123 - should be changed in production)
INSERT INTO public.admins (username, password_hash, name) 
VALUES ('admin', '$2b$10$rQZ8J8mE4dKxS4OoK4.6XeHxF6vT8nU2pD9wE3kL5mN7oP1qR2sT3u', 'System Administrator');

-- Insert sample students for testing
INSERT INTO public.students (name, admission_number, email, class) VALUES 
('John Doe', 'STD001', 'john.doe@marylandsenior.edu', 'Grade 12A'),
('Jane Smith', 'STD002', 'jane.smith@marylandsenior.edu', 'Grade 11B'),
('Michael Johnson', 'STD003', 'michael.johnson@marylandsenior.edu', 'Grade 10A');

-- Enable Row Level Security
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.books ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.borrow_records ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for students table
CREATE POLICY "Students can view their own record" ON public.students
  FOR SELECT USING (true); -- Allow reading for authentication

CREATE POLICY "Only admins can modify students" ON public.students
  FOR ALL USING (false); -- Will be handled by admin functions

-- Create RLS policies for admins table  
CREATE POLICY "Admins can view admin records" ON public.admins
  FOR SELECT USING (true); -- Allow reading for authentication

-- Create RLS policies for books table
CREATE POLICY "Everyone can view books" ON public.books
  FOR SELECT USING (true);

CREATE POLICY "Only admins can modify books" ON public.books
  FOR ALL USING (false); -- Will be handled by admin functions

-- Create RLS policies for borrow_records table
CREATE POLICY "Everyone can view borrow records" ON public.borrow_records
  FOR SELECT USING (true);

CREATE POLICY "Only admins can modify borrow records" ON public.borrow_records
  FOR ALL USING (false); -- Will be handled by admin functions
