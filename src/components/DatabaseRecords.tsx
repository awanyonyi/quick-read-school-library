import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Book, Student, BorrowRecord } from '../types';
import { fetchBooks, fetchStudents, fetchBorrowRecords, calculateFine } from '../utils/libraryData';
import {
  BookOpen,
  Users,
  Search,
  Filter,
  Shield,
  Calendar,
  Hash,
  Mail,
  GraduationCap,
  RefreshCw,
  Clock,
  AlertTriangle,
  CheckCircle
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface DatabaseRecordsProps {
  onUpdate?: () => void;
}

export const DatabaseRecords: React.FC<DatabaseRecordsProps> = ({ onUpdate }) => {
  const [books, setBooks] = useState<Book[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [borrowRecords, setBorrowRecords] = useState<BorrowRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [bookSearch, setBookSearch] = useState('');
  const [studentSearch, setStudentSearch] = useState('');
  const [borrowSearch, setBorrowSearch] = useState('');
  const [bookFilter, setBookFilter] = useState<'all' | 'available' | 'borrowed'>('all');
  const [studentFilter, setStudentFilter] = useState<'all' | 'enrolled' | 'not-enrolled'>('all');
  const [borrowFilter, setBorrowFilter] = useState<'all' | 'active' | 'returned' | 'overdue'>('all');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [booksData, studentsData, borrowData] = await Promise.all([
        fetchBooks(),
        fetchStudents(),
        fetchBorrowRecords()
      ]);

      setBooks(booksData as Book[]);
      setStudents(studentsData);
      setBorrowRecords(borrowData as BorrowRecord[]);
    } catch (error) {
      console.error('Error loading database records:', error);
      toast({
        title: "Error",
        description: "Failed to load database records",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Filter and search books
  const filteredBooks = useMemo(() => {
    let filtered = books;

    // Apply search filter
    if (bookSearch.trim()) {
      filtered = filtered.filter(book =>
        book.title.toLowerCase().includes(bookSearch.toLowerCase()) ||
        book.author.toLowerCase().includes(bookSearch.toLowerCase()) ||
        (book.isbn && book.isbn.toLowerCase().includes(bookSearch.toLowerCase())) ||
        (book.category && book.category.toLowerCase().includes(bookSearch.toLowerCase()))
      );
    }

    // Apply availability filter
    if (bookFilter !== 'all') {
      filtered = filtered.filter(book => {
        if (bookFilter === 'available') {
          return book.available_copies > 0;
        } else if (bookFilter === 'borrowed') {
          return book.available_copies < book.total_copies;
        }
        return true;
      });
    }

    return filtered;
  }, [books, bookSearch, bookFilter]);

  // Filter and search students
  const filteredStudents = useMemo(() => {
    let filtered = students;

    // Apply search filter
    if (studentSearch.trim()) {
      filtered = filtered.filter(student =>
        student.name.toLowerCase().includes(studentSearch.toLowerCase()) ||
        student.admission_number.toLowerCase().includes(studentSearch.toLowerCase()) ||
        student.email.toLowerCase().includes(studentSearch.toLowerCase()) ||
        student.class.toLowerCase().includes(studentSearch.toLowerCase())
      );
    }

    // Apply biometric enrollment filter
    if (studentFilter !== 'all') {
      filtered = filtered.filter(student => {
        if (studentFilter === 'enrolled') {
          return student.biometric_enrolled;
        } else if (studentFilter === 'not-enrolled') {
          return !student.biometric_enrolled;
        }
        return true;
      });
    }

    return filtered;
  }, [students, studentSearch, studentFilter]);

  // Filter and search borrowing records
  const filteredBorrowRecords = useMemo(() => {
    let filtered = borrowRecords;

    // Apply search filter
    if (borrowSearch.trim()) {
      filtered = filtered.filter(record => {
        const book = books.find(b => b.id === record.book_id);
        const student = students.find(s => s.id === record.student_id);
        const searchTerm = borrowSearch.toLowerCase();

        return (
          book?.title.toLowerCase().includes(searchTerm) ||
          book?.author.toLowerCase().includes(searchTerm) ||
          book?.isbn?.toLowerCase().includes(searchTerm) ||
          student?.name.toLowerCase().includes(searchTerm) ||
          student?.admission_number.toLowerCase().includes(searchTerm) ||
          record.id.toLowerCase().includes(searchTerm)
        );
      });
    }

    // Apply status filter
    if (borrowFilter !== 'all') {
      filtered = filtered.filter(record => {
        if (borrowFilter === 'active') {
          return record.status === 'borrowed';
        } else if (borrowFilter === 'returned') {
          return record.status === 'returned';
        } else if (borrowFilter === 'overdue') {
          return record.status === 'borrowed' && new Date() > new Date(record.due_date);
        }
        return true;
      });
    }

    return filtered;
  }, [borrowRecords, borrowSearch, borrowFilter, books, students]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="h-8 w-8 animate-spin text-blue-600" />
        <span className="ml-2 text-gray-600">Loading database records...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Database Records</h2>
          <p className="text-gray-600">View and manage all books and students in the database</p>
        </div>
        <Button onClick={loadData} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh Data
        </Button>
      </div>

      <Tabs defaultValue="books" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="books" className="flex items-center gap-2">
            <BookOpen className="h-4 w-4" />
            Books ({filteredBooks.length})
          </TabsTrigger>
          <TabsTrigger value="students" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Students ({filteredStudents.length})
          </TabsTrigger>
          <TabsTrigger value="borrowing" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Borrowing ({filteredBorrowRecords.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="books" className="space-y-6">
          {/* Books Search and Filter */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Search className="h-5 w-5" />
                Search & Filter Books
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <Input
                    placeholder="Search by title, author, ISBN, or category..."
                    value={bookSearch}
                    onChange={(e) => setBookSearch(e.target.value)}
                    className="w-full"
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    variant={bookFilter === 'all' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setBookFilter('all')}
                  >
                    All ({books.length})
                  </Button>
                  <Button
                    variant={bookFilter === 'available' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setBookFilter('available')}
                  >
                    Available ({books.filter(b => b.available_copies > 0).length})
                  </Button>
                  <Button
                    variant={bookFilter === 'borrowed' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setBookFilter('borrowed')}
                  >
                    Borrowed ({books.filter(b => b.available_copies < b.total_copies).length})
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Books Table */}
          <Card>
            <CardHeader>
              <CardTitle>Books Database Records</CardTitle>
              <CardDescription>
                Complete list of all books in the library database
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4 font-medium">Title</th>
                      <th className="text-left py-3 px-4 font-medium">Author</th>
                      <th className="text-left py-3 px-4 font-medium">ISBN</th>
                      <th className="text-left py-3 px-4 font-medium">Category</th>
                      <th className="text-center py-3 px-4 font-medium">Total</th>
                      <th className="text-center py-3 px-4 font-medium">Available</th>
                      <th className="text-center py-3 px-4 font-medium">Status</th>
                      <th className="text-left py-3 px-4 font-medium">Added</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredBooks.map((book) => (
                      <tr key={book.id} className="border-b hover:bg-gray-50">
                        <td className="py-3 px-4">
                          <div className="font-medium">{book.title}</div>
                        </td>
                        <td className="py-3 px-4">{book.author}</td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-1">
                            <Hash className="h-3 w-3 text-gray-400" />
                            {book.isbn || 'N/A'}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <Badge variant="outline">{book.category || 'Uncategorized'}</Badge>
                        </td>
                        <td className="py-3 px-4 text-center font-medium">{book.total_copies}</td>
                        <td className="py-3 px-4 text-center">
                          <span className={`font-medium ${book.available_copies > 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {book.available_copies}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <Badge
                            variant={book.available_copies > 0 ? 'default' : 'destructive'}
                            className={book.available_copies > 0 ? 'bg-green-100 text-green-800' : ''}
                          >
                            {book.available_copies > 0 ? 'Available' : 'Unavailable'}
                          </Badge>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-1 text-gray-500">
                            <Calendar className="h-3 w-3" />
                            {book.created_at ? new Date(book.created_at).toLocaleDateString() : 'N/A'}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {filteredBooks.length === 0 && (
                  <div className="text-center py-12">
                    <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">No books found matching your criteria</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="students" className="space-y-6">
          {/* Students Search and Filter */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Search className="h-5 w-5" />
                Search & Filter Students
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <Input
                    placeholder="Search by name, admission number, email, or class..."
                    value={studentSearch}
                    onChange={(e) => setStudentSearch(e.target.value)}
                    className="w-full"
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    variant={studentFilter === 'all' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setStudentFilter('all')}
                  >
                    All ({students.length})
                  </Button>
                  <Button
                    variant={studentFilter === 'enrolled' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setStudentFilter('enrolled')}
                  >
                    Biometric Enrolled ({students.filter(s => s.biometric_enrolled).length})
                  </Button>
                  <Button
                    variant={studentFilter === 'not-enrolled' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setStudentFilter('not-enrolled')}
                  >
                    Not Enrolled ({students.filter(s => !s.biometric_enrolled).length})
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Students Table */}
          <Card>
            <CardHeader>
              <CardTitle>Students Database Records</CardTitle>
              <CardDescription>
                Complete list of all students in the library database
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4 font-medium">Name</th>
                      <th className="text-left py-3 px-4 font-medium">Admission No.</th>
                      <th className="text-left py-3 px-4 font-medium">Email</th>
                      <th className="text-left py-3 px-4 font-medium">Class</th>
                      <th className="text-center py-3 px-4 font-medium">Biometric Status</th>
                      <th className="text-left py-3 px-4 font-medium">Registered</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredStudents.map((student) => (
                      <tr key={student.id} className="border-b hover:bg-gray-50">
                        <td className="py-3 px-4">
                          <div className="font-medium">{student.name}</div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-1">
                            <Hash className="h-3 w-3 text-gray-400" />
                            {student.admission_number}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-1">
                            <Mail className="h-3 w-3 text-gray-400" />
                            {student.email}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-1">
                            <GraduationCap className="h-3 w-3 text-gray-400" />
                            {student.class}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-center">
                          {student.biometric_enrolled ? (
                            <Badge className="bg-green-100 text-green-800">
                              <Shield className="h-3 w-3 mr-1" />
                              Enrolled
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-gray-500">
                              Not Enrolled
                            </Badge>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-1 text-gray-500">
                            <Calendar className="h-3 w-3" />
                            {student.created_at ? new Date(student.created_at).toLocaleDateString() : 'N/A'}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {filteredStudents.length === 0 && (
                  <div className="text-center py-12">
                    <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">No students found matching your criteria</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="borrowing" className="space-y-6">
          {/* Borrowing Records Search and Filter */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Search className="h-5 w-5" />
                Search & Filter Borrowing Records
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <Input
                    placeholder="Search by book title, author, ISBN, student name, or record ID..."
                    value={borrowSearch}
                    onChange={(e) => setBorrowSearch(e.target.value)}
                    className="w-full"
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    variant={borrowFilter === 'all' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setBorrowFilter('all')}
                  >
                    All ({borrowRecords.length})
                  </Button>
                  <Button
                    variant={borrowFilter === 'active' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setBorrowFilter('active')}
                  >
                    Active ({borrowRecords.filter(r => r.status === 'borrowed').length})
                  </Button>
                  <Button
                    variant={borrowFilter === 'returned' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setBorrowFilter('returned')}
                  >
                    Returned ({borrowRecords.filter(r => r.status === 'returned').length})
                  </Button>
                  <Button
                    variant={borrowFilter === 'overdue' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setBorrowFilter('overdue')}
                    className="text-red-600"
                  >
                    Overdue ({borrowRecords.filter(r => r.status === 'borrowed' && new Date() > new Date(r.due_date)).length})
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Borrowing Records Table */}
          <Card>
            <CardHeader>
              <CardTitle>Borrowing Records Database</CardTitle>
              <CardDescription>
                Complete list of all borrowing transactions in the library database
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4 font-medium">Record ID</th>
                      <th className="text-left py-3 px-4 font-medium">Book Details</th>
                      <th className="text-left py-3 px-4 font-medium">Student</th>
                      <th className="text-left py-3 px-4 font-medium">Borrow Date</th>
                      <th className="text-left py-3 px-4 font-medium">Due Date</th>
                      <th className="text-left py-3 px-4 font-medium">Return Date</th>
                      <th className="text-center py-3 px-4 font-medium">Status</th>
                      <th className="text-center py-3 px-4 font-medium">Fine</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredBorrowRecords.map((record) => {
                      const book = books.find(b => b.id === record.book_id);
                      const student = students.find(s => s.id === record.student_id);
                      const isOverdue = record.status === 'borrowed' && new Date() > new Date(record.due_date);
                      const fine = isOverdue ? calculateFine(record.due_date) : 0;

                      return (
                        <tr key={record.id} className="border-b hover:bg-gray-50">
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-1">
                              <Hash className="h-3 w-3 text-gray-400" />
                              <span className="font-mono text-xs">{record.id.slice(-8)}</span>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="font-medium">{book?.title || 'Unknown Book'}</div>
                            <div className="text-sm text-gray-500">by {book?.author || 'Unknown Author'}</div>
                            <div className="text-xs text-gray-400">ISBN: {book?.isbn || 'N/A'}</div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="font-medium">{student?.name || 'Unknown Student'}</div>
                            <div className="text-sm text-gray-500">({student?.admission_number})</div>
                            <div className="text-xs text-gray-400">{student?.class || 'N/A'}</div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-1 text-gray-500">
                              <Calendar className="h-3 w-3" />
                              {new Date(record.borrow_date).toLocaleDateString()}
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <div className={`flex items-center gap-1 ${isOverdue ? 'text-red-600' : 'text-gray-500'}`}>
                              <Calendar className="h-3 w-3" />
                              {new Date(record.due_date).toLocaleDateString()}
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            {record.return_date ? (
                              <div className="flex items-center gap-1 text-green-600">
                                <CheckCircle className="h-3 w-3" />
                                {new Date(record.return_date).toLocaleDateString()}
                              </div>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <Badge
                              variant={record.status === 'returned' ? 'default' : (isOverdue ? 'destructive' : 'secondary')}
                              className={
                                record.status === 'returned'
                                  ? 'bg-green-100 text-green-800'
                                  : isOverdue
                                    ? 'bg-red-100 text-red-800'
                                    : 'bg-blue-100 text-blue-800'
                              }
                            >
                              {record.status === 'returned' ? 'Returned' : isOverdue ? 'Overdue' : 'Active'}
                            </Badge>
                          </td>
                          <td className="py-3 px-4 text-center">
                            {fine > 0 ? (
                              <span className="text-red-600 font-medium">
                                KES {fine.toLocaleString()}
                              </span>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {filteredBorrowRecords.length === 0 && (
                  <div className="text-center py-12">
                    <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">No borrowing records found matching your criteria</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};