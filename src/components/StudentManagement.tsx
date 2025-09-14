
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Student } from '../types';
import { Plus, Edit, Trash2, User, Upload, Fingerprint, Shield } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { StudentExcelUpload } from './StudentExcelUpload';
import { BiometricEnrollment } from './BiometricEnrollment';
import { supabase } from '@/integrations/supabase/client';
import { fetchStudents, addStudent } from '@/utils/libraryData';

interface StudentManagementProps {
  onUpdate: () => void;
}

export const StudentManagement: React.FC<StudentManagementProps> = ({ onUpdate }) => {
  const [students, setStudents] = useState<Student[]>([]);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [showExcelUpload, setShowExcelUpload] = useState(false);
  const [biometricEnrollmentStudent, setBiometricEnrollmentStudent] = useState<Student | null>(null);
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
        const { error } = await supabase
          .from('students')
          .update({
            name: formData.name,
            admission_number: formData.admission_number,
            email: formData.email,
            class: formData.class
          })
          .eq('id', editingStudent.id);

        if (error) throw error;

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
      // First check if student has any active borrow records
      const { data: borrowRecords, error: borrowCheckError } = await supabase
        .from('borrow_records')
        .select('id, status, book_id')
        .eq('student_id', studentId)
        .eq('status', 'borrowed');

      if (borrowCheckError) {
        console.warn('Error checking borrow records:', borrowCheckError);
      } else if (borrowRecords && borrowRecords.length > 0) {
        toast({
          title: "Cannot Delete Student",
          description: `Student has ${borrowRecords.length} active borrow record(s). Please return all books first.`,
          variant: "destructive"
        });
        return;
      }

      // Proceed with deletion
      const { error } = await supabase
        .from('students')
        .delete()
        .eq('id', studentId);

      if (error) throw error;

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
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Student Management</h2>
          <p className="text-gray-600">Manage student registrations and information</p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" onClick={() => setShowExcelUpload(!showExcelUpload)}>
            <Upload className="h-4 w-4 mr-2" />
            {showExcelUpload ? 'Hide' : 'Bulk Upload'}
          </Button>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => setIsAddDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Student
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>{editingStudent ? 'Edit Student' : 'Add New Student'}</DialogTitle>
                <DialogDescription>
                  {editingStudent ? 'Update student information' : 'Register a new student in the library system'}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit}>
                <div className="grid gap-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      placeholder="Enter student name"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="admission">Admission Number *</Label>
                    <Input
                      id="admission"
                      value={formData.admission_number}
                      onChange={(e) => setFormData({...formData, admission_number: e.target.value})}
                      placeholder="Enter admission number"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="class">Class *</Label>
                    <Input
                      id="class"
                      value={formData.class}
                      onChange={(e) => setFormData({...formData, class: e.target.value})}
                      placeholder="Enter class (e.g., Grade 10A)"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({...formData, email: e.target.value})}
                      placeholder="Enter email address"
                      required
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={resetForm}>
                    Cancel
                  </Button>
                  <Button type="submit">
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
          <CardTitle>Registered Students ({students.length})</CardTitle>
          <CardDescription>All students registered in the library system</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {students.map((student) => (
              <div key={student.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-start space-x-3">
                      <div className="bg-green-100 p-2 rounded-lg">
                        <User className="h-5 w-5 text-green-600" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg">{student.name}</h3>
                        <p className="text-gray-600">{student.email}</p>
                        <div className="flex items-center space-x-4 mt-2">
                          <span className="text-sm">
                            Admission: <span className="font-medium">{student.admission_number}</span>
                          </span>
                          <span className="text-sm">
                            Class: <span className="font-medium">{student.class}</span>
                          </span>
                           <span className="text-sm text-gray-500">
                             Registered: {new Date(student.created_at || '').toLocaleDateString()}
                           </span>
                           {student.biometric_enrolled && (
                             <div className="flex items-center gap-1 mt-1">
                               <Shield className="h-3 w-3 text-green-600" />
                               <span className="text-xs text-green-600 font-medium">Biometric Enrolled</span>
                             </div>
                           )}
                         </div>
                       </div>
                     </div>
                   </div>
                   <div className="flex space-x-2">
                     {!student.biometric_enrolled && (
                       <Button 
                         variant="outline" 
                         size="sm" 
                         onClick={() => openBiometricEnrollment(student)}
                         className="text-blue-600 hover:text-blue-700"
                       >
                         <Fingerprint className="h-4 w-4" />
                       </Button>
                     )}
                     <Button variant="outline" size="sm" onClick={() => openEditDialog(student)}>
                       <Edit className="h-4 w-4" />
                     </Button>
                     <Button 
                       variant="outline" 
                       size="sm" 
                       onClick={() => handleDelete(student.id)}
                       className="text-red-600 hover:text-red-700"
                     >
                       <Trash2 className="h-4 w-4" />
                     </Button>
                   </div>
                </div>
              </div>
            ))}
            {students.length === 0 && (
              <div className="text-center py-12">
                <User className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500 mb-4">No students registered yet</p>
                <div className="flex justify-center space-x-2">
                  <Button onClick={() => setShowExcelUpload(true)} variant="outline">
                    <Upload className="h-4 w-4 mr-2" />
                    Bulk Upload
                  </Button>
                  <Button onClick={() => setIsAddDialogOpen(true)}>
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
