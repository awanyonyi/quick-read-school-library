
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Student } from '../types';
import { Plus, Edit, Trash2, User, Upload } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { StudentExcelUpload } from './StudentExcelUpload';

interface StudentManagementProps {
  onUpdate: () => void;
}

export const StudentManagement: React.FC<StudentManagementProps> = ({ onUpdate }) => {
  const [students, setStudents] = useState<Student[]>([]);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [showExcelUpload, setShowExcelUpload] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    admissionNumber: '',
    email: '',
    class: ''
  });

  useEffect(() => {
    loadStudents();
  }, []);

  const loadStudents = () => {
    const studentsData = JSON.parse(localStorage.getItem('library_students') || '[]');
    setStudents(studentsData);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.admissionNumber || !formData.email || !formData.class) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    const studentsData = JSON.parse(localStorage.getItem('library_students') || '[]');
    
    // Check for duplicate admission number
    const existingStudent = studentsData.find((student: Student) => 
      student.admissionNumber === formData.admissionNumber && 
      (!editingStudent || student.id !== editingStudent.id)
    );
    
    if (existingStudent) {
      toast({
        title: "Error",
        description: "Admission number already exists",
        variant: "destructive"
      });
      return;
    }
    
    if (editingStudent) {
      // Update existing student
      const updatedStudents = studentsData.map((student: Student) => 
        student.id === editingStudent.id 
          ? { ...student, ...formData }
          : student
      );
      localStorage.setItem('library_students', JSON.stringify(updatedStudents));
      toast({
        title: "Success",
        description: "Student updated successfully"
      });
    } else {
      // Add new student
      const newStudent: Student = {
        id: `std_${Date.now()}`,
        ...formData,
        registeredDate: new Date().toISOString()
      };
      studentsData.push(newStudent);
      localStorage.setItem('library_students', JSON.stringify(studentsData));
      toast({
        title: "Success",
        description: "Student added successfully"
      });
    }
    
    resetForm();
    loadStudents();
    onUpdate();
  };

  const handleDelete = (studentId: string) => {
    const studentsData = JSON.parse(localStorage.getItem('library_students') || '[]');
    const updatedStudents = studentsData.filter((student: Student) => student.id !== studentId);
    localStorage.setItem('library_students', JSON.stringify(updatedStudents));
    
    toast({
      title: "Success",
      description: "Student deleted successfully"
    });
    
    loadStudents();
    onUpdate();
  };

  const resetForm = () => {
    setFormData({
      name: '',
      admissionNumber: '',
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
      admissionNumber: student.admissionNumber,
      email: student.email,
      class: student.class
    });
    setIsAddDialogOpen(true);
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
                      value={formData.admissionNumber}
                      onChange={(e) => setFormData({...formData, admissionNumber: e.target.value})}
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
                            Admission: <span className="font-medium">{student.admissionNumber}</span>
                          </span>
                          <span className="text-sm">
                            Class: <span className="font-medium">{student.class}</span>
                          </span>
                          <span className="text-sm text-gray-500">
                            Registered: {new Date(student.registeredDate).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex space-x-2">
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
    </div>
  );
};
