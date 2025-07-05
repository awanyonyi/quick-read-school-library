import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, CheckCircle, XCircle } from 'lucide-react';
import { Student } from '../../types';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export const StudentSearch: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResult, setSearchResult] = useState<{ student: Student | null; searched: boolean }>({ 
    student: null, 
    searched: false 
  });
  const [isSearching, setIsSearching] = useState(false);

  const handleStudentSearch = async () => {
    if (!searchQuery.trim()) {
      toast({
        title: "Error",
        description: "Please enter an admission number to search",
        variant: "destructive"
      });
      return;
    }

    setIsSearching(true);
    try {
      const { data, error } = await supabase
        .from('students')
        .select('*')
        .eq('admission_number', searchQuery.trim())
        .maybeSingle();

      if (error) {
        console.error('Error searching student:', error);
        toast({
          title: "Error",
          description: "Failed to search for student",
          variant: "destructive"
        });
        return;
      }

      setSearchResult({
        student: data,
        searched: true
      });
    } catch (error) {
      console.error('Error searching student:', error);
      toast({
        title: "Error",
        description: "Failed to search for student",
        variant: "destructive"
      });
    } finally {
      setIsSearching(false);
    }
  };

  const handleSearchKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleStudentSearch();
    }
  };

  const clearSearch = () => {
    setSearchQuery('');
    setSearchResult({ student: null, searched: false });
  };

  return (
    <Card className="animate-fade-in">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Search className="h-5 w-5" />
          Student Registration Check
        </CardTitle>
        <CardDescription>
          Search by admission number to quickly verify if a student is registered
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Input
            placeholder="Enter admission number..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={handleSearchKeyPress}
            className="flex-1"
          />
          <Button onClick={handleStudentSearch} disabled={isSearching} className="hover-scale">
            {isSearching ? (
              <div className="animate-spin h-4 w-4 border-2 border-gray-300 border-t-gray-600 rounded-full" />
            ) : (
              <Search className="h-4 w-4" />
            )}
          </Button>
          {searchResult.searched && (
            <Button variant="outline" onClick={clearSearch}>
              Clear
            </Button>
          )}
        </div>

        {/* Search Result */}
        {searchResult.searched && (
          <div className="p-4 border rounded-lg animate-scale-in">
            {searchResult.student ? (
              <div className="flex items-start gap-3">
                <CheckCircle className="h-6 w-6 text-green-600 mt-0.5" />
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-green-700">Student Found</h3>
                    <Badge variant="default" className="bg-green-100 text-green-700">
                      Registered
                    </Badge>
                  </div>
                  <div className="mt-2 space-y-1">
                    <p><span className="font-medium">Name:</span> {searchResult.student.name}</p>
                    <p><span className="font-medium">Admission Number:</span> {searchResult.student.admission_number}</p>
                    <p><span className="font-medium">Class:</span> {searchResult.student.class}</p>
                    <p><span className="font-medium">Email:</span> {searchResult.student.email}</p>
                    <p className="text-sm text-gray-500">
                      <span className="font-medium">Registered:</span> {' '}
                      {new Date(searchResult.student.created_at || '').toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-start gap-3">
                <XCircle className="h-6 w-6 text-red-600 mt-0.5" />
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-red-700">Student Not Found</h3>
                    <Badge variant="destructive">
                      Not Registered
                    </Badge>
                  </div>
                  <p className="mt-2 text-gray-600">
                    No student found with admission number: <span className="font-medium">{searchQuery}</span>
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    The student may need to be registered in the system first.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};