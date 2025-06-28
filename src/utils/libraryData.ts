
import { Book, Student, BorrowRecord } from '../types';

// Initialize default data
export const initializeDefaultData = () => {
  // Initialize books if not exists
  if (!localStorage.getItem('library_books')) {
    const defaultBooks: Book[] = [
      {
        id: '1',
        title: 'To Kill a Mockingbird',
        author: 'Harper Lee',
        isbn: '9780446310789',
        category: 'Literature',
        totalCopies: 5,
        availableCopies: 5,
        addedDate: new Date().toISOString()
      },
      {
        id: '2',
        title: 'The Great Gatsby',
        author: 'F. Scott Fitzgerald',
        isbn: '9780743273565',
        category: 'Literature',
        totalCopies: 3,
        availableCopies: 3,
        addedDate: new Date().toISOString()
      },
      {
        id: '3',
        title: 'Introduction to Algorithms',
        author: 'Thomas H. Cormen',
        isbn: '9780262033848',
        category: 'Computer Science',
        totalCopies: 4,
        availableCopies: 4,
        addedDate: new Date().toISOString()
      },
      {
        id: '4',
        title: 'Chemistry: The Central Science',
        author: 'Theodore E. Brown',
        isbn: '9780134414232',
        category: 'Science',
        totalCopies: 6,
        availableCopies: 6,
        addedDate: new Date().toISOString()
      }
    ];
    localStorage.setItem('library_books', JSON.stringify(defaultBooks));
  }

  // Initialize students if not exists
  if (!localStorage.getItem('library_students')) {
    const defaultStudents: Student[] = [
      {
        id: 'std_1',
        name: 'John Doe',
        admissionNumber: 'STD001',
        email: 'john.doe@school.edu',
        class: 'Grade 10A',
        registeredDate: new Date().toISOString()
      },
      {
        id: 'std_2',
        name: 'Jane Smith',
        admissionNumber: 'STD002',
        email: 'jane.smith@school.edu',
        class: 'Grade 10B',
        registeredDate: new Date().toISOString()
      },
      {
        id: 'std_3',
        name: 'Mike Johnson',
        admissionNumber: 'STD003',
        email: 'mike.johnson@school.edu',
        class: 'Grade 11A',
        registeredDate: new Date().toISOString()
      }
    ];
    localStorage.setItem('library_students', JSON.stringify(defaultStudents));
  }

  // Initialize borrow records if not exists
  if (!localStorage.getItem('library_borrow_records')) {
    localStorage.setItem('library_borrow_records', JSON.stringify([]));
  }
};

export const calculateFine = (dueDate: string): number => {
  const due = new Date(dueDate);
  const now = new Date();
  const diffTime = now.getTime() - due.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  return diffDays > 0 ? diffDays * 500 : 0; // KES 500 per day
};

export const getBorrowDueDate = (borrowDate: string): string => {
  const borrow = new Date(borrowDate);
  borrow.setHours(borrow.getHours() + 24); // 24 hours from borrow time
  return borrow.toISOString();
};
