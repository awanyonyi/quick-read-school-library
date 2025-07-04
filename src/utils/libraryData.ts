
import { supabase } from '@/integrations/supabase/client';

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
}) => {
  const { data, error } = await supabase
    .from('books')
    .insert([{
      ...bookData,
      available_copies: bookData.total_copies
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
  due_date: string;
}) => {
  // First, check if book is available
  const { data: book, error: bookError } = await supabase
    .from('books')
    .select('available_copies')
    .eq('id', recordData.book_id)
    .single();

  if (bookError) {
    console.error('Error fetching book:', bookError);
    throw bookError;
  }

  if (book.available_copies <= 0) {
    throw new Error('Book is not available for borrowing');
  }

  // Create borrow record
  const { data, error } = await supabase
    .from('borrow_records')
    .insert([{
      ...recordData,
      borrow_date: new Date().toISOString(),
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

export const returnBook = async (recordId: string, fine: number = 0) => {
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
      status: 'returned',
      fine_amount: fine
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
