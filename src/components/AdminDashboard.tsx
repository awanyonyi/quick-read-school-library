
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Book, Student, BorrowRecord } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { BookManagement } from './BookManagement';
import { StudentManagement } from './StudentManagement';
import { BorrowingManagement } from './BorrowingManagement';
import { WeeklyReport } from './WeeklyReport';
import { QuickReturnNavbar } from './QuickReturnNavbar';
import { calculateFine, fetchBooks, fetchStudents, fetchBorrowRecords, returnBook } from '../utils/libraryData';
import { 
  BookOpen, 
  Users, 
  Clock, 
  AlertTriangle, 
  LogOut,
  Library,
  TrendingUp,
  FileText,
  Search,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

const AdminDashboard = () => {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [books, setBooks] = useState<Book[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [borrowRecords, setBorrowRecords] = useState<BorrowRecord[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResult, setSearchResult] = useState<{ student: Student | null; searched: boolean }>({ 
    student: null, 
    searched: false 
  });
  const [isSearching, setIsSearching] = useState(false);

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
    }
  };

  const handleQuickReturn = async (recordId: string) => {
    const record = borrowRecords.find(r => r.id === recordId);
    if (!record) return;

    try {
      const fine = calculateFine(record.due_date);

      // Return book using Supabase
      await returnBook(recordId, fine);

      toast({
        title: "Success",
        description: `Book returned successfully${fine > 0 ? ` with KES ${fine} fine` : ''}`
      });

      loadData();
    } catch (error: any) {
      console.error('Error returning book:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to return book",
        variant: "destructive"
      });
    }
  };

  const handleStudentSearch = async () => {
    if (!searchQuery.trim()) {
      toast({
        title: "Error",
        description: "Please enter an admission number to search",
        variant: "destructive"
      });
      return;
    }

    setIsSearching(true);
    try {
      const { data, error } = await supabase
        .from('students')
        .select('*')
        .eq('admission_number', searchQuery.trim())
        .maybeSingle();

      if (error) {
        console.error('Error searching student:', error);
        toast({
          title: "Error",
          description: "Failed to search for student",
          variant: "destructive"
        });
        return;
      }

      setSearchResult({
        student: data,
        searched: true
      });
    } catch (error) {
      console.error('Error searching student:', error);
      toast({
        title: "Error",
        description: "Failed to search for student",
        variant: "destructive"
      });
    } finally {
      setIsSearching(false);
    }
  };

  const handleSearchKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleStudentSearch();
    }
  };

  const clearSearch = () => {
    setSearchQuery('');
    setSearchResult({ student: null, searched: false });
  };

  const totalBooks = books.reduce((sum, book) => sum + book.total_copies, 0);
  const availableBooks = books.reduce((sum, book) => sum + book.available_copies, 0);
  const borrowedBooks = totalBooks - availableBooks;
  const overdueBooks = borrowRecords.filter(record => 
    record.status === 'overdue' || 
    (record.status === 'borrowed' && new Date() > new Date(record.due_date))
  ).length;

  const tabs = [
    { id: 'overview', label: 'Overview', icon: Library },
    { id: 'books', label: 'Books', icon: BookOpen },
    { id: 'students', label: 'Students', icon: Users },
    { id: 'borrowing', label: 'Borrowing', icon: Clock },
    { id: 'reports', label: 'Weekly Reports', icon: FileText }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <div className="bg-blue-600 p-2 rounded-lg">
                <BookOpen className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">Library Admin</h1>
                <p className="text-sm text-gray-500">Welcome, {user?.name}</p>
              </div>
            </div>
            <Button onClick={logout} variant="outline" size="sm">
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      {/* Quick Return Navigation Bar - Always visible */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2">
          <QuickReturnNavbar
            books={books}
            students={students}
            borrowRecords={borrowRecords}
            onReturnBook={handleQuickReturn}
          />
        </div>
      </div>

      {/* Navigation */}
      <nav className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </nav>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Books</CardTitle>
                  <BookOpen className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{totalBooks}</div>
                  <p className="text-xs text-muted-foreground">
                    {books.length} unique titles
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Available</CardTitle>
                  <TrendingUp className="h-4 w-4 text-green-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">{availableBooks}</div>
                  <p className="text-xs text-muted-foreground">
                    Ready for borrowing
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Borrowed</CardTitle>
                  <Clock className="h-4 w-4 text-blue-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-blue-600">{borrowedBooks}</div>
                  <p className="text-xs text-muted-foreground">
                    Currently on loan
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Overdue</CardTitle>
                  <AlertTriangle className="h-4 w-4 text-red-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-red-600">{overdueBooks}</div>
                  <p className="text-xs text-muted-foreground">
                    Need attention
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Student Search Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Search className="h-5 w-5" />
                  Student Registration Check
                </CardTitle>
                <CardDescription>
                  Search by admission number to quickly verify if a student is registered
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Input
                    placeholder="Enter admission number..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyPress={handleSearchKeyPress}
                    className="flex-1"
                  />
                  <Button onClick={handleStudentSearch} disabled={isSearching}>
                    {isSearching ? (
                      <div className="animate-spin h-4 w-4 border-2 border-gray-300 border-t-gray-600 rounded-full" />
                    ) : (
                      <Search className="h-4 w-4" />
                    )}
                  </Button>
                  {searchResult.searched && (
                    <Button variant="outline" onClick={clearSearch}>
                      Clear
                    </Button>
                  )}
                </div>

                {/* Search Result */}
                {searchResult.searched && (
                  <div className="p-4 border rounded-lg">
                    {searchResult.student ? (
                      <div className="flex items-start gap-3">
                        <CheckCircle className="h-6 w-6 text-green-600 mt-0.5" />
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-green-700">Student Found</h3>
                            <Badge variant="default" className="bg-green-100 text-green-700">
                              Registered
                            </Badge>
                          </div>
                          <div className="mt-2 space-y-1">
                            <p><span className="font-medium">Name:</span> {searchResult.student.name}</p>
                            <p><span className="font-medium">Admission Number:</span> {searchResult.student.admission_number}</p>
                            <p><span className="font-medium">Class:</span> {searchResult.student.class}</p>
                            <p><span className="font-medium">Email:</span> {searchResult.student.email}</p>
                            <p className="text-sm text-gray-500">
                              <span className="font-medium">Registered:</span> {' '}
                              {new Date(searchResult.student.created_at || '').toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-start gap-3">
                        <XCircle className="h-6 w-6 text-red-600 mt-0.5" />
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-red-700">Student Not Found</h3>
                            <Badge variant="destructive">
                              Not Registered
                            </Badge>
                          </div>
                          <p className="mt-2 text-gray-600">
                            No student found with admission number: <span className="font-medium">{searchQuery}</span>
                          </p>
                          <p className="text-sm text-gray-500 mt-1">
                            The student may need to be registered in the system first.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Recent Activity */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Borrowing Activity</CardTitle>
                <CardDescription>Latest book transactions</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {borrowRecords.slice(-5).reverse().map((record) => {
                    const book = books.find(b => b.id === record.book_id);
                    const student = students.find(s => s.id === record.student_id);
                    return (
                      <div key={record.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex-1">
                          <h4 className="font-medium">{book?.title || 'Unknown Book'}</h4>
                          <p className="text-sm text-gray-500">
                            Borrowed by {student?.name || 'Unknown Student'}
                          </p>
                        </div>
                        <div className="text-right">
                          <Badge variant={record.status === 'overdue' ? 'destructive' : 'default'}>
                            {record.status}
                          </Badge>
                          <p className="text-xs text-gray-500 mt-1">
                            {new Date(record.borrow_date).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                  {borrowRecords.length === 0 && (
                    <p className="text-gray-500 text-center py-8">No borrowing activity yet</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === 'books' && <BookManagement onUpdate={loadData} />}
        {activeTab === 'students' && <StudentManagement onUpdate={loadData} />}
        {activeTab === 'borrowing' && <BorrowingManagement onUpdate={loadData} />}
        {activeTab === 'reports' && <WeeklyReport onUpdate={loadData} />}
      </main>
    </div>
  );
};

export default AdminDashboard;
