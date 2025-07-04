
import { useEffect, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { AuthProvider } from "../contexts/AuthContext";
import AdminDashboard from "../components/AdminDashboard";
import StudentDashboard from "../components/StudentDashboard";
import AuthPage from "../components/AuthPage";
import HomePage from "../components/HomePage";

const AuthWrapper = () => {
  const { user, isLoading } = useAuth();
  const [showLogin, setShowLogin] = useState(false);

  useEffect(() => {
    // Initialize any required data or perform setup
    console.log("Auth state:", { user, isLoading });
  }, [user, isLoading]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // If user is authenticated, show appropriate dashboard
  if (user) {
    if (user.role === 'admin') {
      return <AdminDashboard />;
    } else if (user.role === 'student') {
      return <StudentDashboard />;
    }
  }

  // If user wants to login, show auth page
  if (showLogin) {
    return <AuthPage onBackToHome={() => setShowLogin(false)} />;
  }

  // Default: show homepage
  return <HomePage onShowLogin={() => setShowLogin(true)} />;
};

const Index = () => {
  return (
    <AuthProvider>
      <AuthWrapper />
    </AuthProvider>
  );
};

export default Index;
