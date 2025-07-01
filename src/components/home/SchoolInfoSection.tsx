
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BookOpen, Users, Award } from 'lucide-react';

const SchoolInfoSection = () => {
  return (
    <section className="py-16 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">About Our School</h2>
          <p className="text-lg text-gray-600 max-w-3xl mx-auto">
            Maryland Senior School is a premier educational Center committed to nurturing 
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
  );
};

export default SchoolInfoSection;
