import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BookOpen, Users, GraduationCap, MapPin, Phone, Mail, Clock, Award } from 'lucide-react';

interface HomePageProps {
  onShowLogin: () => void;
}

const HomePage = ({ onShowLogin }: HomePageProps) => {
  const schoolImages = [
    "/lovable-uploads/4966ace3-8bbd-447b-8523-60a0ff5b4e0b.png",
    "/lovable-uploads/455cb73f-07ec-42ce-ae0e-40bdfb1cb59d.png",
    "/lovable-uploads/ec3be63c-3db6-44c0-82fd-38309c32da32.png"
  ];

  const [currentImageIndex, setCurrentImageIndex] = React.useState(0);

  React.useEffect(() => {
    const interval = setInterval(() => {
      setCurrentImageIndex((prev) => (prev + 1) % schoolImages.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [schoolImages.length]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50">
      {/* Navigation Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <div className="bg-blue-600 p-2 rounded-full">
                <BookOpen className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Maryland Secondary School</h1>
                <p className="text-sm text-gray-600">Library Management System</p>
              </div>
            </div>
            <nav className="flex items-center space-x-4">
              <Button
                variant="outline"
                onClick={onShowLogin}
                className="text-blue-600 border-blue-600 hover:bg-blue-50"
              >
                <Users className="h-4 w-4 mr-2" />
                Admin Login
              </Button>
              <Button
                onClick={onShowLogin}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <GraduationCap className="h-4 w-4 mr-2" />
                Student Login
              </Button>
            </nav>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0">
          <img
            src={schoolImages[currentImageIndex]}
            alt="Maryland Secondary School"
            className="w-full h-96 object-cover transition-opacity duration-1000"
          />
          <div className="absolute inset-0 bg-black bg-opacity-40"></div>
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="text-center">
            <h1 className="text-4xl md:text-6xl font-bold text-white mb-6 animate-fade-in">
              Welcome to Maryland Secondary School
            </h1>
            <p className="text-xl md:text-2xl text-white mb-8 max-w-3xl mx-auto">
              Excellence in Education - Located in the heart of Subukia Sub-County, Nakuru County
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                size="lg"
                onClick={onShowLogin}
                className="bg-blue-600 hover:bg-blue-700 text-lg px-8 py-3"
              >
                Access Library System
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="bg-white/10 border-white text-white hover:bg-white hover:text-gray-900 text-lg px-8 py-3"
              >
                Learn More
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* School Information Section */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">About Our School</h2>
            <p className="text-lg text-gray-600 max-w-3xl mx-auto">
              Maryland Secondary School is a premier educational institution committed to nurturing 
              academic excellence and character development in the beautiful highlands of Nakuru County.
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            <Card className="text-center hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <BookOpen className="h-8 w-8 text-blue-600" />
                </div>
                <CardTitle>Modern Library</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-base">
                  Our state-of-the-art library houses thousands of books, digital resources, 
                  and study spaces to support every student's learning journey.
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="text-center hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="bg-green-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Award className="h-8 w-8 text-green-600" />
                </div>
                <CardTitle>Academic Excellence</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-base">
                  Consistently ranking among the top schools in Nakuru County, 
                  we pride ourselves on exceptional academic performance and holistic education.
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="text-center hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="bg-purple-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Users className="h-8 w-8 text-purple-600" />
                </div>
                <CardTitle>Dedicated Faculty</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-base">
                  Our qualified and experienced teachers are committed to guiding students 
                  towards academic success and personal growth.
                </CardDescription>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Location & Contact Section */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-12">
            <div>
              <h3 className="text-2xl font-bold text-gray-900 mb-6">Visit Our Campus</h3>
              <div className="space-y-4">
                <div className="flex items-start space-x-3">
                  <MapPin className="h-5 w-5 text-blue-600 mt-1" />
                  <div>
                    <p className="font-medium text-gray-900">Location</p>
                    <p className="text-gray-600">Subukia Sub-County, Nakuru County, Kenya</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <Phone className="h-5 w-5 text-blue-600 mt-1" />
                  <div>
                    <p className="font-medium text-gray-900">Phone</p>
                    <p className="text-gray-600">+254 XXX XXX XXX</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <Mail className="h-5 w-5 text-blue-600 mt-1" />
                  <div>
                    <p className="font-medium text-gray-900">Email</p>
                    <p className="text-gray-600">info@marylandsecondary.ac.ke</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <Clock className="h-5 w-5 text-blue-600 mt-1" />
                  <div>
                    <p className="font-medium text-gray-900">Library Hours</p>
                    <p className="text-gray-600">Monday - Friday: 7:00 AM - 6:00 PM</p>
                    <p className="text-gray-600">Saturday: 8:00 AM - 4:00 PM</p>
                  </div>
                </div>
              </div>
            </div>
            
            <div>
              <h3 className="text-2xl font-bold text-gray-900 mb-6">Library Services</h3>
              <div className="bg-white p-6 rounded-lg shadow-sm">
                <ul className="space-y-3">
                  <li className="flex items-center space-x-3">
                    <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                    <span>Book borrowing and returns</span>
                  </li>
                  <li className="flex items-center space-x-3">
                    <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                    <span>Digital resource access</span>
                  </li>
                  <li className="flex items-center space-x-3">
                    <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                    <span>Study room reservations</span>
                  </li>
                  <li className="flex items-center space-x-3">
                    <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                    <span>Research assistance</span>
                  </li>
                  <li className="flex items-center space-x-3">
                    <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                    <span>Computer and internet access</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
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
    </div>
  );
};

export default HomePage;
