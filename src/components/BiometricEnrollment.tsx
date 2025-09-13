import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { BiometricAuth } from './BiometricAuth';
import { apiClient } from '@/utils/apiClient';
import { toast } from '@/hooks/use-toast';
import { Fingerprint, CheckCircle } from 'lucide-react';

interface BiometricEnrollmentProps {
  isOpen: boolean;
  onClose: () => void;
  studentId: string;
  studentName: string;
  onEnrollmentComplete: () => void;
}

export const BiometricEnrollment: React.FC<BiometricEnrollmentProps> = ({
  isOpen,
  onClose,
  studentId,
  studentName,
  onEnrollmentComplete
}) => {
  const [isEnrolling, setIsEnrolling] = useState(false);
  const [enrollmentStep, setEnrollmentStep] = useState<'start' | 'enrolling' | 'complete'>('start');

  // Check for duplicate fingerprints before enrollment
  const checkForDuplicates = async (newFingerprint: string): Promise<boolean> => {
    try {
      // Fetch all enrolled biometric data
      const existingBiometricData = await apiClient.getBiometricData();

      if (existingBiometricData.length === 0) {
        return false; // No duplicates if no existing data
      }

      // Get SDK instance for verification
      const win = window as any;
      const sdkAvailable = !!(
        (win.Fingerprint && win.Fingerprint.WebApi) ||
        win.DPWebSDK ||
        win.dpWebSDK ||
        win.DigitalPersona ||
        win.DPFP ||
        win.WebSdk
      );

      if (!sdkAvailable) {
        console.warn('SDK not available for duplicate check, proceeding with enrollment');
        return false;
      }

      let reader;
      try {
        // Initialize SDK reader for verification
        if (win.Fingerprint?.WebApi) {
          reader = new win.Fingerprint.WebApi();
        } else if (win.WebSdk) {
          reader = typeof win.WebSdk === 'function' ? new win.WebSdk() : win.WebSdk;
        } else {
          console.warn('Unsupported SDK for verification, proceeding with enrollment');
          return false;
        }

        // Check each existing fingerprint
        for (const existing of existingBiometricData) {
          if (!existing.biometric_data?.fingerprint) continue;

          try {
            // Use SDK verification method (this is a simplified implementation)
            // In a real implementation, you'd use the SDK's verify method
            const verificationResult = await reader.verifyFingerprints(
              newFingerprint,
              existing.biometric_data.fingerprint
            );

            // Check if verification score is above threshold (e.g., 80%)
            if (verificationResult.score > 0.8) {
              toast({
                title: "Duplicate Fingerprint Detected",
                description: `This fingerprint is already enrolled for ${existing.name}. Enrollment cancelled.`,
                variant: "destructive"
              });
              return true; // Duplicate found
            }
          } catch (verifyError) {
            console.warn('Verification failed for existing fingerprint:', verifyError);
            // Continue checking other fingerprints
          }
        }

        return false; // No duplicates found

      } catch (sdkError) {
        console.warn('SDK verification setup failed:', sdkError);
        return false; // Proceed with enrollment if verification fails
      }

    } catch (error) {
      console.error('Error checking for duplicates:', error);
      // Proceed with enrollment if duplicate check fails
      return false;
    }
  };

  // ES6: Enhanced async/await with destructuring and arrow functions
  const handleEnrollmentSuccess = async (biometricData: string) => {
    setIsEnrolling(true);

    try {
      const biometricInfo = JSON.parse(biometricData);

      // Check for duplicate fingerprints before saving
      const isDuplicate = await checkForDuplicates(biometricInfo.fingerprint);

      if (isDuplicate) {
        setIsEnrolling(false);
        return; // Stop enrollment if duplicate found
      }

      // ES6: Object property shorthand
      const updateData = {
        biometric_enrolled: true,
        biometric_id: biometricInfo.biometricId,
        biometric_data: biometricInfo
      };

      await apiClient.updateBiometricData(studentId, updateData);

      // ES6: Array of completion actions
      const completionActions = [
        () => setEnrollmentStep('complete'),
        () => onEnrollmentComplete(),
        () => toast({
          title: "Enrollment Complete",
          description: `Biometric data enrolled successfully for ${studentName}`
        })
      ];

      completionActions.forEach(action => action());

      // ES6: Arrow function in setTimeout
      setTimeout(() => {
        [onClose, () => setEnrollmentStep('start')].forEach(fn => fn());
      }, 2000);

    } catch (error: any) {
      console.error('Error saving biometric data:', error);
      toast({
        title: "Error",
        description: error?.message ?? "Failed to save biometric data",
        variant: "destructive"
      });
    } finally {
      setIsEnrolling(false);
    }
  };

  const handleEnrollmentError = (error: string) => {
    toast({
      title: "Enrollment Failed",
      description: error,
      variant: "destructive"
    });
    setIsEnrolling(false);
  };

  const startEnrollment = () => {
    setEnrollmentStep('enrolling');
  };

  const resetEnrollment = () => {
    setEnrollmentStep('start');
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Fingerprint className="h-5 w-5 text-primary" />
            Biometric Enrollment
          </DialogTitle>
          <DialogDescription>
            Enroll biometric data for {studentName} to enable secure book borrowing
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {enrollmentStep === 'start' && (
            <div className="text-center space-y-6">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary/10">
                <Fingerprint className="h-10 w-10 text-primary" />
              </div>
              
              <div className="space-y-2">
                <h3 className="text-lg font-semibold">Ready to Enroll</h3>
                <p className="text-sm text-muted-foreground">
                  This will register the student's biometric data for secure authentication during book borrowing.
                </p>
              </div>

              <div className="space-y-3">
                <div className="text-left bg-muted p-3 rounded-lg">
                  <h4 className="font-medium text-sm mb-2">Enrollment Process:</h4>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>• Student places finger on sensor or looks at camera</li>
                    <li>• System captures and encrypts biometric data</li>
                    <li>• Data is securely stored for future verification</li>
                    <li>• Student can now borrow books using biometric authentication</li>
                  </ul>
                </div>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" onClick={onClose} className="flex-1">
                  Cancel
                </Button>
                <Button onClick={startEnrollment} className="flex-1">
                  Start Enrollment
                </Button>
              </div>
            </div>
          )}

          {enrollmentStep === 'enrolling' && (
            <div className="space-y-4">
              <BiometricAuth
                mode="enroll"
                studentId={studentId}
                onAuthSuccess={handleEnrollmentSuccess}
                onAuthError={handleEnrollmentError}
              />
              
              <div className="flex gap-2">
                <Button variant="outline" onClick={resetEnrollment} className="flex-1">
                  Back
                </Button>
              </div>
            </div>
          )}

          {enrollmentStep === 'complete' && (
            <div className="text-center space-y-6">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-100">
                <CheckCircle className="h-10 w-10 text-green-600" />
              </div>
              
              <div className="space-y-2">
                <h3 className="text-lg font-semibold text-green-600">Enrollment Complete!</h3>
                <p className="text-sm text-muted-foreground">
                  {studentName} can now use biometric authentication for book borrowing.
                </p>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};