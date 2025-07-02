
import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
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
      
      // First try admin login with new credentials
      const { data: adminData, error: adminError } = await supabase
        .from('admins')
        .select('*')
        .eq('username', username)
        .single();

      if (adminData && !adminError) {
        // Check for new admin credentials
        if (username === 'Maryland@library' && password === 'Maryland_lib2025') {
          const userProfile: UserProfile = {
            id: adminData.id,
            name: adminData.name,
            role: 'admin',
            email: undefined
          };
          setUser(userProfile);
          localStorage.setItem('library_user', JSON.stringify(userProfile));
          return { success: true };
        } else {
          return { success: false, error: 'Invalid credentials' };
        }
      }

      // If not admin, try student login (name + admission number)
      const { data: studentData, error: studentError } = await supabase
        .from('students')
        .select('*')
        .eq('name', username)
        .eq('admission_number', password)
        .single();

      if (studentData && !studentError) {
        const userProfile: UserProfile = {
          id: studentData.id,
          name: studentData.name,
          role: 'student',
          admission_number: studentData.admission_number,
          email: studentData.email
        };
        setUser(userProfile);
        localStorage.setItem('library_user', JSON.stringify(userProfile));
        return { success: true };
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
