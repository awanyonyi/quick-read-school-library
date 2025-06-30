
import { Book, Student, BorrowRecord } from '../types';

// Generate unique ISBN
const generateUniqueISBN = (existingBooks: Book[]): string => {
  const timestamp = Date.now().toString();
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  let isbn = `978${timestamp.slice(-6)}${random}`;
  
  // Ensure uniqueness
  while (existingBooks.some(book => book.isbn === isbn)) {
    const newRandom = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    isbn = `978${timestamp.slice(-6)}${newRandom}`;
  }
  
  return isbn;
};

// Initialize default data
export const initializeDefaultData = () => {
  // Initialize books if not exists
  if (!localStorage.getItem('library_books')) {
    const defaultBooks: Book[] = [];
    
    // Create individual copies with unique ISBNs
    const bookTemplates = [
      {
        title: 'To Kill a Mockingbird',
        author: 'Harper Lee',
        category: 'Literature',
        copies: 5
      },
      {
        title: 'The Great Gatsby',
        author: 'F. Scott Fitzgerald',
        category: 'Literature',
        copies: 3
      },
      {
        title: 'Introduction to Algorithms',
        author: 'Thomas H. Cormen',
        category: 'Computer Science',
        copies: 4
      },
      {
        title: 'Chemistry: The Central Science',
        author: 'Theodore E. Brown',
        category: 'Science',
        copies: 6
      }
    ];

    let idCounter = 1;
    bookTemplates.forEach(template => {
      for (let i = 0; i < template.copies; i++) {
        const uniqueISBN = generateUniqueISBN(defaultBooks);
        const book: Book = {
          id: idCounter.toString(),
          title: template.title,
          author: template.author,
          isbn: uniqueISBN,
          category: template.category,
          totalCopies: 1, // Each book is now a single copy
          availableCopies: 1,
          addedDate: new Date().toISOString()
        };
        defaultBooks.push(book);
        idCounter++;
      }
    });

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
