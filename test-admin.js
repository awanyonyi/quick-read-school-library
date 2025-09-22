import mysql from 'mysql2/promise';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';

dotenv.config();

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'school_library',
  port: parseInt(process.env.DB_PORT || '3306'),
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  acquireTimeout: 60000,
  timeout: 60000,
};

async function testAdmin() {
  let pool;

  try {
    pool = mysql.createPool(dbConfig);
    console.log('Pool created');

    // Check admin_users table
    const [rows] = await pool.execute('SELECT * FROM admin_users');
    console.log('Admin users:', rows);

    // Test password verification
    if (rows.length > 0) {
      const admin = rows[0];
      const testPassword = 'Sheila_library';
      const isValid = await bcrypt.compare(testPassword, admin.password_hash);
      console.log(`Password 'Sheila_library' valid:`, isValid);

      // Reset password to Sheila_library and clear lockout
      const hashedReset = await bcrypt.hash('Sheila_library', 12);
      console.log('Reset hashed password:', hashedReset);

      const resetQuery = `
        UPDATE admin_users
        SET password_hash = ?, login_attempts = 0, locked_until = NULL, password_changed_at = NOW(), updated_at = NOW()
        WHERE id = ?
      `;
      const [resetResult] = await pool.execute(resetQuery, [hashedReset, admin.id]);
      console.log('Reset result:', resetResult);

      // Verify reset
      const [resetRows] = await pool.execute('SELECT * FROM admin_users WHERE id = ?', [admin.id]);
      console.log('Reset user:', resetRows[0]);

      // Test password after reset
      const isValidAfterReset = await bcrypt.compare('Sheila_library', resetRows[0].password_hash);
      console.log(`Password 'Sheila_library' valid after reset:`, isValidAfterReset);
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    if (pool) {
      await pool.end();
    }
  }
}

testAdmin();