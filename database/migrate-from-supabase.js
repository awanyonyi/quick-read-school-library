#!/usr/bin/env node

/**
 * Data Migration Script: Supabase to MySQL
 * This script migrates data from Supabase to MySQL database
 */

const mysql = require('mysql2/promise');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// MySQL connection configuration
const mysqlConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'school_library',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

// Supabase configuration
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Supabase configuration missing. Please set SUPABASE_URL and SUPABASE_ANON_KEY environment variables.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function migrateData() {
  let mysqlConnection;

  try {
    console.log('🚀 Starting data migration from Supabase to MySQL...\n');

    // Connect to MySQL
    mysqlConnection = await mysql.createConnection(mysqlConfig);
    console.log('✅ Connected to MySQL database');

    // Test Supabase connection
    const { data: testData, error: testError } = await supabase.from('students').select('count').limit(1);
    if (testError) {
      throw new Error(`Supabase connection failed: ${testError.message}`);
    }
    console.log('✅ Connected to Supabase');

    // Migrate students
    console.log('\n📚 Migrating students...');
    await migrateStudents(mysqlConnection);

    // Migrate books
    console.log('\n📖 Migrating books...');
    await migrateBooks(mysqlConnection);

    // Migrate borrow records
    console.log('\n📋 Migrating borrow records...');
    await migrateBorrowRecords(mysqlConnection);

    // Migrate biometric logs (if any)
    console.log('\n🔐 Migrating biometric verification logs...');
    await migrateBiometricLogs(mysqlConnection);

    console.log('\n🎉 Migration completed successfully!');

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    if (mysqlConnection) {
      await mysqlConnection.end();
      console.log('✅ MySQL connection closed');
    }
  }
}

async function migrateStudents(mysqlConnection) {
  try {
    // Fetch all students from Supabase
    const { data: students, error } = await supabase
      .from('students')
      .select('*')
      .order('created_at', { ascending: true });

    if (error) throw error;

    if (!students || students.length === 0) {
      console.log('ℹ️  No students found in Supabase');
      return;
    }

    console.log(`📊 Found ${students.length} students to migrate`);

    // Insert students into MySQL
    const insertQuery = `
      INSERT INTO students (
        id, name, admission_number, email, class,
        blacklisted, blacklist_until, blacklist_reason,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        name = VALUES(name),
        email = VALUES(email),
        class = VALUES(class),
        blacklisted = VALUES(blacklisted),
        blacklist_until = VALUES(blacklist_until),
        blacklist_reason = VALUES(blacklist_reason),
        updated_at = NOW()
    `;

    let successCount = 0;
    for (const student of students) {
      try {
        await mysqlConnection.execute(insertQuery, [
          student.id,
          student.name,
          student.admission_number,
          student.email || null,
          student.class || null,
          student.blacklisted || false,
          student.blacklist_until || null,
          student.blacklist_reason || null,
          student.created_at,
          student.updated_at || student.created_at
        ]);
        successCount++;
      } catch (err) {
        console.error(`❌ Failed to migrate student ${student.id}:`, err.message);
      }
    }

    console.log(`✅ Successfully migrated ${successCount}/${students.length} students`);

  } catch (error) {
    console.error('❌ Error migrating students:', error.message);
    throw error;
  }
}

async function migrateBooks(mysqlConnection) {
  try {
    // Fetch all books from Supabase
    const { data: books, error } = await supabase
      .from('books')
      .select('*')
      .order('created_at', { ascending: true });

    if (error) throw error;

    if (!books || books.length === 0) {
      console.log('ℹ️  No books found in Supabase');
      return;
    }

    console.log(`📊 Found ${books.length} books to migrate`);

    // Insert books into MySQL
    const insertQuery = `
      INSERT INTO books (
        id, title, author, isbn, category,
        total_copies, available_copies,
        due_period_value, due_period_unit,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        title = VALUES(title),
        author = VALUES(author),
        isbn = VALUES(isbn),
        category = VALUES(category),
        total_copies = VALUES(total_copies),
        available_copies = VALUES(available_copies),
        due_period_value = VALUES(due_period_value),
        due_period_unit = VALUES(due_period_unit),
        updated_at = NOW()
    `;

    let successCount = 0;
    for (const book of books) {
      try {
        await mysqlConnection.execute(insertQuery, [
          book.id,
          book.title,
          book.author,
          book.isbn || null,
          book.category || null,
          book.total_copies || 1,
          book.available_copies || book.total_copies || 1,
          book.due_period_value || 24,
          book.due_period_unit || 'hours',
          book.created_at,
          book.updated_at || book.created_at
        ]);
        successCount++;
      } catch (err) {
        console.error(`❌ Failed to migrate book ${book.id}:`, err.message);
      }
    }

    console.log(`✅ Successfully migrated ${successCount}/${books.length} books`);

  } catch (error) {
    console.error('❌ Error migrating books:', error.message);
    throw error;
  }
}

