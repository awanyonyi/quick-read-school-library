
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Book, Student, BorrowRecord } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { BookManagement } from './BookManagement';
import { StudentManagement } from './StudentManagement';
import { BorrowingManagement } from './BorrowingManagement';
import { WeeklyReport } from './WeeklyReport';
import { QuickReturnNavbar } from './QuickReturnNavbar';
import { DashboardStats } from './dashboard/DashboardStats';
import { StudentSearch } from './dashboard/StudentSearch';
import { RecentActivity } from './dashboard/RecentActivity';
import { calculateFine, fetchBooks, fetchStudents, fetchBorrowRecords, returnBook } from '../utils/libraryData';
import { 
  BookOpen, 
  Users, 
  Clock, 
  LogOut,
  Library,
  FileText
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';

const AdminDashboard = () => {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [books, setBooks] = useState<Book[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [borrowRecords, setBorrowRecords] = useState<BorrowRecord[]>([]);

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
                  className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
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
            <DashboardStats books={books} borrowRecords={borrowRecords} />
            <StudentSearch />
            <RecentActivity books={books} students={students} borrowRecords={borrowRecords} />
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
