import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BookOpen, TrendingUp, Clock, AlertTriangle } from 'lucide-react';
import { Book, BorrowRecord } from '../../types';

interface DashboardStatsProps {
  books: Book[];
  borrowRecords: BorrowRecord[];
}

export const DashboardStats: React.FC<DashboardStatsProps> = ({ books, borrowRecords }) => {
  const totalBooks = books.reduce((sum, book) => sum + book.total_copies, 0);
  const availableBooks = books.reduce((sum, book) => sum + book.available_copies, 0);
  const borrowedBooks = totalBooks - availableBooks;
  const overdueBooks = borrowRecords.filter(record => 
    record.status === 'overdue' || 
    (record.status === 'borrowed' && new Date() > new Date(record.due_date))
  ).length;

  return (
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
  );
};