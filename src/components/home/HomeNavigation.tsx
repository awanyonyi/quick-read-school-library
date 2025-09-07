
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
        <div className="flex justify-between items-center min-h-16 py-2">
          <div className="flex items-center space-x-2 sm:space-x-3 flex-1 min-w-0">
            <img src={schoolLogo} alt="School Logo" className="h-10 w-10 sm:h-12 sm:w-12 object-contain flex-shrink-0" />
            <div className="min-w-0 flex-1">
              <h1 className="text-sm sm:text-xl font-bold text-gray-900 truncate">Maryland Senior School</h1>
              <p className="text-xs sm:text-sm text-gray-600 hidden sm:block">Library Management System</p>
            </div>
          </div>
          <nav className="flex items-center space-x-1 sm:space-x-4">
            <Button
              variant="outline"
              onClick={onShowLogin}
              size="sm"
              className="text-primary border-primary hover:bg-primary/10 text-xs sm:text-sm px-2 sm:px-4"
            >
              <Users className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-2" />
              <span className="hidden sm:inline">Admin</span>
            </Button>
            <Button
              onClick={onShowLogin}
              size="sm"
              className="bg-primary hover:bg-primary/80 text-primary-foreground text-xs sm:text-sm px-2 sm:px-4"
            >
              <GraduationCap className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-2" />
              <span className="hidden sm:inline">Student</span>
            </Button>
          </nav>
        </div>
      </div>
    </header>
  );
};

export default HomeNavigation;
