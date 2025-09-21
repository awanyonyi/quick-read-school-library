#!/usr/bin/env node

/**
 * Create Admin Table Script
 * Creates the admin_users table
 */

import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'school_library',
  port: parseInt(process.env.DB_PORT || '3306'),
};

async function createAdminTable() {
  console.log('🔧 Creating admin_users table...\n');

  let connection;

  try {
    connection = await mysql.createConnection(dbConfig);

    // Drop table if exists
    try {
      await connection.execute('DROP TABLE IF EXISTS admin_users');
      console.log('✅ Dropped existing admin_users table');
    } catch (e) {
      console.log('ℹ️  Table did not exist or could not be dropped');
    }

    // Create table
    const createTableSQL = `
      CREATE TABLE admin_users (
        id VARCHAR(36) PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        salt VARCHAR(64) NOT NULL,
        role VARCHAR(20) DEFAULT 'admin',
        is_active BIT DEFAULT 1,
        last_login DATETIME NULL,
        login_attempts INT DEFAULT 0,
        locked_until DATETIME NULL,
        password_changed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `;

    await connection.execute(createTableSQL);
    console.log('✅ Created admin_users table successfully');

  } catch (error) {
    console.error('❌ Failed to create admin table:', error.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

createAdminTable().catch(console.error);