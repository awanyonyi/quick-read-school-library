
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '../contexts/AuthContext';
import { BookOpen, Lock, User, Mail, AlertCircle } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

const AuthPage = () => {
  const { login, signUp, isLoading } = useAuth();
  const [loginData, setLoginData] = useState({ email: '', password: '' });
  const [signUpData, setSignUpData] = useState({ 
    email: '', 
    password: '', 
    confirmPassword: '',
    name: '', 
    role: 'student' as 'admin' | 'student',
    admissionNumber: ''
  });
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validatePassword = (password: string): boolean => {
    return password.length >= 8;
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: { [key: string]: string } = {};

    if (!validateEmail(loginData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }
    if (!loginData.password) {
      newErrors.password = 'Password is required';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});
    const result = await login(loginData.email, loginData.password);
    
    if (!result.success) {
      toast({
        title: "Login Failed",
        description: result.error || "Invalid credentials",
        variant: "destructive"
      });
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: { [key: string]: string } = {};

    if (!validateEmail(signUpData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }
    if (!validatePassword(signUpData.password)) {
      newErrors.password = 'Password must be at least 8 characters long';
    }
    if (signUpData.password !== signUpData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }
    if (!signUpData.name.trim()) {
      newErrors.name = 'Name is required';
    }
    if (signUpData.role === 'student' && !signUpData.admissionNumber.trim()) {
      newErrors.admissionNumber = 'Admission number is required for students';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});
    const result = await signUp(
      signUpData.email,
      signUpData.password,
      signUpData.name,
      signUpData.role,
      signUpData.role === 'student' ? signUpData.admissionNumber : undefined
    );

    if (result.success) {
      toast({
        title: "Account Created",
        description: "Please check your email to verify your account",
      });
    } else {
      toast({
        title: "Sign Up Failed", 
        description: result.error || "Failed to create account",
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

        <Tabs defaultValue="login" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="login">Login</TabsTrigger>
            <TabsTrigger value="signup">Sign Up</TabsTrigger>
          </TabsList>

          <TabsContent value="login">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lock className="h-5 w-5" />
                  Login
                </CardTitle>
                <CardDescription>
                  Enter your credentials to access the library system
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="login-email">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input
                        id="login-email"
                        type="email"
                        placeholder="Enter your email"
                        value={loginData.email}
                        onChange={(e) => setLoginData({...loginData, email: e.target.value})}
                        className={`pl-10 ${errors.email ? 'border-red-500' : ''}`}
                        required
                      />
                    </div>
                    {errors.email && (
                      <div className="flex items-center gap-1 text-red-600 text-sm">
                        <AlertCircle className="h-3 w-3" />
                        {errors.email}
                      </div>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="login-password">Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input
                        id="login-password"
                        type="password"
                        placeholder="Enter your password"
                        value={loginData.password}
                        onChange={(e) => setLoginData({...loginData, password: e.target.value})}
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
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="signup">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Create Account
                </CardTitle>
                <CardDescription>
                  Register for a new library account
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSignUp} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-name">Full Name</Label>
                    <Input
                      id="signup-name"
                      type="text"
                      placeholder="Enter your full name"
                      value={signUpData.name}
                      onChange={(e) => setSignUpData({...signUpData, name: e.target.value})}
                      className={errors.name ? 'border-red-500' : ''}
                      required
                    />
                    {errors.name && (
                      <div className="flex items-center gap-1 text-red-600 text-sm">
                        <AlertCircle className="h-3 w-3" />
                        {errors.name}
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signup-email">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input
                        id="signup-email"
                        type="email"
                        placeholder="Enter your email address"
                        value={signUpData.email}
                        onChange={(e) => setSignUpData({...signUpData, email: e.target.value})}
                        className={`pl-10 ${errors.email ? 'border-red-500' : ''}`}
                        required
                      />
                    </div>
                    {errors.email && (
                      <div className="flex items-center gap-1 text-red-600 text-sm">
                        <AlertCircle className="h-3 w-3" />
                        {errors.email}
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signup-role">Role</Label>
                    <Select value={signUpData.role} onValueChange={(value: 'admin' | 'student') => setSignUpData({...signUpData, role: value})}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="student">Student</SelectItem>
                        <SelectItem value="admin">Administrator</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {signUpData.role === 'student' && (
                    <div className="space-y-2">
                      <Label htmlFor="signup-admission">Admission Number</Label>
                      <Input
                        id="signup-admission"
                        type="text"
                        placeholder="Enter your admission number"
                        value={signUpData.admissionNumber}
                        onChange={(e) => setSignUpData({...signUpData, admissionNumber: e.target.value})}
                        className={errors.admissionNumber ? 'border-red-500' : ''}
                        required
                      />
                      {errors.admissionNumber && (
                        <div className="flex items-center gap-1 text-red-600 text-sm">
                          <AlertCircle className="h-3 w-3" />
                          {errors.admissionNumber}
                        </div>
                      )}
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="signup-password">Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input
                        id="signup-password"
                        type="password"
                        placeholder="Create a secure password"
                        value={signUpData.password}
                        onChange={(e) => setSignUpData({...signUpData, password: e.target.value})}
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

                  <div className="space-y-2">
                    <Label htmlFor="signup-confirm-password">Confirm Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input
                        id="signup-confirm-password"
                        type="password"
                        placeholder="Confirm your password"
                        value={signUpData.confirmPassword}
                        onChange={(e) => setSignUpData({...signUpData, confirmPassword: e.target.value})}
                        className={`pl-10 ${errors.confirmPassword ? 'border-red-500' : ''}`}
                        required
                      />
                    </div>
                    {errors.confirmPassword && (
                      <div className="flex items-center gap-1 text-red-600 text-sm">
                        <AlertCircle className="h-3 w-3" />
                        {errors.confirmPassword}
                      </div>
                    )}
                  </div>

                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? 'Creating Account...' : 'Create Account'}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default AuthPage;
