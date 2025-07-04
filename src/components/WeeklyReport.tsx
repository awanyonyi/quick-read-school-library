
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Book, Student, BorrowRecord } from '../types';
import { fetchBooks, fetchStudents, fetchBorrowRecords } from '../utils/libraryData';
import { format, startOfWeek, endOfWeek, isWithinInterval } from 'date-fns';
import { CalendarIcon, Printer, FileText, Download } from 'lucide-react';
import { cn } from '@/lib/utils';

interface WeeklyReportProps {
  onUpdate: () => void;
}

export const WeeklyReport: React.FC<WeeklyReportProps> = ({ onUpdate }) => {
  const [books, setBooks] = useState<Book[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [borrowRecords, setBorrowRecords] = useState<BorrowRecord[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [reportType, setReportType] = useState<'borrowed' | 'returned' | 'all'>('all');
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

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

  const getWeeklyRecords = () => {
    const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 }); // Monday
    const weekEnd = endOfWeek(selectedDate, { weekStartsOn: 1 }); // Sunday

    return borrowRecords.filter(record => {
      const recordDate = new Date(record.borrow_date);
      const returnDate = record.return_date ? new Date(record.return_date) : null;
      
      const isInWeek = isWithinInterval(recordDate, { start: weekStart, end: weekEnd });
      const isReturnInWeek = returnDate ? isWithinInterval(returnDate, { start: weekStart, end: weekEnd }) : false;

      switch (reportType) {
        case 'borrowed':
          return isInWeek;
        case 'returned':
          return isReturnInWeek;
        case 'all':
          return isInWeek || isReturnInWeek;
        default:
          return isInWeek;
      }
    });
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExport = () => {
    const weeklyRecords = getWeeklyRecords();
    const csvContent = [
      ['Book Title', 'Author', 'Student Name', 'Class', 'Admission Number', 'Borrow Date', 'Return Date', 'Status', 'Fine (KES)'],
      ...weeklyRecords.map(record => {
        const book = books.find(b => b.id === record.book_id);
        const student = students.find(s => s.id === record.student_id);
        return [
          book?.title || 'Unknown',
          book?.author || 'Unknown',
          student?.name || 'Unknown',
          student?.class || 'Unknown',
          student?.admission_number || 'Unknown',
          format(new Date(record.borrow_date), 'yyyy-MM-dd'),
          record.return_date ? format(new Date(record.return_date), 'yyyy-MM-dd') : 'Not returned',
          record.status,
          ((record.fine_amount || record.fine) as number || 0).toString()
        ];
      })
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `weekly-report-${format(selectedDate, 'yyyy-MM-dd')}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const weeklyRecords = getWeeklyRecords();
  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(selectedDate, { weekStartsOn: 1 });

  const totalBorrowed = weeklyRecords.filter(r => 
    isWithinInterval(new Date(r.borrow_date), { start: weekStart, end: weekEnd })
  ).length;
  
  const totalReturned = weeklyRecords.filter(r => 
    r.return_date && isWithinInterval(new Date(r.return_date), { start: weekStart, end: weekEnd })
  ).length;
  
  const totalFines = weeklyRecords.reduce((sum, record) => sum + ((record.fine_amount || record.fine) as number || 0), 0);

  return (
    <div className="space-y-6">
      {/* Print styles */}
      <style dangerouslySetInnerHTML={{
        __html: `
          @media print {
            @page {
              size: A4;
              margin: 1in;
            }
            .print\\:hidden {
              display: none !important;
            }
            .print\\:block {
              display: block !important;
            }
          }
        `
      }} />

      {/* Controls - Hidden when printing */}
      <div className="print:hidden flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Weekly Borrowing Report</h2>
          <p className="text-gray-600">Generate and print weekly borrowing activity reports</p>
        </div>
        <div className="flex items-center space-x-4">
          <Button onClick={handleExport} variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
          <Button onClick={handlePrint} className="bg-blue-600 hover:bg-blue-700">
            <Printer className="h-4 w-4 mr-2" />
            Print Report
          </Button>
        </div>
      </div>

      {/* Filters - Hidden when printing */}
      <div className="print:hidden grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Select Week</label>
          <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !selectedDate && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {selectedDate ? (
                  `Week of ${format(weekStart, 'MMM dd')} - ${format(weekEnd, 'MMM dd, yyyy')}`
                ) : (
                  <span>Pick a date</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(date) => {
                  if (date) {
                    setSelectedDate(date);
                    setIsCalendarOpen(false);
                  }
                }}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Report Type</label>
          <Select value={reportType} onValueChange={(value: 'borrowed' | 'returned' | 'all') => setReportType(value)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Activities</SelectItem>
              <SelectItem value="borrowed">Books Borrowed</SelectItem>
              <SelectItem value="returned">Books Returned</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Report Header - Visible when printing */}
      <div className="print:block hidden text-center mb-8">
        <h1 className="text-2xl font-bold mb-2">School Library - Weekly Borrowing Report</h1>
        <p className="text-lg">Week: {format(weekStart, 'MMM dd')} - {format(weekEnd, 'MMM dd, yyyy')}</p>
        <p className="text-sm text-gray-600 mt-2">Report Type: {reportType === 'all' ? 'All Activities' : reportType === 'borrowed' ? 'Books Borrowed' : 'Books Returned'}</p>
      </div>

      {/* Summary Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Books Borrowed</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalBorrowed}</div>
            <p className="text-xs text-muted-foreground">This week</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Books Returned</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalReturned}</div>
            <p className="text-xs text-muted-foreground">This week</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Fines</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">KES {totalFines.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Collected this week</p>
          </CardContent>
        </Card>
      </div>

      {/* Records Table */}
      <Card>
        <CardHeader>
          <CardTitle>Detailed Records</CardTitle>
          <CardDescription>
            {weeklyRecords.length} records for the week of {format(weekStart, 'MMM dd')} - {format(weekEnd, 'MMM dd, yyyy')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {weeklyRecords.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Book</TableHead>
                  <TableHead>Student</TableHead>
                  <TableHead>Class</TableHead>
                  <TableHead>Admission No.</TableHead>
                  <TableHead>Borrow Date</TableHead>
                  <TableHead>Return Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Fine (KES)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {weeklyRecords.map((record) => {
                  const book = books.find(b => b.id === record.book_id);
                  const student = students.find(s => s.id === record.student_id);
                  
                  return (
                    <TableRow key={record.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{book?.title || 'Unknown Book'}</div>
                          <div className="text-sm text-gray-500">by {book?.author || 'Unknown Author'}</div>
                        </div>
                      </TableCell>
                      <TableCell>{student?.name || 'Unknown Student'}</TableCell>
                      <TableCell>{student?.class || 'Unknown'}</TableCell>
                      <TableCell>{student?.admission_number || 'Unknown'}</TableCell>
                      <TableCell>{format(new Date(record.borrow_date), 'MMM dd, yyyy')}</TableCell>
                      <TableCell>
                        {record.return_date 
                          ? format(new Date(record.return_date), 'MMM dd, yyyy')
                          : 'Not returned'
                        }
                      </TableCell>
                      <TableCell>
                        <span className={cn(
                          "px-2 py-1 rounded-full text-xs font-medium",
                          record.status === 'returned' && "bg-green-100 text-green-800",
                          record.status === 'borrowed' && "bg-blue-100 text-blue-800",
                          record.status === 'overdue' && "bg-red-100 text-red-800"
                        )}>
                          {record.status}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        {((record.fine_amount || record.fine) as number || 0) > 0 ? ((record.fine_amount || record.fine) as number).toLocaleString() : '-'}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No records found for the selected week</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Print footer - Only visible when printing */}
      <div className="print:block hidden text-center text-sm text-gray-600 mt-8">
        <p>Generated on {format(new Date(), 'PPP')} by School Library Management System</p>
      </div>
    </div>
  );
};
