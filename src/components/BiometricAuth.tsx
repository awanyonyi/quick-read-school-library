import React, { useState, useEffect } from 'react';
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
  const [fingerprintReader, setFingerprintReader] = useState<any>(null);

  useEffect(() => {
    // Initialize DigitalPersona reader using window SDK directly
    const initializeReader = async () => {
      try {
        // Wait for DOM to be ready
        await new Promise(resolve => {
          if (document.readyState === 'complete') {
            resolve(true);
          } else {
            window.addEventListener('load', () => resolve(true));
          }
        });

        // ES6: Array destructuring and find() for SDK detection
        const sdkNames = ['DPWebSDK', 'dpWebSDK', 'DigitalPersona', 'DPFP'];
        const dpSDK = sdkNames.map(name => (window as any)[name]).find(Boolean);
        
        console.log("Checking for DigitalPersona SDK:", !!dpSDK);
        
        if (dpSDK) {
          // ES6: Array of initialization methods with find()
          const initMethods = [
            () => dpSDK.FingerprintReader && new dpSDK.FingerprintReader(),
            () => dpSDK.createFingerprintReader && dpSDK.createFingerprintReader(),
            () => dpSDK.WebSdk?.FingerprintReader && new dpSDK.WebSdk.FingerprintReader()
          ];
          
          const reader = initMethods.map(method => {
            try { return method(); } catch { return null; }
          }).find(Boolean);
          
          if (reader) {
            console.log("DigitalPersona reader initialized successfully");
            setFingerprintReader(reader);

            reader.on("DeviceConnected", () => {
              console.log("DigitalPersona reader connected");
              toast({
                title: "Device Connected",
                description: "DigitalPersona fingerprint reader is ready"
              });
            });

            reader.on("DeviceDisconnected", () => {
              console.log("DigitalPersona reader disconnected");
              toast({
                title: "Device Disconnected",
                description: "DigitalPersona fingerprint reader disconnected",
                variant: "destructive"
              });
            });

            reader.on("SamplesAcquired", (event: any) => {
              console.log("Fingerprint samples acquired:", event.samples);
            });

            reader.on("ErrorOccurred", (err: any) => {
              console.error("DigitalPersona reader error:", err);
            });
          } else {
            console.log("No compatible DigitalPersona reader found");
          }
        } else {
          console.log("DigitalPersona SDK not found on window object");
        }
      } catch (error) {
        console.log("DigitalPersona SDK not available, will use alternative methods");
      }
    };

    initializeReader();

    return () => {
      if (fingerprintReader) {
        fingerprintReader.stopAcquisition?.().catch(() => {});
        fingerprintReader.off?.(); // remove listeners
      }
    };
  }, []);

  // Check if biometric authentication is supported (WebAuthn or DigitalPersona)
  const isBiometricSupported = () => {
    // ES6: Use Array.includes() for cleaner SDK detection
    const sdkProperties = ['DPWebSDK', 'dpWebSDK'];
    const hasSDK = sdkProperties.some(prop => window[prop]);
    
    if (hasSDK) {
      return true;
    }
    
    // Check for DigitalPersona ActiveX controls (legacy support)
    try {
      const activeXControl = new ActiveXObject("DPFPCtl.DPFPControl");
      return Boolean(activeXControl);
    } catch (e) {
      // ActiveX not available, continue checking
    }
    
    // ES6: Destructuring and logical operators for WebAuthn check
    const { PublicKeyCredential } = window;
    const { credentials } = navigator;
    
    // Check for WebAuthn with proper permission handling
    if (PublicKeyCredential && credentials && window.isSecureContext) {
      return true;
    }
    
    return false;
  };

  // ES6: Template literals and modern string methods
  const generateBiometricId = () => {
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 11);
    return `bio_${timestamp}_${randomString}`;
  };

  const enrollBiometric = async () => {
    if (!fingerprintReader) {
      onAuthError('DigitalPersona reader not initialized');
      return;
    }

    setIsProcessing(true);
    
    try {
      toast({
        title: "Ready to Capture",
        description: "Please place your finger on the DigitalPersona sensor"
      });

      // Start fingerprint capture for enrollment
      const template = await captureFingerprint();
      
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
        onAuthSuccess(JSON.stringify({
          biometricId: `bio_${studentId}`,
          templateStored: true,
          authType,
          enrolledAt: new Date().toISOString()
        }));

        toast({
          title: "Enrollment Successful",
          description: `${authType === 'fingerprint' ? 'Fingerprint' : 'Face'} enrolled successfully`
        });
      } else {
        throw new Error(data?.[0]?.message || 'Failed to store biometric template');
      }
    } catch (error: any) {
      console.error('Biometric enrollment error:', error);
      onAuthError(error.message || 'Failed to enroll biometric data');
    } finally {
      setIsProcessing(false);
    }
  };

  const captureFingerprint = async (): Promise<string> => {
    if (!fingerprintReader) {
      throw new Error('Fingerprint reader not initialized');
    }

    return new Promise((resolve, reject) => {
      const handleSamplesAcquired = (event: any) => {
        console.log("Fingerprint samples acquired:", event.samples);
        fingerprintReader?.stopAcquisition().catch(() => {});
        
        try {
          // Convert samples to base64 template
          const template = btoa(JSON.stringify(event.samples));
          resolve(template);
        } catch (error) {
          reject(new Error('Failed to process fingerprint samples'));
        }
      };

      const handleError = (error: any) => {
        console.error("Fingerprint capture error:", error);
        fingerprintReader?.stopAcquisition().catch(() => {});
        reject(new Error(`Fingerprint capture failed: ${error.message || 'Unknown error'}`));
      };

      // Set up event listeners
      fingerprintReader.on("SamplesAcquired", handleSamplesAcquired);
      fingerprintReader.on("ErrorOccurred", handleError);

      // Start capture with timeout
      const timeout = setTimeout(() => {
        fingerprintReader?.stopAcquisition().catch(() => {});
        reject(new Error('Fingerprint capture timeout'));
      }, 30000);

      fingerprintReader.startAcquisition('Intermediate')
        .catch((error) => {
          clearTimeout(timeout);
          reject(new Error(`Failed to start fingerprint capture: ${error.message}`));
        });
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
                // ES6: Destructuring with default values for template extraction
                const { Data, template, raw } = sample;
                const templateData = Data || template || raw || sample;
                
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
        
        // ES6: Object property shorthand and optional chaining
        const captureSettings = {
          format: dpSDK.SampleFormat?.PngImage ?? 'PngImage',
          resolution: 500, // Standard resolution
          compression: dpSDK.CompressionAlgorithm?.None ?? 'None'
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
      // ES6: Array includes for SDK detection
      const dpSdkAvailable = ['DPWebSDK', 'dpWebSDK'].some(sdk => window[sdk]);
      if (dpSdkAvailable) {
        await verifyDigitalPersona();
        return;
      }
      
      // Use the new DigitalPersona integration
      const capturedTemplate = await captureFingerprint();
      
      // Send Base64 template to backend for verification
      const { data, error } = await supabase.rpc('verify_biometric_template', {
        template_data: capturedTemplate,
        biometric_type: authType
      });

      if (error) {
        throw new Error(error.message);
      }

      // ES6: Optional chaining and destructuring
      const [firstResult] = data || [];
      
      if (firstResult?.success) {
        const { student_id, student_name, admission_number } = firstResult;
        
        const successData = {
          success: true,
          studentId: student_id,
          studentName: student_name,
          admissionNumber: admission_number,
          verifiedAt: new Date().toISOString(),
          authType
        };
        
        onAuthSuccess(JSON.stringify(successData));
        
        const authTypeName = authType === 'fingerprint' ? 'Fingerprint' : 'Face';
        toast({
          title: "Success",
          description: `${authTypeName} verified successfully`
        });
      } else {
        throw new Error(firstResult?.message ?? 'Biometric verification failed');
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
      
      // ES6: Destructuring for SDK detection
      const { DPWebSDK, dpWebSDK } = window;
      const dpSDK = DPWebSDK || dpWebSDK;
      
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