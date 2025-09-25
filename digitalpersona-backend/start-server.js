const { spawn } = require('child_process');
const path = require('path');

// Start the DigitalPersona backend server
const serverPath = path.join(__dirname, 'server.js');
console.log('Starting DigitalPersona backend server from:', serverPath);

const server = spawn('node', [serverPath], {
  stdio: 'inherit',
  cwd: __dirname
});

server.on('error', (error) => {
  console.error('Failed to start server:', error);
});

server.on('close', (code) => {
  console.log(`Server process exited with code ${code}`);
});