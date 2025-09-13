import React, { useEffect, useState } from "react";

interface BiometricAuthProps {
  mode: "enroll" | "verify";
  studentId: string;
  onAuthSuccess: (biometricData: string) => void;
  onAuthError: (error: string) => void;
}

export const BiometricAuth: React.FC<BiometricAuthProps> = ({
  mode,
  studentId,
  onAuthSuccess,
  onAuthError,
}) => {
  const [status, setStatus] = useState<string>("Initializing device...");
  const [reader, setReader] = useState<any>(null);
  const [sdkLoaded, setSdkLoaded] = useState<boolean>(false);

  // Check if SDK is loaded
  useEffect(() => {
    let retryCount = 0;
    const maxRetries = 20; // Stop after 10 seconds (20 * 500ms)

    const checkSdkAvailability = () => {
      const win = window as any;
      if (win.Fingerprint && win.Fingerprint.WebApi) {
        setSdkLoaded(true);
        setStatus("SDK loaded. Initializing device...");
        try {
          const newReader = new win.Fingerprint.WebApi();
          setReader(newReader);
        } catch (err) {
          console.error("Failed to create WebApi instance:", err);
          setStatus("Failed to initialize biometric device.");
          onAuthError("Failed to initialize biometric device.");
        }
      } else {
        retryCount++;
        if (retryCount >= maxRetries) {
          setStatus("Biometric SDK failed to load. Please refresh the page.");
          onAuthError("Biometric SDK not available. Please ensure the device drivers are installed.");
          return;
        }
        setStatus("Waiting for biometric SDK to load...");
        // Retry after a short delay
        setTimeout(checkSdkAvailability, 500);
      }
    };

    checkSdkAvailability();
  }, [onAuthError]);

  // Initialize device when reader is available
  useEffect(() => {
    if (!reader || !sdkLoaded) return;

    // Listen for device connections
    reader.onDeviceConnected = (device) => {
      console.log("Fingerprint reader connected:", device);
      setStatus("Fingerprint reader connected. Ready to scan.");
    };

    reader.onDeviceDisconnected = (device) => {
      console.warn("Fingerprint reader disconnected.");
      setStatus("Device disconnected. Please reconnect.");
    };

    // Start acquisition when mounted
    const win = window as any;
    reader
      .startAcquisition(win.Fingerprint.SampleFormat.PngImage)
      .then(() => setStatus("Place your finger on the scanner"))
      .catch((err) => {
        console.error("Device acquisition error:", err);
        setStatus("Device not found or busy.");
        onAuthError("Cannot start acquisition. Is the device plugged in?");
      });

    // Subscribe to samples
    reader.onSamplesAcquired = (samples) => {
      try {
        const fingerprintImage = samples[0].Data; // Base64-encoded PNG
        const biometricPayload = {
          studentId,
          biometricId: `${studentId}-${Date.now()}`,
          fingerprint: fingerprintImage,
          mode,
          timestamp: new Date().toISOString(),
        };

        onAuthSuccess(JSON.stringify(biometricPayload));
        setStatus("Fingerprint captured successfully!");
        reader.stopAcquisition();
      } catch (err: any) {
        console.error("Sample processing error:", err);
        onAuthError(err.message || "Error processing fingerprint.");
      }
    };

    return () => {
      reader.stopAcquisition().catch(() => {});
    };
  }, [mode, studentId, onAuthSuccess, onAuthError, reader, sdkLoaded]);

  return (
    <div className="text-center space-y-3">
      <p className="text-sm text-muted-foreground">{status}</p>
    </div>
  );
};
