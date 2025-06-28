
export interface Book {
  id: string;
  title: string;
  author: string;
  isbn: string;
  category: string;
  totalCopies: number;
  availableCopies: number;
  addedDate: string;
}

export interface Student {
  id: string;
  name: string;
  admissionNumber: string;
  email: string;
  registeredDate: string;
}

export interface BorrowRecord {
  id: string;
  bookId: string;
  studentId: string;
  borrowDate: string;
  returnDate: string | null;
  dueDate: string;
  fine: number;
  status: 'borrowed' | 'returned' | 'overdue';
}
