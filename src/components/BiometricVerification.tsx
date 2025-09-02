import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { BiometricAuth } from './BiometricAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Shield, CheckCircle, AlertCircle } from 'lucide-react';
import { Student } from '@/types';

interface BiometricVerificationProps {
  isOpen: boolean;
  onClose: () => void;
  onVerificationSuccess: (student: Student) => void;
  onVerificationError: (error: string) => void;
}

export const BiometricVerification: React.FC<BiometricVerificationProps> = ({
  isOpen,
  onClose,
  onVerificationSuccess,
  onVerificationError
}) => {
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationStep, setVerificationStep] = useState<'start' | 'verifying' | 'success'>('start');
  const [verifiedStudent, setVerifiedStudent] = useState<Student | null>(null);

  const handleVerificationSuccess = async (verificationData: string) => {
    setIsVerifying(true);
    
    try {
      // In a real implementation, you would validate the biometric data against stored credentials
      // For demo purposes, we'll simulate verification by checking enrolled students
      
      const { data: students, error } = await supabase
        .from('students')
        .select('*')
        .eq('biometric_enrolled', true);

      if (error) throw error;

      if (students && students.length > 0) {
        // Simulate finding a matching student (in real app, this would be based on actual biometric matching)
        const matchedStudent = students[0]; // For demo, just take the first enrolled student
        
        setVerifiedStudent(matchedStudent);
        setVerificationStep('success');
        
        toast({
          title: "Verification Successful",
          description: `Identity verified for ${matchedStudent.name}`
        });

        // Pass the verified student to parent component
        setTimeout(() => {
          onVerificationSuccess(matchedStudent);
          onClose();
          resetVerification();
        }, 2000);

      } else {
        throw new Error('No enrolled biometric data found. Please enroll first.');
      }

    } catch (error: any) {
      console.error('Error verifying biometric data:', error);
      const errorMessage = error.message || "Failed to verify biometric data";
      onVerificationError(errorMessage);
      toast({
        title: "Verification Failed",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setIsVerifying(false);
    }
  };

  const handleVerificationError = (error: string) => {
    onVerificationError(error);
    toast({
      title: "Verification Failed",
      description: error,
      variant: "destructive"
    });
    setIsVerifying(false);
  };

  const startVerification = () => {
    setVerificationStep('verifying');
  };

  const resetVerification = () => {
    setVerificationStep('start');
    setVerifiedStudent(null);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Biometric Verification
          </DialogTitle>
          <DialogDescription>
            Verify student identity using biometric authentication before book issuance
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {verificationStep === 'start' && (
            <div className="text-center space-y-6">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary/10">
                <Shield className="h-10 w-10 text-primary" />
              </div>
              
              <div className="space-y-2">
                <h3 className="text-lg font-semibold">Identity Verification Required</h3>
                <p className="text-sm text-muted-foreground">
                  Student must verify their identity using biometric authentication before borrowing books.
                </p>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-2">
                  <AlertCircle className="h-4 w-4 text-amber-600" />
                  <span className="font-medium text-amber-800 text-sm">Security Notice</span>
                </div>
                <p className="text-xs text-amber-700">
                  Only enrolled students with registered biometric data can borrow books through this system.
                </p>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" onClick={onClose} className="flex-1">
                  Cancel
                </Button>
                <Button onClick={startVerification} className="flex-1">
                  Start Verification
                </Button>
              </div>
            </div>
          )}

          {verificationStep === 'verifying' && (
            <div className="space-y-4">
              <BiometricAuth
                mode="verify"
                onAuthSuccess={handleVerificationSuccess}
                onAuthError={handleVerificationError}
              />
              
              <div className="flex gap-2">
                <Button variant="outline" onClick={resetVerification} className="flex-1">
                  Back
                </Button>
              </div>
            </div>
          )}

          {verificationStep === 'success' && verifiedStudent && (
            <div className="text-center space-y-6">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-100">
                <CheckCircle className="h-10 w-10 text-green-600" />
              </div>
              
              <div className="space-y-2">
                <h3 className="text-lg font-semibold text-green-600">Verification Successful!</h3>
                <p className="text-sm text-muted-foreground">
                  Identity verified for {verifiedStudent.name}
                </p>
                <div className="bg-green-50 border border-green-200 rounded-lg p-3 mt-4">
                  <div className="text-sm">
                    <div className="font-medium">{verifiedStudent.name}</div>
                    <div className="text-muted-foreground">
                      {verifiedStudent.admission_number} • {verifiedStudent.class}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};