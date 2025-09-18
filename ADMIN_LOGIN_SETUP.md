# 🔐 Admin Login Setup Guide

## Overview

The Maryland School Library system includes a comprehensive admin authentication system that provides secure access to administrative functions. This guide covers everything you need to know about setting up and using the admin login functionality.

## 📋 Admin Credentials

### Default Credentials
```
Username: Maryland_library
Password: Sheila_library
Email:    admin@maryland.edu
Role:     admin
```

### ⚠️ Security Notice
**Important:** These are the default credentials. For production use, you should:
1. Change the default password immediately after first login
2. Update the username if desired
3. Use strong, unique passwords
4. Consider implementing additional security measures

## 🚀 Quick Start

### 1. Start the API Server
```bash
cd quick-read-school-library
node api-server.js
```

### 2. Test Admin Login
```bash
# Test the admin login functionality
node scripts/test-admin-login.js
```

### 3. Access Admin Dashboard
1. Open your browser to `http://localhost:5173` (frontend)
2. Look for admin login section
3. Use the credentials above to log in

## 🔧 API Endpoints

### Authentication Endpoints

#### POST `/api/admin/login`
Login with admin credentials.

**Request:**
```json
{
  "username": "Maryland_library",
  "password": "Sheila_library"
}
```

**Response (Success):**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "admin-1",
    "username": "Maryland_library",
    "email": "admin@maryland.edu",
    "role": "admin",
    "lastLogin": "2024-01-15T10:30:00.000Z"
  },
  "expiresAt": "2024-01-15T18:30:00.000Z"
}
```

#### GET `/api/admin/verify`
Verify admin session token.

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "user": {
    "id": "admin-1",
    "username": "Maryland_library",
    "email": "admin@maryland.edu",
    "role": "admin",
    "lastLogin": "2024-01-15T10:30:00.000Z"
  }
}
```

#### GET `/api/admin/profile`
Get admin profile information.

**Headers:**
```
Authorization: Bearer <token>
```

#### PUT `/api/admin/password`
Change admin password.

**Headers:**
```
Authorization: Bearer <token>
```

**Request:**
```json
{
  "currentPassword": "Sheila_library",
  "newPassword": "NewSecurePassword123!"
}
```

#### PUT `/api/admin/username`
Change admin username.

**Headers:**
```
Authorization: Bearer <token>
```

**Request:**
```json
{
  "currentPassword": "Sheila_library",
  "newUsername": "new_admin_username"
}
```

#### POST `/api/admin/logout`
Logout admin session.

## 🔐 Security Features

### JWT Authentication
- **Token-based authentication** using JSON Web Tokens
- **8-hour token expiration** for security
- **Bearer token authorization** for protected routes
- **Session token tracking** for additional security

### Password Security
- **Minimum 6 characters** required
- **Current password verification** for changes
- **Secure storage** (though currently hardcoded for demo)

### Input Validation
- **Required field validation** for username and password
- **Username length validation** (minimum 3 characters)
- **Password strength validation** (minimum 6 characters)

## 🧪 Testing

### Automated Testing
Run the comprehensive test script:
```bash
cd quick-read-school-library
node scripts/test-admin-login.js
```

### Manual Testing
1. **Login Test:**
   ```bash
   curl -X POST http://localhost:3001/api/admin/login \
     -H "Content-Type: application/json" \
     -d '{"username":"Maryland_library","password":"Sheila_library"}'
   ```

2. **Session Verification:**
   ```bash
   curl -X GET http://localhost:3001/api/admin/verify \
     -H "Authorization: Bearer YOUR_TOKEN_HERE"
   ```

3. **Profile Access:**
   ```bash
   curl -X GET http://localhost:3001/api/admin/profile \
     -H "Authorization: Bearer YOUR_TOKEN_HERE"
   ```

## ⚙️ Configuration

### Environment Variables
```bash
# JWT Configuration
JWT_SECRET=your-super-secure-jwt-secret-change-this-in-production
JWT_EXPIRES_IN=8h

# Database Configuration
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=Allanware5895
DB_NAME=school_library
DB_PORT=3306
```

### Changing Default Credentials
To change the default admin credentials, edit the `ADMIN_CREDENTIALS` object in `api-server.js`:

```javascript
const ADMIN_CREDENTIALS = {
  username: 'your_new_username',
  password: 'your_new_secure_password',
  id: 'admin-1',
  email: 'admin@your-school.edu',
  role: 'admin'
};
```

## 🔄 Password Management

### Changing Password
1. Login with current credentials
2. Use the password change endpoint
3. Provide current password and new password
4. New password must be at least 6 characters

### Password Requirements
- Minimum 6 characters
- Can contain letters, numbers, and special characters
- Current password must be provided for verification

### Username Management
- Minimum 3 characters
- Current password required for changes
- Username must be unique (though not enforced in current implementation)

