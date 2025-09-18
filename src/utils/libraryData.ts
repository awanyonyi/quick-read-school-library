
import { apiClient } from './apiClient';
import { mockDataProvider } from './mockData';

export const isOverdue = (dueDate: string): boolean => {
  const due = new Date(dueDate);
  const now = new Date();
  return now > due;
};

// ES6: Enhanced function with Map for better performance and readability
export const calculateDueDate = (
  borrowDate: string,
  duePeriodValue: number = 24,
  duePeriodUnit: string = 'hours'
): string => {
  const borrow = new Date(borrowDate);
  
  // ES6: Map for cleaner switch-case alternative
  const timeOperations = new Map([
    ['hours', () => borrow.setHours(borrow.getHours() + duePeriodValue)],
    ['days', () => borrow.setDate(borrow.getDate() + duePeriodValue)],
    ['weeks', () => borrow.setDate(borrow.getDate() + (duePeriodValue * 7))],
    ['months', () => borrow.setMonth(borrow.getMonth() + duePeriodValue)],
    ['years', () => borrow.setFullYear(borrow.getFullYear() + duePeriodValue)]
  ]);
  
  // ES6: Optional execution with fallback
  const operation = timeOperations.get(duePeriodUnit);
  if (operation) {
    operation();
  } else {
    borrow.setHours(borrow.getHours() + 24); // fallback to 24 hours
  }
  
  return borrow.toISOString();
};

// Global flag to track API availability
let apiAvailable = true;

// Test API connection on module load
const testApiConnection = async () => {
  try {
    await apiClient.getBooks();
    apiAvailable = true;
    console.log('✅ API server connected successfully');
  } catch (error) {
    apiAvailable = false;
    console.warn('⚠️ API server not available. Using mock data provider.');
    console.warn('📝 To fix this:');
    console.warn('   1. Start the API server: node api-server.js');
    console.warn('   2. Ensure MySQL database is running');
    console.warn('   3. Check API_BASE_URL in environment variables');
  }
};

// Initialize API connection test
testApiConnection();

// Database helper functions
export const fetchBooks = async () => {
  if (!apiAvailable) {
    console.log('📊 Using mock data for books');
    return mockDataProvider.fetchBooks();
  }

  try {
    return await apiClient.getBooks();
  } catch (error) {
    console.warn('API call failed, falling back to mock data:', error);
    return mockDataProvider.fetchBooks();
  }
};

export const fetchStudents = async () => {
  if (!apiAvailable) {
    console.log('📊 Using mock data for students');
    return mockDataProvider.fetchStudents();
  }

  try {
    return await apiClient.getStudents();
  } catch (error) {
    console.warn('API call failed, falling back to mock data:', error);
    return mockDataProvider.fetchStudents();
  }
};

export const fetchBorrowRecords = async () => {
  if (!apiAvailable) {
    console.log('📊 Using mock data for borrow records');
    return [];
  }

  try {
    return await apiClient.getBorrowRecords();
  } catch (error) {
    console.warn('API call failed for borrow records:', error);
    return [];
  }
};

// ES6: Enhanced function with destructuring and default parameters
export const addBook = async (bookData: {
  title: string;
  author: string;
  isbn: string;
  category: string;
  total_copies: number;
  due_period_value?: number;
  due_period_unit?: string;
}) => {
  if (!apiAvailable) {
    throw new Error('API server not available');
  }

  try {
    return await apiClient.addBook(bookData);
  } catch (error) {
    console.error('Error adding book:', error);
    throw error;
  }
};

export const addStudent = async (studentData: {
  name: string;
  admission_number: string;
  email: string;
  class: string;
}) => {
  if (!apiAvailable) {
    throw new Error('API server not available');
  }

  try {
    return await apiClient.addStudent(studentData);
  } catch (error) {
    console.error('Error adding student:', error);
    throw error;
  }
};

