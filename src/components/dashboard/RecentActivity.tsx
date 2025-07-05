import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Book, Student, BorrowRecord } from '../../types';

interface RecentActivityProps {
  books: Book[];
  students: Student[];
  borrowRecords: BorrowRecord[];
}

export const RecentActivity: React.FC<RecentActivityProps> = ({ 
  books, 
  students, 
  borrowRecords 
}) => {
  return (
    <Card className="animate-fade-in">
      <CardHeader>
        <CardTitle>Recent Borrowing Activity</CardTitle>
        <CardDescription>Latest book transactions</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {borrowRecords.slice(-5).reverse().map((record, index) => {
            const book = books.find(b => b.id === record.book_id);
            const student = students.find(s => s.id === record.student_id);
            return (
              <div 
                key={record.id} 
                className="flex items-center justify-between p-4 border rounded-lg hover:shadow-md transition-shadow animate-fade-in"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div className="flex-1">
                  <h4 className="font-medium">{book?.title || 'Unknown Book'}</h4>
                  <p className="text-sm text-gray-500">
                    Borrowed by {student?.name || 'Unknown Student'}
                  </p>
                </div>
                <div className="text-right">
                  <Badge 
                    variant={record.status === 'overdue' ? 'destructive' : 'default'}
                    className="animate-scale-in"
                  >
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
  );
};