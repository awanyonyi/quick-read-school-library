
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
            Maryland Senior School is committed to nurturing 
            academic excellence and character development in the beautiful highlands of Nakuru County.
          </p>
        </div>
        
        <div className="grid md:grid-cols-3 gap-8">
          <Card className="text-center hover:shadow-card transition-all duration-300 hover:scale-105 bg-gradient-accent border-0">
            <CardHeader>
              <div className="bg-primary/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 shadow-primary">
                <BookOpen className="h-8 w-8 text-primary" />
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

          <Card className="text-center hover:shadow-card transition-all duration-300 hover:scale-105 bg-gradient-accent border-0">
            <CardHeader>
              <div className="bg-accent/20 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 shadow-primary">
                <Award className="h-8 w-8 text-accent-foreground" />
              </div>
              <CardTitle>Academic Excellence</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-base">
                Consistently ranking as the top schools in Subukia Sub-County, 
                we pride ourselves on exceptional academic performance and holistic education.
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="text-center hover:shadow-card transition-all duration-300 hover:scale-105 bg-gradient-accent border-0">
            <CardHeader>
              <div className="bg-secondary/50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 shadow-primary">
                <Users className="h-8 w-8 text-secondary-foreground" />
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