export const createBorrowRecord = async (recordData: {
  book_id: string;
  student_id: string;
  due_period_value?: number;
  due_period_unit?: string;
}) => {
  if (!apiAvailable) {
    throw new Error('API server not available');
  }

  try {
    // First, find an available copy of the book
    const availableBooks = await apiClient.getBooks();
    const selectedBook = availableBooks.find((book: any) =>
      book.id === recordData.book_id && book.available_copies > 0
    );

    if (!selectedBook) {
      throw new Error('No available copies of this book');
    }

    if (!selectedBook.copies || selectedBook.copies.length === 0) {
      throw new Error('No book copies found for this book');
    }

    // Find the first available copy
    const availableCopy = selectedBook.copies.find((copy: any) => copy.status === 'available');

    if (!availableCopy) {
      throw new Error('No available copies of this book');
    }

    // Create the borrow record with the actual book copy ID
    const borrowData = {
      book_copy_id: availableCopy.id, // Use the actual copy ID
      student_id: recordData.student_id,
      due_period_value: recordData.due_period_value,
      due_period_unit: recordData.due_period_unit
    };

    return await apiClient.createBorrowRecord(borrowData);
  } catch (error) {
    console.error('Error creating borrow record:', error);
    throw error;
  }
};

export const returnBook = async (recordId: string) => {
  if (!apiAvailable) {
    throw new Error('API server not available');
  }

  try {
    return await apiClient.returnBook(recordId);
  } catch (error) {
    console.error('Error returning book:', error);
    throw error;
  }
};

// Blacklist management functions
export const unblacklistStudent = async (studentId: string, reason: string) => {
  if (!apiAvailable) {
    throw new Error('API server not available');
  }

  try {
    // Update student record to remove blacklist
    const updateData = {
      blacklisted: false,
      blacklist_until: null,
      blacklist_reason: null,
      unblacklist_reason: reason,
      unblacklist_date: new Date().toISOString()
    };

    await apiClient.updateStudent(studentId, updateData);
    console.log(`✅ Student ${studentId} unblacklisted with reason: ${reason}`);
    return { success: true };
  } catch (error) {
    console.error('Error unblacklisting student:', error);
    throw error;
  }
};

