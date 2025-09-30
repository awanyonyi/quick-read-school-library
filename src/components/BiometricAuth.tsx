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
  const [useMockMode, setUseMockMode] = useState<boolean>(false);

  // Check if SDK is loaded or enable mock mode
  useEffect(() => {
    let retryCount = 0;
    const maxRetries = 5; // Increased retries

    const checkSdkAvailability = () => {
      const win = window as any;

      // Check for URL parameter to force mock mode
      const urlParams = new URLSearchParams(window.location.search);
      const forceMock = urlParams.get('mockBiometric') === 'true';

      if (forceMock) {
        console.log("🔧 MOCK MODE: Forced via URL parameter");
        setUseMockMode(true);
        setSdkLoaded(true);
        setStatus("Mock biometric device ready for testing");
        return;
      }

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
          // Don't call onAuthError immediately - let user see the error message
          setTimeout(() => onAuthError("Failed to initialize biometric device."), 2000);
        }
      } else {
        retryCount++;
        if (retryCount >= maxRetries) {
          console.log("⚠️ SDK not found after maximum retries, enabling mock mode for testing");
          setUseMockMode(true);
          setSdkLoaded(true);
          setStatus("Mock biometric device ready (SDK not available)");
          return;
        }
        setStatus(`Waiting for biometric SDK to load... (${retryCount}/${maxRetries})`);
        // Retry after a longer delay
        setTimeout(checkSdkAvailability, 1000);
      }
    };

    checkSdkAvailability();
  }, [onAuthError]);

  // Initialize device when reader is available or in mock mode
  useEffect(() => {
    if (useMockMode) {
      // Mock mode: simulate device connection and start scanning
      console.log("🔧 MOCK MODE: Simulating device initialization");
      setStatus("Mock device connected. Ready to scan.");

      // Simulate the scanning process
      setTimeout(() => {
        setStatus("Place your finger on the mock scanner");
      }, 1000);

      // Simulate fingerprint capture after a few seconds
      setTimeout(() => {
        setStatus("Mock fingerprint captured. Processing...");

        // Simulate verification request
        setTimeout(async () => {
          try {
            console.log("🔍 Sending mock fingerprint for verification...");
            const response = await fetch('http://localhost:52182/api/biometric/verify', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ fingerprint: 'mock-fingerprint-data-' + Date.now() }),
            });

            const result = await response.json();

            if (result.success) {
              console.log("✅ Mock biometric verification successful for student:", result.studentId);
              const verificationPayload = {
                success: true,
                studentId: result.studentId,
                message: result.message,
                timestamp: new Date().toISOString(),
              };
              onAuthSuccess(JSON.stringify(verificationPayload));
              setStatus("Mock verification successful!");
            } else {
              console.log("❌ Mock biometric verification failed:", result.message);
              onAuthError(result.message || "Mock verification failed");
              setStatus("Mock verification failed. Please try again.");
            }
          } catch (verifyError) {
            console.error("Mock verification request failed:", verifyError);
            onAuthError("Mock verification service unavailable. Please check: 1) DigitalPersona backend server is running on port 52182, 2) Network connectivity");
            setStatus("Mock verification service error. Check console for details.");
          }
        }, 2000);
      }, 3000);

      return;
    }

    if (!reader || !sdkLoaded) return;

    // Listen for device connections
    reader.onDeviceConnected = (device) => {
      console.log("✅ Fingerprint reader connected:", device);
      setStatus("Fingerprint reader connected. Ready to scan.");
    };

    reader.onDeviceDisconnected = (device) => {
      console.warn("⚠️ Fingerprint reader disconnected:", device);
      setStatus("Device disconnected. Please reconnect.");
    };

    // Add connection failure handler
    reader.onConnectionFailed = (error) => {
      console.error("❌ Device connection failed:", error);
      setStatus("Device connection failed. Switching to mock mode...");

      setTimeout(() => {
        console.log("🔄 Switching to mock mode due to connection failure");
        setUseMockMode(true);
        setStatus("Mock biometric device ready (connection failed)");
      }, 2000);

      onAuthError(`Device connection failed: ${error.message || error}. Please check device connection and try again.`);
    };

    // Add communication failure handler
    reader.onCommunicationFailed = (error) => {
      console.error("❌ Device communication failed:", error);
      setStatus("Device communication failed. Switching to mock mode...");

      setTimeout(() => {
        console.log("🔄 Switching to mock mode due to communication failure");
        setUseMockMode(true);
        setStatus("Mock biometric device ready (communication failed)");
      }, 2000);

      onAuthError(`Device communication failed: ${error.message || error}. Please check device connection and restart the browser.`);
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
      .then(() => {
        console.log("✅ Device acquisition started successfully");
        setStatus("Place your finger on the scanner");
      })
      .catch((err) => {
        console.error("❌ Device acquisition error:", err);
        console.error("Error details:", {
          message: err.message,
          name: err.name,
          stack: err.stack,
          sampleFormat: sampleFormat,
          readerType: typeof reader,
          readerMethods: reader ? Object.getOwnPropertyNames(Object.getPrototypeOf(reader)) : 'undefined'
        });

        setStatus("Device not found or busy. Switching to mock mode...");

        // Automatically switch to mock mode if device acquisition fails
        setTimeout(() => {
          console.log("🔄 Switching to mock mode due to device acquisition failure");
          setUseMockMode(true);
          setStatus("Mock biometric device ready (device acquisition failed)");
        }, 2000);

        onAuthError(`Cannot start acquisition: ${err.message}. Please check: 1) Device is connected, 2) DigitalPersona service is running, 3) Try refreshing the page`);
      });

    // Subscribe to samples (only for real hardware)
    if (!useMockMode) {
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
              const response = await fetch('http://localhost:52182/api/biometric/verify', {
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
              onAuthError("Verification service unavailable. Please check: 1) DigitalPersona backend server is running on port 52182, 2) Network connectivity, 3) Server logs for errors");
              setStatus("Verification service error. Check console for details.");
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
    }

    return () => {
      if (reader && !useMockMode) {
        reader.stopAcquisition().catch(() => {});
      }
    };
  }, [mode, effectiveStudentId, onAuthSuccess, onAuthError, reader, sdkLoaded, useMockMode]);

  return (
    <div className="text-center space-y-3">
      {useMockMode && (
        <div className="bg-yellow-100 border border-yellow-300 rounded-lg p-2 mb-3">
          <div className="flex items-center justify-center gap-2">
            <div className="text-yellow-600 text-sm font-medium">🔧 MOCK MODE ACTIVE</div>
          </div>
          <p className="text-xs text-yellow-700 mt-1">
            Testing biometric functionality without hardware
          </p>
        </div>
      )}
      <p className="text-sm text-muted-foreground">{status}</p>
      {status.includes("failed to load") && !useMockMode && (
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
      {useMockMode && (
        <div className="text-xs text-blue-600 mt-2">
          <p><strong>Mock Mode Instructions:</strong></p>
          <p>The system will automatically simulate fingerprint verification in a few seconds.</p>
          <p>This allows you to test the complete book issuance workflow.</p>
        </div>
      )}
    </div>
  );
};
