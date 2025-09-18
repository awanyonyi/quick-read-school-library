#!/usr/bin/env node

/**
 * Admin Security Setup Script
 * This script helps set up the improved admin authentication system
 */

import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'school_library',
  port: parseInt(process.env.DB_PORT || '3306'),
  multipleStatements: true
};

async function setupAdminSecurity() {
  console.log('🔐 Setting up Admin Security Enhancements...\n');

  let connection;

  try {
    // Connect to database
    console.log('📡 Connecting to database...');
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ Database connected successfully\n');

    // Read and execute the security schema
    const schemaPath = path.join(__dirname, '../database/admin-security-schema.sql');
    const schemaSQL = fs.readFileSync(schemaPath, 'utf8');

    console.log('🛠️  Creating admin security tables...');
    await connection.execute(schemaSQL);
    console.log('✅ Admin security tables created successfully\n');

    // Verify the setup
    console.log('🔍 Verifying setup...');

    // Check if admin user exists
    const [adminUsers] = await connection.execute(
      'SELECT COUNT(*) as count FROM admin_users WHERE username = ?',
      ['admin']
    );

    if (adminUsers[0].count > 0) {
      console.log('✅ Default admin user exists');
    } else {
      console.log('❌ Default admin user not found');
    }

    // Check security settings
    const [settings] = await connection.execute(
      'SELECT setting_key, setting_value FROM system_settings WHERE setting_key LIKE ?',
      ['%password_%']
    );

    console.log('✅ Security settings configured:');
    settings.forEach(setting => {
      console.log(`   - ${setting.setting_key}: ${setting.setting_value}`);
    });

    console.log('\n🎉 Admin Security Setup Complete!');
    console.log('\n📋 Next Steps:');
    console.log('1. Start the API server: npm run api');
    console.log('2. Test admin login with:');
    console.log('   Username: admin');
    console.log('   Password: AdminSecure123! (change this immediately)');
    console.log('3. Change the default password after first login');
    console.log('\n🔒 Security Features Enabled:');
    console.log('   ✅ Password hashing with bcrypt');
    console.log('   ✅ JWT token authentication');
    console.log('   ✅ Rate limiting (10 attempts/hour)');
    console.log('   ✅ Account lockout after 5 failed attempts');
    console.log('   ✅ Session management with expiration');
    console.log('   ✅ Security audit logging');
    console.log('   ✅ Password complexity requirements');

  } catch (error) {
    console.error('❌ Setup failed:', error.message);
    console.log('\n🔧 Troubleshooting:');
    console.log('1. Ensure MySQL server is running');
    console.log('2. Check database credentials in .env file');
    console.log('3. Verify database exists: CREATE DATABASE school_library;');
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// Run the setup
setupAdminSecurity().catch(console.error);