export const processOverdueBooks = async () => {
  if (!apiAvailable) {
    throw new Error('API server not available');
  }

  try {
    console.log('🔍 Processing overdue books and updating blacklist...');

    // Get all borrow records and students
    const [borrowRecords, students] = await Promise.all([
      apiClient.getBorrowRecords(),
      apiClient.getStudents()
    ]);

    const now = new Date();
    const overdueRecords = borrowRecords.filter(record =>
      record.status === 'borrowed' && new Date(record.due_date) < now
    );

    // Group overdue records by student
    const studentOverdueCount = new Map<string, any[]>();
    overdueRecords.forEach(record => {
      if (!studentOverdueCount.has(record.student_id)) {
        studentOverdueCount.set(record.student_id, []);
      }
      studentOverdueCount.get(record.student_id)!.push(record);
    });

    let blacklistedCount = 0;
    let updatedCount = 0;

    // Process each student with overdue books
    for (const [studentId, records] of studentOverdueCount) {
      const student = students.find(s => s.id === studentId);
      if (!student) continue;

      // Calculate days overdue for the most overdue book
      const mostOverdueRecord = records.reduce((prev, current) => {
        const prevDays = Math.floor((now.getTime() - new Date(prev.due_date).getTime()) / (1000 * 60 * 60 * 24));
        const currentDays = Math.floor((now.getTime() - new Date(current.due_date).getTime()) / (1000 * 60 * 60 * 24));
        return currentDays > prevDays ? current : prev;
      });

      const daysOverdue = Math.floor((now.getTime() - new Date(mostOverdueRecord.due_date).getTime()) / (1000 * 60 * 60 * 24));

      // Blacklist criteria: 3+ overdue books OR any book overdue by 7+ days
      const shouldBlacklist = records.length >= 3 || daysOverdue >= 7;

      if (shouldBlacklist && !student.blacklisted) {
        // Calculate blacklist duration based on severity
        let blacklistDays = 7; // Default 1 week
        if (records.length >= 5 || daysOverdue >= 14) {
          blacklistDays = 30; // 1 month for severe cases
        } else if (records.length >= 3 || daysOverdue >= 7) {
          blacklistDays = 14; // 2 weeks for moderate cases
        }

        const blacklistUntil = new Date();
        blacklistUntil.setDate(blacklistUntil.getDate() + blacklistDays);

        const blacklistReason = `Overdue books: ${records.length} book(s), most overdue by ${daysOverdue} day(s)`;

        const updateData = {
          blacklisted: true,
          blacklist_until: blacklistUntil.toISOString(),
          blacklist_reason: blacklistReason,
          blacklist_date: now.toISOString()
        };

        await apiClient.updateStudent(studentId, updateData);
        blacklistedCount++;
        console.log(`🚫 Blacklisted student ${student.name} (${studentId}) for ${blacklistDays} days: ${blacklistReason}`);
      } else if (student.blacklisted && !shouldBlacklist) {
        // Student is blacklisted but no longer meets criteria - could unblacklist automatically
        // For now, we'll leave this manual to avoid accidental unblacklisting
        console.log(`⚠️ Student ${student.name} (${studentId}) has ${records.length} overdue book(s), ${daysOverdue} days overdue - manual review recommended`);
      } else if (student.blacklisted) {
        updatedCount++;
        console.log(`📝 Updated blacklist status for ${student.name} (${studentId})`);
      }
    }

    console.log(`✅ Blacklist processing complete: ${blacklistedCount} students blacklisted, ${updatedCount} updated`);
    return {
      success: true,
      blacklistedCount,
      updatedCount,
      totalOverdueRecords: overdueRecords.length,
      affectedStudents: studentOverdueCount.size
    };
  } catch (error) {
    console.error('Error processing overdue books:', error);
    throw error;
  }
};

// Biometric verification logging
export const logBiometricVerification = async (verificationData: {
  student_id: string;
  book_id?: string;
  verification_type: 'book_issue' | 'book_return' | 'enrollment' | 'verification';
  verification_method: 'fingerprint' | 'face' | 'card' | 'manual_selection';
  verification_status: 'success' | 'failed';
  verified_by?: string;
  verification_timestamp: string;
  borrow_record_id?: string | null;
  additional_data?: any;
}) => {
  if (!apiAvailable) {
    console.warn('API server not available, biometric verification not logged');
    return { success: false, error: 'API server not available' };
  }

  try {
    const result = await apiClient.logBiometricVerification(verificationData);
    console.log('✅ Biometric verification logged to database:', verificationData);
    return { success: true, data: result };
  } catch (error) {
    console.error('Error in biometric verification logging:', error);
    // Don't throw error to avoid breaking the main flow
    return { success: false, error };
  }
};

// Legacy compatibility functions
export const calculateFine = (dueDate: string): number => {
  // Return 0 since we no longer use fines
  return 0;
};

export const getBorrowDueDate = (
  borrowDate: Date | string,
  periodValue: number = 24,
  periodUnit: string = 'hours'
): Date => {
  const borrow = new Date(borrowDate);

  // ES6: Map for cleaner switch-case alternative
  const timeOperations = new Map([
    ['hours', () => borrow.setHours(borrow.getHours() + periodValue)],
    ['days', () => borrow.setDate(borrow.getDate() + periodValue)],
    ['weeks', () => borrow.setDate(borrow.getDate() + (periodValue * 7))],
    ['months', () => borrow.setMonth(borrow.getMonth() + periodValue)],
    ['years', () => borrow.setFullYear(borrow.getFullYear() + periodValue)]
  ]);

  // ES6: Optional execution with fallback
  const operation = timeOperations.get(periodUnit);
  if (operation) {
    operation();
  } else {
    borrow.setHours(borrow.getHours() + 24); // fallback to 24 hours
  }

  return borrow;
};
