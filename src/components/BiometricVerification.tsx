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

  // ES6: Enhanced error handling with destructuring and optional chaining
  const handleVerificationSuccess = async (verificationData: string) => {
    try {
      const parsedData = JSON.parse(verificationData);
      const { success, studentId, message } = parsedData;
      
      if (success && studentId) {
        const { data: student, error } = await supabase
          .from('students')
          .select('*')
          .eq('id', studentId)
          .single();

        if (error) {
          console.error('Error fetching student:', error);
          onVerificationError('Database error during verification');
          return;
        }

        if (student) {
          // Enhanced success feedback with detailed student information
          const successActions = [
            () => setVerifiedStudent(student),
            () => setVerificationStep('success'),
            () => toast({
              title: "🔐 Biometric Verification Successful!",
              description: (
                <div className="space-y-2">
                  <div className="font-semibold text-green-700">
                    ✅ Identity Verified for {student.name}
                  </div>
                  <div className="text-sm space-y-1">
                    <div>👤 <span className="font-medium">{student.name}</span></div>
                    <div>🎓 Admission: <span className="font-medium">{student.admission_number}</span></div>
                    <div>🏫 Class: <span className="font-medium">{student.class}</span></div>
                    <div>📧 Email: <span className="font-medium">{student.email || 'Not provided'}</span></div>
                  </div>
                  <div className="text-xs text-green-600 font-medium mt-2">
                    Ready to proceed with book issuance
                  </div>
                </div>
              ),
              duration: 5000,
            })
          ];

          successActions.forEach(action => action());

          // ES6: Array of cleanup actions with arrow functions
          const cleanupActions = [
            () => onVerificationSuccess(student),
            () => onClose(),
            () => resetVerification()
          ];
          
          setTimeout(() => {
            cleanupActions.forEach(action => action());
          }, 2000);
        } else {
          onVerificationError('Student not found');
        }
      } else {
        onVerificationError(message ?? 'Biometric verification failed');
      }
    } catch (error: any) {
      console.error('Verification error:', error);
      onVerificationError('Verification failed');
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
            <div className="text-center space-y-6 animate-pulse">
              <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-green-100 border-4 border-green-200">
                <CheckCircle className="h-12 w-12 text-green-600" />
              </div>

              <div className="space-y-3">
                <h3 className="text-xl font-bold text-green-600">🎉 VERIFICATION SUCCESSFUL!</h3>
                <p className="text-sm text-muted-foreground">
                  Student identity has been securely verified
                </p>

                <div className="bg-green-50 border-2 border-green-200 rounded-lg p-4 space-y-3">
                  <div className="text-center">
                    <div className="text-lg font-bold text-green-800">{verifiedStudent.name}</div>
                    <div className="text-sm text-green-700">✅ Biometric Authentication Passed</div>
                  </div>

                  <div className="border-t border-green-200 pt-3 space-y-2">
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div className="bg-white rounded p-2">
                        <div className="text-gray-500 text-xs">ADMISSION</div>
                        <div className="font-semibold">{verifiedStudent.admission_number}</div>
                      </div>
                      <div className="bg-white rounded p-2">
                        <div className="text-gray-500 text-xs">CLASS</div>
                        <div className="font-semibold">{verifiedStudent.class}</div>
                      </div>
                    </div>

                    {verifiedStudent.email && (
                      <div className="bg-white rounded p-2 text-sm">
                        <div className="text-gray-500 text-xs">EMAIL</div>
                        <div className="font-semibold">{verifiedStudent.email}</div>
                      </div>
                    )}
                  </div>

                  <div className="border-t border-green-200 pt-3">
                    <div className="text-center">
                      <div className="inline-flex items-center gap-2 bg-green-100 px-3 py-1 rounded-full text-xs font-medium text-green-800">
                        <CheckCircle className="h-3 w-3" />
                        READY FOR BOOK ISSUANCE
                      </div>
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