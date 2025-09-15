
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
        'Admission Number': '2343',
        'Name': 'John Mwangi',
        'Class': '2E'
      },
      {
        'Admission Number': '3243',
        'Name': 'Jane Wangari',
        'Class': '4W'
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
      console.log('Processing Excel file:', file.name);
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);

      console.log('Raw Excel data:', jsonData);
      console.log('Number of rows found:', jsonData.length);

      if (jsonData.length === 0) {
        toast({
          title: "Upload Error",
          description: "No data found in Excel file. Please check the file format.",
          variant: "destructive"
        });
        setIsUploading(false);
        return;
      }

      // Get existing students from database
      const existingStudentsResponse = await fetch('http://localhost:3001/api/students');

      if (!existingStudentsResponse.ok) {
        console.error('Error fetching existing students:', existingStudentsResponse.status);
        toast({
          title: "Database Error",
          description: "Failed to check existing students",
          variant: "destructive"
        });
        setIsUploading(false);
        return;
      }

      const existingStudents = await existingStudentsResponse.json();

      const newStudents: any[] = [];
      const errors: string[] = [];
      let successCount = 0;

      // Log the first row to see what columns we have
      if (jsonData.length > 0) {
        console.log('Available columns:', Object.keys(jsonData[0]));
      }

      jsonData.forEach((row: any, index: number) => {
        const rowNumber = index + 2; // Excel row number (starting from 2, accounting for header)
        
        console.log(`Processing row ${rowNumber}:`, row);
        
        // More flexible column matching - handle various naming conventions
        const name = row['Name'] || row['Student Name'] || row['name'] || row['student_name'] || row['NAME'];
        const admissionNumber = row['Admission Number'] || row['AdmissionNumber'] || row['admission_number'] || row['ID'] || row['ADMISSION NUMBER'];
        const studentClass = row['Class'] || row['class'] || row['Grade'] || row['grade'] || row['CLASS'];

        console.log(`Row ${rowNumber} extracted values:`, { name, admissionNumber, studentClass });

        // Validate required fields
        if (!name || !admissionNumber || !studentClass) {
          const missingFields = [];
          if (!name) missingFields.push('Name');
          if (!admissionNumber) missingFields.push('Admission Number');
          if (!studentClass) missingFields.push('Class');
          
          errors.push(`Row ${rowNumber}: Missing required fields: ${missingFields.join(', ')}`);
          console.log(`Row ${rowNumber} validation failed - missing:`, missingFields);
          return;
        }

        // Check for duplicate admission numbers in existing data
        const existingStudent = existingStudents?.find((student: any) => 
          student.admission_number === String(admissionNumber).trim()
        );
        
        if (existingStudent) {
          errors.push(`Row ${rowNumber}: Admission number ${admissionNumber} already exists`);
          console.log(`Row ${rowNumber} duplicate admission number:`, admissionNumber);
          return;
        }

        // Check for duplicate admission numbers in current upload
        const duplicateInUpload = newStudents.find(student => 
          student.admission_number === String(admissionNumber).trim()
        );
        
        if (duplicateInUpload) {
          errors.push(`Row ${rowNumber}: Duplicate admission number ${admissionNumber} in upload`);
          console.log(`Row ${rowNumber} duplicate in current upload:`, admissionNumber);
          return;
        }

        // Create new student with generated email
        const cleanAdmissionNumber = String(admissionNumber).trim();
        const generatedEmail = `${cleanAdmissionNumber.toLowerCase()}@marylandsenior.edu`;
        const newStudent = {
          name: String(name).trim(),
          admission_number: cleanAdmissionNumber,
          email: generatedEmail,
          class: String(studentClass).trim()
        };

        console.log(`Row ${rowNumber} created student:`, newStudent);
        newStudents.push(newStudent);
        successCount++;
      });

      console.log('Upload results:', { successCount, errorCount: errors.length, newStudents });

      // Save successful entries to database via API
      if (newStudents.length > 0) {
        console.log('Attempting to save students:', newStudents);

        // Insert students one by one via API
        const insertPromises = newStudents.map(student =>
          fetch('http://localhost:3001/api/students', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(student),
          })
        );

        try {
          const results = await Promise.allSettled(insertPromises);
          const failedInserts = results.filter(result => result.status === 'rejected');

          if (failedInserts.length > 0) {
            console.error('Some student inserts failed:', failedInserts);
            toast({
              title: "Partial Success",
              description: `${newStudents.length - failedInserts.length} students saved, ${failedInserts.length} failed`,
              variant: "destructive"
            });
          } else {
            console.log('Successfully saved all students to database');
          }
        } catch (error) {
          console.error('Error saving students:', error);
          toast({
            title: "Database Error",
            description: "Failed to save students to database",
            variant: "destructive"
          });
          setIsUploading(false);
          return;
        }
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
          description: "No students were uploaded due to errors. Check the error details below.",
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
            Accepted formats: .xlsx, .xls. Required columns: <strong>Admission Number</strong>, <strong>Name</strong>, <strong>Class</strong>
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
            <li>• Column headers: <strong>"Admission Number"</strong>, <strong>"Name"</strong>, <strong>"Class"</strong></li>
            <li>• All three columns are required for each student</li>
            <li>• Admission numbers must be unique</li>
            <li>• Email addresses will be auto-generated based on admission number</li>
            <li>• First row should contain column headers</li>
            <li>• Alternative column names are also supported (e.g., "Student Name" for "Name")</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};
