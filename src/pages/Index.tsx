
import React, { useEffect, useState } from 'react';
import { AuthProvider, useAuth } from '../contexts/AuthContext';
import { initializeDefaultData } from '../utils/libraryData';
import LoginForm from '../components/LoginForm';
import AdminDashboard from '../components/AdminDashboard';
import StudentDashboard from '../components/StudentDashboard';
import HomePage from '../components/HomePage';

const MainApp = () => {
  const { user, isLoading } = useAuth();
  const [showLogin, setShowLogin] = useState(false);

  useEffect(() => {
    // Initialize default data on app startup
    initializeDefaultData();
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-green-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // If user is logged in, show appropriate dashboard
  if (user) {
    return user.role === 'admin' ? <AdminDashboard /> : <StudentDashboard />;
  }

  // If no user is logged in, show either home page or login form
  if (showLogin) {
    return <LoginForm onBackToHome={() => setShowLogin(false)} />;
  }

  return <HomePage onShowLogin={() => setShowLogin(true)} />;
};

const Index = () => {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
};

export default Index;