async function migrateBorrowRecords(mysqlConnection) {
  try {
    // Fetch all borrow records from Supabase
    const { data: records, error } = await supabase
      .from('borrow_records')
      .select('*')
      .order('borrow_date', { ascending: true });

    if (error) throw error;

    if (!records || records.length === 0) {
      console.log('ℹ️  No borrow records found in Supabase');
      return;
    }

    console.log(`📊 Found ${records.length} borrow records to migrate`);

    // Insert borrow records into MySQL
    const insertQuery = `
      INSERT INTO borrow_records (
        id, book_id, student_id, borrow_date, due_date,
        return_date, status, fine_amount, fine_paid,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        return_date = VALUES(return_date),
        status = VALUES(status),
        fine_amount = VALUES(fine_amount),
        fine_paid = VALUES(fine_paid),
        updated_at = NOW()
    `;

    let successCount = 0;
    for (const record of records) {
      try {
        await mysqlConnection.execute(insertQuery, [
          record.id,
          record.book_id,
          record.student_id,
          record.borrow_date,
          record.due_date,
          record.return_date || null,
          record.status || 'borrowed',
          record.fine_amount || 0,
          record.fine_paid || false,
          record.created_at,
          record.updated_at || record.created_at
        ]);
        successCount++;
      } catch (err) {
        console.error(`❌ Failed to migrate borrow record ${record.id}:`, err.message);
      }
    }

    console.log(`✅ Successfully migrated ${successCount}/${records.length} borrow records`);

  } catch (error) {
    console.error('❌ Error migrating borrow records:', error.message);
    throw error;
  }
}

async function migrateBiometricLogs(mysqlConnection) {
  try {
    // Check if biometric_verification_logs table exists in Supabase
    const { data: logs, error } = await supabase
      .from('biometric_verification_logs')
      .select('*')
      .order('created_at', { ascending: true });

    if (error) {
      console.log('ℹ️  Biometric verification logs table not found in Supabase or no data');
      return;
    }

    if (!logs || logs.length === 0) {
      console.log('ℹ️  No biometric verification logs found in Supabase');
      return;
    }

    console.log(`📊 Found ${logs.length} biometric verification logs to migrate`);

    // Insert biometric logs into MySQL
    const insertQuery = `
      INSERT INTO biometric_verification_logs (
        id, student_id, book_id, verification_type,
        verification_method, verification_status, verified_by,
        verification_timestamp, borrow_record_id, additional_data,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        verification_status = VALUES(verification_status),
        verified_by = VALUES(verified_by),
        additional_data = VALUES(additional_data),
        updated_at = NOW()
    `;

    let successCount = 0;
    for (const log of logs) {
      try {
        await mysqlConnection.execute(insertQuery, [
          log.id,
          log.student_id,
          log.book_id || null,
          log.verification_type,
          log.verification_method,
          log.verification_status,
          log.verified_by || null,
          log.verification_timestamp,
          log.borrow_record_id || null,
          JSON.stringify(log.additional_data) || null,
          log.created_at,
          log.updated_at || log.created_at
        ]);
        successCount++;
      } catch (err) {
        console.error(`❌ Failed to migrate biometric log ${log.id}:`, err.message);
      }
    }

    console.log(`✅ Successfully migrated ${successCount}/${logs.length} biometric verification logs`);

  } catch (error) {
    console.error('❌ Error migrating biometric logs:', error.message);
    // Don't throw error for biometric logs as this table might not exist
  }
}

// Run migration if this script is executed directly
if (require.main === module) {
  migrateData().catch(console.error);
}

module.exports = { migrateData, migrateStudents, migrateBooks, migrateBorrowRecords, migrateBiometricLogs };