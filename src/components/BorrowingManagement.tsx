
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Book, Student, BorrowRecord } from '../types';
import { calculateFine, getBorrowDueDate } from '../utils/libraryData';
import { Plus, BookOpen, User, Clock, CheckCircle, AlertTriangle } from 'lucide-react';
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

  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    const booksData = JSON.parse(localStorage.getItem('library_books') || '[]');
    const studentsData = JSON.parse(localStorage.getItem('library_students') || '[]');
    const recordsData = JSON.parse(localStorage.getItem('library_borrow_records') || '[]');
    
    setBooks(booksData);
    setStudents(studentsData);
    setBorrowRecords(recordsData);
  };

  const handleIssueBook = () => {
    if (!selectedBookId || !selectedStudentId) {
      toast({
        title: "Error",
        description: "Please select both a book and a student",
        variant: "destructive"
      });
      return;
    }

    const book = books.find(b => b.id === selectedBookId);
    if (!book || book.availableCopies <= 0) {
      toast({
        title: "Error",
        description: "Book is not available for borrowing",
        variant: "destructive"
      });
      return;
    }

    // Check if student already has this book
    const existingRecord = borrowRecords.find(record => 
      record.bookId === selectedBookId && 
      record.studentId === selectedStudentId && 
      record.status === 'borrowed'
    );

    if (existingRecord) {
      toast({
        title: "Error",
        description: "Student already has this book borrowed",
        variant: "destructive"
      });
      return;
    }

    const borrowDate = new Date().toISOString();
    const dueDate = getBorrowDueDate(borrowDate);

    // Create borrow record
    const newRecord: BorrowRecord = {
      id: Date.now().toString(),
      bookId: selectedBookId,
      studentId: selectedStudentId,
      borrowDate,
      returnDate: null,
      dueDate,
      fine: 0,
      status: 'borrowed'
    };

    // Update records
    const updatedRecords = [...borrowRecords, newRecord];
    localStorage.setItem('library_borrow_records', JSON.stringify(updatedRecords));

    // Update book availability
    const updatedBooks = books.map(b => 
      b.id === selectedBookId 
        ? { ...b, availableCopies: b.availableCopies - 1 }
        : b
    );
    localStorage.setItem('library_books', JSON.stringify(updatedBooks));

    toast({
      title: "Success",
      description: "Book issued successfully"
    });

    setSelectedBookId('');
    setSelectedStudentId('');
    setIsIssueDialogOpen(false);
    loadData();
    onUpdate();
  };

  const handleReturnBook = (recordId: string) => {
    const record = borrowRecords.find(r => r.id === recordId);
    if (!record) return;

    const returnDate = new Date().toISOString();
    const fine = calculateFine(record.dueDate);

    // Update record
    const updatedRecords = borrowRecords.map(r => 
      r.id === recordId 
        ? {
            ...r,
            returnDate,
            fine,
            status: 'returned' as const
          }
        : r
    );
    localStorage.setItem('library_borrow_records', JSON.stringify(updatedRecords));

    // Update book availability
    const updatedBooks = books.map(b => 
      b.id === record.bookId 
        ? { ...b, availableCopies: b.availableCopies + 1 }
        : b
    );
    localStorage.setItem('library_books', JSON.stringify(updatedBooks));

    toast({
      title: "Success",
      description: `Book returned successfully${fine > 0 ? ` with KES ${fine} fine` : ''}`
    });

    loadData();
    onUpdate();
  };

  const availableBooks = books.filter(book => book.availableCopies > 0);
  const activeBorrowRecords = borrowRecords.filter(record => record.status === 'borrowed');
  const overdueRecords = activeBorrowRecords.filter(record => new Date() > new Date(record.dueDate));

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
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Issue Book</DialogTitle>
              <DialogDescription>
                Select a book and student to issue a book
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Select Book</label>
                <Select value={selectedBookId} onValueChange={setSelectedBookId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a book..." />
                  </SelectTrigger>
                  <SelectContent>
                    {availableBooks.map((book) => (
                      <SelectItem key={book.id} value={book.id}>
                        {book.title} - {book.author} (Available: {book.availableCopies})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Select Student</label>
                <Select value={selectedStudentId} onValueChange={setSelectedStudentId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a student..." />
                  </SelectTrigger>
                  <SelectContent>
                    {students.map((student) => (
                      <SelectItem key={student.id} value={student.id}>
                        {student.name} ({student.admissionNumber})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsIssueDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleIssueBook}>
                Issue Book
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

      {/* Active Borrowings */}
      <Card>
        <CardHeader>
          <CardTitle>Active Borrowings</CardTitle>
          <CardDescription>Books currently borrowed by students</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {activeBorrowRecords.map((record) => {
              const book = books.find(b => b.id === record.bookId);
              const student = students.find(s => s.id === record.studentId);
              const isOverdue = new Date() > new Date(record.dueDate);
              const fine = isOverdue ? calculateFine(record.dueDate) : 0;

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
                          <div className="flex items-center space-x-2 mt-2">
                            <User className="h-4 w-4 text-gray-400" />
                            <span className="text-sm">{student?.name || 'Unknown Student'}</span>
                            <span className="text-sm text-gray-500">({student?.admissionNumber})</span>
                          </div>
                          <div className="flex items-center space-x-4 mt-2">
                            <span className="text-sm">
                              Borrowed: {new Date(record.borrowDate).toLocaleDateString()}
                            </span>
                            <span className="text-sm">
                              Due: {new Date(record.dueDate).toLocaleString()}
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

      {/* Recent Returns */}
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
                const book = books.find(b => b.id === record.bookId);
                const student = students.find(s => s.id === record.studentId);

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
                            <div className="flex items-center space-x-2 mt-2">
                              <User className="h-4 w-4 text-gray-400" />
                              <span className="text-sm">{student?.name || 'Unknown Student'}</span>
                            </div>
                            <div className="flex items-center space-x-4 mt-2">
                              <span className="text-sm">
                                Returned: {record.returnDate ? new Date(record.returnDate).toLocaleDateString() : 'N/A'}
                              </span>
                              {record.fine > 0 && (
                                <span className="text-sm text-red-600">
                                  Fine: KES {record.fine.toLocaleString()}
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
    </div>
  );
};
