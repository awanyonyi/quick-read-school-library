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
  const [reader] = useState(() => new (window as any).Fingerprint.WebApi());

  useEffect(() => {
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
    reader
      .startAcquisition((window as any).Fingerprint.SampleFormat.PngImage)
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
  }, [mode, studentId, onAuthSuccess, onAuthError, reader]);

  return (
    <div className="text-center space-y-3">
      <p className="text-sm text-muted-foreground">{status}</p>
    </div>
  );
};
