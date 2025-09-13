const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Serve static files from the parent directory (to serve the SDK files)
app.use(express.static(path.join(__dirname, '..', 'public')));

// Basic health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// WebSocket connection handling
wss.on('connection', (ws, req) => {
  console.log('DigitalPersona WebSocket client connected');

  ws.on('message', (message) => {
    console.log('Received message:', message.toString());

    // Echo the message back (basic implementation)
    // In a real implementation, this would communicate with the DigitalPersona device
    ws.send(JSON.stringify({
      type: 'echo',
      data: message.toString(),
      timestamp: new Date().toISOString()
    }));
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

const PORT = process.env.PORT || 52181;
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