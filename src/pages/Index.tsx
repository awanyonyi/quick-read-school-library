
import { useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { AuthProvider } from "../contexts/AuthContext";
import AdminDashboard from "../components/AdminDashboard";
import StudentDashboard from "../components/StudentDashboard";
import AuthPage from "../components/AuthPage";

const AuthWrapper = () => {
  const { user, isLoading } = useAuth();

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

  if (!user) {
    return <AuthPage />;
  }

  // Route to appropriate dashboard based on user role
  if (user.role === 'admin') {
    return <AdminDashboard />;
  } else if (user.role === 'student') {
    return <StudentDashboard />;
  }

  // Fallback - should not reach here normally
  return <AuthPage />;
};

const Index = () => {
  return (
    <AuthProvider>
      <AuthWrapper />
    </AuthProvider>
  );
};

export default Index;
