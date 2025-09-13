#!/usr/bin/env node

/**
 * Setup Verification Script
 * Checks if the application is properly configured and ready to run
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 School Library Setup Verification\n');

// Check if .env file exists
const envPath = path.join(__dirname, '..', '.env');
const envExamplePath = path.join(__dirname, '..', '.env.example');

console.log('1. Environment Configuration:');
if (fs.existsSync(envPath)) {
  console.log('   ✅ .env file exists');

  // Check if required environment variables are set
  require('dotenv').config({ path: envPath });

  const requiredVars = ['DB_HOST', 'DB_USER', 'DB_PASSWORD', 'DB_NAME'];
  const missingVars = requiredVars.filter(varName => !process.env[varName]);

  if (missingVars.length === 0) {
    console.log('   ✅ All required database environment variables are set');
  } else {
    console.log('   ❌ Missing environment variables:', missingVars.join(', '));
    console.log('   📝 Please update your .env file with the missing variables');
  }
} else {
  console.log('   ❌ .env file not found');
  console.log('   📝 Copy .env.example to .env and configure your settings');
  console.log('   📋 Example: cp .env.example .env');
}

// Check if package.json exists and has mysql2 dependency
console.log('\n2. Dependencies:');
const packagePath = path.join(__dirname, '..', 'package.json');
if (fs.existsSync(packagePath)) {
  const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));

  if (packageJson.dependencies && packageJson.dependencies.mysql2) {
    console.log('   ✅ mysql2 dependency is installed');
  } else {
    console.log('   ❌ mysql2 dependency not found in package.json');
    console.log('   📝 Run: npm install mysql2');
  }

  if (packageJson.dependencies && packageJson.dependencies.dotenv) {
    console.log('   ✅ dotenv dependency is installed');
  } else {
    console.log('   ❌ dotenv dependency not found in package.json');
    console.log('   📝 Run: npm install dotenv');
  }
} else {
  console.log('   ❌ package.json not found');
}

// Check if database schema files exist
console.log('\n3. Database Schema:');
const schemaPath = path.join(__dirname, '..', 'database', 'mysql-schema-simple.sql');
if (fs.existsSync(schemaPath)) {
  console.log('   ✅ MySQL schema file exists');
} else {
  console.log('   ❌ MySQL schema file not found');
}

// Check if migration script exists
console.log('\n4. Migration Tools:');
const migrationPath = path.join(__dirname, '..', 'database', 'migrate-from-supabase.js');
if (fs.existsSync(migrationPath)) {
  console.log('   ✅ Migration script exists');
} else {
  console.log('   ❌ Migration script not found');
}

// Test MySQL connection (if dependencies are available)
console.log('\n5. Database Connection Test:');
try {
  const mysql = require('mysql2/promise');
  require('dotenv').config({ path: envPath });

  const config = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'school_library',
    connectTimeout: 5000
  };

  console.log('   🔄 Testing MySQL connection...');

  mysql.createConnection(config).then(async (connection) => {
    console.log('   ✅ MySQL connection successful');
    await connection.end();
  }).catch((error) => {
    console.log('   ❌ MySQL connection failed:', error.message);
    console.log('   📝 Please check:');
    console.log('      - MySQL server is running');
    console.log('      - Database credentials are correct');
    console.log('      - Database exists');
    console.log('      - Firewall allows connections');
  });

} catch (error) {
  console.log('   ❌ Cannot test MySQL connection (dependencies not installed)');
  console.log('   📝 Run: npm install mysql2 dotenv');
}

// Summary and next steps
console.log('\n📋 Summary & Next Steps:');
console.log('========================');

const issues = [];

if (!fs.existsSync(envPath)) issues.push('Create .env file');
if (!fs.existsSync(packagePath) || !JSON.parse(fs.readFileSync(packagePath, 'utf8')).dependencies?.mysql2) {
  issues.push('Install mysql2 dependency');
}
if (!fs.existsSync(schemaPath)) issues.push('Database schema missing');

if (issues.length === 0) {
  console.log('✅ Setup looks good! You can now:');
  console.log('   1. Start MySQL server');
  console.log('   2. Create database: mysql -u root -p < database/mysql-schema-simple.sql');
  console.log('   3. Run migration (if needed): node database/migrate-from-supabase.js');
  console.log('   4. Start app: npm run dev');
} else {
  console.log('❌ Issues found:');
  issues.forEach(issue => console.log(`   - ${issue}`));
}

console.log('\n📖 For detailed setup instructions, see: README-MYSQL-MIGRATION.md');