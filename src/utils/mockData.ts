/**
 * Mock Data Provider
 * Provides fallback data when database is not available
 */

// Mock data for development and testing
export const mockBooks = [
  {
    id: '1',
    title: 'Introduction to Algorithms',
    author: 'Thomas H. Cormen',
    isbn: '978-0262033848',
    category: 'Computer Science',
    total_copies: 5,
    available_copies: 3,
    due_period_value: 24,
    due_period_unit: 'hours',
    created_at: '2024-01-01T00:00:00.000Z',
    updated_at: '2024-01-01T00:00:00.000Z'
  },
  {
    id: '2',
    title: 'Clean Code',
    author: 'Robert C. Martin',
    isbn: '978-0132350884',
    category: 'Software Engineering',
    total_copies: 3,
    available_copies: 2,
    due_period_value: 24,
    due_period_unit: 'hours',
    created_at: '2024-01-01T00:00:00.000Z',
    updated_at: '2024-01-01T00:00:00.000Z'
  },
  {
    id: '3',
    title: 'The Pragmatic Programmer',
    author: 'Andrew Hunt',
    isbn: '978-0201616224',
    category: 'Software Engineering',
    total_copies: 4,
    available_copies: 1,
    due_period_value: 24,
    due_period_unit: 'hours',
    created_at: '2024-01-01T00:00:00.000Z',
    updated_at: '2024-01-01T00:00:00.000Z'
  }
];

export const mockStudents = [
  {
    id: '1',
    name: 'John Doe',
    admission_number: 'ADM001',
    email: 'john.doe@school.edu',
    class: 'Grade 12A',
    blacklisted: false,
    blacklist_until: null,
    blacklist_reason: null,
    created_at: '2024-01-01T00:00:00.000Z',
    updated_at: '2024-01-01T00:00:00.000Z'
  },
  {
    id: '2',
    name: 'Jane Smith',
    admission_number: 'ADM002',
    email: 'jane.smith@school.edu',
    class: 'Grade 11B',
    blacklisted: false,
    blacklist_until: null,
    blacklist_reason: null,
    created_at: '2024-01-01T00:00:00.000Z',
    updated_at: '2024-01-01T00:00:00.000Z'
  },
  {
    id: '3',
    name: 'Bob Johnson',
    admission_number: 'ADM003',
    email: 'bob.johnson@school.edu',
    class: 'Grade 10C',
    blacklisted: true,
    blacklist_until: '2024-12-31T23:59:59.000Z',
    blacklist_reason: 'Overdue books',
    created_at: '2024-01-01T00:00:00.000Z',
    updated_at: '2024-01-01T00:00:00.000Z'
  }
];

export const mockBorrowRecords = [
  {
    id: '1',
    book_id: '1',
    student_id: '1',
    borrow_date: '2024-09-01T10:00:00.000Z',
    due_date: '2024-09-02T10:00:00.000Z',
    return_date: null,
    status: 'borrowed',
    fine_amount: 0,
    fine_paid: false,
    created_at: '2024-09-01T10:00:00.000Z',
    updated_at: '2024-09-01T10:00:00.000Z',
    books: {
      title: 'Introduction to Algorithms',
      author: 'Thomas H. Cormen',
      isbn: '978-0262033848'
    },
    students: {
      name: 'John Doe',
      admission_number: 'ADM001',
      class: 'Grade 12A'
    }
  },
  {
    id: '2',
    book_id: '2',
    student_id: '2',
    borrow_date: '2024-08-15T14:30:00.000Z',
    due_date: '2024-08-16T14:30:00.000Z',
    return_date: '2024-08-16T12:00:00.000Z',
    status: 'returned',
    fine_amount: 0,
    fine_paid: false,
    created_at: '2024-08-15T14:30:00.000Z',
    updated_at: '2024-08-16T12:00:00.000Z',
    books: {
      title: 'Clean Code',
      author: 'Robert C. Martin',
      isbn: '978-0132350884'
    },
    students: {
      name: 'Jane Smith',
      admission_number: 'ADM002',
      class: 'Grade 11B'
    }
  }
];

// Mock functions that mimic database operations
export const mockFetchBooks = async () => {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 100));
  return mockBooks;
};

export const mockFetchStudents = async () => {
  await new Promise(resolve => setTimeout(resolve, 100));
  return mockStudents;
};

export const mockFetchBorrowRecords = async () => {
  await new Promise(resolve => setTimeout(resolve, 100));
  return mockBorrowRecords;
};

export const mockAddBook = async (bookData: any) => {
  await new Promise(resolve => setTimeout(resolve, 200));
  const newBook = {
    id: Date.now().toString(),
    ...bookData,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
  mockBooks.push(newBook);
  return newBook;
};

export const mockAddStudent = async (studentData: any) => {
  await new Promise(resolve => setTimeout(resolve, 200));
  const newStudent = {
    id: Date.now().toString(),
    ...studentData,
    blacklisted: false,
    blacklist_until: null,
    blacklist_reason: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
  mockStudents.push(newStudent);
  return newStudent;
};

export const mockCreateBorrowRecord = async (recordData: any) => {
  await new Promise(resolve => setTimeout(resolve, 300));

  // Find the book and check availability
  const book = mockBooks.find(b => b.id === recordData.book_id);
  if (!book) throw new Error('Book not found');
  if (book.available_copies <= 0) throw new Error('Book not available');

  // Find the student
  const student = mockStudents.find(s => s.id === recordData.student_id);
  if (!student) throw new Error('Student not found');
  if (student.blacklisted) throw new Error('Student is blacklisted');

  // Create the record
  const newRecord = {
    id: Date.now().toString(),
    ...recordData,
    borrow_date: new Date().toISOString(),
    due_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours from now
    return_date: null,
    status: 'borrowed',
    fine_amount: 0,
    fine_paid: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  // Update book availability
  book.available_copies -= 1;

  mockBorrowRecords.push(newRecord);
  return newRecord;
};

export const mockReturnBook = async (recordId: string) => {
  await new Promise(resolve => setTimeout(resolve, 200));

  const record = mockBorrowRecords.find(r => r.id === recordId);
  if (!record) throw new Error('Borrow record not found');

  // Update the record
  record.return_date = new Date().toISOString();
  record.status = 'returned';
  record.updated_at = new Date().toISOString();

  // Update book availability
  const book = mockBooks.find(b => b.id === record.book_id);
  if (book) {
    book.available_copies += 1;
  }

  return record;
};

// Export all mock functions
export const mockDataProvider = {
  fetchBooks: mockFetchBooks,
  fetchStudents: mockFetchStudents,
  fetchBorrowRecords: mockFetchBorrowRecords,
  addBook: mockAddBook,
  addStudent: mockAddStudent,
  createBorrowRecord: mockCreateBorrowRecord,
  returnBook: mockReturnBook,
  unblacklistStudent: async (studentId: string) => {
    const student = mockStudents.find(s => s.id === studentId);
    if (student) {
      student.blacklisted = false;
      student.blacklist_until = null;
      student.blacklist_reason = null;
      student.updated_at = new Date().toISOString();
    }
    return student;
  },
  processOverdueBooks: async () => {
    // Mock overdue processing
    console.log('Mock: Processing overdue books');
  },
  logBiometricVerification: async () => {
    console.log('Mock: Biometric verification logged');
    return { success: true };
  }
};