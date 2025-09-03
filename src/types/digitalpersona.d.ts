// DigitalPersona SDK type declarations
declare global {
  interface Window {
    DPWebSDK?: any;
    dpWebSDK?: any;
  }
  
  // ActiveX object support for DigitalPersona legacy integration
  class ActiveXObject {
    constructor(progid: string);
  }
  
  const ActiveXObject: {
    new(progid: string): any;
  };
}

export {};