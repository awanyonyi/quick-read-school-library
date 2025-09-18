
import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Book, Student, BorrowRecord } from '../types';
import { calculateFine, getBorrowDueDate, fetchBooks, fetchStudents, fetchBorrowRecords, createBorrowRecord, returnBook, logBiometricVerification } from '../utils/libraryData';
import { Plus, BookOpen, User, Clock, CheckCircle, AlertTriangle, Search, Shield } from 'lucide-react';
import { BiometricVerification } from './BiometricVerification';
import { toast, useToast } from '@/hooks/use-toast';

interface BorrowingManagementProps {
  onUpdate: () => void;
}

export const BorrowingManagement: React.FC<BorrowingManagementProps> = ({ onUpdate }) => {
  const { dismiss } = useToast();
  const [books, setBooks] = useState<Book[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [borrowRecords, setBorrowRecords] = useState<BorrowRecord[]>([]);
  const [isIssueDialogOpen, setIsIssueDialogOpen] = useState(false);
  const [selectedBookId, setSelectedBookId] = useState('');
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [bookSearchQuery, setBookSearchQuery] = useState('');
  const [studentSearchQuery, setStudentSearchQuery] = useState('');
  const [borrowPeriodValue, setBorrowPeriodValue] = useState('');
  const [borrowPeriodUnit, setBorrowPeriodUnit] = useState('days');
  const [showBiometricVerification, setShowBiometricVerification] = useState(false);
  const [showManualStudentSelection, setShowManualStudentSelection] = useState(false);
  const [manualSelectedStudentId, setManualSelectedStudentId] = useState('');
  const [manualStudentSearchQuery, setManualStudentSearchQuery] = useState('');
  const [pendingIssueData, setPendingIssueData] = useState<{
    bookId: string;
    borrowPeriod: { value: number; unit: string };
  } | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [booksData, studentsData, recordsData] = await Promise.all([
        fetchBooks(),
        fetchStudents(),
        fetchBorrowRecords()
      ]);
      
      setBooks(booksData as Book[]);
      setStudents(studentsData);
      setBorrowRecords(recordsData as BorrowRecord[]);
    } catch (error) {
      console.error('Error loading data:', error);
      toast({
        title: "Error",
        description: "Failed to load data",
        variant: "destructive"
      });
    }
  };

  const availableBooks = books.filter(book => book.available_copies > 0);

  // Filter books based on search query
  const filteredBooks = useMemo(() => {
    if (!bookSearchQuery.trim()) {
      return availableBooks;
    }
    return availableBooks.filter(book =>
      book.title.toLowerCase().includes(bookSearchQuery.toLowerCase()) ||
      book.author.toLowerCase().includes(bookSearchQuery.toLowerCase())
    );
  }, [availableBooks, bookSearchQuery]);

  // Filter students based on search query
  const filteredStudents = useMemo(() => {
    if (!studentSearchQuery.trim()) {
      return students;
    }
    return students.filter(student =>
      student.name.toLowerCase().includes(studentSearchQuery.toLowerCase()) ||
      student.admission_number.toLowerCase().includes(studentSearchQuery.toLowerCase())
    );
  }, [students, studentSearchQuery]);

  // Filter students for manual selection
  const filteredManualStudents = useMemo(() => {
    if (!manualStudentSearchQuery.trim()) {
      return students;
    }
    return students.filter(student =>
      student.name.toLowerCase().includes(manualStudentSearchQuery.toLowerCase()) ||
      student.admission_number?.toLowerCase().includes(manualStudentSearchQuery.toLowerCase()) ||
      student.email?.toLowerCase().includes(manualStudentSearchQuery.toLowerCase()) ||
      student.class?.toLowerCase().includes(manualStudentSearchQuery.toLowerCase())
    );
  }, [students, manualStudentSearchQuery]);

  const handleIssueBook = async () => {
    if (!selectedBookId || !borrowPeriodValue) {
      toast({
        title: "Error",
        description: "Please select book and borrowing period",
        variant: "destructive"
      });
      return;
    }

    const book = books.find(b => b.id === selectedBookId);
    if (!book || book.available_copies <= 0) {
      toast({
        title: "Error",
        description: "Book is not available for borrowing",
        variant: "destructive"
      });
      return;
    }

    // Store the pending issue data and show biometric verification
    setPendingIssueData({
      bookId: selectedBookId,
      borrowPeriod: {
        value: parseInt(borrowPeriodValue),
        unit: borrowPeriodUnit
      }
    });
    setShowBiometricVerification(true);
  };

  const handleBiometricVerificationSuccess = async (verifiedStudent: Student) => {
    if (!pendingIssueData) return;

    // Check if student already has this book
    const existingRecord = borrowRecords.find(record =>
      record.book_id === pendingIssueData.bookId &&
      record.student_id === verifiedStudent.id &&
      record.status === 'borrowed'
    );

    if (existingRecord) {
      toast({
        title: "Error",
        description: "Student already has this book borrowed",
        variant: "destructive"
      });
      setShowBiometricVerification(false);
      setPendingIssueData(null);
      return;
    }

    try {
      const book = books.find(b => b.id === pendingIssueData.bookId);
      if (!book) {
        throw new Error("Book not found");
      }

      // Create borrow record with verified student
      const borrowRecord = await createBorrowRecord({
        book_id: pendingIssueData.bookId,
        student_id: verifiedStudent.id,
        due_period_value: pendingIssueData.borrowPeriod.value,
        due_period_unit: pendingIssueData.borrowPeriod.unit
      });

      // Log biometric verification event to database
      await logBiometricVerification({
        student_id: verifiedStudent.id,
        book_id: pendingIssueData.bookId,
        verification_type: 'book_issue',
        verification_method: 'fingerprint',
        verification_status: 'success',
        verified_by: 'system', // Could be librarian ID in future
        verification_timestamp: new Date().toISOString(),
        borrow_record_id: borrowRecord?.id || null,
        additional_data: {
          book_title: book.title,
          book_author: book.author,
          book_isbn: book.isbn,
          student_name: verifiedStudent.name,
          student_admission: verifiedStudent.admission_number,
          student_class: verifiedStudent.class,
          borrow_period: `${pendingIssueData.borrowPeriod.value} ${pendingIssueData.borrowPeriod.unit}`,
          due_date: getBorrowDueDate(
            new Date(),
            pendingIssueData.borrowPeriod.value,
            pendingIssueData.borrowPeriod.unit
          ).toISOString()
        }
      });

      // Enhanced success message with detailed student information and flash effect
      const successMessage = (
        <div className="space-y-3 animate-pulse">
          <div className="text-center">
            <div className="text-2xl mb-2">🎉</div>
            <div className="font-bold text-lg text-green-700">
              BOOK ISSUED SUCCESSFULLY!
            </div>
          </div>

          <div className="bg-green-50 border-2 border-green-200 rounded-lg p-4 space-y-3">
            <div className="text-center">
              <div className="font-semibold text-lg text-green-800">
                📖 {book.title}
              </div>
              <div className="text-sm text-green-700">
                by {book.author} • ISBN: {book.isbn || 'N/A'}
              </div>
            </div>

            <div className="border-t border-green-200 pt-3">
              <div className="text-center space-y-2">
                <div className="font-medium text-green-800">👤 STUDENT DETAILS</div>
                <div className="bg-white rounded p-3 space-y-1">
                  <div className="font-semibold text-lg">{verifiedStudent.name}</div>
                  <div className="text-sm text-gray-600">
                    Admission: <span className="font-medium">{verifiedStudent.admission_number}</span>
                  </div>
                  <div className="text-sm text-gray-600">
                    Class: <span className="font-medium">{verifiedStudent.class}</span>
                  </div>
                  <div className="text-sm text-gray-600">
                    Email: <span className="font-medium">{verifiedStudent.email || 'Not provided'}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="border-t border-green-200 pt-3">
              <div className="text-center space-y-2">
                <div className="font-medium text-green-800">📅 BORROWING DETAILS</div>
                <div className="bg-white rounded p-3 space-y-1">
                  <div className="text-sm">
                    <span className="font-medium">Issued:</span> {new Date().toLocaleDateString()} at {new Date().toLocaleTimeString()}
                  </div>
                  <div className="text-sm">
                    <span className="font-medium">Due:</span> {getBorrowDueDate(
                      new Date(),
                      pendingIssueData.borrowPeriod.value,
                      pendingIssueData.borrowPeriod.unit
                    ).toLocaleDateString()}
                  </div>
                  <div className="text-sm">
                    <span className="font-medium">Period:</span> {pendingIssueData.borrowPeriod.value} {pendingIssueData.borrowPeriod.unit}
                  </div>
                </div>
              </div>
            </div>

            <div className="border-t border-green-200 pt-3">
              <div className="text-center">
                <div className="inline-flex items-center gap-2 bg-green-100 px-4 py-2 rounded-full">
                  <div className="text-green-600">🔐</div>
                  <div className="font-medium text-green-800 text-sm">
                    BIOMETRIC VERIFICATION SUCCESSFUL
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="text-center text-xs text-green-600">
            ✅ Database updated • ✅ Biometric log recorded • ✅ Book availability updated
          </div>
        </div>
      );

      toast({
        title: "🎉 BOOK ISSUED SUCCESSFULLY!",
        description: successMessage,
        duration: 10000, // Show longer for detailed info
      });

      // Reset form
      setSelectedBookId('');
      setSelectedStudentId('');
      setBookSearchQuery('');
      setStudentSearchQuery('');
      setBorrowPeriodValue('');
      setBorrowPeriodUnit('days');
      setIsIssueDialogOpen(false);
      setShowBiometricVerification(false);
      setPendingIssueData(null);
      loadData();
      onUpdate();
    } catch (error: unknown) {
      console.error('Error issuing book:', error);
      toast({
        title: "Error",
        description: (error instanceof Error ? error.message : "Failed to issue book"),
        variant: "destructive"
      });
    }
  };

  const handleBiometricVerificationError = (error: string) => {
    setShowBiometricVerification(false);

    // Show manual student selection as fallback
    if (pendingIssueData) {
      toast({
        title: "Biometric Verification Failed",
        description: (
          <div className="space-y-2">
            <p>{error}</p>
            <p className="text-sm">Would you like to select the student manually instead?</p>
            <div className="flex gap-2 mt-3">
              <Button
                size="sm"
                onClick={() => {
                  setShowManualStudentSelection(true);
                  dismiss();
                }}
              >
                Yes, Select Manually
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setPendingIssueData(null);
                  dismiss();
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        ),
        duration: 10000,
      });
    } else {
      toast({
        title: "Biometric Verification Failed",
        description: error,
        variant: "destructive"
      });
    }
  };

  const handleManualStudentSelection = async () => {
    if (!manualSelectedStudentId || !pendingIssueData) return;

    const selectedStudent = students.find(s => s.id === manualSelectedStudentId);
    if (!selectedStudent) {
      toast({
        title: "Error",
        description: "Selected student not found",
        variant: "destructive"
      });
      return;
    }

    // Check if student already has this book
    const existingRecord = borrowRecords.find(record =>
      record.book_id === pendingIssueData.bookId &&
      record.student_id === selectedStudent.id &&
      record.status === 'borrowed'
    );

    if (existingRecord) {
      toast({
        title: "Error",
        description: "Student already has this book borrowed",
        variant: "destructive"
      });
      setShowManualStudentSelection(false);
      setPendingIssueData(null);
      return;
    }

    try {
      const book = books.find(b => b.id === pendingIssueData.bookId);
      if (!book) {
        throw new Error("Book not found");
      }

      // Create borrow record with manually selected student
      const borrowRecord = await createBorrowRecord({
        book_id: pendingIssueData.bookId,
        student_id: selectedStudent.id,
        due_period_value: pendingIssueData.borrowPeriod.value,
        due_period_unit: pendingIssueData.borrowPeriod.unit
      });

      // Log manual verification event
      await logBiometricVerification({
        student_id: selectedStudent.id,
        book_id: pendingIssueData.bookId,
        verification_type: 'book_issue',
        verification_method: 'manual_selection',
        verification_status: 'success',
        verified_by: 'librarian', // Could be current user ID
        verification_timestamp: new Date().toISOString(),
        borrow_record_id: borrowRecord?.id || null,
        additional_data: {
          book_title: book.title,
          book_author: book.author,
          book_isbn: book.isbn,
          student_name: selectedStudent.name,
          student_admission: selectedStudent.admission_number,
          student_class: selectedStudent.class,
          borrow_period: `${pendingIssueData.borrowPeriod.value} ${pendingIssueData.borrowPeriod.unit}`,
          due_date: getBorrowDueDate(
            new Date(),
            pendingIssueData.borrowPeriod.value,
            pendingIssueData.borrowPeriod.unit
          ).toISOString()
        }
      });

      // Success message for manual selection
      const successMessage = (
        <div className="space-y-3 animate-pulse">
          <div className="text-center">
            <div className="text-2xl mb-2">🎉</div>
            <div className="font-bold text-lg text-green-700">
              BOOK ISSUED SUCCESSFULLY!
            </div>
          </div>

          <div className="bg-green-50 border-2 border-green-200 rounded-lg p-4 space-y-3">
            <div className="text-center">
              <div className="font-semibold text-lg text-green-800">
                📖 {book.title}
              </div>
              <div className="text-sm text-green-700">
                by {book.author} • ISBN: {book.isbn || 'N/A'}
              </div>
            </div>

            <div className="border-t border-green-200 pt-3">
              <div className="text-center space-y-2">
                <div className="font-medium text-green-800">👤 STUDENT DETAILS</div>
                <div className="bg-white rounded p-3 space-y-1">
                  <div className="font-semibold text-lg">{selectedStudent.name}</div>
                  <div className="text-sm text-gray-600">
                    Admission: <span className="font-medium">{selectedStudent.admission_number}</span>
                  </div>
                  <div className="text-sm text-gray-600">
                    Class: <span className="font-medium">{selectedStudent.class}</span>
                  </div>
                  <div className="text-sm text-gray-600">
                    Email: <span className="font-medium">{selectedStudent.email || 'Not provided'}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="border-t border-green-200 pt-3">
              <div className="text-center space-y-2">
                <div className="font-medium text-green-800">📅 BORROWING DETAILS</div>
                <div className="bg-white rounded p-3 space-y-1">
                  <div className="text-sm">
                    <span className="font-medium">Issued:</span> {new Date().toLocaleDateString()} at {new Date().toLocaleTimeString()}
                  </div>
                  <div className="text-sm">
                    <span className="font-medium">Due:</span> {getBorrowDueDate(
                      new Date(),
                      pendingIssueData.borrowPeriod.value,
                      pendingIssueData.borrowPeriod.unit
                    ).toLocaleDateString()}
                  </div>
                  <div className="text-sm">
                    <span className="font-medium">Period:</span> {pendingIssueData.borrowPeriod.value} {pendingIssueData.borrowPeriod.unit}
                  </div>
                </div>
              </div>
            </div>

            <div className="border-t border-green-200 pt-3">
              <div className="text-center">
                <div className="inline-flex items-center gap-2 bg-blue-100 px-4 py-2 rounded-full">
                  <div className="text-blue-600">👤</div>
                  <div className="font-medium text-blue-800 text-sm">
                    MANUAL STUDENT SELECTION
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="text-center text-xs text-green-600">
            ✅ Database updated • ✅ Manual verification logged • ✅ Book availability updated
          </div>
        </div>
      );

      toast({
        title: "🎉 BOOK ISSUED SUCCESSFULLY!",
        description: successMessage,
        duration: 10000,
      });

      // Reset form
      setSelectedBookId('');
      setSelectedStudentId('');
      setBookSearchQuery('');
      setStudentSearchQuery('');
      setBorrowPeriodValue('');
      setBorrowPeriodUnit('days');
      setIsIssueDialogOpen(false);
      setShowManualStudentSelection(false);
      setManualSelectedStudentId('');
      setManualStudentSearchQuery('');
      setPendingIssueData(null);
      loadData();
      onUpdate();
    } catch (error: unknown) {
      console.error('Error issuing book manually:', error);
      toast({
        title: "Error",
        description: (error instanceof Error ? error.message : "Failed to issue book"),
        variant: "destructive"
      });
    }
  };

  const handleReturnBook = async (recordId: string) => {
    const record = borrowRecords.find(r => r.id === recordId);
    if (!record) return;

    try {
      // Return book using Supabase
      await returnBook(recordId);

      toast({
        title: "Success",
        description: "Book returned successfully"
      });

      loadData();
      onUpdate();
    } catch (error: unknown) {
      console.error('Error returning book:', error);
      toast({
        title: "Error",
        description: (error instanceof Error ? error.message : "Failed to return book"),
        variant: "destructive"
      });
    }
  };

  const activeBorrowRecords = borrowRecords.filter(record => record.status === 'borrowed');
  const overdueRecords = activeBorrowRecords.filter(record => new Date() > new Date(record.due_date));

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Borrowing Management</h2>
          <p className="text-gray-600">Issue and return books, manage borrowing records</p>
        </div>
        <Dialog open={isIssueDialogOpen} onOpenChange={setIsIssueDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Issue Book
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary" />
                Issue Book with Biometric Authentication
              </DialogTitle>
              <DialogDescription>
                Select a book and set borrowing period. Student identity will be verified using biometric authentication.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-6 py-4">
              {/* Book Selection with Search */}
              <div className="space-y-3">
                <label className="text-sm font-medium">Select Book</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <Input
                    placeholder="Search books by title or author..."
                    value={bookSearchQuery}
                    onChange={(e) => setBookSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={selectedBookId} onValueChange={setSelectedBookId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a book..." />
                  </SelectTrigger>
                  <SelectContent className="max-h-60">
                    {filteredBooks.length > 0 ? (
                      filteredBooks.map((book) => (
                        <SelectItem key={book.id} value={book.id}>
                          <div className="flex flex-col">
                            <span className="font-medium">{book.title}</span>
                            <span className="text-sm text-gray-500">
                              by {book.author} • ISBN: {book.isbn || 'N/A'}
                            </span>
                            <span className="text-sm text-gray-500">
                              Available: {book.available_copies}
                            </span>
                          </div>
                        </SelectItem>
                      ))
                    ) : (
                      <div className="p-2 text-sm text-gray-500 text-center">
                        {bookSearchQuery ? 'No books found matching your search' : 'No available books'}
                      </div>
                    )}
                  </SelectContent>
                </Select>
              </div>

              {/* Biometric Authentication Notice */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Shield className="h-4 w-4 text-blue-600" />
                  <span className="font-medium text-blue-800 text-sm">Biometric Authentication Required</span>
                </div>
                <p className="text-xs text-blue-700">
                  Student identity will be verified using biometric authentication (fingerprint or face recognition) before book issuance.
                </p>
              </div>

               {/* Borrowing Period Selection */}
               <div className="space-y-3">
                 <label className="text-sm font-medium">Borrowing Period</label>
                 <div className="flex space-x-2">
                   <Input
                     type="number"
                     placeholder="Enter period"
                     value={borrowPeriodValue}
                     onChange={(e) => setBorrowPeriodValue(e.target.value)}
                     min="1"
                     className="flex-1"
                   />
                   <Select value={borrowPeriodUnit} onValueChange={setBorrowPeriodUnit}>
                     <SelectTrigger className="w-32">
                       <SelectValue />
                     </SelectTrigger>
                     <SelectContent>
                       <SelectItem value="hours">Hours</SelectItem>
                       <SelectItem value="days">Days</SelectItem>
                       <SelectItem value="weeks">Weeks</SelectItem>
                       <SelectItem value="months">Months</SelectItem>
                       <SelectItem value="years">Years</SelectItem>
                     </SelectContent>
                   </Select>
                 </div>
                 {borrowPeriodValue && (
                   <p className="text-sm text-muted-foreground">
                     Book will be due in {borrowPeriodValue} {borrowPeriodUnit}
                   </p>
                 )}
               </div>
             </div>
             <DialogFooter className="flex flex-col-reverse sm:flex-row gap-2 sm:gap-0">
               <Button variant="outline" onClick={() => setIsIssueDialogOpen(false)} className="w-full sm:w-auto">
                 Cancel
               </Button>
               <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                 <Button
                   variant="outline"
                   onClick={() => {
                     if (!selectedBookId || !borrowPeriodValue) {
                       toast({
                         title: "Error",
                         description: "Please select book and borrowing period",
                         variant: "destructive"
                       });
                       return;
                     }
                     setPendingIssueData({
                       bookId: selectedBookId,
                       borrowPeriod: {
                         value: parseInt(borrowPeriodValue),
                         unit: borrowPeriodUnit
                       }
                     });
                     setShowManualStudentSelection(true);
                   }}
                   className="w-full sm:w-auto flex items-center gap-2"
                 >
                   <User className="h-4 w-4" />
                   Manual Selection
                 </Button>
                 <Button onClick={handleIssueBook} className="w-full sm:w-auto flex items-center gap-2">
                   <Shield className="h-4 w-4" />
                   Biometric Verification
                 </Button>
               </div>
             </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Borrowings</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeBorrowRecords.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overdue Books</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{overdueRecords.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Available Books</CardTitle>
            <BookOpen className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{availableBooks.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Active Borrowings - Updated to include ISBN */}
      <Card>
        <CardHeader>
          <CardTitle>Active Borrowings</CardTitle>
          <CardDescription>Books currently borrowed by students</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {activeBorrowRecords.map((record) => {
              const book = books.find(b => b.id === record.book_id);
              const student = students.find(s => s.id === record.student_id);
              const isOverdue = new Date() > new Date(record.due_date);
              const fine = isOverdue ? calculateFine(record.due_date) : 0;

              return (
                <div key={record.id} className="border rounded-lg p-4">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-start space-x-3">
                        <div className={`p-2 rounded-lg ${isOverdue ? 'bg-red-100' : 'bg-blue-100'}`}>
                          <BookOpen className={`h-5 w-5 ${isOverdue ? 'text-red-600' : 'text-blue-600'}`} />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold">{book?.title || 'Unknown Book'}</h3>
                          <p className="text-gray-600">by {book?.author || 'Unknown Author'}</p>
                          <p className="text-sm text-gray-500">ISBN: {book?.isbn || 'N/A'}</p>
                          <div className="flex items-center space-x-2 mt-2">
                            <User className="h-4 w-4 text-gray-400" />
                            <span className="text-sm">{student?.name || 'Unknown Student'}</span>
                            <span className="text-sm text-gray-500">({student?.admission_number})</span>
                          </div>
                          <div className="flex items-center space-x-4 mt-2">
                            <span className="text-sm">
                              Borrowed: {new Date(record.borrow_date).toLocaleDateString()}
                            </span>
                            <span className="text-sm">
                              Due: {new Date(record.due_date).toLocaleString()}
                            </span>
                          </div>
                          {fine > 0 && (
                            <p className="text-sm text-red-600 font-medium mt-1">
                              Fine: KES {fine.toLocaleString()}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge variant={isOverdue ? 'destructive' : 'default'}>
                        {isOverdue ? 'Overdue' : 'Active'}
                      </Badge>
                      <Button 
                        size="sm" 
                        onClick={() => handleReturnBook(record.id)}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Return
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
            {activeBorrowRecords.length === 0 && (
              <div className="text-center py-12">
                <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No active borrowings</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Recent Returns - Updated to include ISBN */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Returns</CardTitle>
          <CardDescription>Recently returned books</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {borrowRecords
              .filter(record => record.status === 'returned')
              .slice(-5)
              .reverse()
              .map((record) => {
                const book = books.find(b => b.id === record.book_id);
                const student = students.find(s => s.id === record.student_id);

                return (
                  <div key={record.id} className="border rounded-lg p-4">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-start space-x-3">
                          <div className="bg-green-100 p-2 rounded-lg">
                            <CheckCircle className="h-5 w-5 text-green-600" />
                          </div>
                          <div className="flex-1">
                            <h3 className="font-semibold">{book?.title || 'Unknown Book'}</h3>
                            <p className="text-gray-600">by {book?.author || 'Unknown Author'}</p>
                            <p className="text-sm text-gray-500">ISBN: {book?.isbn || 'N/A'}</p>
                            <div className="flex items-center space-x-2 mt-2">
                              <User className="h-4 w-4 text-gray-400" />
                              <span className="text-sm">{student?.name || 'Unknown Student'}</span>
                            </div>
                            <div className="flex items-center space-x-4 mt-2">
                              <span className="text-sm">
                                Returned: {record.return_date ? new Date(record.return_date).toLocaleDateString() : 'N/A'}
                              </span>
                            {(record.fine_amount || record.fine) && (record.fine_amount || record.fine) > 0 && (
                                <span className="text-sm text-red-600">
                                  Fine: KES {((record.fine_amount || record.fine) as number).toLocaleString()}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                      <Badge variant="default" className="bg-green-100 text-green-800">
                        Returned
                      </Badge>
                    </div>
                  </div>
                );
              })}
            {borrowRecords.filter(r => r.status === 'returned').length === 0 && (
              <div className="text-center py-8">
                <CheckCircle className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-500">No returns yet</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Biometric Verification Dialog */}
      <BiometricVerification
        isOpen={showBiometricVerification}
        onClose={() => {
          setShowBiometricVerification(false);
          setPendingIssueData(null);
        }}
        onVerificationSuccess={handleBiometricVerificationSuccess}
        onVerificationError={handleBiometricVerificationError}
      />

      {/* Manual Student Selection Dialog */}
      <Dialog open={showManualStudentSelection} onOpenChange={setShowManualStudentSelection}>
        <DialogContent className="sm:max-w-[600px] mx-4 max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <User className="h-5 w-5 text-primary" />
              Manual Student Selection
            </DialogTitle>
            <DialogDescription>
              Select a student manually when biometric verification is not available
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Search Input */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Search Students</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <Input
                  placeholder="Search by admission number, name, email, or class..."
                  value={manualStudentSearchQuery}
                  onChange={(e) => setManualStudentSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Student List */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Select Student</label>
              <div className="max-h-60 overflow-y-auto border rounded-lg">
                {filteredManualStudents.length > 0 ? (
                  filteredManualStudents.map((student) => (
                    <div
                      key={student.id}
                      className={`p-3 border-b cursor-pointer hover:bg-gray-50 transition-colors ${
                        manualSelectedStudentId === student.id ? 'bg-blue-50 border-blue-200' : ''
                      }`}
                      onClick={() => setManualSelectedStudentId(student.id)}
                    >
                      <div className="flex items-start space-x-3">
                        <div className={`p-2 rounded-lg flex-shrink-0 ${
                          manualSelectedStudentId === student.id ? 'bg-blue-100' : 'bg-green-100'
                        }`}>
                          <User className={`h-4 w-4 ${
                            manualSelectedStudentId === student.id ? 'text-blue-600' : 'text-green-600'
                          }`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-sm truncate">{student.name}</h3>
                          <p className="text-gray-600 text-xs truncate">{student.email}</p>
                          <div className="flex items-center space-x-3 mt-1">
                            <span className="text-xs">
                              <span className="font-medium">Adm:</span> {student.admission_number}
                            </span>
                            <span className="text-xs">
                              <span className="font-medium">Class:</span> {student.class}
                            </span>
                          </div>
                        </div>
                        {manualSelectedStudentId === student.id && (
                          <div className="flex-shrink-0">
                            <div className="w-4 h-4 bg-blue-600 rounded-full flex items-center justify-center">
                              <CheckCircle className="h-3 w-3 text-white" />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-4 text-center text-gray-500">
                    {manualStudentSearchQuery ? 'No students found matching your search' : 'No students available'}
                  </div>
                )}
              </div>
            </div>

            {/* Selected Student Info */}
            {manualSelectedStudentId && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle className="h-4 w-4 text-blue-600" />
                  <span className="font-medium text-blue-800 text-sm">Selected Student</span>
                </div>
                {(() => {
                  const selectedStudent = students.find(s => s.id === manualSelectedStudentId);
                  return selectedStudent ? (
                    <div className="text-sm space-y-1">
                      <div><span className="font-medium">Name:</span> {selectedStudent.name}</div>
                      <div><span className="font-medium">Admission:</span> {selectedStudent.admission_number}</div>
                      <div><span className="font-medium">Class:</span> {selectedStudent.class}</div>
                      <div><span className="font-medium">Email:</span> {selectedStudent.email || 'Not provided'}</div>
                    </div>
                  ) : null;
                })()}
              </div>
            )}
          </div>

          <DialogFooter className="flex flex-col-reverse sm:flex-row gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => {
                setShowManualStudentSelection(false);
                setManualSelectedStudentId('');
                setManualStudentSearchQuery('');
                setPendingIssueData(null);
              }}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button
              onClick={handleManualStudentSelection}
              disabled={!manualSelectedStudentId}
              className="w-full sm:w-auto"
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Issue Book to Selected Student
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
