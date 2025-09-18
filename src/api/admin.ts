import express from 'express';
import jwt, { SignOptions, Secret } from 'jsonwebtoken';

type Request = express.Request;
type Response = express.Response;

// Define JWT payload type
interface JwtPayload {
  adminId: string;
  username: string;
  role: string;
  sessionToken: string;
  iat?: number;
  exp?: number;
}

// Extend Request interface to include admin authentication properties
declare global {
  namespace Express {
    interface Request {
      adminUser?: any;
      sessionToken?: string;
    }
  }
}

// JWT secret - in production, use environment variable
const JWT_SECRET: Secret = process.env.JWT_SECRET || 'your-super-secure-jwt-secret-change-this-in-production';
const JWT_EXPIRES_IN: string = process.env.JWT_EXPIRES_IN || '8h';

// Hardcoded admin credentials
const ADMIN_CREDENTIALS = {
  username: 'admin',
  password: 'admin123',
  id: 'admin-1',
  email: 'admin@school.edu',
  role: 'admin'
};

// Admin login with hardcoded credentials
export const adminLogin = async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;

    // Validate input
    if (!username || !password) {
      return res.status(400).json({
        error: 'Username and password are required'
      });
    }

    // Check hardcoded credentials
    if (username === ADMIN_CREDENTIALS.username && password === ADMIN_CREDENTIALS.password) {
      // Create JWT token
      const jwtToken = jwt.sign(
        {
          adminId: ADMIN_CREDENTIALS.id,
          username: ADMIN_CREDENTIALS.username,
          role: ADMIN_CREDENTIALS.role,
          sessionToken: 'admin-session-' + Date.now()
        } as JwtPayload,
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES_IN } as SignOptions
      );

      return res.json({
        success: true,
        token: jwtToken,
        user: {
          id: ADMIN_CREDENTIALS.id,
          username: ADMIN_CREDENTIALS.username,
          email: ADMIN_CREDENTIALS.email,
          role: ADMIN_CREDENTIALS.role,
          lastLogin: new Date().toISOString()
        },
        expiresAt: new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString() // 8 hours from now
      });
    }

    return res.status(401).json({
      error: 'Invalid credentials'
    });

  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Admin logout
export const adminLogout = async (req: Request, res: Response) => {
  try {
    res.json({ success: true, message: 'Logged out successfully' });
  } catch (error) {
    console.error('Admin logout error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Verify admin session
export const verifyAdminSession = async (req: Request, res: Response) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;

    res.json({
      success: true,
      user: {
        id: ADMIN_CREDENTIALS.id,
        username: ADMIN_CREDENTIALS.username,
        email: ADMIN_CREDENTIALS.email,
        role: ADMIN_CREDENTIALS.role,
        lastLogin: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Session verification error:', error);
    res.status(401).json({ error: 'Invalid token' });
  }
};

// Change admin password
export const changeAdminPassword = async (req: Request, res: Response) => {
  try {
    const { currentPassword, newPassword } = req.body;

    // Validate input
    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        error: 'Current password and new password are required'
      });
    }

    // Check if current password matches
    if (currentPassword !== ADMIN_CREDENTIALS.password) {
      return res.status(401).json({
        error: 'Current password is incorrect'
      });
    }

    // Validate new password
    if (newPassword.length < 6) {
      return res.status(400).json({
        error: 'New password must be at least 6 characters long'
      });
    }

    // Update the hardcoded password (in a real app, this would be stored securely)
    ADMIN_CREDENTIALS.password = newPassword;

    res.json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    console.error('Password change error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Change admin username
export const changeAdminUsername = async (req: Request, res: Response) => {
  try {
    const { currentPassword, newUsername } = req.body;

    // Validate input
    if (!currentPassword || !newUsername) {
      return res.status(400).json({
        error: 'Current password and new username are required'
      });
    }

    // Check if current password matches
    if (currentPassword !== ADMIN_CREDENTIALS.password) {
      return res.status(401).json({
        error: 'Current password is incorrect'
      });
    }

    // Validate new username
    if (newUsername.length < 3) {
      return res.status(400).json({
        error: 'New username must be at least 3 characters long'
      });
    }

    // Update the hardcoded username
    ADMIN_CREDENTIALS.username = newUsername;

    res.json({
      success: true,
      message: 'Username changed successfully'
    });
  } catch (error) {
    console.error('Username change error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get admin profile
export const getAdminProfile = async (req: Request, res: Response) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;

    res.json({
      success: true,
      user: {
        id: ADMIN_CREDENTIALS.id,
        username: ADMIN_CREDENTIALS.username,
        email: ADMIN_CREDENTIALS.email,
        role: ADMIN_CREDENTIALS.role,
        lastLogin: new Date().toISOString(),
        createdAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Middleware to verify admin authentication (simplified)
export const requireAdminAuth = async (req: Request, res: Response, next: Function) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;

    // Add user info to request
    req.adminUser = ADMIN_CREDENTIALS;
    req.sessionToken = decoded.sessionToken;

    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(401).json({ error: 'Invalid token' });
  }
};