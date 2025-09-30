#!/usr/bin/env node

/**
 * Biometric Device Connection Test Script
 * Tests DigitalPersona device connectivity and provides diagnostic information
 */

import http from 'http';
import WebSocket from 'ws';

const BACKEND_URL = 'http://localhost:52181';

console.log('🔍 DigitalPersona Biometric Device Connection Test');
console.log('=================================================');
console.log(`Testing backend server at: ${BACKEND_URL}`);
console.log('');

// Test 1: Health Check
console.log('1. Testing backend server health...');
const healthCheck = () => {
  return new Promise((resolve, reject) => {
    const req = http.get(`${BACKEND_URL}/health`, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          console.log('   ✅ Server is running');
          console.log(`   📅 Server time: ${response.timestamp}`);
          resolve(response);
        } catch (e) {
          console.log('   ❌ Server response is not valid JSON');
          reject(e);
        }
      });
    });

    req.on('error', (err) => {
      console.log('   ❌ Cannot connect to backend server');
      console.log(`   💡 Make sure the DigitalPersona backend server is running on port 52181`);
      console.log(`   💡 Run: cd digitalpersona-backend && node server.js`);
      reject(err);
    });

    req.setTimeout(5000, () => {
      console.log('   ⏰ Health check timed out');
      req.destroy();
      reject(new Error('Timeout'));
    });
  });
};

// Test 2: WebSocket Connection
console.log('2. Testing WebSocket connection...');
const websocketTest = () => {
  return new Promise((resolve, reject) => {
    try {
      const ws = new WebSocket(BACKEND_URL.replace('http', 'ws'));

      ws.on('open', () => {
        console.log('   ✅ WebSocket connection established');
        ws.close();
        resolve();
      });

      ws.on('error', (err) => {
        console.log('   ❌ WebSocket connection failed');
        console.log(`   💡 Error: ${err.message}`);
        reject(err);
      });

      ws.on('close', () => {
        console.log('   📡 WebSocket connection closed');
      });

      setTimeout(() => {
        console.log('   ⏰ WebSocket test timed out');
        ws.terminate();
        reject(new Error('Timeout'));
      }, 5000);
    } catch (err) {
      console.log('   ❌ WebSocket test failed to start');
      reject(err);
    }
  });
};

// Test 3: Biometric API Test
console.log('3. Testing biometric verification API...');
const biometricApiTest = () => {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({
      fingerprint: 'test-fingerprint-data-' + Date.now()
    });

    const options = {
      hostname: 'localhost',
      port: 52181,
      path: '/api/biometric/verify',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          console.log('   ✅ Biometric API is responding');
          console.log(`   📊 Response: ${response.success ? 'Success' : 'Failed'}`);
          if (response.message) {
            console.log(`   💬 Message: ${response.message}`);
          }
          resolve(response);
        } catch (e) {
          console.log('   ❌ Biometric API response is not valid JSON');
          reject(e);
        }
      });
    });

    req.on('error', (err) => {
      console.log('   ❌ Cannot connect to biometric API');
      console.log(`   💡 Make sure the backend server is running`);
      reject(err);
    });

    req.write(postData);
    req.end();

    setTimeout(() => {
      console.log('   ⏰ Biometric API test timed out');
      req.destroy();
      reject(new Error('Timeout'));
    }, 5000);
  });
};

// Test 4: Device Simulation Test
console.log('4. Testing device simulation...');
const deviceSimulationTest = () => {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(BACKEND_URL.replace('http', 'ws'));

    ws.on('open', () => {
      console.log('   📡 Connected to WebSocket for device test');

      // Send enumerate command
      ws.send(JSON.stringify({ type: 'enumerate' }));

      // Listen for response
      ws.on('message', (data) => {
        try {
          const message = JSON.parse(data.toString());
          console.log('   ✅ Device enumeration response received');
          console.log(`   🔢 Devices found: ${message.devices?.length || 0}`);

          if (message.devices && message.devices.length > 0) {
            console.log('   📋 Available devices:');
            message.devices.forEach((device, index) => {
              console.log(`      ${index + 1}. ${device.deviceID} (${device.uid})`);
            });
          }

          ws.close();
          resolve(message);
        } catch (e) {
          console.log('   ❌ Invalid device enumeration response');
          ws.close();
          reject(e);
        }
      });
    });

    ws.on('error', (err) => {
      console.log('   ❌ Device simulation test failed');
      reject(err);
    });

    setTimeout(() => {
      console.log('   ⏰ Device simulation test timed out');
      ws.terminate();
      reject(new Error('Timeout'));
    }, 5000);
  });
};

// Run all tests
async function runTests() {
  try {
    console.log('');
    await healthCheck();
    console.log('');

    await websocketTest();
    console.log('');

    await biometricApiTest();
    console.log('');

    await deviceSimulationTest();
    console.log('');

    console.log('🎉 All tests completed successfully!');
    console.log('');
    console.log('📋 Summary:');
    console.log('   ✅ Backend server is running');
    console.log('   ✅ WebSocket connection works');
    console.log('   ✅ Biometric API is responding');
    console.log('   ✅ Device simulation is working');
    console.log('');
    console.log('💡 If you still get device errors in the browser:');
    console.log('   1. Check browser console for detailed error messages');
    console.log('   2. Try refreshing the page');
    console.log('   3. Check Windows Device Manager for fingerprint reader status');
    console.log('   4. Ensure no other applications are using the fingerprint reader');

  } catch (error) {
    console.log('');
    console.log('❌ Some tests failed. Check the errors above.');
    console.log('');
    console.log('🔧 Troubleshooting steps:');
    console.log('   1. Start the DigitalPersona backend server:');
    console.log('      cd digitalpersona-backend && node server.js');
    console.log('   2. Or use the startup script:');
    console.log('      ./start-digitalpersona-server.bat');
    console.log('   3. Check if port 52181 is available');
    console.log('   4. Verify DigitalPersona drivers are installed');
    console.log('   5. Restart your browser and try again');
  }
}

runTests();