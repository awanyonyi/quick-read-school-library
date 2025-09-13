
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
import { toast } from '@/hooks/use-toast';

interface BorrowingManagementProps {
  onUpdate: () => void;
}

export const BorrowingManagement: React.FC<BorrowingManagementProps> = ({ onUpdate }) => {
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

      // Enhanced success message with detailed student information
      toast({
        title: "✅ Book Issued Successfully",
        description: (
          <div className="space-y-2">
            <div className="font-semibold text-green-700">
              📖 {book.title}
            </div>
            <div className="text-sm">
              <div className="font-medium">👤 {verifiedStudent.name}</div>
              <div className="text-gray-600">
                Admission: {verifiedStudent.admission_number} • Class: {verifiedStudent.class}
              </div>
              <div className="text-gray-600">
                Due: {getBorrowDueDate(
                  new Date(),
                  pendingIssueData.borrowPeriod.value,
                  pendingIssueData.borrowPeriod.unit
                ).toLocaleDateString()}
              </div>
            </div>
            <div className="text-xs text-green-600 font-medium">
              🔐 Biometric verification successful
            </div>
          </div>
        ),
        duration: 8000, // Show longer for detailed info
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
    setPendingIssueData(null);
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
             <DialogFooter>
               <Button variant="outline" onClick={() => setIsIssueDialogOpen(false)}>
                 Cancel
               </Button>
               <Button onClick={handleIssueBook} className="flex items-center gap-2">
                 <Shield className="h-4 w-4" />
                 Proceed with Biometric Verification
               </Button>
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
    </div>
  );
};
