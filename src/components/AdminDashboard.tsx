import schoolLogo from '@/assets/school-logo.jpeg'
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Book, Student, BorrowRecord } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { BookManagement } from './BookManagement';
import { StudentManagement } from './StudentManagement';
import { BorrowingManagement } from './BorrowingManagement';
import BlacklistManagement from './BlacklistManagement';
import { WeeklyReport } from './WeeklyReport';
import { DatabaseRecords } from './DatabaseRecords';
import { QuickReturnNavbar } from './QuickReturnNavbar';
import { DashboardStats } from './dashboard/DashboardStats';
import { StudentSearch } from './dashboard/StudentSearch';
import { BorrowingRecordSearch } from './dashboard/BorrowingRecordSearch';
import { RecentActivity } from './dashboard/RecentActivity';
import AdminPasswordReset from './dashboard/AdminPasswordReset';
import { calculateFine, fetchBooks, fetchStudents, fetchBorrowRecords, returnBook } from '../utils/libraryData';
import {
  BookOpen,
  Users,
  Clock,
  LogOut,
  Library,
  FileText,
  Settings,
  UserX,
  Database
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
      // Return book using Supabase
      await returnBook(recordId);

      toast({
        title: "Success",
        description: "Book returned successfully"
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
    { id: 'database', label: 'Database Records', icon: Database },
    { id: 'books', label: 'Books', icon: BookOpen },
    { id: 'students', label: 'Students', icon: Users },
    { id: 'borrowing', label: 'Borrowing', icon: Clock },
    { id: 'blacklist', label: 'Blacklist', icon: UserX },
    { id: 'reports', label: 'Weekly Reports', icon: FileText },
    { id: 'settings', label: 'Settings', icon: Settings }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-2 sm:space-x-4">
              <img
                src={schoolLogo}
                alt="School Logo"
                className="h-10 w-10 sm:h-14 sm:w-14 object-contain rounded-full border border-gray-300 shadow"
                style={{ marginBottom: 0 }}
              />
              <div className="min-w-0 flex-1">
                <h1 className="text-lg sm:text-xl font-semibold text-gray-900 truncate">Library Admin</h1>
                <p className="text-xs sm:text-sm text-gray-500 truncate">Welcome, {user?.name}</p>
              </div>
            </div>
            <Button onClick={logout} variant="outline" size="sm" className="shrink-0">
              <LogOut className="h-4 w-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">Logout</span>
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
      <nav className="bg-white border-b overflow-x-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-2 sm:space-x-8 min-w-max">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center space-x-1 sm:space-x-2 py-3 sm:py-4 px-2 sm:px-1 border-b-2 font-medium text-xs sm:text-sm transition-colors whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className="h-3 w-3 sm:h-4 sm:w-4" />
                  <span className="hidden xs:inline sm:inline">{tab.label}</span>
                  <span className="xs:hidden sm:hidden">{tab.label.split(' ')[0]}</span>
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
            <BorrowingRecordSearch />
            <RecentActivity books={books} students={students} borrowRecords={borrowRecords} />
          </div>
        )}

        {activeTab === 'database' && <DatabaseRecords onUpdate={loadData} />}

        {activeTab === 'books' && <BookManagement onUpdate={loadData} />}
        {activeTab === 'students' && <StudentManagement onUpdate={loadData} />}
        {activeTab === 'borrowing' && <BorrowingManagement onUpdate={loadData} />}
        {activeTab === 'blacklist' && <BlacklistManagement onUpdate={loadData} />}
        {activeTab === 'reports' && <WeeklyReport onUpdate={loadData} />}
        {activeTab === 'settings' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Admin Settings</h2>
              <p className="text-gray-600">Manage your admin account settings</p>
            </div>
            <AdminPasswordReset />
          </div>
        )}
      </main>
    </div>
  );
};

export default AdminDashboard;
