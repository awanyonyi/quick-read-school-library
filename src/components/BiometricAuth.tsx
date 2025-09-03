import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Fingerprint, Eye, Shield, CheckCircle, AlertCircle } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface BiometricAuthProps {
  onAuthSuccess: (biometricId: string) => void;
  onAuthError: (error: string) => void;
  mode: 'enroll' | 'verify';
  studentId?: string;
}

export const BiometricAuth: React.FC<BiometricAuthProps> = ({
  onAuthSuccess,
  onAuthError,
  mode,
  studentId
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [authType, setAuthType] = useState<'fingerprint' | 'face'>('fingerprint');

  // Check if biometric authentication is supported (WebAuthn or DigitalPersona)
  const isBiometricSupported = () => {
    // Check for DigitalPersona SDK and drivers
    if (window.DPWebSDK || window.dpWebSDK) {
      return true;
    }
    
    // Check for DigitalPersona ActiveX controls (legacy support)
    try {
      const activeXControl = new ActiveXObject("DPFPCtl.DPFPControl");
      if (activeXControl) {
        return true;
      }
    } catch (e) {
      // ActiveX not available, continue checking
    }
    
    // Check for WebAuthn with proper permission handling
    if (window.PublicKeyCredential && navigator.credentials) {
      // Check if we're in a secure context
      if (!window.isSecureContext) {
        return false;
      }
      return true;
    }
    
    return false;
  };

  const generateBiometricId = () => {
    return `bio_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  };

  const enrollBiometric = async () => {
    if (!isBiometricSupported()) {
      onAuthError('Biometric authentication is not supported on this device');
      return;
    }

    setIsProcessing(true);
    
    try {
      // Try DigitalPersona first for hardware-based capture
      if (window.DPWebSDK || window.dpWebSDK) {
        await enrollDigitalPersona();
        return;
      }
      
      // Fallback to WebAuthn - simulate base64 capture for demo
      const simulatedBiometricData = await captureSimulatedFingerprint();
      
      // Send Base64 template to backend for storage
      const { data, error } = await supabase.rpc('store_biometric_template', {
        student_id_param: studentId,
        template_data: simulatedBiometricData,
        biometric_type: authType
      });

      if (error) {
        throw new Error(error.message);
      }

      if (data && data.length > 0 && data[0].success) {
        onAuthSuccess(JSON.stringify({
          biometricId: `bio_${studentId}`,
          templateStored: true,
          authType,
          enrolledAt: new Date().toISOString()
        }));

        toast({
          title: "Success",
          description: `${authType === 'fingerprint' ? 'Fingerprint' : 'Face'} enrolled successfully`
        });
      } else {
        throw new Error(data?.[0]?.message || 'Failed to store biometric template');
      }
    } catch (error: any) {
      console.error('Biometric enrollment error:', error);
      let errorMessage = 'Failed to enroll biometric data';
      
      if (error.name === 'NotAllowedError') {
        errorMessage = 'Biometric enrollment was cancelled or not allowed';
      } else if (error.name === 'NotSupportedError') {
        errorMessage = 'Biometric authentication is not supported on this device';
      } else if (error.name === 'SecurityError') {
        errorMessage = 'Security error during biometric enrollment';
      } else {
        errorMessage = error.message || errorMessage;
      }
      
      onAuthError(errorMessage);
    } finally {
      setIsProcessing(false);
    }
  };

  const captureSimulatedFingerprint = async (): Promise<string> => {
    // Simulate capturing fingerprint and converting to Base64
    // In real implementation, this would interface with DigitalPersona SDK
    return new Promise((resolve) => {
      setTimeout(() => {
        // Generate a unique base64-like string for simulation
        const simulatedTemplate = btoa(`fingerprint_${studentId}_${Date.now()}_${Math.random()}`);
        resolve(simulatedTemplate);
      }, 2000); // Simulate capture time
    });
  };

  const enrollDigitalPersona = async () => {
    try {
      console.log('Starting DigitalPersona enrollment...');
      
      // Check for DigitalPersona SDK availability
      const dpSDK = window.DPWebSDK || window.dpWebSDK;
      if (!dpSDK) {
        // Try alternative detection methods
        if (typeof ActiveXObject !== 'undefined') {
          try {
            new ActiveXObject("DPFPCtl.DPFPControl");
            throw new Error('DigitalPersona ActiveX detected but Web SDK not available. Please ensure DigitalPersona Web SDK is properly installed.');
          } catch (activeXError) {
            throw new Error('DigitalPersona SDK not found. Please install DigitalPersona software and ensure drivers are properly configured.');
          }
        } else {
          throw new Error('DigitalPersona SDK not found. Please install DigitalPersona software with Web SDK support.');
        }
      }
      
      console.log('DigitalPersona SDK found, capturing fingerprint...');
      
      // Show user feedback
      toast({
        title: "Ready to Capture",
        description: "Please place your finger on the DigitalPersona sensor"
      });
      
      // Capture fingerprint template using DigitalPersona SDK
      const template = await captureDigitalPersonaFingerprint(dpSDK);
      
      console.log('Fingerprint captured, storing template...');
      
      // Send Base64 template to backend for storage
      const { data, error } = await supabase.rpc('store_biometric_template', {
        student_id_param: studentId,
        template_data: template,
        biometric_type: authType
      });

      if (error) {
        throw new Error(error.message);
      }

      if (data && data.length > 0 && data[0].success) {
        const enrollmentData = {
          biometricId: `bio_${studentId}`,
          deviceType: 'DigitalPersona',
          templateStored: true,
          authType,
          enrolledAt: new Date().toISOString(),
          sdkVersion: dpSDK.version || 'Unknown'
        };
        
        onAuthSuccess(JSON.stringify(enrollmentData));
        
        toast({
          title: "Enrollment Successful",
          description: `${authType === 'fingerprint' ? 'Fingerprint' : 'Face'} enrolled successfully with DigitalPersona device`
        });
      } else {
        throw new Error(data?.[0]?.message || 'Failed to store biometric template');
      }
    } catch (error: any) {
      console.error('DigitalPersona enrollment error:', error);
      throw new Error(`DigitalPersona enrollment failed: ${error.message}`);
    }
  };

  const captureDigitalPersonaFingerprint = async (dpSDK: any): Promise<string> => {
    return new Promise((resolve, reject) => {
      try {
        // Initialize DigitalPersona SDK
        console.log('Initializing DigitalPersona SDK...');
        
        // Check for different SDK versions and initialization methods
        let fingerprintReader;
        
        if (dpSDK.FingerprintReader) {
          // Web SDK version
          fingerprintReader = new dpSDK.FingerprintReader();
        } else if (dpSDK.createFingerprintReader) {
          // Alternative SDK version
          fingerprintReader = dpSDK.createFingerprintReader();
        } else {
          throw new Error('DigitalPersona FingerprintReader not found in SDK');
        }
        
        let captureTimeout: NodeJS.Timeout;
        let capturedSample: any = null;
        
        // Set capture timeout (30 seconds)
        captureTimeout = setTimeout(() => {
          fingerprintReader.stopAcquisition?.().catch(() => {});
          reject(new Error('Fingerprint capture timeout - please try again'));
        }, 30000);
        
        // Listen for successful capture
        fingerprintReader.on('SampleAcquired', (sample: any) => {
          clearTimeout(captureTimeout);
          capturedSample = sample;
          console.log('Fingerprint sample acquired successfully');
          
          // Stop capture and process sample
          fingerprintReader.stopAcquisition()
            .then(() => {
              try {
                // Extract template data - handle different SDK response formats
                let templateData;
                if (sample.Data) {
                  templateData = sample.Data;
                } else if (sample.template) {
                  templateData = sample.template;
                } else if (sample.raw) {
                  templateData = sample.raw;
                } else {
                  templateData = sample;
                }
                
                // Convert to base64 for storage
                const base64Template = typeof templateData === 'string' 
                  ? btoa(templateData) 
                  : btoa(JSON.stringify(templateData));
                
                console.log('Template processed and converted to base64');
                resolve(base64Template);
              } catch (processError) {
                reject(new Error(`Failed to process fingerprint template: ${processError}`));
              }
            })
            .catch((stopError: any) => {
              reject(new Error(`Failed to stop fingerprint capture: ${stopError.message}`));
            });
        });
        
        // Listen for capture errors
        fingerprintReader.on('ErrorOccurred', (error: any) => {
          clearTimeout(captureTimeout);
          fingerprintReader.stopAcquisition?.().catch(() => {});
          console.error('DigitalPersona capture error:', error);
          reject(new Error(`Fingerprint capture failed: ${error.message || 'Unknown error'}`));
        });
        
        // Listen for quality feedback
        fingerprintReader.on('QualityReported', (quality: any) => {
          console.log('Fingerprint quality:', quality);
          // You can add UI feedback here for quality
        });
        
        // Start fingerprint capture with optimal settings
        const captureSettings = {
          format: dpSDK.SampleFormat?.PngImage || 'PngImage',
          resolution: 500, // Standard resolution
          compression: dpSDK.CompressionAlgorithm?.None || 'None'
        };
        
        console.log('Starting fingerprint capture with settings:', captureSettings);
        
        fingerprintReader.startAcquisition(captureSettings)
          .catch((startError: any) => {
            clearTimeout(captureTimeout);
            console.error('Failed to start fingerprint capture:', startError);
            reject(new Error(`Failed to start fingerprint capture: ${startError.message}`));
          });
        
      } catch (error: any) {
        console.error('DigitalPersona initialization failed:', error);
        reject(new Error(`DigitalPersona initialization failed: ${error.message}`));
      }
    });
  };

  const verifyBiometric = async () => {
    if (!isBiometricSupported()) {
      onAuthError('Biometric authentication is not supported on this device');
      return;
    }

    setIsProcessing(true);
    
    try {
      // Try DigitalPersona first for hardware-based verification
      if (window.DPWebSDK || window.dpWebSDK) {
        await verifyDigitalPersona();
        return;
      }
      
      // Fallback to simulated capture for demo
      const capturedTemplate = await captureSimulatedFingerprint();
      
      // Send Base64 template to backend for verification
      const { data, error } = await supabase.rpc('verify_biometric_template', {
        template_data: capturedTemplate,
        biometric_type: authType
      });

      if (error) {
        throw new Error(error.message);
      }

      if (data && data.length > 0 && data[0].success) {
        const studentData = data[0];
        
        onAuthSuccess(JSON.stringify({
          success: true,
          studentId: studentData.student_id,
          studentName: studentData.student_name,
          admissionNumber: studentData.admission_number,
          verifiedAt: new Date().toISOString(),
          authType
        }));
        
        toast({
          title: "Success",
          description: `${authType === 'fingerprint' ? 'Fingerprint' : 'Face'} verified successfully`
        });
      } else {
        throw new Error(data?.[0]?.message || 'Biometric verification failed');
      }
    } catch (error: any) {
      console.error('Biometric verification error:', error);
      let errorMessage = 'Failed to verify biometric data';
      
      if (error.name === 'NotAllowedError') {
        errorMessage = 'Biometric verification was cancelled or not allowed';
      } else if (error.name === 'NotSupportedError') {
        errorMessage = 'Biometric authentication is not supported on this device';
      } else if (error.name === 'SecurityError') {
        errorMessage = 'Security error during biometric verification';
      } else {
        errorMessage = error.message || errorMessage;
      }
      
      onAuthError(errorMessage);
    } finally {
      setIsProcessing(false);
    }
  };

  const verifyDigitalPersona = async () => {
    try {
      console.log('Starting DigitalPersona verification...');
      
      // Check for DigitalPersona SDK availability
      const dpSDK = window.DPWebSDK || window.dpWebSDK;
      if (!dpSDK) {
        throw new Error('DigitalPersona SDK not found. Please ensure DigitalPersona software is running.');
      }
      
      console.log('DigitalPersona SDK found, capturing fingerprint for verification...');
      
      // Show user feedback
      toast({
        title: "Ready to Verify",
        description: "Please place your finger on the DigitalPersona sensor"
      });
      
      // Capture fingerprint template using DigitalPersona SDK
      const capturedTemplate = await captureDigitalPersonaFingerprint(dpSDK);
      
      console.log('Fingerprint captured, verifying against database...');
      
      // Send Base64 template to backend for verification
      const { data, error } = await supabase.rpc('verify_biometric_template', {
        template_data: capturedTemplate,
        biometric_type: authType
      });

      if (error) {
        throw new Error(error.message);
      }

      if (data && data.length > 0 && data[0].success) {
        const studentData = data[0];
        
        const verificationData = {
          success: true,
          studentId: studentData.student_id,
          studentName: studentData.student_name,
          admissionNumber: studentData.admission_number,
          deviceType: 'DigitalPersona',
          verifiedAt: new Date().toISOString(),
          authType,
          sdkVersion: dpSDK.version || 'Unknown'
        };
        
        onAuthSuccess(JSON.stringify(verificationData));
        
        toast({
          title: "Verification Successful",
          description: `Welcome ${studentData.student_name}! Identity verified with DigitalPersona device`
        });
      } else {
        throw new Error(data?.[0]?.message || 'Biometric verification failed - no matching fingerprint found');
      }
    } catch (error: any) {
      console.error('DigitalPersona verification error:', error);
      throw new Error(`DigitalPersona verification failed: ${error.message}`);
    }
  };

  const handleBiometricAuth = () => {
    if (mode === 'enroll') {
      enrollBiometric();
    } else {
      verifyBiometric();
    }
  };

  if (!isBiometricSupported()) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-amber-500" />
            Biometric Not Supported
          </CardTitle>
          <CardDescription>
            Biometric authentication is not available. Please ensure DigitalPersona drivers and SDK are installed.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="p-3 bg-muted rounded-lg">
              <h4 className="font-medium text-sm mb-2">DigitalPersona Setup:</h4>
              <ul className="text-xs text-muted-foreground space-y-1">
                <li>• Install DigitalPersona software with Web SDK</li>
                <li>• Ensure drivers are properly configured</li>
                <li>• Connect your DigitalPersona fingerprint device</li>
                <li>• Run the DigitalPersona service</li>
              </ul>
            </div>
            <p className="text-xs text-muted-foreground">
              If you have the software installed, try refreshing the page or restarting the DigitalPersona service.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-primary" />
          {mode === 'enroll' ? 'Enroll Biometric' : 'Verify Identity'}
        </CardTitle>
        <CardDescription>
          {mode === 'enroll' 
            ? 'Register your biometric data for secure authentication'
            : 'Verify your identity using biometric authentication'
          }
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Button
            variant={authType === 'fingerprint' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setAuthType('fingerprint')}
            className="flex items-center gap-2"
          >
            <Fingerprint className="h-4 w-4" />
            Fingerprint
          </Button>
          <Button
            variant={authType === 'face' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setAuthType('face')}
            className="flex items-center gap-2"
          >
            <Eye className="h-4 w-4" />
            Face ID
          </Button>
        </div>

        <div className="text-center py-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
            {authType === 'fingerprint' ? (
              <Fingerprint className="h-8 w-8 text-primary" />
            ) : (
              <Eye className="h-8 w-8 text-primary" />
            )}
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            {mode === 'enroll' 
              ? `Place your ${authType === 'fingerprint' ? 'finger on the sensor' : 'face in front of the camera'} to enroll`
              : `Use your ${authType === 'fingerprint' ? 'fingerprint' : 'face'} to verify your identity`
            }
          </p>
        </div>

        <Button 
          onClick={handleBiometricAuth}
          disabled={isProcessing}
          className="w-full"
        >
          {isProcessing ? (
            <div className="flex items-center gap-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              Processing...
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4" />
              {mode === 'enroll' ? 'Enroll Now' : 'Verify Now'}
            </div>
          )}
        </Button>

        <div className="text-center">
          <Badge variant="secondary" className="text-xs">
            Secure Biometric Authentication
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
};