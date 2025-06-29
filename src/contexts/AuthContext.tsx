
import React, { createContext, useContext, useState, useEffect } from 'react';

export interface User {
  id: string;
  name: string;
  role: 'admin' | 'student';
  admissionNumber?: string;
}

interface AuthContextType {
  user: User | null;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
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

// Simple encryption function for password hashing
const hashPassword = (password: string): string => {
  let hash = 0;
  for (let i = 0; i < password.length; i++) {
    const char = password.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return hash.toString(16);
};

// Admin credentials with encrypted password
const ADMIN_USERNAME = 'Maryland@library';
const ADMIN_PASSWORD_HASH = hashPassword('Maryland_lib2025');

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for saved user session
    const savedUser = localStorage.getItem('library_user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
    setIsLoading(false);
  }, []);

  const login = async (username: string, password: string): Promise<boolean> => {
    setIsLoading(true);
    
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Check for admin credentials with encrypted password
    if (username === ADMIN_USERNAME && hashPassword(password) === ADMIN_PASSWORD_HASH) {
      const adminUser: User = {
        id: 'admin_1',
        name: 'Library Administrator',
        role: 'admin'
      };
      setUser(adminUser);
      localStorage.setItem('library_user', JSON.stringify(adminUser));
      setIsLoading(false);
      return true;
    }
    
    // Check for student credentials (username as name, password as admission number)
    const students = JSON.parse(localStorage.getItem('library_students') || '[]');
    const student = students.find((s: any) => 
      s.name.toLowerCase() === username.toLowerCase() && s.admissionNumber === password
    );
    
    if (student) {
      const studentUser: User = {
        id: student.id,
        name: student.name,
        role: 'student',
        admissionNumber: student.admissionNumber
      };
      setUser(studentUser);
      localStorage.setItem('library_user', JSON.stringify(studentUser));
      setIsLoading(false);
      return true;
    }
    
    setIsLoading(false);
    return false;
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('library_user');
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};
