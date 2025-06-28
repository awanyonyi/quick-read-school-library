
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Book, BorrowRecord } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { calculateFine } from '../utils/libraryData';
import { 
  BookOpen, 
  LogOut, 
  Search, 
  Clock, 
  AlertTriangle,
  CheckCircle,
  Filter
} from 'lucide-react';

const StudentDashboard = () => {
  const { user, logout } = useAuth();
  const [books, setBooks] = useState<Book[]>([]);
  const [borrowRecords, setBorrowRecords] = useState<BorrowRecord[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    const booksData = JSON.parse(localStorage.getItem('library_books') || '[]');
    const recordsData = JSON.parse(localStorage.getItem('library_borrow_records') || '[]');
    
    setBooks(booksData);
    setBorrowRecords(recordsData.filter((record: BorrowRecord) => record.studentId === user?.id));
  };

  const categories = ['all', ...new Set(books.map(book => book.category))];
  
  const filteredBooks = books.filter(book => {
    const matchesSearch = book.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         book.author.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || book category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const myBorrowedBooks = borrowRecords.filter(record => record.status === 'borrowed');
  const myOverdueBooks = borrowRecords.filter(record => {
    if (record.status !== 'borrowed') return false;
    return new Date() > new Date(record.dueDate);
  });

  const totalFines = borrowRecords.reduce((sum, record) => {
    if (record.status === 'borrowed' && new Date() > new Date(record.dueDate)) {
      return sum + calculateFine(record.dueDate);
    }
    return sum + record.fine;
  }, 0);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <div className="bg-green-600 p-2 rounded-lg">
                <BookOpen className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">Student Portal</h1>
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

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Search and Filter */}
            <Card>
              <CardHeader>
                <CardTitle>Available Books</CardTitle>
                <CardDescription>Browse and search for books available in the library</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col sm:flex-row gap-4 mb-6">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Search books by title or author..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <div className="relative">
                    <Filter className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <select
                      value={selectedCategory}
                      onChange={(e) => setSelectedCategory(e.target.value)}
                      className="pl-10 pr-8 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    >
                      {categories.map(category => (
                        <option key={category} value={category}>
                          {category === 'all' ? 'All Categories' : category}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid gap-4">
                  {filteredBooks.map((book) => (
                    <div key={book.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h3 className="font-semibold text-lg">{book.title}</h3>
                          <p className="text-gray-600">by {book.author}</p>
                          <div className="flex items-center space-x-4 mt-2">
                            <Badge variant="secondary">{book.category}</Badge>
                            <span className="text-sm text-gray-500">ISBN: {book.isbn}</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="flex items-center space-x-2">
                            {book.availableCopies > 0 ? (
                              <Badge variant="default" className="bg-green-100 text-green-800">
                                Available ({book.availableCopies})
                              </Badge>
                            ) : (
                              <Badge variant="destructive">
                                Out of Stock
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-gray-500 mt-1">
                            Total: {book.totalCopies} copies
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                  {filteredBooks.length === 0 && (
                    <div className="text-center py-12">
                      <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-500">No books found matching your search</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Quick Stats */}
            <Card>
              <CardHeader>
                <CardTitle>My Library Status</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Clock className="h-4 w-4 text-blue-600" />
                    <span className="text-sm">Borrowed Books</span>
                  </div>
                  <Badge variant="outline">{myBorrowedBooks.length}</Badge>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <AlertTriangle className="h-4 w-4 text-red-600" />
                    <span className="text-sm">Overdue Books</span>
                  </div>
                  <Badge variant={myOverdueBooks.length > 0 ? "destructive" : "outline"}>
                    {myOverdueBooks.length}
                  </Badge>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium">Total Fines</span>
                  </div>
                  <span className={`font-bold ${totalFines > 0 ? 'text-red-600' : 'text-green-600'}`}>
                    KES {totalFines.toLocaleString()}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* My Borrowing History */}
            <Card>
              <CardHeader>
                <CardTitle>My Borrowing History</CardTitle>
                <CardDescription>Your recent book borrowing activity</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {borrowRecords.slice(-5).reverse().map((record) => {
                    const book = books.find(b => b.id === record.bookId);
                    const isOverdue = record.status === 'borrowed' && new Date() > new Date(record.dueDate);
                    const fine = isOverdue ? calculateFine(record.dueDate) : record.fine;
                    
                    return (
                      <div key={record.id} className="border rounded-lg p-3">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h4 className="font-medium text-sm">{book?.title || 'Unknown Book'}</h4>
                            <p className="text-xs text-gray-500">
                              Borrowed: {new Date(record.borrowDate).toLocaleDateString()}
                            </p>
                            {record.status === 'borrowed' && (
                              <p className="text-xs text-gray-500">
                                Due: {new Date(record.dueDate).toLocaleString()}
                              </p>
                            )}
                          </div>
                          <div className="text-right">
                            <Badge 
                              variant={
                                record.status === 'returned' ? 'default' :
                                isOverdue ? 'destructive' : 'secondary'
                              }
                              className="text-xs"
                            >
                              {isOverdue ? 'overdue' : record.status}
                            </Badge>
                            {fine > 0 && (
                              <p className="text-xs text-red-600 mt-1">
                                Fine: KES {fine}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {borrowRecords.length === 0 && (
                    <div className="text-center py-6">
                      <CheckCircle className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                      <p className="text-sm text-gray-500">No borrowing history yet</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
};

export default StudentDashboard;
