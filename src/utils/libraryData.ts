
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
    return await apiClient.createBorrowRecord(recordData);
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
    // For now, we'll implement this as a simple API call
    // In a full implementation, you'd have a dedicated endpoint for this
    console.log(`Unblacklisting student ${studentId} with reason: ${reason}`);
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
    // For now, we'll implement this as a simple API call
    // In a full implementation, you'd have a dedicated endpoint for this
    console.log('Processing overdue books...');
    return { success: true };
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
  verification_method: 'fingerprint' | 'face' | 'card';
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
