
import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Student } from '../types';
import { Plus, Edit, Trash2, User, Upload, Fingerprint, Shield, Search, X } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { StudentExcelUpload } from './StudentExcelUpload';
import { BiometricEnrollment } from './BiometricEnrollment';
import { fetchStudents, addStudent } from '@/utils/libraryData';
import { apiClient } from '@/utils/apiClient';

interface StudentManagementProps {
  onUpdate: () => void;
}

export const StudentManagement: React.FC<StudentManagementProps> = ({ onUpdate }) => {
  const [students, setStudents] = useState<Student[]>([]);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [showExcelUpload, setShowExcelUpload] = useState(false);
  const [biometricEnrollmentStudent, setBiometricEnrollmentStudent] = useState<Student | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    admission_number: '',
    email: '',
    class: ''
  });

  useEffect(() => {
    loadStudents();
  }, []);

  const loadStudents = async () => {
    try {
      const studentsData = await fetchStudents();
      setStudents(studentsData);
    } catch (error) {
      console.error('Error loading students:', error);
      toast({
        title: "Error",
        description: "Failed to load students",
        variant: "destructive"
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.admission_number || !formData.email || !formData.class) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    try {
      if (editingStudent) {
        // Update existing student
        await apiClient.updateStudent(editingStudent.id, {
          name: formData.name,
          admission_number: formData.admission_number,
          email: formData.email,
          class: formData.class
        });

        toast({
          title: "Success",
          description: "Student updated successfully"
        });
      } else {
        // Add new student
        await addStudent({
          name: formData.name,
          admission_number: formData.admission_number,
          email: formData.email,
          class: formData.class
        });

        toast({
          title: "Success",
          description: "Student added successfully"
        });
      }
      
      resetForm();
      loadStudents();
      onUpdate();
    } catch (error: unknown) {
      console.error('Error saving student:', error);
      const errorMessage = error instanceof Error ? error.message : "Failed to save student";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive"
      });
    }
  };

  const handleDelete = async (studentId: string) => {
    try {
      await apiClient.deleteStudent(studentId);

      toast({
        title: "Success",
        description: "Student deleted successfully"
      });

      loadStudents();
      onUpdate();
    } catch (error: unknown) {
      // Enhanced error logging for better debugging
      console.error('Error deleting student:', {
        error,
        type: typeof error,
        constructor: error?.constructor?.name,
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        // Additional Supabase error details
        ...(typeof error === 'object' && error !== null && 'details' in error && { details: (error as any).details }),
        ...(typeof error === 'object' && error !== null && 'hint' in error && { hint: (error as any).hint }),
        ...(typeof error === 'object' && error !== null && 'code' in error && { code: (error as any).code })
      });

      let errorMessage = "Failed to delete student";

      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'object' && error !== null) {
        // Try to extract meaningful information from Supabase error object
        const errorObj = error as any;
        if (errorObj.message) {
          errorMessage = errorObj.message;
        } else if (errorObj.error?.message) {
          errorMessage = errorObj.error.message;
        } else if (errorObj.details) {
          errorMessage = errorObj.details;
        } else if (errorObj.hint) {
          errorMessage = `Database error: ${errorObj.hint}`;
        } else if (errorObj.code) {
          errorMessage = `Database error (code: ${errorObj.code})`;
        }
      }

      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive"
      });
    }
  };

  // Filter students based on search query
  const filteredStudents = useMemo(() => {
    if (!searchQuery.trim()) {
      return students;
    }
    return students.filter(student =>
      student.admission_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      student.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      student.class?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [students, searchQuery]);

  const resetForm = () => {
    setFormData({
      name: '',
      admission_number: '',
      email: '',
      class: ''
    });
    setEditingStudent(null);
    setIsAddDialogOpen(false);
  };

  const openEditDialog = (student: Student) => {
    setEditingStudent(student);
    setFormData({
      name: student.name,
      admission_number: student.admission_number || '',
      email: student.email,
      class: student.class
    });
    setIsAddDialogOpen(true);
  };

  const openBiometricEnrollment = (student: Student) => {
    setBiometricEnrollmentStudent(student);
  };

  const closeBiometricEnrollment = () => {
    setBiometricEnrollmentStudent(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Student Management</h2>
          <p className="text-sm sm:text-base text-gray-600">Manage student registrations and information</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <Button variant="outline" onClick={() => setShowExcelUpload(!showExcelUpload)} className="w-full sm:w-auto">
            <Upload className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">{showExcelUpload ? 'Hide' : 'Bulk Upload'}</span>
            <span className="sm:hidden">Upload</span>
          </Button>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => setIsAddDialogOpen(true)} className="w-full sm:w-auto">
                <Plus className="h-4 w-4 mr-2" />
                Add Student
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px] mx-4 max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-lg sm:text-xl">{editingStudent ? 'Edit Student' : 'Add New Student'}</DialogTitle>
                <DialogDescription className="text-sm">
                  {editingStudent ? 'Update student information' : 'Register a new student in the library system'}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit}>
                <div className="grid gap-3 sm:gap-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="name" className="text-sm font-medium">Full Name *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      placeholder="Enter student name"
                      required
                      className="h-10"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="admission" className="text-sm font-medium">Admission Number *</Label>
                    <Input
                      id="admission"
                      value={formData.admission_number}
                      onChange={(e) => setFormData({...formData, admission_number: e.target.value})}
                      placeholder="Enter admission number"
                      required
                      className="h-10"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="class" className="text-sm font-medium">Class *</Label>
                    <Input
                      id="class"
                      value={formData.class}
                      onChange={(e) => setFormData({...formData, class: e.target.value})}
                      placeholder="Enter class (e.g., Grade 10A)"
                      required
                      className="h-10"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-sm font-medium">Email *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({...formData, email: e.target.value})}
                      placeholder="Enter email address"
                      required
                      className="h-10"
                    />
                  </div>
                </div>
                <DialogFooter className="flex flex-col-reverse sm:flex-row gap-2 sm:gap-0">
                  <Button type="button" variant="outline" onClick={resetForm} className="w-full sm:w-auto">
                    Cancel
                  </Button>
                  <Button type="submit" className="w-full sm:w-auto">
                    {editingStudent ? 'Update Student' : 'Add Student'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Excel Upload Section */}
      {showExcelUpload && (
        <StudentExcelUpload onUploadComplete={() => {
          loadStudents();
          onUpdate();
          setShowExcelUpload(false);
        }} />
      )}

      <Card>
        <CardHeader>
          <CardTitle>Registered Students ({filteredStudents.length})</CardTitle>
          <CardDescription>All students registered in the library system</CardDescription>

          {/* Search Input */}
          <div className="flex items-center space-x-2 pt-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                placeholder="Search by admission number, name, email, or class..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-10"
              />
              {searchQuery && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6 p-0 hover:bg-gray-100"
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
            </div>
            {searchQuery && (
              <div className="text-sm text-gray-500">
                {filteredStudents.length} of {students.length} students
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 sm:space-y-4">
            {filteredStudents.map((student) => (
              <div key={student.id} className="border rounded-lg p-3 sm:p-4 hover:shadow-md transition-shadow">
                <div className="flex flex-col sm:flex-row justify-between items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start space-x-3">
                      <div className="bg-green-100 p-2 rounded-lg flex-shrink-0">
                        <User className="h-4 w-4 sm:h-5 sm:w-5 text-green-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-base sm:text-lg truncate">{student.name}</h3>
                        <p className="text-gray-600 text-sm truncate">{student.email}</p>
                        <div className="flex flex-wrap items-center gap-2 sm:gap-4 mt-2">
                          <span className="text-xs sm:text-sm">
                            <span className="sm:hidden">Adm:</span>
                            <span className="hidden sm:inline">Admission:</span>
                            <span className="font-medium ml-1">{student.admission_number}</span>
                          </span>
                          <span className="text-xs sm:text-sm">
                            Class: <span className="font-medium">{student.class}</span>
                          </span>
                          <span className="text-xs sm:text-sm text-gray-500 hidden sm:inline">
                            Registered: {new Date(student.created_at || '').toLocaleDateString()}
                          </span>
                          {student.biometric_enrolled && (
                            <div className="flex items-center gap-1">
                              <Shield className="h-3 w-3 text-green-600" />
                              <span className="text-xs text-green-600 font-medium hidden sm:inline">Biometric Enrolled</span>
                              <span className="text-xs text-green-600 font-medium sm:hidden">Bio</span>
                            </div>
                          )}
                        </div>
                        <div className="text-xs text-gray-500 sm:hidden mt-1">
                          {new Date(student.created_at || '').toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex space-x-1 sm:space-x-2 w-full sm:w-auto justify-end">
                    {!student.biometric_enrolled && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openBiometricEnrollment(student)}
                        className="text-blue-600 hover:text-blue-700 flex-1 sm:flex-none"
                      >
                        <Fingerprint className="h-3 w-3 sm:h-4 sm:w-4" />
                        <span className="hidden sm:inline ml-1">Enroll</span>
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEditDialog(student)}
                      className="flex-1 sm:flex-none"
                    >
                      <Edit className="h-3 w-3 sm:h-4 sm:w-4" />
                      <span className="hidden sm:inline ml-1">Edit</span>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(student.id)}
                      className="text-red-600 hover:text-red-700 flex-1 sm:flex-none"
                    >
                      <Trash2 className="h-3 w-3 sm:h-4 sm:w-4" />
                      <span className="hidden sm:inline ml-1">Delete</span>
                    </Button>
                  </div>
                </div>
              </div>
            ))}
            {filteredStudents.length === 0 && (
              <div className="text-center py-8 sm:py-12">
                <User className="h-10 w-10 sm:h-12 sm:w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500 mb-4 text-sm sm:text-base">
                  {searchQuery ? 'No students found matching your search' : 'No students registered yet'}
                </p>
                <div className="flex flex-col sm:flex-row justify-center gap-2 sm:space-x-2">
                  <Button onClick={() => setShowExcelUpload(true)} variant="outline" className="w-full sm:w-auto">
                    <Upload className="h-4 w-4 mr-2" />
                    Bulk Upload
                  </Button>
                  <Button onClick={() => setIsAddDialogOpen(true)} className="w-full sm:w-auto">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Your First Student
                  </Button>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Biometric Enrollment Dialog */}
      {biometricEnrollmentStudent && (
        <BiometricEnrollment
          isOpen={true}
          onClose={closeBiometricEnrollment}
          studentId={biometricEnrollmentStudent.id}
          studentName={biometricEnrollmentStudent.name}
          onEnrollmentComplete={() => {
            loadStudents();
            onUpdate();
          }}
        />
      )}
    </div>
  );
};
