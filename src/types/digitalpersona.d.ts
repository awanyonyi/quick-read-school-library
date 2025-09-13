// DigitalPersona SDK type declarations
declare global {
  interface Window {
    DPWebSDK?: any;
    dpWebSDK?: any;
  }

  var WebSdk: any;

  // ActiveX object support for DigitalPersona legacy integration
  class ActiveXObject {
    constructor(progid: string);
  }

  const ActiveXObject: {
    new(progid: string): any;
  };

  // DigitalPersona Fingerprint SDK globals
  namespace Fingerprint {
    class WebApi {
      constructor();
      startAcquisition(format: SampleFormat, deviceId?: string): Promise<void>;
      stopAcquisition(): Promise<void>;
      enumerateDevices(): Promise<string[]>;
      getDeviceInfo(deviceId: string): Promise<any>;
      onDeviceConnected?: (event: any) => void;
      onDeviceDisconnected?: (event: any) => void;
      onCommunicationFailed?: (event: any) => void;
      onSamplesAcquired?: (samples: any) => void;
      onQualityReported?: (event: any) => void;
    }

    enum SampleFormat {
      PngImage = 0,
      Raw = 1,
      Intermediate = 2,
      Compressed = 3
    }

    enum QualityCode {
      // Add quality codes as needed
    }

    function b64UrlTo64(b64Url: string): string;
    function b64UrlToUtf8(b64Url: string): string;
  }

  // DigitalPersona Devices SDK globals
  class DeviceManager {
    on(event: string, callback: (device: any) => void): void;
  }

  enum DeviceType {
    FingerprintReader = 1,
    // Add other types as needed
  }

  enum DeviceEvents {
    DeviceConnected = "DeviceConnected",
    DeviceDisconnected = "DeviceDisconnected"
  }

  // Fingerprint Reader class
  class FingerprintReader {
    startAcquisition(format: SampleFormat): Promise<void>;
    stopAcquisition(): void;
    onSamplesAcquired?: (samples: any) => void;
  }

  enum SampleFormat {
    PngImage = 0,
    Raw = 1,
    Intermediate = 2,
    Compressed = 3
  }
}

export {};