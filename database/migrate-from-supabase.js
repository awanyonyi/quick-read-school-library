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

    // Migrate system settings and user roles
    console.log('\n⚙️  Migrating system settings and user roles...');
    await migrateSystemSettings(mysqlConnection);

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

    // Insert books into MySQL (without total_copies/available_copies)
    const insertBookQuery = `
      INSERT INTO books (
        id, title, author, category,
        due_period_value, due_period_unit,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        title = VALUES(title),
        author = VALUES(author),
        category = VALUES(category),
        due_period_value = VALUES(due_period_value),
        due_period_unit = VALUES(due_period_unit),
        updated_at = NOW()
    `;

    // Insert book copies
    const insertCopyQuery = `
      INSERT INTO book_copies (
        id, book_id, isbn, status, condition_notes,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `;

    let successCount = 0;
    for (const book of books) {
      try {
        // Insert book metadata
        await mysqlConnection.execute(insertBookQuery, [
          book.id,
          book.title,
          book.author,
          book.category || null,
          book.due_period_value || 24,
          book.due_period_unit || 'hours',
          book.created_at,
          book.updated_at || book.created_at
        ]);

        // Create book copies with unique ISBNs
        const totalCopies = book.total_copies || 1;
        const availableCopies = book.available_copies || totalCopies;

        for (let i = 1; i <= totalCopies; i++) {
          const copyId = `${book.id}_copy_${i}`;
          // Generate unique 13-digit ISBN
          const isbn = Math.floor(Math.random() * 9000000000000) + 1000000000000;
          const status = i <= availableCopies ? 'available' : 'borrowed';

          await mysqlConnection.execute(insertCopyQuery, [
            copyId,
            book.id,
            isbn.toString(),
            status,
            null, // condition_notes
            book.created_at,
            book.updated_at || book.created_at
          ]);
        }

        successCount++;
      } catch (err) {
        console.error(`❌ Failed to migrate book ${book.id}:`, err.message);
      }
    }

    console.log(`✅ Successfully migrated ${successCount}/${books.length} books with their copies`);

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

    let successCount = 0;
    for (const record of records) {
      try {
        // Find an available copy for this book
        const [copyResult] = await mysqlConnection.execute(
          `SELECT id FROM book_copies WHERE book_id = ? AND status = 'available' LIMIT 1`,
          [record.book_id]
        );

        if (!copyResult || copyResult.length === 0) {
          // If no available copy, find any copy (could be borrowed already)
          const [anyCopyResult] = await mysqlConnection.execute(
            `SELECT id FROM book_copies WHERE book_id = ? LIMIT 1`,
            [record.book_id]
          );

          if (!anyCopyResult || anyCopyResult.length === 0) {
            console.error(`❌ No copies found for book ${record.book_id}, skipping borrow record ${record.id}`);
            continue;
          }

          copyId = anyCopyResult[0].id;
        } else {
          copyId = copyResult[0].id;
        }

        // Insert borrow record into MySQL
        const insertQuery = `
          INSERT INTO borrow_records (
            id, book_copy_id, student_id, borrow_date, due_date,
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

        await mysqlConnection.execute(insertQuery, [
          record.id,
          copyId,
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

    let successCount = 0;
    for (const log of logs) {
      try {
        let bookCopyId = null;

        // If there's a borrow_record_id, get the book_copy_id from it
        if (log.borrow_record_id) {
          const [borrowResult] = await mysqlConnection.execute(
            `SELECT book_copy_id FROM borrow_records WHERE id = ?`,
            [log.borrow_record_id]
          );
          if (borrowResult && borrowResult.length > 0) {
            bookCopyId = borrowResult[0].book_copy_id;
          }
        }

        // If no borrow_record_id but there's a book_id, find a copy for that book
        if (!bookCopyId && log.book_id) {
          const [copyResult] = await mysqlConnection.execute(
            `SELECT id FROM book_copies WHERE book_id = ? LIMIT 1`,
            [log.book_id]
          );
          if (copyResult && copyResult.length > 0) {
            bookCopyId = copyResult[0].id;
          }
        }

        // Insert biometric logs into MySQL
        const insertQuery = `
          INSERT INTO biometric_verification_logs (
            id, student_id, book_copy_id, verification_type,
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

        await mysqlConnection.execute(insertQuery, [
          log.id,
          log.student_id,
          bookCopyId,
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

async function migrateSystemSettings(mysqlConnection) {
  try {
    // Insert default system settings
    const settingsQuery = `
      INSERT IGNORE INTO system_settings (setting_key, setting_value, description) VALUES
      ('library_name', '"Maryland School Library"', 'Name of the library'),
      ('default_borrow_period', '{"value": 24, "unit": "hours"}', 'Default borrowing period'),
      ('fine_per_day', '10.00', 'Fine amount per overdue day in KES'),
      ('max_borrow_limit', '3', 'Maximum books a student can borrow'),
      ('biometric_required', 'true', 'Whether biometric verification is required')
    `;
    await mysqlConnection.execute(settingsQuery);

    // Insert default user roles
    const rolesQuery = `
      INSERT IGNORE INTO user_roles (name, description, permissions) VALUES
      ('admin', 'System Administrator', '{"all": true}'),
      ('librarian', 'Library Staff', '{"manage_books": true, "manage_students": true, "issue_books": true, "return_books": true}'),
      ('student', 'Student User', '{"borrow_books": true, "view_history": true}')
    `;
    await mysqlConnection.execute(rolesQuery);

    console.log('✅ Successfully inserted default system settings and user roles');

  } catch (error) {
    console.error('❌ Error migrating system settings:', error.message);
    // Don't throw error for system settings as they might already exist
  }
}

module.exports = { migrateData, migrateStudents, migrateBooks, migrateBorrowRecords, migrateBiometricLogs, migrateSystemSettings };