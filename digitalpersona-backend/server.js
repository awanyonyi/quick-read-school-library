const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Middleware to parse JSON bodies
app.use(express.json());

// Serve static files from the parent directory (to serve the SDK files)
app.use(express.static(path.join(__dirname, '..', 'public')));

// Basic health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Test WebSocket connection endpoint
app.get('/test-websocket', (req, res) => {
  res.json({
    status: 'websocket_test',
    message: 'WebSocket server is ready for DigitalPersona SDK connections',
    port: PORT,
    timestamp: new Date().toISOString()
  });
});

// Biometric verification endpoint
app.post('/api/biometric/verify', (req, res) => {
  console.log('Biometric verification request received:', req.body);

  // For now, simulate a successful verification
  // In a real implementation, this would:
  // 1. Connect to DigitalPersona service
  // 2. Compare fingerprint data against enrolled templates
  // 3. Return verification result

  const { fingerprint } = req.body;

  if (!fingerprint) {
    return res.status(400).json({
      success: false,
      message: 'No fingerprint data provided'
    });
  }

  // Simulate verification process
  setTimeout(() => {
    // For demo purposes, randomly succeed or fail
    const isVerified = Math.random() > 0.3; // 70% success rate for demo

    if (isVerified) {
      res.json({
        success: true,
        message: 'Fingerprint verified successfully',
        studentId: 'demo-student-' + Date.now(),
        confidence: Math.random() * 100,
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(401).json({
        success: false,
        message: 'Fingerprint verification failed',
        timestamp: new Date().toISOString()
      });
    }
  }, 1000); // Simulate processing time
});

// DigitalPersona WebSDK Protocol Handler
class DigitalPersonaProtocolHandler {
  constructor(ws) {
    this.ws = ws;
    this.devices = this.initializeMockDevices();
    this.acquisitionActive = false;
    this.currentDevice = null;
  }

  initializeMockDevices() {
    // Simulate a U.are.U 4500 device
    return [{
      uid: 'DP-UAREU-4500-001',
      deviceID: 'U.are.U 4500',
      deviceTech: 1, // Optical
      deviceModality: 2, // Area
      uidType: 0, // Persistent
      available: true
    }];
  }

  handleMessage(message) {
    try {
      const data = JSON.parse(message.toString());
      console.log('DigitalPersona protocol message:', data);

      switch (data.type) {
        case 'enumerate':
          this.handleEnumerate();
          break;
        case 'startAcquisition':
          this.handleStartAcquisition(data);
          break;
        case 'stopAcquisition':
          this.handleStopAcquisition();
          break;
        case 'getDeviceInfo':
          this.handleGetDeviceInfo(data);
          break;
        default:
          console.log('Unknown message type:', data.type);
      }
    } catch (error) {
      console.error('Error parsing WebSocket message:', error);
    }
  }

  handleEnumerate() {
    console.log('Enumerating devices...');
    this.ws.send(JSON.stringify({
      type: 'enumerate',
      devices: this.devices,
      timestamp: new Date().toISOString()
    }));
  }

  handleStartAcquisition(data) {
    console.log('Starting acquisition with format:', data.format);
    this.acquisitionActive = true;
    this.currentDevice = data.deviceUid;

    // Simulate fingerprint acquisition
    setTimeout(() => {
      if (this.acquisitionActive) {
        this.simulateFingerprintCapture(data.format);
      }
    }, 2000);

    this.ws.send(JSON.stringify({
      type: 'acquisitionStarted',
      deviceUid: data.deviceUid,
      format: data.format,
      timestamp: new Date().toISOString()
    }));
  }

  handleStopAcquisition() {
    console.log('Stopping acquisition...');
    this.acquisitionActive = false;
    this.currentDevice = null;

    this.ws.send(JSON.stringify({
      type: 'acquisitionStopped',
      timestamp: new Date().toISOString()
    }));
  }

  handleGetDeviceInfo(data) {
    const device = this.devices.find(d => d.uid === data.deviceUid);
    if (device) {
      this.ws.send(JSON.stringify({
        type: 'deviceInfo',
        device: device,
        timestamp: new Date().toISOString()
      }));
    }
  }

  simulateFingerprintCapture(format) {
    if (!this.acquisitionActive) return;

    console.log('Simulating fingerprint capture...');

    // Generate mock fingerprint data
    const mockFingerprintData = this.generateMockFingerprintData(format);

    this.ws.send(JSON.stringify({
      type: 'samplesAcquired',
      samples: mockFingerprintData,
      deviceUid: this.currentDevice,
      timestamp: new Date().toISOString()
    }));

    // Simulate quality report
    this.ws.send(JSON.stringify({
      type: 'qualityReported',
      quality: 85, // High quality
      timestamp: new Date().toISOString()
    }));
  }

  generateMockFingerprintData(format) {
    // Generate different data based on format
    switch (format) {
      case 0: // PngImage
        return [`data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==`];
      case 1: // Raw
        return [{
          Data: btoa('mock-raw-fingerprint-data'),
          Format: 'Raw'
        }];
      case 2: // Compressed
        return [{
          Data: btoa('mock-wsq-fingerprint-data'),
          Format: 'Compressed'
        }];
      case 3: // Intermediate
        return [{
          Data: btoa('mock-feature-set-data'),
          Format: 'Intermediate'
        }];
      default:
        return [`data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==`];
    }
  }
}

// WebSocket connection handling
wss.on('connection', (ws, req) => {
  console.log('DigitalPersona WebSocket client connected');
  const protocolHandler = new DigitalPersonaProtocolHandler(ws);

  ws.on('message', (message) => {
    protocolHandler.handleMessage(message);
  });

  ws.on('close', () => {
    console.log('DigitalPersona WebSocket client disconnected');
  });

  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
  });

  // Send initial connection confirmation
  ws.send(JSON.stringify({
    type: 'connected',
    message: 'DigitalPersona WebSocket server connected',
    timestamp: new Date().toISOString()
  }));
});

const PORT = process.env.PORT || 52182;
const HOST = process.env.HOST || '127.0.0.1';

server.listen(PORT, HOST, () => {
  console.log(`🚀 DigitalPersona Backend Server running on http://${HOST}:${PORT}`);
  console.log(`📡 WebSocket server ready for connections`);
  console.log(`🔗 Health check: http://${HOST}:${PORT}/health`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('Shutting down DigitalPersona Backend Server...');
  wss.close();
  server.close(() => {
    console.log('Server shut down gracefully');
    process.exit(0);
  });
});

process.on('SIGTERM', () => {
  console.log('Shutting down DigitalPersona Backend Server...');
  wss.close();
  server.close(() => {
    console.log('Server shut down gracefully');
    process.exit(0);
  });
});