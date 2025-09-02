import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Fingerprint, Eye, Shield, CheckCircle, AlertCircle } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

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

  // Check if WebAuthn is supported
  const isWebAuthnSupported = () => {
    return window.PublicKeyCredential && 
           navigator.credentials && 
           navigator.credentials.create;
  };

  const generateBiometricId = () => {
    return `bio_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  };

  const enrollBiometric = async () => {
    if (!isWebAuthnSupported()) {
      onAuthError('Biometric authentication is not supported on this device');
      return;
    }

    setIsProcessing(true);
    
    try {
      const biometricId = generateBiometricId();
      
      // Create WebAuthn credential for enrollment
      const credential = await navigator.credentials.create({
        publicKey: {
          challenge: new Uint8Array(32),
          rp: {
            name: "Maryland Secondary School Library",
            id: window.location.hostname,
          },
          user: {
            id: new TextEncoder().encode(studentId || biometricId),
            name: `student_${studentId}`,
            displayName: `Student ${studentId}`,
          },
          pubKeyCredParams: [{ alg: -7, type: "public-key" }],
          authenticatorSelection: {
            authenticatorAttachment: "platform",
            userVerification: "required",
          },
          timeout: 60000,
          attestation: "direct"
        }
      }) as PublicKeyCredential;

      if (credential) {
        // Store biometric credential reference
        const credentialData = {
          id: credential.id,
          type: credential.type,
          rawId: Array.from(new Uint8Array(credential.rawId)),
          response: {
            clientDataJSON: Array.from(new Uint8Array(credential.response.clientDataJSON)),
            attestationObject: Array.from(new Uint8Array((credential.response as AuthenticatorAttestationResponse).attestationObject))
          }
        };

        onAuthSuccess(JSON.stringify({
          biometricId,
          credentialId: credential.id,
          credentialData,
          authType,
          enrolledAt: new Date().toISOString()
        }));

        toast({
          title: "Success",
          description: `${authType === 'fingerprint' ? 'Fingerprint' : 'Face'} enrolled successfully`
        });
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
      }
      
      onAuthError(errorMessage);
    } finally {
      setIsProcessing(false);
    }
  };

  const verifyBiometric = async () => {
    if (!isWebAuthnSupported()) {
      onAuthError('Biometric authentication is not supported on this device');
      return;
    }

    setIsProcessing(true);
    
    try {
      // For verification, we would typically get stored credential IDs from the server
      // For demo purposes, we'll simulate verification
      const credential = await navigator.credentials.get({
        publicKey: {
          challenge: new Uint8Array(32),
          allowCredentials: [], // In real implementation, this would contain stored credential IDs
          userVerification: "required",
          timeout: 60000,
        }
      });

      if (credential) {
        const verificationData = {
          credentialId: credential.id,
          verifiedAt: new Date().toISOString(),
          authType
        };

        onAuthSuccess(JSON.stringify(verificationData));
        
        toast({
          title: "Success",
          description: `${authType === 'fingerprint' ? 'Fingerprint' : 'Face'} verified successfully`
        });
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
      }
      
      onAuthError(errorMessage);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleBiometricAuth = () => {
    if (mode === 'enroll') {
      enrollBiometric();
    } else {
      verifyBiometric();
    }
  };

  if (!isWebAuthnSupported()) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-amber-500" />
            Biometric Not Supported
          </CardTitle>
          <CardDescription>
            Biometric authentication is not available on this device or browser.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Please use a device with biometric capabilities and a supported browser to use this feature.
          </p>
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