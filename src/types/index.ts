
export interface Book {
  id: string;
  title: string;
  author: string;
  isbn?: string; // Optional for aggregated responses
  category: string;
  total_copies: number;
  available_copies: number;
  due_period_value?: number;
  due_period_unit?: string;
  created_at: string;
  copies?: any[]; // For aggregated API responses
}

export interface Student {
  id: string;
  name: string;
  admission_number?: string;
  email: string;
  class: string;
  created_at?: string;
  blacklisted?: boolean;
  blacklist_until?: string;
  blacklist_reason?: string;
  biometric_enrolled?: boolean;
  biometric_id?: string;
  biometric_data?: any;
  // Legacy properties for backward compatibility
  admissionNumber?: string;
  registeredDate?: string;
}

export interface BorrowRecord {
  id: string;
  book_id?: string; // Optional for backward compatibility
  book_copy_id?: string; // New field for book copy reference
  student_id: string;
  borrow_date: string;
  return_date: string | null;
  due_date: string;
  fine_amount?: number;
  status: 'borrowed' | 'returned' | 'overdue';
  // Denormalized fields for performance
  student_name?: string;
  student_admission_number?: string;
  student_class?: string;
  book_title?: string;
  book_author?: string;
  book_isbn?: string;
  // Structured objects for compatibility
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
  // Legacy properties for backward compatibility
  fine?: number;
  borrowDate?: string;
  returnDate?: string | null;
  bookId?: string;
  studentId?: string;
}

export interface Profile {
  id: string;
  name: string;
  role: 'admin' | 'student';
  admission_number?: string;
  email: string;
  created_at: string;
}

export interface LibrarySettings {
  id: string;
  setting_key: string;
  setting_value: string;
  created_at: string;
  updated_at: string;
}
