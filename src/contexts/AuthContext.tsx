
import React, { createContext, useContext, useState, useEffect } from 'react';
import { toast } from '@/hooks/use-toast';

export interface UserProfile {
  id: string;
  name: string;
  role: 'admin' | 'student';
  admission_number?: string;
  email?: string;
}

interface AuthContextType {
  user: UserProfile | null;
  login: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check if user is already logged in from localStorage
    const storedUser = localStorage.getItem('library_user');
    const storedToken = localStorage.getItem('admin_token');
    const tokenExpires = localStorage.getItem('token_expires');

    if (storedUser) {
      try {
        const userProfile = JSON.parse(storedUser);

        // For admin users, since login is hard-coded, just check token expiry
        if (userProfile.role === 'admin' && storedToken && tokenExpires) {
          const expiresAt = new Date(tokenExpires);
          if (new Date() < expiresAt) {
            // Token still valid, keep user logged in
            setUser(userProfile);
            setIsLoading(false);
          } else {
            // Token expired, clear storage
            localStorage.removeItem('library_user');
            localStorage.removeItem('admin_token');
            localStorage.removeItem('token_expires');
            setIsLoading(false);
          }
        } else {
          // Student user or no token, just set the user
          setUser(userProfile);
          setIsLoading(false);
        }
      } catch (error) {
        console.error('Error parsing stored user:', error);
        localStorage.removeItem('library_user');
        localStorage.removeItem('admin_token');
        localStorage.removeItem('token_expires');
        setIsLoading(false);
      }
    } else {
      setIsLoading(false);
    }
  }, []);

  const login = async (username: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      setIsLoading(true);

      // Check if this is admin login
      const isAdminAttempt = username === 'admin';

      if (isAdminAttempt) {
        // Hard-coded admin login
        if (username === 'admin' && password === 'Sheila1234') {
          const mockAdminData = {
            success: true,
            user: {
              id: 'admin-1',
              username: 'admin',
              email: 'admin@school.com'
            },
            token: 'mock-admin-token',
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours from now
          };

          const userProfile: UserProfile = {
            id: mockAdminData.user.id,
            name: mockAdminData.user.username,
            role: 'admin',
            email: mockAdminData.user.email
          };

          // Store both user profile and token
          setUser(userProfile);
          localStorage.setItem('library_user', JSON.stringify(userProfile));
          localStorage.setItem('admin_token', mockAdminData.token);
          localStorage.setItem('token_expires', mockAdminData.expiresAt);

          return { success: true };
        } else {
          return { success: false, error: 'Invalid admin credentials' };
        }
      }

      // Student login: try to find student by admission number
      try {
        const studentsResponse = await fetch(`http://localhost:3001/api/students?admission_number=${encodeURIComponent(password)}`);

        if (studentsResponse.ok) {
          const students = await studentsResponse.json();
          const student = students.find((s: any) => s.admission_number === password && s.name === username);

          if (student) {
            const userProfile: UserProfile = {
              id: student.id,
              name: student.name,
              role: 'student',
              admission_number: student.admission_number,
              email: student.email
            };
            setUser(userProfile);
            localStorage.setItem('library_user', JSON.stringify(userProfile));
            return { success: true };
          }
        }
      } catch (apiError) {
        console.error('API error during student login:', apiError);
      }

      return { success: false, error: 'Invalid credentials' };
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: 'An unexpected error occurred' };
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async (): Promise<void> => {
    try {
      // Clear all stored data
      setUser(null);
      localStorage.removeItem('library_user');
      localStorage.removeItem('admin_token');
      localStorage.removeItem('token_expires');

      toast({
        title: "Logged out",
        description: "You have been logged out successfully",
      });
    } catch (error) {
      console.error('Logout error:', error);
      // Still clear local data even if there are errors
      setUser(null);
      localStorage.removeItem('library_user');
      localStorage.removeItem('admin_token');
      localStorage.removeItem('token_expires');
    }
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};
