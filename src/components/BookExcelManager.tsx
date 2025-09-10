import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Download, Upload, FileSpreadsheet, CheckCircle, XCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import * as XLSX from 'xlsx';
import { fetchBooks, addBook } from '@/utils/libraryData';
import { Book } from '@/types';

interface BookExcelManagerProps {
  onUploadComplete: () => void;
}

interface UploadResult {
  successCount: number;
  errors: string[];
}

export default function BookExcelManager({ onUploadComplete }: BookExcelManagerProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadResults, setUploadResults] = useState<UploadResult | null>(null);
  const { toast } = useToast();

  const downloadTemplate = () => {
    const template = [
      {
        Title: 'The Great Gatsby',
        Author: 'F. Scott Fitzgerald',
        Category: 'Language',
        'Total Copies': 3,
        'Due Period Value': 14,
        'Due Period Unit': 'days'
      },
      {
        Title: 'Introduction to Physics',
        Author: 'John Smith',
        Category: 'Science',
        'Total Copies': 2,
        'Due Period Value': 7,
        'Due Period Unit': 'days'
      }
    ];

    const worksheet = XLSX.utils.json_to_sheet(template);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Books Template');
    
    // Set column widths for better readability
    worksheet['!cols'] = [
      { width: 25 }, // Title
      { width: 20 }, // Author
      { width: 20 }, // Category
      { width: 15 }, // Total Copies
      { width: 18 }, // Due Period Value
      { width: 18 }  // Due Period Unit
    ];

    XLSX.writeFile(workbook, 'books_template.xlsx');
    
    toast({
      title: "Template Downloaded",
      description: "Books template has been downloaded successfully",
    });
  };

  const downloadCurrentBooks = async () => {
    try {
      const books = await fetchBooks();
      
      // Group books by title and author, then aggregate data
      const groupedBooks = books.reduce((acc, book) => {
        const key = `${book.title}-${book.author}`;
        if (!acc[key]) {
          acc[key] = {
            Title: book.title,
            Author: book.author,
            Category: book.category,
            'Total Copies': 0,
            'Due Period Value': book.due_period_value || 24,
            'Due Period Unit': book.due_period_unit || 'hours'
          };
        }
        acc[key]['Total Copies']++;
        return acc;
      }, {} as Record<string, any>);

      const exportData = Object.values(groupedBooks);

      if (exportData.length === 0) {
        toast({
          title: "No Data",
          description: "No books found to export",
          variant: "destructive"
        });
        return;
      }

      const worksheet = XLSX.utils.json_to_sheet(exportData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Current Books');
      
      // Set column widths
      worksheet['!cols'] = [
        { width: 25 }, // Title
        { width: 20 }, // Author
        { width: 20 }, // Category
        { width: 15 }, // Total Copies
        { width: 18 }, // Due Period Value
        { width: 18 }  // Due Period Unit
      ];

      XLSX.writeFile(workbook, `books_export_${new Date().toISOString().split('T')[0]}.xlsx`);
      
      toast({
        title: "Export Successful",
        description: `Exported ${exportData.length} book titles to Excel`,
      });
    } catch (error) {
      console.error('Error exporting books:', error);
      toast({
        title: "Export Failed",
        description: "Failed to export books data",
        variant: "destructive"
      });
    }
  };

  const generateUniqueISBN = (existingBooks: Book[]): string => {
    const existingISBNs = new Set(existingBooks.map(book => book.isbn).filter(Boolean));
    let isbn: string;
    
    do {
      const timestamp = Date.now().toString();
      const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
      isbn = `978${timestamp.slice(-6)}${random}`;
    } while (existingISBNs.has(isbn));
    
    return isbn;
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setUploadResults(null);

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);

      const errors: string[] = [];
      let successCount = 0;
      const existingBooks = await fetchBooks();

      for (let i = 0; i < jsonData.length; i++) {
        const row = jsonData[i] as any;
        const rowNum = i + 2; // Excel row number (1-indexed + header)

        // Validate required fields
        if (!row.Title || typeof row.Title !== 'string' || row.Title.trim() === '') {
          errors.push(`Row ${rowNum}: Title is required`);
          continue;
        }

        if (!row.Author || typeof row.Author !== 'string' || row.Author.trim() === '') {
          errors.push(`Row ${rowNum}: Author is required`);
          continue;
        }

        if (!row.Category || typeof row.Category !== 'string' || row.Category.trim() === '') {
          errors.push(`Row ${rowNum}: Category is required`);
          continue;
        }

        // Validate category against allowed values
        const allowedCategories = ['Science', 'Language', 'Technicals and Applied', 'Humanities', 'Maths'];
        if (!allowedCategories.includes(row.Category.trim())) {
          errors.push(`Row ${rowNum}: Category must be one of: ${allowedCategories.join(', ')}`);
          continue;
        }

        // Validate total copies
        const totalCopies = parseInt(row['Total Copies']) || 1;
        if (totalCopies < 1 || totalCopies > 100) {
          errors.push(`Row ${rowNum}: Total Copies must be between 1 and 100`);
          continue;
        }

        // Validate due period
        const duePeriodValue = parseInt(row['Due Period Value']) || 24;
        const duePeriodUnit = row['Due Period Unit'] || 'hours';
        
        const allowedUnits = ['hours', 'days', 'weeks', 'months', 'years'];
        if (!allowedUnits.includes(duePeriodUnit)) {
          errors.push(`Row ${rowNum}: Due Period Unit must be one of: ${allowedUnits.join(', ')}`);
          continue;
        }

        if (duePeriodValue < 1) {
          errors.push(`Row ${rowNum}: Due Period Value must be at least 1`);
          continue;
        }

        try {
          // Add each copy as a separate book record
          for (let copy = 0; copy < totalCopies; copy++) {
            const isbn = generateUniqueISBN([...existingBooks]);
            
            await addBook({
              title: row.Title.trim(),
              author: row.Author.trim(),
              isbn,
              category: row.Category.trim(),
              total_copies: 1, // Each record represents one copy
              due_period_value: duePeriodValue,
              due_period_unit: duePeriodUnit
            });
            
            // Add to existing books to avoid ISBN conflicts
            existingBooks.push({
              id: '',
              title: row.Title.trim(),
              author: row.Author.trim(),
              isbn,
              category: row.Category.trim(),
              total_copies: 1,
              available_copies: 1,
              due_period_value: duePeriodValue,
              due_period_unit: duePeriodUnit,
              created_at: new Date().toISOString()
            });
          }
          
          successCount += totalCopies;
        } catch (error) {
          console.error(`Error adding book from row ${rowNum}:`, error);
          errors.push(`Row ${rowNum}: Failed to add book - ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      setUploadResults({ successCount, errors });

      if (successCount > 0) {
        toast({
          title: "Upload Completed",
          description: `Successfully added ${successCount} book${successCount === 1 ? '' : 's'}${errors.length > 0 ? ` with ${errors.length} error${errors.length === 1 ? '' : 's'}` : ''}`,
        });
        onUploadComplete();
      } else {
        toast({
          title: "Upload Failed",
          description: "No books were added due to errors",
          variant: "destructive"
        });
      }

    } catch (error) {
      console.error('Error processing file:', error);
      toast({
        title: "Upload Failed",
        description: "Failed to process the Excel file",
        variant: "destructive"
      });
    } finally {
      setIsUploading(false);
      // Reset file input
      event.target.value = '';
    }
  };

  return (
    <div className="space-y-6">
      {/* Download Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Download Books Data
          </CardTitle>
          <CardDescription>
            Export current books or download a template for bulk upload
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <Button onClick={downloadTemplate} variant="outline">
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              Download Template
            </Button>
            <Button onClick={downloadCurrentBooks}>
              <Download className="h-4 w-4 mr-2" />
              Export Current Books
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            Template includes sample data with all required fields: Title, Author, Category, Total Copies, Due Period Value, and Due Period Unit.
          </p>
        </CardContent>
      </Card>

      {/* Upload Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Upload Books from Excel
          </CardTitle>
          <CardDescription>
            Import multiple books from an Excel file
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="excel-file">Select Excel File</Label>
            <Input
              id="excel-file"
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileUpload}
              disabled={isUploading}
            />
          </div>
          
          {isUploading && (
            <div className="flex items-center gap-2 text-blue-600">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
              Processing Excel file...
            </div>
          )}

          <div className="text-sm text-muted-foreground space-y-2">
            <p><strong>Required columns:</strong> Title, Author, Category, Total Copies</p>
            <p><strong>Optional columns:</strong> Due Period Value, Due Period Unit</p>
            <p><strong>Valid Categories:</strong> Science, Language, Technicals and Applied, Humanities, Maths</p>
            <p><strong>Valid Period Units:</strong> hours, days, weeks, months, years</p>
          </div>
        </CardContent>
      </Card>

      {/* Results Section */}
      {uploadResults && (
        <Card>
          <CardHeader>
            <CardTitle>Upload Results</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <span className="text-green-600 font-medium">
                Successfully added: {uploadResults.successCount} book{uploadResults.successCount === 1 ? '' : 's'}
              </span>
            </div>
            
            {uploadResults.errors.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <XCircle className="h-5 w-5 text-red-600" />
                  <span className="text-red-600 font-medium">
                    Errors: {uploadResults.errors.length}
                  </span>
                </div>
                <div className="bg-red-50 p-3 rounded-md">
                  <ul className="text-sm text-red-700 space-y-1">
                    {uploadResults.errors.map((error, index) => (
                      <li key={index}>• {error}</li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}