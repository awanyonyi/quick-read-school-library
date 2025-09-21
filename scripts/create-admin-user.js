#!/usr/bin/env node

/**
 * Create Admin User Script
 * Creates the correct admin user with Maryland_library credentials
 */

import mysql from 'mysql2/promise';
import bcrypt from 'bcrypt';
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
};

async function createAdminUser() {
  console.log('🔐 Creating Admin User with Correct Credentials...\n');

  let connection;

  try {
    // Connect to database
    console.log('📡 Connecting to database...');
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ Database connected successfully\n');

    // Check if admin user already exists
    const [existingUsers] = await connection.execute(
      'SELECT id, username FROM admin_users WHERE username = ?',
      ['Maryland_library']
    );

    if (existingUsers.length > 0) {
      console.log('✅ Admin user "Maryland_library" already exists');
      console.log('   User ID:', existingUsers[0].id);
      console.log('   Username:', existingUsers[0].username);
      return;
    }

    // Hash the password
    console.log('🔒 Hashing password...');
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash('Sheila_library', saltRounds);
    console.log('✅ Password hashed successfully\n');

    // Create the admin user
    console.log('👤 Creating admin user...');
    const userId = 'admin-maryland-1';
    const insertQuery = `
      INSERT INTO admin_users (
        id, username, email, password_hash, salt, role, is_active
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        password_hash = VALUES(password_hash),
        salt = VALUES(salt),
        email = VALUES(email),
        is_active = VALUES(is_active)
    `;

    await connection.execute(insertQuery, [
      userId,
      'Maryland_library',
      'admin@maryland.edu',
      hashedPassword,
      '', // salt not needed with bcrypt
      'admin',
      1
    ]);

    console.log('✅ Admin user created successfully!');
    console.log('\n📋 Admin Credentials:');
    console.log('   👤 Username: Maryland_library');
    console.log('   🔑 Password: Sheila_library');
    console.log('   📧 Email: admin@maryland.edu');
    console.log('   🆔 Role: admin');

    // Verify the user was created
    const [verifyUsers] = await connection.execute(
      'SELECT id, username, email, role FROM admin_users WHERE username = ?',
      ['Maryland_library']
    );

    if (verifyUsers.length > 0) {
      console.log('\n✅ Verification successful:');
      console.log('   User found in database:', verifyUsers[0].username);
    }

  } catch (error) {
    console.error('❌ Failed to create admin user:', error.message);
    console.log('\n🔧 Troubleshooting:');
    console.log('1. Ensure MySQL server is running');
    console.log('2. Check database credentials in .env file');
    console.log('3. Verify admin_users table exists (run setup-admin-security.js first)');
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// Run the script
createAdminUser().catch(console.error);