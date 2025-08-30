
import React from 'react';
import { Button } from '@/components/ui/button';
import { BookOpen, Users, GraduationCap } from 'lucide-react';
import schoolLogo from '@/assets/school-logo.jpeg';

interface HomeNavigationProps {
  onShowLogin: () => void;
}

const HomeNavigation = ({ onShowLogin }: HomeNavigationProps) => {
  return (
    <header className="bg-white shadow-sm border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-3">
            <img src={schoolLogo} alt="School Logo" className="h-12 w-12 object-contain" />
           {/* <div className="bg-primary p-2 rounded-full">
              <BookOpen className="h-6 w-6 text-primary-foreground" />
            </div> */}
            <div>
              <h1 className="text-xl font-bold text-gray-900">Maryland Senior School</h1>
              <p className="text-sm text-gray-600">Library Management System</p>
            </div>
          </div>
          <nav className="flex items-center space-x-4">
            <Button
              variant="outline"
              onClick={onShowLogin}
              className="text-primary border-primary hover:bg-primary/10"
            >
              <Users className="h-4 w-4 mr-2" />
              Admin Login
            </Button>
            <Button
              onClick={onShowLogin}
              className="bg-primary hover:bg-primary/80 text-primary-foreground"
            >
              <GraduationCap className="h-4 w-4 mr-2" />
              Student Login
            </Button>
          </nav>
        </div>
      </div>
    </header>
  );
};

export default HomeNavigation;
