import React, { useEffect, useState } from "react";

interface BiometricAuthProps {
  mode: "enroll" | "verify";
  studentId?: string; // Optional for verify mode
  onAuthSuccess: (biometricData: string) => void;
  onAuthError: (error: string) => void;
}

export const BiometricAuth: React.FC<BiometricAuthProps> = ({
  mode,
  studentId,
  onAuthSuccess,
  onAuthError,
}) => {
  // For verify mode, we might not have a studentId yet
  const effectiveStudentId = studentId || 'unknown';
  const [status, setStatus] = useState<string>("Initializing device...");
  const [reader, setReader] = useState<any>(null);
  const [sdkLoaded, setSdkLoaded] = useState<boolean>(false);

  // Check if SDK is loaded
  useEffect(() => {
    let retryCount = 0;
    const maxRetries = 20; // Stop after 10 seconds (20 * 500ms)

    const checkSdkAvailability = () => {
      const win = window as any;

      // Debug logging
      console.log(`🔄 SDK Check Attempt ${retryCount + 1}/${maxRetries}`);
      console.log("Available globals:", {
        Fingerprint: !!win.Fingerprint,
        FingerprintWebApi: !!win.Fingerprint?.WebApi,
        DPWebSDK: !!win.DPWebSDK,
        dpWebSDK: !!win.dpWebSDK,
        DigitalPersona: !!win.DigitalPersona,
        DPFP: !!win.DPFP,
        WebSdk: !!win.WebSdk
      });

      // Check for available SDK objects
      const sdkAvailable = !!(
        (win.Fingerprint && win.Fingerprint.WebApi) ||
        win.DPWebSDK ||
        win.dpWebSDK ||
        win.DigitalPersona ||
        win.DPFP ||
        win.WebSdk
      );

      if (sdkAvailable) {
        console.log("✅ SDK detected!");
        setSdkLoaded(true);
        setStatus("SDK loaded. Initializing device...");

        try {
          let newReader;

          // Debug: Log available SDK properties
          console.log("SDK Properties Debug:", {
            Fingerprint: win.Fingerprint ? Object.keys(win.Fingerprint) : 'undefined',
            WebSdk: win.WebSdk ? Object.keys(win.WebSdk) : 'undefined',
            DPWebSDK: win.DPWebSDK ? Object.keys(win.DPWebSDK) : 'undefined'
          });

          // Try different SDK initialization methods
          if (win.Fingerprint?.WebApi) {
            console.log("✅ Using Fingerprint.WebApi");
            newReader = new win.Fingerprint.WebApi();
            console.log("Reader methods:", Object.getOwnPropertyNames(Object.getPrototypeOf(newReader)));
          } else if (win.DPWebSDK) {
            console.log("✅ Using DPWebSDK");
            // Handle DPWebSDK initialization
            newReader = win.DPWebSDK;
          } else if (win.WebSdk) {
            console.log("✅ Using WebSdk");
            // Handle WebSdk initialization - WebSdk might be a constructor or factory
            if (typeof win.WebSdk === 'function') {
              newReader = new win.WebSdk();
            } else {
              newReader = win.WebSdk;
            }
          } else {
            throw new Error("No compatible SDK initialization method found");
          }

          console.log("✅ SDK instance created successfully");
          setReader(newReader);
        } catch (err) {
          console.error("❌ Failed to create SDK instance:", err);
          setStatus("Failed to initialize biometric device.");
          onAuthError("Failed to initialize biometric device.");
        }
      } else {
        retryCount++;
        if (retryCount >= maxRetries) {
          console.error("❌ SDK loading failed after maximum retries");
          console.error("Available globals at failure:", {
            Fingerprint: win.Fingerprint,
            FingerprintWebApi: win.Fingerprint?.WebApi,
            DPWebSDK: win.DPWebSDK,
            dpWebSDK: win.dpWebSDK,
            DigitalPersona: win.DigitalPersona,
            DPFP: win.DPFP,
            WebSdk: win.WebSdk
          });
          setStatus("Biometric SDK failed to load. Please refresh the page.");
          onAuthError("Biometric SDK not available. Please ensure the device drivers are installed.");
          return;
        }
        setStatus(`Waiting for biometric SDK to load... (${retryCount}/${maxRetries})`);
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

    // Determine the correct sample format
    let sampleFormat = 0; // Default to PngImage (0)
    if (win.Fingerprint?.SampleFormat?.PngImage !== undefined) {
      sampleFormat = win.Fingerprint.SampleFormat.PngImage;
    } else if (win.Fingerprint?.SampleFormat !== undefined && typeof win.Fingerprint.SampleFormat === 'object') {
      // Try to find PngImage in the SampleFormat object
      sampleFormat = win.Fingerprint.SampleFormat.PngImage || win.Fingerprint.SampleFormat.PNG || 0;
    }

    console.log("Using sample format:", sampleFormat);

    reader
      .startAcquisition(sampleFormat)
      .then(() => setStatus("Place your finger on the scanner"))
      .catch((err) => {
        console.error("Device acquisition error:", err);
        setStatus("Device not found or busy.");
        onAuthError("Cannot start acquisition. Is the device plugged in?");
      });

    // Subscribe to samples
    reader.onSamplesAcquired = async (samples) => {
      try {
        console.log("Samples received:", samples);
        console.log("Samples type:", typeof samples);
        console.log("Samples is array:", Array.isArray(samples));

        // Handle different sample formats
        let fingerprintImage;

        if (typeof samples === 'string') {
          // Handle string format (like "t" or base64 data)
          if (samples.length > 10) {
            // Likely base64 encoded image data
            fingerprintImage = samples;
            console.log("✅ Using direct string format (base64 data)");
          } else {
            // Short string, might be status message
            console.log("Received status message:", samples);
            setStatus(`Device status: ${samples}`);
            return; // Don't process as fingerprint data
          }
        } else if (Array.isArray(samples) && samples.length > 0) {
          // Handle array format
          const firstSample = samples[0];
          console.log("First sample structure:", firstSample);

          if (firstSample?.Data) {
            fingerprintImage = firstSample.Data;
            console.log("✅ Using samples[0].Data format");
          } else if (firstSample?.data) {
            fingerprintImage = firstSample.data;
            console.log("✅ Using samples[0].data format");
          } else if (typeof firstSample === 'string') {
            fingerprintImage = firstSample;
            console.log("✅ Using samples[0] as string");
          } else if (firstSample && typeof firstSample === 'object') {
            const possibleKeys = ['Data', 'data', 'image', 'fingerprint', 'png', 'base64'];
            for (const key of possibleKeys) {
              if (firstSample[key]) {
                fingerprintImage = firstSample[key];
                console.log(`✅ Found data in samples[0].${key}`);
                break;
              }
            }
          }

          if (!fingerprintImage) {
            console.error("Available sample properties:", Object.keys(firstSample || {}));
            throw new Error("Could not extract fingerprint data from sample array");
          }
        } else if (samples && typeof samples === 'object' && !Array.isArray(samples)) {
          // Handle object format
          const objectKeys = Object.keys(samples);
          console.log("Sample object properties:", objectKeys);
          console.log("Sample object values:", samples);

          // Try all possible keys that might contain data
          const possibleKeys = ['Data', 'data', 'image', 'fingerprint', 'png', 'base64', 'content', 'value', 'result', 'payload'];

          for (const key of possibleKeys) {
            if (samples[key]) {
              fingerprintImage = samples[key];
              console.log(`✅ Found data in samples.${key}`);
              break;
            }
          }

          // If no standard keys found, try the first available property
          if (!fingerprintImage && objectKeys.length > 0) {
            const firstKey = objectKeys[0];
            fingerprintImage = samples[firstKey];
            console.log(`✅ Using first available property: samples.${firstKey}`);
          }

          if (!fingerprintImage) {
            console.error("Available object properties:", objectKeys);
            console.error("Object values:", JSON.stringify(samples, null, 2));
            throw new Error("Could not extract fingerprint data from sample object");
          }
        } else {
          throw new Error(`Unsupported sample format: ${typeof samples}`);
        }

        if (!fingerprintImage) {
          throw new Error("No fingerprint data found in any supported format");
        }

        if (mode === 'verify') {
          // For verification mode, send fingerprint to verification service
          try {
            console.log("🔍 Sending fingerprint for verification...");
            const response = await fetch('http://localhost:3001/api/biometric/verify', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ fingerprint: fingerprintImage }),
            });

            const result = await response.json();

            if (result.success) {
              console.log("✅ Biometric verification successful for student:", result.studentId);
              const verificationPayload = {
                success: true,
                studentId: result.studentId,
                message: result.message,
                timestamp: new Date().toISOString(),
              };
              onAuthSuccess(JSON.stringify(verificationPayload));
              setStatus("Verification successful!");
            } else {
              console.log("❌ Biometric verification failed:", result.message);
              onAuthError(result.message || "Verification failed");
              setStatus("Verification failed. Please try again.");
            }
          } catch (verifyError) {
            console.error("Verification request failed:", verifyError);
            onAuthError("Verification service unavailable");
            setStatus("Verification service error.");
          }
        } else {
          // For enrollment mode, return the captured fingerprint
          const biometricPayload = {
            biometricId: `${effectiveStudentId}-${Date.now()}`,
            fingerprint: fingerprintImage,
            timestamp: new Date().toISOString(),
          };

          console.log("✅ Biometric data captured for enrollment");
          onAuthSuccess(JSON.stringify(biometricPayload));
          setStatus("Fingerprint captured successfully!");
        }

        reader.stopAcquisition();
      } catch (err: any) {
        console.error("Sample processing error:", err);
        console.error("Sample details:", samples);
        onAuthError(err.message || "Error processing fingerprint.");
      }
    };

    return () => {
      reader.stopAcquisition().catch(() => {});
    };
  }, [mode, effectiveStudentId, onAuthSuccess, onAuthError, reader, sdkLoaded]);

  return (
    <div className="text-center space-y-3">
      <p className="text-sm text-muted-foreground">{status}</p>
      {status.includes("failed to load") && (
        <div className="text-xs text-red-600 mt-2 space-y-1">
          <p><strong>Troubleshooting steps for U.are.U 4500:</strong></p>
          <ul className="text-left list-disc list-inside">
            <li>✅ DigitalPersona drivers are installed on Windows 10</li>
            <li>Check that the U.are.U 4500 reader is connected and powered on</li>
            <li>Try using Chrome or Firefox (recommended for WebUSB support)</li>
            <li>If using HTTPS, ensure proper SSL certificate configuration</li>
            <li>Check Windows Device Manager to verify device is recognized</li>
            <li>Try refreshing the page or restarting the browser</li>
            <li>Check browser console for detailed error messages</li>
            <li>Ensure no other applications are using the fingerprint reader</li>
          </ul>
        </div>
      )}
    </div>
  );
};
