Pimport jwt from 'jsonwebtoken';

const JWT_SECRET = 'your-super-secure-jwt-secret-change-this-in-production';

// Create a token like the login does
const token = jwt.sign(
  {
    adminId: 'admin-maryland-1',
    username: 'Maryland_library',
    role: 'admin',
    sessionToken: 'admin-session-' + Date.now()
  },
  JWT_SECRET,
  { expiresIn: '8h' }
);

console.log('Token:', token);

// Decode the token to verify
const decoded = jwt.verify(token, JWT_SECRET);
console.log('Decoded token:', decoded);

// Test the API call
async function testAPI() {
  try {
    const response = await fetch('http://localhost:3001/api/admin/password', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        currentPassword: 'Sheila_library',
        newPassword: 'newpassword123'
      })
    });

    const data = await response.json();
    console.log('Response status:', response.status);
    console.log('Response data:', data);
  } catch (error) {
    console.error('Error:', error);
  }
}

testAPI();