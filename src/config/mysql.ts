import mysql from 'mysql2/promise';

// MySQL database configuration
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

// Create connection pool
const pool = mysql.createPool(dbConfig);

// Test database connection
export const testConnection = async (): Promise<boolean> => {
  try {
    const connection = await pool.getConnection();
    console.log('✅ MySQL database connected successfully');
    connection.release();
    return true;
  } catch (error) {
    console.error('❌ MySQL database connection failed:', error);
    console.error('Please check:');
    console.error('1. MySQL server is running');
    console.error('2. Database credentials are correct');
    console.error('3. Database exists');
    console.error('4. Firewall allows connections');
    return false;
  }
};

// Safe database operation wrapper
export const safeDbOperation = async <T>(
  operation: () => Promise<T>,
  fallbackValue: T,
  operationName: string = 'Database operation'
): Promise<T> => {
  try {
    return await operation();
  } catch (error) {
    console.error(`❌ ${operationName} failed:`, error);
    console.warn(`⚠️ Using fallback value for ${operationName}`);
    return fallbackValue;
  }
};

// Execute query with proper error handling
export const executeQuery = async (query: string, params: any[] = []): Promise<any> => {
  try {
    const [rows] = await pool.execute(query, params);
    return rows;
  } catch (error) {
    console.error('Database query error:', error);
    throw error;
  }
};

// Execute transaction
export const executeTransaction = async (queries: Array<{ query: string; params: any[] }>): Promise<any> => {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const results = [];
    for (const { query, params } of queries) {
      const [result] = await connection.execute(query, params);
      results.push(result);
    }

    await connection.commit();
    return results;
  } catch (error) {
    await connection.rollback();
    console.error('Transaction failed:', error);
    throw error;
  } finally {
    connection.release();
  }
};

// Close database connection pool
export const closeConnection = async (): Promise<void> => {
  try {
    await pool.end();
    console.log('✅ MySQL connection pool closed');
  } catch (error) {
    console.error('Error closing MySQL connection pool:', error);
  }
};

export default pool;