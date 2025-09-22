import mysql from 'mysql2/promise';
import bcrypt from 'bcrypt';

const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: 'Allanware5895',
  database: 'school_library',
  port: 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  // acquireTimeout: 60000, // Removed invalid option
  // timeout: 60000, // Removed invalid option
};

async function testPool() {
  let pool;

  try {
    pool = mysql.createPool(dbConfig);
    console.log('Pool created');

    // Test update like the API does
    const adminId = 'admin-maryland-1';
    const newPassword = 'newpassword123';

    const hashedPassword = await bcrypt.hash(newPassword, 12);
    console.log('Hashed password:', hashedPassword);

    const query = `
      UPDATE admin_users
      SET password_hash = ?, password_changed_at = NOW(), updated_at = NOW()
      WHERE id = ?
    `;

    console.log('Executing query with params:', [hashedPassword, adminId]);

    const [result] = await pool.execute(query, [hashedPassword, adminId]);
    console.log('Update result:', result);

    return true;
  } catch (error) {
    console.error('Error in testPool:', error);
    return false;
  } finally {
    if (pool) {
      await pool.end();
    }
  }
}

testPool();