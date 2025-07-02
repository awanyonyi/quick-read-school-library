
export interface Book {
  id: string;
  title: string;
  author: string;
  isbn: string;
  category: 'Science' | 'Language' | 'Technicals and Applied' | 'Humanities' | 'Maths';
  total_copies: number;
  available_copies: number;
  created_at: string;
}

export interface Student {
  id: string;
  name: string;
  admission_number: string;
  email: string;
  class: string;
  created_at: string;
}

export interface BorrowRecord {
  id: string;
  book_id: string;
  student_id: string;
  borrow_date: string;
  return_date: string | null;
  due_date: string;
  fine_amount: number;
  status: 'borrowed' | 'returned' | 'overdue';
  books?: {
    title: string;
    author: string;
    isbn: string;
  };
  students?: {
    name: string;
    admission_number: string;
    class: string;
  };
}

export interface Profile {
  id: string;
  name: string;
  role: 'admin' | 'student';
  admission_number?: string;
  email: string;
  created_at: string;
}
