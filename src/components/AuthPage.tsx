
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '../contexts/AuthContext';
import { BookOpen, Lock, User, AlertCircle, GraduationCap, Shield } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

const AuthPage = () => {
  const { login, isLoading } = useAuth();
  const [adminData, setAdminData] = useState({ username: '', password: '' });
  const [studentData, setStudentData] = useState({ name: '', admissionNumber: '' });
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: { [key: string]: string } = {};

    if (!adminData.username.trim()) {
      newErrors.username = 'Username is required';
    }
    if (!adminData.password) {
      newErrors.password = 'Password is required';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});
    const result = await login(adminData.username, adminData.password);
    
    if (!result.success) {
      toast({
        title: "Login Failed",
        description: result.error || "Invalid credentials",
        variant: "destructive"
      });
    }
  };

  const handleStudentLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: { [key: string]: string } = {};

    if (!studentData.name.trim()) {
      newErrors.name = 'Name is required';
    }
    if (!studentData.admissionNumber.trim()) {
      newErrors.admissionNumber = 'Admission number is required';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});
    const result = await login(studentData.name, studentData.admissionNumber);
    
    if (!result.success) {
      toast({
        title: "Login Failed",
        description: result.error || "Invalid credentials",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="bg-blue-600 p-3 rounded-full inline-block mb-4">
            <BookOpen className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Maryland Senior School</h1>
          <p className="text-gray-600">Library Management System</p>
        </div>

        <Tabs defaultValue="student" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="student">Student Login</TabsTrigger>
            <TabsTrigger value="admin">Admin Login</TabsTrigger>
          </TabsList>

          <TabsContent value="student">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <GraduationCap className="h-5 w-5" />
                  Student Login
                </CardTitle>
                <CardDescription>
                  Enter your name and admission number to access the library
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleStudentLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="student-name">Full Name</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input
                        id="student-name"
                        type="text"
                        placeholder="Enter your full name"
                        value={studentData.name}
                        onChange={(e) => setStudentData({...studentData, name: e.target.value})}
                        className={`pl-10 ${errors.name ? 'border-red-500' : ''}`}
                        required
                      />
                    </div>
                    {errors.name && (
                      <div className="flex items-center gap-1 text-red-600 text-sm">
                        <AlertCircle className="h-3 w-3" />
                        {errors.name}
                      </div>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="admission-number">Admission Number</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input
                        id="admission-number"
                        type="text"
                        placeholder="Enter your admission number"
                        value={studentData.admissionNumber}
                        onChange={(e) => setStudentData({...studentData, admissionNumber: e.target.value})}
                        className={`pl-10 ${errors.admissionNumber ? 'border-red-500' : ''}`}
                        required
                      />
                    </div>
                    {errors.admissionNumber && (
                      <div className="flex items-center gap-1 text-red-600 text-sm">
                        <AlertCircle className="h-3 w-3" />
                        {errors.admissionNumber}
                      </div>
                    )}
                  </div>

                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? 'Signing In...' : 'Sign In'}
                  </Button>
                </form>

                <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                  <p className="text-sm text-blue-700">
                    <strong>Demo Students:</strong><br />
                    • John Doe (STD001)<br />
                    • Jane Smith (STD002)<br />
                    • Michael Johnson (STD003)
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="admin">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Admin Login
                </CardTitle>
                <CardDescription>
                  Administrator access to the library management system
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleAdminLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="admin-username">Username</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input
                        id="admin-username"
                        type="text"
                        placeholder="Enter admin username"
                        value={adminData.username}
                        onChange={(e) => setAdminData({...adminData, username: e.target.value})}
                        className={`pl-10 ${errors.username ? 'border-red-500' : ''}`}
                        required
                      />
                    </div>
                    {errors.username && (
                      <div className="flex items-center gap-1 text-red-600 text-sm">
                        <AlertCircle className="h-3 w-3" />
                        {errors.username}
                      </div>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="admin-password">Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input
                        id="admin-password"
                        type="password"
                        placeholder="Enter admin password"
                        value={adminData.password}
                        onChange={(e) => setAdminData({...adminData, password: e.target.value})}
                        className={`pl-10 ${errors.password ? 'border-red-500' : ''}`}
                        required
                      />
                    </div>
                    {errors.password && (
                      <div className="flex items-center gap-1 text-red-600 text-sm">
                        <AlertCircle className="h-3 w-3" />
                        {errors.password}
                      </div>
                    )}
                  </div>

                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? 'Signing In...' : 'Sign In'}
                  </Button>
                </form>

                <div className="mt-4 p-3 bg-amber-50 rounded-lg">
                  <p className="text-sm text-amber-700">
                    <strong>Demo Admin:</strong><br />
                    Username: admin<br />
                    Password: admin123
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default AuthPage;
