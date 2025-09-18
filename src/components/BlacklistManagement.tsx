import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, UserX, UserCheck, Clock } from 'lucide-react';
import { Student } from '@/types';
import { fetchStudents, unblacklistStudent, processOverdueBooks } from '@/utils/libraryData';
import { toast, useToast } from '@/hooks/use-toast';

interface BlacklistManagementProps {
  onUpdate: () => void;
}

export default function BlacklistManagement({ onUpdate }: BlacklistManagementProps) {
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [unblacklistReason, setUnblacklistReason] = useState('');
  const [isUnblacklistDialogOpen, setIsUnblacklistDialogOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const { dismiss } = useToast();

  useEffect(() => {
    loadStudents();
  }, []);

  const loadStudents = async () => {
    try {
      const data = await fetchStudents();
      setStudents(data);
    } catch (error) {
      console.error('Error loading students:', error);
      toast({
        title: "Error",
        description: "Failed to load students",
        variant: "destructive"
      });
    }
  };

  const handleProcessOverdue = async () => {
    setIsProcessing(true);
    try {
      await processOverdueBooks();
      await loadStudents();
      onUpdate();
      toast({
        title: "Success",
        description: "Processed overdue books and updated blacklist",
      });
    } catch (error) {
      console.error('Error processing overdue books:', error);
      toast({
        title: "Error",
        description: "Failed to process overdue books",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUnblacklist = async () => {
    if (!selectedStudent || !unblacklistReason.trim()) {
      toast({
        title: "Error",
        description: "Please provide a reason for unblacklisting",
        variant: "destructive"
      });
      return;
    }

    try {
      await unblacklistStudent(selectedStudent.id, unblacklistReason);
      await loadStudents();
      onUpdate();
      
      toast({
        title: "Success",
        description: `${selectedStudent.name} has been unblacklisted`,
      });
      
      setIsUnblacklistDialogOpen(false);
      setSelectedStudent(null);
      setUnblacklistReason('');
    } catch (error) {
      console.error('Error unblacklisting student:', error);
      toast({
        title: "Error",
        description: "Failed to unblacklist student",
        variant: "destructive"
      });
    }
  };

  const openUnblacklistDialog = (student: Student) => {
    setSelectedStudent(student);
    setIsUnblacklistDialogOpen(true);
  };

  const blacklistedStudents = students.filter(student => student.blacklisted);
  const activeBlacklisted = blacklistedStudents.filter(student => {
    if (!student.blacklist_until) return true;
    return new Date(student.blacklist_until) > new Date();
  });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const isBlacklistExpired = (blacklistUntil: string | undefined) => {
    if (!blacklistUntil) return false;
    return new Date(blacklistUntil) <= new Date();
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Blacklist Management</h2>
          <p className="text-gray-600">Manage student blacklists and process overdue books</p>
        </div>
        <Button 
          onClick={handleProcessOverdue}
          disabled={isProcessing}
          variant="outline"
        >
          <AlertTriangle className="h-4 w-4 mr-2" />
          {isProcessing ? 'Processing...' : 'Process Overdue Books'}
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <UserX className="h-8 w-8 text-red-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Blacklisted</p>
                <p className="text-2xl font-bold text-gray-900">{blacklistedStudents.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <AlertTriangle className="h-8 w-8 text-orange-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Active Blacklist</p>
                <p className="text-2xl font-bold text-gray-900">{activeBlacklisted.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <Clock className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Expired Blacklist</p>
                <p className="text-2xl font-bold text-gray-900">
                  {blacklistedStudents.filter(s => isBlacklistExpired(s.blacklist_until)).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Blacklisted Students List */}
      {blacklistedStudents.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <UserCheck className="h-12 w-12 text-green-400 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Blacklisted Students</h3>
            <p className="text-gray-600 text-center">
              All students are in good standing. Use "Process Overdue Books" to check for new violations.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {blacklistedStudents.map((student) => {
            const isExpired = isBlacklistExpired(student.blacklist_until);
            
            return (
              <Card key={student.id}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <CardTitle className="text-lg">{student.name}</CardTitle>
                      <CardDescription>
                        Admission Number: {student.admission_number} • Class: {student.class}
                      </CardDescription>
                      
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant={isExpired ? "secondary" : "destructive"}>
                          {isExpired ? 'Expired' : 'Active'} Blacklist
                        </Badge>
                        {student.blacklist_until && (
                          <span className="text-sm text-gray-600">
                            Until: {formatDate(student.blacklist_until)}
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <Button
                      onClick={() => openUnblacklistDialog(student)}
                      variant="outline"
                      size="sm"
                    >
                      <UserCheck className="h-4 w-4 mr-2" />
                      Unblacklist
                    </Button>
                  </div>
                </CardHeader>
                
                {student.blacklist_reason && (
                  <CardContent>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Blacklist Reason:</Label>
                      <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded-md">
                        {student.blacklist_reason}
                      </p>
                    </div>
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* Unblacklist Dialog */}
      <Dialog open={isUnblacklistDialogOpen} onOpenChange={setIsUnblacklistDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Unblacklist Student</DialogTitle>
            <DialogDescription>
              Remove {selectedStudent?.name} from the blacklist by providing a reason.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="reason">Reason for Unblacklisting *</Label>
              <Textarea
                id="reason"
                value={unblacklistReason}
                onChange={(e) => setUnblacklistReason(e.target.value)}
                placeholder="Provide a genuine reason for removing the blacklist..."
                rows={3}
                required
              />
            </div>
          </div>
          
          <div className="flex justify-end space-x-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsUnblacklistDialogOpen(false);
                setSelectedStudent(null);
                setUnblacklistReason('');
              }}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleUnblacklist}
              disabled={!unblacklistReason.trim()}
            >
              Unblacklist Student
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}