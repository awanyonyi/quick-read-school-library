
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
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (error) {
        console.error('Error parsing stored user:', error);
        localStorage.removeItem('library_user');
      }
    }
    setIsLoading(false);
  }, []);

  const login = async (username: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      setIsLoading(true);

      // For now, use simple authentication
      // Admin login: username "admin", password "admin123"
      if (username === 'admin' && password === 'admin123') {
        const userProfile: UserProfile = {
          id: 'admin-1',
          name: 'Administrator',
          role: 'admin',
          email: 'admin@school.edu'
        };
        setUser(userProfile);
        localStorage.setItem('library_user', JSON.stringify(userProfile));
        return { success: true };
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
    setUser(null);
    localStorage.removeItem('library_user');
    toast({
      title: "Logged out",
      description: "You have been logged out successfully",
    });
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};
