
import React from 'react';
import { BookOpen } from 'lucide-react';

const HomeFooter = () => {
  return (
    <footer className="bg-gray-900 text-white py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <div className="flex justify-center items-center space-x-3 mb-4">
            <div className="bg-primary p-2 rounded-full">
              <BookOpen className="h-5 w-5 text-primary-foreground" />
            </div>
            <h3 className="text-lg font-semibold">Maryland Senior School</h3>
          </div>
          <p className="text-gray-400 mb-4">
            School Motto:Education is a compass
          </p>
          <div className="space-y-2">
            <p className="text-sm text-gray-500">
              © 2025 Maryland Senior School. All rights reserved.
            </p>
            <p className="underline-text-sm text-gray-500">
              Designed by Allan Wanyonyi
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default HomeFooter;
