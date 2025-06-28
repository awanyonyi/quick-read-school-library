
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Student } from '../types';
import { Upload, Download, AlertCircle, CheckCircle2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import * as XLSX from 'xlsx';

interface StudentExcelUploadProps {
  onUploadComplete: () => void;
}

export const StudentExcelUpload: React.FC<StudentExcelUploadProps> = ({ onUploadComplete }) => {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadResults, setUploadResults] = useState<{
    success: number;
    errors: string[];
  } | null>(null);

  const downloadTemplate = () => {
    const templateData = [
      {
        'Student Name': 'John Doe',
        'Admission Number': 'STD001',
        'Email': 'john.doe@school.edu'
      },
      {
        'Student Name': 'Jane Smith',
        'Admission Number': 'STD002',
        'Email': 'jane.smith@school.edu'
      }
    ];

    const worksheet = XLSX.utils.json_to_sheet(templateData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Students');
    
    XLSX.writeFile(workbook, 'student_template.xlsx');
    
    toast({
      title: "Template Downloaded",
      description: "Excel template has been downloaded successfully"
    });
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setUploadResults(null);

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);

      const existingStudents = JSON.parse(localStorage.getItem('library_students') || '[]');
      const newStudents: Student[] = [];
      const errors: string[] = [];
      let successCount = 0;

      jsonData.forEach((row: any, index: number) => {
        const rowNumber = index + 2; // Excel row number (starting from 2, accounting for header)
        
        // Extract data with flexible column naming
        const name = row['Student Name'] || row['Name'] || row['student_name'] || row['name'];
        const admissionNumber = row['Admission Number'] || row['AdmissionNumber'] || row['admission_number'] || row['ID'];
        const email = row['Email'] || row['email'] || row['Email Address'] || row['email_address'];

        // Validate required fields
        if (!name || !admissionNumber || !email) {
          errors.push(`Row ${rowNumber}: Missing required fields (Name: ${name || 'missing'}, Admission: ${admissionNumber || 'missing'}, Email: ${email || 'missing'})`);
          return;
        }

        // Check for duplicate admission numbers in existing data
        const existingStudent = existingStudents.find((student: Student) => 
          student.admissionNumber === String(admissionNumber)
        );
        
        if (existingStudent) {
          errors.push(`Row ${rowNumber}: Admission number ${admissionNumber} already exists`);
          return;
        }

        // Check for duplicate admission numbers in current upload
        const duplicateInUpload = newStudents.find(student => 
          student.admissionNumber === String(admissionNumber)
        );
        
        if (duplicateInUpload) {
          errors.push(`Row ${rowNumber}: Duplicate admission number ${admissionNumber} in upload`);
          return;
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(String(email))) {
          errors.push(`Row ${rowNumber}: Invalid email format for ${email}`);
          return;
        }

        // Create new student
        const newStudent: Student = {
          id: `std_${Date.now()}_${index}`,
          name: String(name).trim(),
          admissionNumber: String(admissionNumber).trim(),
          email: String(email).trim().toLowerCase(),
          registeredDate: new Date().toISOString()
        };

        newStudents.push(newStudent);
        successCount++;
      });

      // Save successful entries
      if (newStudents.length > 0) {
        const updatedStudents = [...existingStudents, ...newStudents];
        localStorage.setItem('library_students', JSON.stringify(updatedStudents));
      }

      setUploadResults({
        success: successCount,
        errors
      });

      if (successCount > 0) {
        toast({
          title: "Upload Successful",
          description: `${successCount} students uploaded successfully${errors.length > 0 ? ` with ${errors.length} errors` : ''}`
        });
        onUploadComplete();
      } else {
        toast({
          title: "Upload Failed",
          description: "No students were uploaded due to errors",
          variant: "destructive"
        });
      }

    } catch (error) {
      console.error('Error processing Excel file:', error);
      toast({
        title: "Upload Error",
        description: "Failed to process Excel file. Please check the file format.",
        variant: "destructive"
      });
    } finally {
      setIsUploading(false);
      // Reset file input
      event.target.value = '';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Upload className="h-5 w-5" />
          <span>Upload Students from Excel</span>
        </CardTitle>
        <CardDescription>
          Upload a bulk list of students from an Excel file to populate the system
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Template Download */}
        <div className="bg-blue-50 p-4 rounded-lg">
          <div className="flex items-start space-x-3">
            <Download className="h-5 w-5 text-blue-600 mt-0.5" />
            <div className="flex-1">
              <h4 className="font-medium text-blue-900">Download Template</h4>
              <p className="text-sm text-blue-700 mb-3">
                Download the Excel template with the correct format before uploading your student data.
              </p>
              <Button variant="outline" size="sm" onClick={downloadTemplate}>
                <Download className="h-4 w-4 mr-2" />
                Download Template
              </Button>
            </div>
          </div>
        </div>

        {/* File Upload */}
        <div className="space-y-4">
          <Label htmlFor="excel-upload">Upload Excel File</Label>
          <Input
            id="excel-upload"
            type="file"
            accept=".xlsx,.xls"
            onChange={handleFileUpload}
            disabled={isUploading}
          />
          <p className="text-sm text-gray-500">
            Accepted formats: .xlsx, .xls. Required columns: Student Name, Admission Number, Email
          </p>
        </div>

        {/* Upload Status */}
        {isUploading && (
          <div className="flex items-center space-x-2 text-blue-600">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
            <span>Processing Excel file...</span>
          </div>
        )}

        {/* Upload Results */}
        {uploadResults && (
          <div className="space-y-4">
            {uploadResults.success > 0 && (
              <div className="bg-green-50 p-4 rounded-lg">
                <div className="flex items-center space-x-2">
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                  <span className="font-medium text-green-900">
                    {uploadResults.success} students uploaded successfully
                  </span>
                </div>
              </div>
            )}

            {uploadResults.errors.length > 0 && (
              <div className="bg-red-50 p-4 rounded-lg">
                <div className="flex items-start space-x-2">
                  <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
                  <div className="flex-1">
                    <h4 className="font-medium text-red-900 mb-2">
                      {uploadResults.errors.length} errors encountered:
                    </h4>
                    <div className="max-h-32 overflow-y-auto space-y-1">
                      {uploadResults.errors.map((error, index) => (
                        <p key={index} className="text-sm text-red-700">
                          • {error}
                        </p>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Instructions */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h4 className="font-medium text-gray-900 mb-2">Excel File Requirements:</h4>
          <ul className="text-sm text-gray-700 space-y-1">
            <li>• Column headers: "Student Name", "Admission Number", "Email"</li>
            <li>• All three columns are required for each student</li>
            <li>• Admission numbers must be unique</li>
            <li>• Email addresses must be valid</li>
            <li>• First row should contain column headers</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};
