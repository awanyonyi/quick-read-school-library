
import schoolLogo from '@/assets/school-logo.jpeg'

const HomeFooter = () => {
  return (
    <footer className="bg-gray-900 text-white py-6 sm:py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <div className="flex justify-center items-center space-x-3 mb-4">
            <div className="mb-4">
              <img src={schoolLogo} alt="School Logo" className="h-16 w-16 sm:h-20 sm:w-20 object-contain mx-auto mb-3 sm:mb-5" />
              <h3 className="text-base sm:text-lg font-semibold">Maryland Senior School</h3>
            </div>
          </div>
          <p className="text-gray-400 mb-4 text-sm sm:text-base px-4">
            School Motto: Education is a compass
          </p>
          <div className="space-y-2">
            <p className="text-xs sm:text-sm text-gray-500">
              © 2025 Maryland Senior School. All rights reserved.
            </p>
            <p className="text-xs sm:text-sm text-gray-500">
              Powered by Allan Wanyonyi
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default HomeFooter;
