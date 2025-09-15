import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, BookOpen, Calendar, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import { BorrowRecord } from '../../types';
import { toast } from '@/hooks/use-toast';
import { calculateFine } from '../../utils/libraryData';

export const BorrowingRecordSearch: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResult, setSearchResult] = useState<{ 
    records: BorrowRecord[]; 
    searched: boolean; 
    studentName: string | null;
  }>({ 
    records: [], 
    searched: false, 
    studentName: null 
  });
  const [isSearching, setIsSearching] = useState(false);

  const handleBorrowingRecordSearch = async () => {
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
      // First find the student
      const studentResponse = await fetch(`http://localhost:3001/api/students?admission_number=${encodeURIComponent(searchQuery.trim())}`);

      if (!studentResponse.ok) {
        throw new Error(`HTTP error! status: ${studentResponse.status}`);
      }

      const students = await studentResponse.json();
      const student = students.find((s: any) => s.admission_number === searchQuery.trim());

      if (!student) {
        setSearchResult({
          records: [],
          searched: true,
          studentName: null
        });
        return;
      }

      // Fetch borrowing records for the student
      const recordsResponse = await fetch(`http://localhost:3001/api/borrowing?student_id=${student.id}`);

      if (!recordsResponse.ok) {
        throw new Error(`HTTP error! status: ${recordsResponse.status}`);
      }

      const records = await recordsResponse.json();

      setSearchResult({
        records: (records || []) as BorrowRecord[],
        searched: true,
        studentName: student.name
      });
    } catch (error) {
      console.error('Error searching borrowing records:', error);
      toast({
        title: "Error",
        description: "Failed to search for borrowing records",
        variant: "destructive"
      });
    } finally {
      setIsSearching(false);
    }
  };

  const handleSearchKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleBorrowingRecordSearch();
    }
  };

  const clearSearch = () => {
    setSearchQuery('');
    setSearchResult({ records: [], searched: false, studentName: null });
  };

  const getStatusBadge = (record: BorrowRecord) => {
    if (record.status === 'returned') {
      return (
        <Badge variant="default" className="bg-green-100 text-green-700">
          <CheckCircle className="w-3 h-3 mr-1" />
          Returned
        </Badge>
      );
    }
    
    const fine = calculateFine(record.due_date);
    if (fine > 0) {
      return (
        <Badge variant="destructive">
          <AlertTriangle className="w-3 h-3 mr-1" />
          Overdue
        </Badge>
      );
    }
    
    return (
      <Badge variant="secondary">
        <BookOpen className="w-3 h-3 mr-1" />
        Borrowed
      </Badge>
    );
  };

  return (
    <Card className="animate-fade-in">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Search className="h-5 w-5" />
          Student Borrowing Records Search
        </CardTitle>
        <CardDescription>
          Search by admission number to view a student's borrowing history
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
          <Button onClick={handleBorrowingRecordSearch} disabled={isSearching} className="hover-scale">
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
          <div className="space-y-4">
            {searchResult.studentName ? (
              <div className="p-4 border rounded-lg animate-scale-in">
                <div className="flex items-center gap-2 mb-4">
                  <h3 className="font-semibold text-green-700">
                    Borrowing Records for {searchResult.studentName}
                  </h3>
                  <Badge variant="default" className="bg-green-100 text-green-700">
                    {searchResult.records.length} Record{searchResult.records.length !== 1 ? 's' : ''}
                  </Badge>
                </div>
                
                {searchResult.records.length > 0 ? (
                  <div className="space-y-3">
                    {searchResult.records.map((record) => {
                      const fine = record.status !== 'returned' ? calculateFine(record.due_date) : (record.fine_amount || 0);
                      return (
                        <div 
                          key={record.id} 
                          className="p-3 border rounded-lg bg-gray-50 hover:shadow-md transition-shadow"
                        >
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <h4 className="font-medium text-gray-900">
                                {record.books?.title || 'Unknown Book'}
                              </h4>
                              <p className="text-sm text-gray-600">
                                by {record.books?.author || 'Unknown Author'}
                              </p>
                              <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                                <span className="flex items-center gap-1">
                                  <Calendar className="w-3 h-3" />
                                  Borrowed: {new Date(record.borrow_date).toLocaleDateString()}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Calendar className="w-3 h-3" />
                                  Due: {new Date(record.due_date).toLocaleDateString()}
                                </span>
                                {record.return_date && (
                                  <span className="flex items-center gap-1">
                                    <Calendar className="w-3 h-3" />
                                    Returned: {new Date(record.return_date).toLocaleDateString()}
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="text-right">
                              {getStatusBadge(record)}
                              {fine > 0 && (
                                <p className="text-sm text-red-600 mt-1 font-medium">
                                  Fine: KES {fine}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <BookOpen className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                    <p>No borrowing records found for this student</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-4 border rounded-lg animate-scale-in">
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
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};