
import React from 'react';
import { BookOpen } from 'lucide-react';

const HomeFooter = () => {
  return (
    <footer className="bg-gray-900 text-white py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <div className="flex justify-center items-center space-x-3 mb-4">
            <div className="bg-blue-600 p-2 rounded-full">
              <BookOpen className="h-5 w-5 text-white" />
            </div>
            <h3 className="text-lg font-semibold">Maryland Secondary School</h3>
          </div>
          <p className="text-gray-400 mb-4">
            Empowering minds, shaping futures - Excellence in education since our establishment
          </p>
          <p className="text-sm text-gray-500">
            © 2024 Maryland Secondary School. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default HomeFooter;
