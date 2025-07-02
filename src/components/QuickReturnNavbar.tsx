
import React, { useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Search, Filter, CheckCircle, Clock, AlertTriangle, X } from 'lucide-react';
import { Book, Student, BorrowRecord } from '../types';
import { calculateFine } from '../utils/libraryData';

interface QuickReturnNavbarProps {
  books: Book[];
  students: Student[];
  borrowRecords: BorrowRecord[];
  onReturnBook: (recordId: string) => void;
}

export const QuickReturnNavbar: React.FC<QuickReturnNavbarProps> = ({
  books,
  students,
  borrowRecords,
  onReturnBook
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'overdue'>('all');
  const [isExpanded, setIsExpanded] = useState(false);

  const activeBorrowRecords = borrowRecords.filter(record => record.status === 'borrowed');
  
  const filteredRecords = useMemo(() => {
    let filtered = activeBorrowRecords;

    // Filter by status
    if (statusFilter === 'overdue') {
      filtered = filtered.filter(record => new Date() > new Date(record.due_date));
    }

    // Filter by search query
    if (searchQuery.trim()) {
      filtered = filtered.filter(record => {
        const book = books.find(b => b.id === record.book_id);
        const student = students.find(s => s.id === record.student_id);
        
        const searchTerm = searchQuery.toLowerCase();
        return (
          book?.title.toLowerCase().includes(searchTerm) ||
          book?.author.toLowerCase().includes(searchTerm) ||
          book?.isbn?.toLowerCase().includes(searchTerm) ||
          student?.name.toLowerCase().includes(searchTerm) ||
          student?.admission_number.toLowerCase().includes(searchTerm)
        );
      });
    }

    return filtered;
  }, [activeBorrowRecords, statusFilter, searchQuery, books, students]);

  const overdueCount = activeBorrowRecords.filter(record => 
    new Date() > new Date(record.due_date)
  ).length;

  const clearFilters = () => {
    setSearchQuery('');
    setStatusFilter('all');
  };

  return (
    <Card className="mb-6">
      <CardContent className="p-4">
        {/* Main Navigation Bar */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-4 flex-1">
            {/* Search Input */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                placeholder="Search by student name, book title, ISBN..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Status Filter */}
            <Select value={statusFilter} onValueChange={(value: 'all' | 'active' | 'overdue') => setStatusFilter(value)}>
              <SelectTrigger className="w-40">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Borrowed</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="overdue">Overdue</SelectItem>
              </SelectContent>
            </Select>

            {/* Quick Stats */}
            <div className="flex items-center space-x-3">
              <Badge variant="outline" className="bg-blue-50 text-blue-700">
                <Clock className="h-3 w-3 mr-1" />
                {activeBorrowRecords.length} Active
              </Badge>
              {overdueCount > 0 && (
                <Badge variant="destructive">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  {overdueCount} Overdue
                </Badge>
              )}
            </div>
          </div>

          {/* Clear Filters & Toggle */}
          <div className="flex items-center space-x-2">
            {(searchQuery || statusFilter !== 'all') && (
              <Button variant="outline" size="sm" onClick={clearFilters}>
                <X className="h-4 w-4 mr-1" />
                Clear
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? 'Hide' : 'Show'} Quick Returns ({filteredRecords.length})
            </Button>
          </div>
        </div>

        {/* Expanded Quick Return List */}
        {isExpanded && (
          <div className="border-t pt-4">
            <h3 className="text-sm font-medium text-gray-900 mb-3">Quick Return Actions</h3>
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {filteredRecords.map((record) => {
                const book = books.find(b => b.id === record.book_id);
                const student = students.find(s => s.id === record.student_id);
                const isOverdue = new Date() > new Date(record.due_date);
                const fine = isOverdue ? calculateFine(record.due_date) : 0;

                return (
                  <div
                    key={record.id}
                    className={`flex items-center justify-between p-3 rounded-lg border ${
                      isOverdue ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-200'
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-3">
                        <div className={`p-1.5 rounded ${isOverdue ? 'bg-red-100' : 'bg-blue-100'}`}>
                          {isOverdue ? (
                            <AlertTriangle className="h-4 w-4 text-red-600" />
                          ) : (
                            <Clock className="h-4 w-4 text-blue-600" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2">
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {book?.title || 'Unknown Book'}
                            </p>
                            {book?.isbn && (
                              <span className="text-xs text-gray-500">({book.isbn})</span>
                            )}
                          </div>
                          <div className="flex items-center space-x-4 mt-1">
                            <p className="text-xs text-gray-600">
                              Student: {student?.name || 'Unknown'} ({student?.admission_number})
                            </p>
                            <p className="text-xs text-gray-500">
                              Due: {new Date(record.due_date).toLocaleDateString()}
                            </p>
                            {fine > 0 && (
                              <span className="text-xs text-red-600 font-medium">
                                Fine: KES {fine.toLocaleString()}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => onReturnBook(record.id)}
                      className="bg-green-600 hover:bg-green-700 ml-3"
                    >
                      <CheckCircle className="h-4 w-4 mr-1" />
                      Return
                    </Button>
                  </div>
                );
              })}
              {filteredRecords.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <Clock className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                  <p>No borrowed books found matching your criteria</p>
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
