
import { supabase } from '@/integrations/supabase/client';

export const isOverdue = (dueDate: string): boolean => {
  const due = new Date(dueDate);
  const now = new Date();
  return now > due;
};

export const calculateDueDate = (
  borrowDate: string,
  duePeriodValue: number = 24,
  duePeriodUnit: string = 'hours'
): string => {
  const borrow = new Date(borrowDate);
  
  switch (duePeriodUnit) {
    case 'hours':
      borrow.setHours(borrow.getHours() + duePeriodValue);
      break;
    case 'days':
      borrow.setDate(borrow.getDate() + duePeriodValue);
      break;
    case 'weeks':
      borrow.setDate(borrow.getDate() + (duePeriodValue * 7));
      break;
    case 'months':
      borrow.setMonth(borrow.getMonth() + duePeriodValue);
      break;
    case 'years':
      borrow.setFullYear(borrow.getFullYear() + duePeriodValue);
      break;
    default:
      borrow.setHours(borrow.getHours() + 24); // fallback to 24 hours
  }
  
  return borrow.toISOString();
};

// Database helper functions
export const fetchBooks = async () => {
  const { data, error } = await supabase
    .from('books')
    .select('*')
    .order('created_at', { ascending: false });
  
  if (error) {
    console.error('Error fetching books:', error);
    return [];
  }
  
  return data || [];
};

export const fetchStudents = async () => {
  const { data, error } = await supabase
    .from('students')
    .select('*')
    .order('created_at', { ascending: false });
  
  if (error) {
    console.error('Error fetching students:', error);
    return [];
  }
  
  return data || [];
};

export const fetchBorrowRecords = async () => {
  const { data, error } = await supabase
    .from('borrow_records')
    .select(`
      *,
      books (title, author, isbn),
      students (name, admission_number, class)
    `)
    .order('borrow_date', { ascending: false });
  
  if (error) {
    console.error('Error fetching borrow records:', error);
    return [];
  }
  
  return data || [];
};

export const addBook = async (bookData: {
  title: string;
  author: string;
  isbn: string;
  category: string;
  total_copies: number;
  due_period_value?: number;
  due_period_unit?: string;
}) => {
  const { data, error } = await supabase
    .from('books')
    .insert([{
      ...bookData,
      available_copies: bookData.total_copies,
      due_period_value: bookData.due_period_value || 24,
      due_period_unit: bookData.due_period_unit || 'hours'
    }])
    .select()
    .single();
  
  if (error) {
    console.error('Error adding book:', error);
    throw error;
  }
  
  return data;
};

export const addStudent = async (studentData: {
  name: string;
  admission_number: string;
  email: string;
  class: string;
}) => {
  const { data, error } = await supabase
    .from('students')
    .insert([studentData])
    .select()
    .single();
  
  if (error) {
    console.error('Error adding student:', error);
    throw error;
  }
  
  return data;
};

export const createBorrowRecord = async (recordData: {
  book_id: string;
  student_id: string;
}) => {
  // Check if student is blacklisted
  const { data: student, error: studentError } = await supabase
    .from('students')
    .select('blacklisted, blacklist_until')
    .eq('id', recordData.student_id)
    .single();

  if (studentError) {
    console.error('Error fetching student:', studentError);
    throw studentError;
  }

  if (student.blacklisted) {
    const blacklistUntil = student.blacklist_until ? new Date(student.blacklist_until) : null;
    if (!blacklistUntil || blacklistUntil > new Date()) {
      throw new Error('Student is currently blacklisted and cannot borrow books');
    }
  }

  // Check if book is available and get due period settings
  const { data: book, error: bookError } = await supabase
    .from('books')
    .select('available_copies, due_period_value, due_period_unit')
    .eq('id', recordData.book_id)
    .single();

  if (bookError) {
    console.error('Error fetching book:', bookError);
    throw bookError;
  }

  if (book.available_copies <= 0) {
    throw new Error('Book is not available for borrowing');
  }

  // Calculate due date based on book's settings
  const borrowDate = new Date().toISOString();
  const dueDate = calculateDueDate(
    borrowDate,
    book.due_period_value || 24,
    book.due_period_unit || 'hours'
  );

  // Create borrow record
  const { data, error } = await supabase
    .from('borrow_records')
    .insert([{
      book_id: recordData.book_id,
      student_id: recordData.student_id,
      borrow_date: borrowDate,
      due_date: dueDate,
      status: 'borrowed'
    }])
    .select()
    .single();
  
  if (error) {
    console.error('Error creating borrow record:', error);
    throw error;
  }

  // Update book availability
  const { error: updateError } = await supabase
    .from('books')
    .update({ available_copies: book.available_copies - 1 })
    .eq('id', recordData.book_id);

  if (updateError) {
    console.error('Error updating book availability:', updateError);
    throw updateError;
  }
  
  return data;
};

export const returnBook = async (recordId: string) => {
  // First get the borrow record to get the book_id
  const { data: borrowRecord, error: fetchError } = await supabase
    .from('borrow_records')
    .select('book_id')
    .eq('id', recordId)
    .single();

  if (fetchError) {
    console.error('Error fetching borrow record:', fetchError);
    throw fetchError;
  }

  // Update the borrow record
  const { data, error } = await supabase
    .from('borrow_records')
    .update({
      return_date: new Date().toISOString(),
      status: 'returned'
    })
    .eq('id', recordId)
    .select()
    .single();
  
  if (error) {
    console.error('Error returning book:', error);
    throw error;
  }

  // Increment book availability
  const { data: currentBook, error: bookFetchError } = await supabase
    .from('books')
    .select('available_copies')
    .eq('id', borrowRecord.book_id)
    .single();

  if (bookFetchError) {
    console.error('Error fetching book for availability update:', bookFetchError);
    throw bookFetchError;
  }

  const { error: updateError } = await supabase
    .from('books')
    .update({ available_copies: currentBook.available_copies + 1 })
    .eq('id', borrowRecord.book_id);

  if (updateError) {
    console.error('Error updating book availability:', updateError);
    throw updateError;
  }
  
  return data;
};

// Functions for blacklist management
export const unblacklistStudent = async (studentId: string, reason: string) => {
  const { data, error } = await supabase
    .from('students')
    .update({
      blacklisted: false,
      blacklist_until: null,
      blacklist_reason: reason
    })
    .eq('id', studentId)
    .select()
    .single();

  if (error) {
    console.error('Error unblacklisting student:', error);
    throw error;
  }

  return data;
};

// Function to check and auto-blacklist overdue students
export const processOverdueBooks = async () => {
  const { error } = await supabase.rpc('auto_blacklist_overdue_students');
  
  if (error) {
    console.error('Error processing overdue books:', error);
    throw error;
  }
};

// Legacy compatibility functions
export const calculateFine = (dueDate: string): number => {
  // Return 0 since we no longer use fines
  return 0;
};

export const getBorrowDueDate = (borrowDate: string): string => {
  // Use default 24 hours for backward compatibility
  return calculateDueDate(borrowDate, 24, 'hours');
};