## 🚨 Error Handling

### Common Error Responses

#### Invalid Credentials (401)
```json
{
  "error": "Invalid credentials"
}
```

#### Missing Token (401)
```json
{
  "error": "No token provided"
}
```

#### Invalid Token (401)
```json
{
  "error": "Invalid token"
}
```

#### Password Too Short (400)
```json
{
  "error": "New password must be at least 6 characters long"
}
```

#### Current Password Incorrect (401)
```json
{
  "error": "Current password is incorrect"
}
```

## 📱 Frontend Integration

### Login Component
```javascript
const handleLogin = async (username, password) => {
  try {
    const response = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });

    const data = await response.json();

    if (data.success) {
      // Store token in localStorage
      localStorage.setItem('adminToken', data.token);
      // Redirect to admin dashboard
      navigate('/admin');
    } else {
      // Handle login error
      setError(data.error);
    }
  } catch (error) {
    setError('Login failed');
  }
};
```

### Protected Route Component
```javascript
const ProtectedRoute = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const verifyToken = async () => {
      const token = localStorage.getItem('adminToken');

      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const response = await fetch('/api/admin/verify', {
          headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
          setIsAuthenticated(true);
        } else {
          localStorage.removeItem('adminToken');
        }
      } catch (error) {
        localStorage.removeItem('adminToken');
      }

      setLoading(false);
    };

    verifyToken();
  }, []);

  if (loading) return <div>Loading...</div>;

  return isAuthenticated ? children : <Navigate to="/admin/login" />;
};
```

## 🔧 Troubleshooting

### Common Issues

#### 1. "Invalid credentials" Error
- Check that username and password are correct
- Ensure you're using the exact credentials (case-sensitive)
- Verify the API server is running

#### 2. "No token provided" Error
- Make sure you're including the Authorization header
- Check that the token is properly formatted: `Bearer <token>`
- Verify the token hasn't expired (8-hour limit)

#### 3. "Invalid token" Error
- Token may have expired - login again
- Token may be malformed or corrupted
- JWT_SECRET may have changed

#### 4. Password Change Not Working
- Ensure current password is correct
- New password must be at least 6 characters
- Check that you're using the correct endpoint and headers

#### 5. API Server Not Responding
- Make sure the server is running: `node api-server.js`
- Check that port 3001 is not in use
- Verify all dependencies are installed

### Debug Commands
```bash
# Check if API server is running
curl http://localhost:3001/api/books

# Test admin login
curl -X POST http://localhost:3001/api/admin/login \
  -H "Content-Type: application/json" \
  -d '{"username":"Maryland_library","password":"Sheila_library"}'

# Test token verification
curl -X GET http://localhost:3001/api/admin/verify \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

## 📊 Monitoring

### Session Tracking
- Admin login attempts are logged
- Session tokens are tracked
- Token expiration is monitored
- Failed login attempts can be monitored

### Security Logging
- All authentication attempts are logged
- Password changes are tracked
- Session verification is monitored
- Failed attempts can trigger alerts

## 🚀 Production Deployment

### Security Considerations
1. **Change default credentials** immediately
2. **Use strong JWT_SECRET** in production
3. **Enable HTTPS** for secure communication
4. **Implement rate limiting** for login attempts
5. **Add password complexity requirements**
6. **Enable audit logging** for security events

### Environment Setup
```bash
# Production environment variables
NODE_ENV=production
JWT_SECRET=your-production-jwt-secret-here
API_PORT=3001

# Database (use production database)
DB_HOST=your-production-db-host
DB_USER=your-production-db-user
DB_PASSWORD=your-production-db-password
DB_NAME=school_library_prod
```

### Database Migration
For production, consider:
1. Moving admin credentials to database
2. Implementing password hashing
3. Adding user roles and permissions
4. Enabling audit logging

## 📞 Support

If you encounter issues with the admin login system:

1. Check the troubleshooting section above
2. Run the test script: `node scripts/test-admin-login.js`
3. Verify API server logs for error messages
4. Check browser developer tools for frontend issues
5. Ensure all dependencies are properly installed

## 🎯 Next Steps

After setting up admin login, you can:

1. **Explore Admin Dashboard** - Access administrative functions
2. **Manage Users** - Add/edit student and staff accounts
3. **Configure System** - Set up library policies and settings
4. **Monitor Activity** - View borrowing history and reports
5. **Security Settings** - Configure additional security measures

---

## ✅ Admin Login Setup Complete!

Your Maryland School Library admin authentication system is now fully configured and ready to use. The system provides secure, token-based authentication with comprehensive security features and easy-to-use API endpoints.

**Default Login:**
- Username: `Maryland_library`
- Password: `Sheila_library`

**Remember to change the default password after first login for security!** 🔐