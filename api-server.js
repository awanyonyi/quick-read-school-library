import express from 'express';
import mysql from 'mysql2/promise';
import cors from 'cors';
import dotenv from 'dotenv';
import bcrypt from 'bcrypt';
import { mockDataProvider } from './src/utils/mockData.ts';

dotenv.config();

const app = express();
const PORT = process.env.API_PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

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
};

// Create connection pool
const pool = mysql.createPool(dbConfig);

// Flag to determine if we should use mock data
let useMockData = false;

// Test database connection
const testConnection = async () => {
  try {
    const connection = await pool.getConnection();
    console.log('✅ MySQL database connected successfully');
    connection.release();
    useMockData = false;
    return true;
  } catch (error) {
    console.error('❌ MySQL database connection failed:', error);
    console.error('Please check:');
    console.error('1. MySQL server is running');
    console.error('2. Database credentials are correct');
    console.error('3. Database exists');
    console.error('4. Firewall allows connections');
    console.error('⚠️ Falling back to mock data for development');
    useMockData = true;
    return false;
  }
};

// Safe database operation wrapper
const safeDbOperation = async (operation, fallbackValue, operationName = 'Database operation') => {
  try {
    return await operation();
  } catch (error) {
    console.error(`❌ ${operationName} failed:`, error);
    console.warn(`⚠️ Using fallback value for ${operationName}`);
    return fallbackValue;
  }
};

// Execute query with proper error handling
const executeQuery = async (query, params = []) => {
  try {
    const [rows] = await pool.execute(query, params);
    return rows;
  } catch (error) {
    console.error('Database query error:', error);
    throw error;
  }
};

// Generate unique 8-digit ISBN
const generateUniqueISBN = async () => {
  let isbn;
  let attempts = 0;
  const maxAttempts = 100; // Prevent infinite loops

  do {
    // Generate 8-digit number (10000000 to 99999999)
    isbn = Math.floor(Math.random() * 90000000) + 10000000;
    attempts++;

    if (attempts >= maxAttempts) {
      throw new Error('Could not generate unique ISBN after maximum attempts');
    }

    // Check if ISBN already exists in database
    const existingQuery = 'SELECT COUNT(*) as count FROM book_copies WHERE isbn = ?';
    const existingResult = await executeQuery(existingQuery, [isbn.toString()]);
    const exists = existingResult[0]?.count > 0;

    if (!exists) {
      break; // ISBN is unique
    }
  } while (true);

  return isbn.toString();
};

// API Routes

// Books routes
app.get('/api/books', async (req, res) => {
  try {
    if (useMockData) {
      const books = await mockDataProvider.fetchBooks();
      res.json(books);
    } else {
      const query = `
        SELECT
          b.*,
          COUNT(bc.id) as total_copies,
          COUNT(CASE WHEN bc.status = 'available' THEN 1 END) as available_copies,
          JSON_ARRAYAGG(
            JSON_OBJECT(
              'id', bc.id,
              'isbn', bc.isbn,
              'status', bc.status,
              'condition_notes', bc.condition_notes
            )
          ) as copies
        FROM books b
        LEFT JOIN book_copies bc ON b.id = bc.book_id
        GROUP BY b.id
        ORDER BY b.created_at DESC
      `;
      const rows = await executeQuery(query);
      res.json(rows || []);
    }
  } catch (error) {
    console.error('Error fetching books:', error);
    res.status(500).json({ error: 'Failed to fetch books' });
  }
});

app.get('/api/books/search', async (req, res) => {
  try {
    const { q } = req.query;

    if (!q || typeof q !== 'string') {
      return res.status(400).json({ error: 'Search query is required' });
    }

    const searchTerm = `%${q}%`;

    const query = `
      SELECT
        b.*,
        COUNT(bc.id) as total_copies,
        COUNT(CASE WHEN bc.status = 'available' THEN 1 END) as available_copies,
        JSON_ARRAYAGG(
          JSON_OBJECT(
            'id', bc.id,
            'isbn', bc.isbn,
            'status', bc.status,
            'condition_notes', bc.condition_notes
          )
        ) as copies
      FROM books b
      LEFT JOIN book_copies bc ON b.id = bc.book_id
      WHERE b.title LIKE ? OR b.author LIKE ? OR bc.isbn LIKE ?
      GROUP BY b.id
      ORDER BY b.created_at DESC
    `;

    const rows = await executeQuery(query, [searchTerm, searchTerm, searchTerm]);
    res.json(rows || []);
  } catch (error) {
    console.error('Error searching books:', error);
    res.status(500).json({ error: 'Failed to search books' });
  }
});

app.post('/api/books', async (req, res) => {
  try {
    const { title, author, category, total_copies, isbn, due_period_value = 24, due_period_unit = 'hours' } = req.body;

    if (!total_copies || total_copies < 1) {
      return res.status(400).json({ error: 'total_copies must be at least 1' });
    }

    // Start transaction
    const connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
      // Insert book metadata
      const bookQuery = `
        INSERT INTO books (
          id, title, author, category,
          due_period_value, due_period_unit,
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())
      `;

      const bookId = crypto.randomUUID();
      await connection.execute(bookQuery, [
        bookId,
        title,
        author,
        category || null,
        due_period_value,
        due_period_unit
      ]);

      // Use provided ISBN or generate unique ones for each copy
      const copyInserts = [];
      const copyIds = [];

      for (let i = 0; i < total_copies; i++) {
        const copyId = crypto.randomUUID();
        let copyIsbn;

        if (isbn && i === 0) {
          // Use provided ISBN for first copy
          copyIsbn = isbn;
        } else if (isbn) {
          // For additional copies with provided ISBN, append copy number
          copyIsbn = `${isbn}-${i + 1}`;
        } else {
          // Generate unique ISBN if none provided
          copyIsbn = await generateUniqueISBN();
        }

        copyInserts.push([copyId, bookId, copyIsbn, 'available', null]);
        copyIds.push(copyId);
      }

      // Insert book copies
      const copyQuery = `
        INSERT INTO book_copies (
          id, book_id, isbn, status, condition_notes,
          created_at, updated_at
        ) VALUES ${copyInserts.map(() => '(?, ?, ?, ?, ?, NOW(), NOW())').join(', ')}
      `;

      const flattenedValues = copyInserts.flat();
      await connection.execute(copyQuery, flattenedValues);

      await connection.commit();

      res.json({
        id: bookId,
        title,
        author,
        category,
        total_copies,
        available_copies: total_copies,
        due_period_value,
        due_period_unit,
        copies: copyIds.map((id, index) => ({
          id,
          isbn: copyInserts[index][2],
          status: 'available'
        })),
        created_at: new Date(),
        updated_at: new Date()
      });
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Error adding book:', error);
    res.status(500).json({ error: 'Failed to add book' });
  }
});

app.delete('/api/books/:bookId', async (req, res) => {
  try {
    const { bookId } = req.params;

    if (useMockData) {
      // Mock delete
      res.json({ message: 'Book deleted successfully (mock)' });
    } else {
      // Start transaction
      const connection = await pool.getConnection();
      await connection.beginTransaction();

      try {
        // Check if any book copies are currently borrowed
        const borrowCheckQuery = `
          SELECT COUNT(*) as count FROM borrow_records br
          JOIN book_copies bc ON br.book_copy_id = bc.id
          WHERE bc.book_id = ? AND br.status = 'borrowed'
        `;
        const [borrowCheckResult] = await connection.execute(borrowCheckQuery, [bookId]);
        const activeBorrows = borrowCheckResult[0]?.count || 0;

        if (activeBorrows > 0) {
          await connection.rollback();
          return res.status(400).json({
            error: `Cannot delete book: ${activeBorrows} copy(ies) are currently borrowed. Please wait for all copies to be returned.`
          });
        }

        // Delete book copies first (due to foreign key constraint)
        const deleteCopiesQuery = `DELETE FROM book_copies WHERE book_id = ?`;
        await connection.execute(deleteCopiesQuery, [bookId]);

        // Delete the book
        const deleteBookQuery = `DELETE FROM books WHERE id = ?`;
        const [result] = await connection.execute(deleteBookQuery, [bookId]);

        if (result.affectedRows === 0) {
          await connection.rollback();
          return res.status(404).json({ error: 'Book not found' });
        }

        await connection.commit();

        res.json({
          message: 'Book and all its copies deleted successfully',
          book_id: bookId
        });
      } catch (error) {
        await connection.rollback();
        throw error;
      } finally {
        connection.release();
      }
    }
  } catch (error) {
    console.error('Error deleting book:', error);
    res.status(500).json({ error: 'Failed to delete book' });
  }
});

app.put('/api/books/:bookId', async (req, res) => {
  try {
    const { bookId } = req.params;
    const { title, author, category, total_copies } = req.body;

    if (useMockData) {
      // Mock update
      res.json({
        id: bookId,
        title,
        author,
        category,
        total_copies,
        updated_at: new Date().toISOString()
      });
    } else {
      // Start transaction
      const connection = await pool.getConnection();
      await connection.beginTransaction();

      try {
        // Update book metadata
        const updateBookQuery = `
          UPDATE books
          SET title = ?, author = ?, category = ?, updated_at = NOW()
          WHERE id = ?
        `;
        const [result] = await connection.execute(updateBookQuery, [
          title,
          author,
          category || null,
          bookId
        ]);

        if (result.affectedRows === 0) {
          await connection.rollback();
          return res.status(404).json({ error: 'Book not found' });
        }

        // Get current number of copies
        const countQuery = `SELECT COUNT(*) as count FROM book_copies WHERE book_id = ?`;
        const [countResult] = await connection.execute(countQuery, [bookId]);
        const currentCopies = countResult[0]?.count || 0;

        // If total_copies changed, we need to add or remove copies
        if (total_copies > currentCopies) {
          // Add more copies
          const copiesToAdd = total_copies - currentCopies;
          const copyInserts = [];

          for (let i = 0; i < copiesToAdd; i++) {
            const copyId = crypto.randomUUID();
            const copyIsbn = await generateUniqueISBN();
            copyInserts.push([copyId, bookId, copyIsbn, 'available', null]);
          }

          if (copyInserts.length > 0) {
            const addCopiesQuery = `
              INSERT INTO book_copies (
                id, book_id, isbn, status, condition_notes,
                created_at, updated_at
              ) VALUES ${copyInserts.map(() => '(?, ?, ?, ?, ?, NOW(), NOW())').join(', ')}
            `;
            const flattenedValues = copyInserts.flat();
            await connection.execute(addCopiesQuery, flattenedValues);
          }
        } else if (total_copies < currentCopies) {
          // Remove excess copies (only if they're available)
          const copiesToRemove = currentCopies - total_copies;

          // First, get available copies to remove
          const availableCopiesQuery = `
            SELECT id FROM book_copies
            WHERE book_id = ? AND status = 'available'
            LIMIT ?
          `;
          const [availableCopiesResult] = await connection.execute(availableCopiesQuery, [bookId, copiesToRemove]);

          if (availableCopiesResult.length > 0) {
            const copyIdsToRemove = availableCopiesResult.map(row => row.id);
            const removeCopiesQuery = `DELETE FROM book_copies WHERE id IN (${copyIdsToRemove.map(() => '?').join(', ')})`;
            await connection.execute(removeCopiesQuery, copyIdsToRemove);
          }
        }

        await connection.commit();

        // Get updated book data
        const selectQuery = `
          SELECT
            b.*,
            COUNT(bc.id) as total_copies,
            COUNT(CASE WHEN bc.status = 'available' THEN 1 END) as available_copies,
            JSON_ARRAYAGG(
              JSON_OBJECT(
                'id', bc.id,
                'isbn', bc.isbn,
                'status', bc.status,
                'condition_notes', bc.condition_notes
              )
            ) as copies
          FROM books b
          LEFT JOIN book_copies bc ON b.id = bc.book_id
          WHERE b.id = ?
          GROUP BY b.id
        `;
        const [updatedBookResult] = await pool.execute(selectQuery, [bookId]);

        res.json(updatedBookResult[0]);
      } catch (error) {
        await connection.rollback();
        throw error;
      } finally {
        connection.release();
      }
    }
  } catch (error) {
    console.error('Error updating book:', error);
    res.status(500).json({ error: 'Failed to update book' });
  }
});

// Students routes
app.get('/api/students', async (req, res) => {
  try {
    if (useMockData) {
      const students = await mockDataProvider.fetchStudents();
      res.json(students);
    } else {
      const query = `
        SELECT * FROM students
        ORDER BY created_at DESC
      `;
      const rows = await executeQuery(query);
      res.json(rows || []);
    }
  } catch (error) {
    console.error('Error fetching students:', error);
    res.status(500).json({ error: 'Failed to fetch students' });
  }
});

app.post('/api/students', async (req, res) => {
  try {
    const { name, admission_number, email, class: studentClass } = req.body;

    if (useMockData) {
      const newStudent = await mockDataProvider.addStudent({
        name,
        admission_number,
        email,
        class: studentClass
      });
      res.json(newStudent);
    } else {
      const query = `
        INSERT INTO students (
          id, name, admission_number, email, class,
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, NOW(), NOW())
      `;

      const studentId = crypto.randomUUID();
      const values = [
        studentId,
        name,
        admission_number,
        email || null,
        studentClass || null
      ];

      await pool.execute(query, values);

      res.json({
        id: studentId,
        name,
        admission_number,
        email,
        class: studentClass,
        created_at: new Date(),
        updated_at: new Date()
      });
    }
  } catch (error) {
    console.error('Error adding student:', error);
    res.status(500).json({ error: 'Failed to add student' });
  }
});

app.put('/api/students/:studentId', async (req, res) => {
  try {
    const { studentId } = req.params;
    const { name, admission_number, email, class: studentClass } = req.body;

    if (useMockData) {
      // Mock update
      res.json({
        id: studentId,
        name,
        admission_number,
        email,
        class: studentClass,
        updated_at: new Date()
      });
    } else {
      const query = `
        UPDATE students
        SET name = ?, admission_number = ?, email = ?, class = ?, updated_at = NOW()
        WHERE id = ?
      `;

      await pool.execute(query, [name, admission_number, email || null, studentClass || null, studentId]);

      // Fetch updated student data
      const selectQuery = `SELECT * FROM students WHERE id = ?`;
      const [rows] = await pool.execute(selectQuery, [studentId]);

      if (rows.length === 0) {
        return res.status(404).json({ error: 'Student not found' });
      }

      res.json(rows[0]);
    }
  } catch (error) {
    console.error('Error updating student:', error);
    res.status(500).json({ error: 'Failed to update student' });
  }
});

app.delete('/api/students/:studentId', async (req, res) => {
  try {
    const { studentId } = req.params;

    if (useMockData) {
      // Mock delete
      res.json({ message: 'Student deleted successfully' });
    } else {
      // Check if student has active borrow records
      const borrowCheckQuery = `
        SELECT COUNT(*) as count FROM borrow_records
        WHERE student_id = ? AND status = 'borrowed'
      `;
      const [borrowCheckResult] = await pool.execute(borrowCheckQuery, [studentId]);
      const activeBorrows = borrowCheckResult[0]?.count || 0;

      if (activeBorrows > 0) {
        return res.status(400).json({
          error: `Student has ${activeBorrows} active borrow record(s). Please return all books first.`
        });
      }

      const query = `DELETE FROM students WHERE id = ?`;
      await pool.execute(query, [studentId]);

      res.json({ message: 'Student deleted successfully' });
    }
  } catch (error) {
    console.error('Error deleting student:', error);
    res.status(500).json({ error: 'Failed to delete student' });
  }
});

// Unblacklist a student (Admin only)
app.put('/api/students/:studentId/unblacklist', async (req, res) => {
  try {
    const { studentId } = req.params;
    const { reason, adminId } = req.body;

    // Validate required fields
    if (!reason || reason.trim().length < 10) {
      return res.status(400).json({
        error: 'Unblacklist reason is required and must be at least 10 characters long'
      });
    }

    if (!adminId) {
      return res.status(400).json({
        error: 'Admin ID is required for unblacklist operation'
      });
    }

    if (useMockData) {
      // Mock unblacklist
      res.json({
        success: true,
        message: 'Student unblacklisted successfully (mock)',
        unblacklist_reason: reason.trim(),
        unblacklist_date: new Date().toISOString()
      });
    } else {
      // First, get current student data to log the change
      const selectQuery = `SELECT * FROM students WHERE id = ?`;
      const [rows] = await pool.execute(selectQuery, [studentId]);

      if (rows.length === 0) {
        return res.status(404).json({ error: 'Student not found' });
      }

      const student = rows[0];

      if (!student.blacklisted) {
        return res.status(400).json({
          error: 'Student is not currently blacklisted'
        });
      }

      // Update student to remove blacklist
      const updateQuery = `
        UPDATE students
        SET
          blacklisted = FALSE,
          blacklist_until = NULL,
          blacklist_reason = CONCAT('Manually unblacklisted by admin - Reason: ', ?, ' - Previous: ', COALESCE(blacklist_reason, 'No previous reason')),
          updated_at = NOW()
        WHERE id = ?
      `;

      await pool.execute(updateQuery, [reason.trim(), studentId]);

      // Log the unblacklist action
      const logQuery = `
        INSERT INTO admin_actions (
          id, admin_id, action_type, target_type, target_id,
          action_details, created_at
        ) VALUES (?, ?, 'unblacklist', 'student', ?, ?, NOW())
      `;

      const logId = crypto.randomUUID();
      const actionDetails = JSON.stringify({
        student_name: student.name,
        student_admission: student.admission_number,
        previous_blacklist_reason: student.blacklist_reason,
        unblacklist_reason: reason.trim(),
        unblacklist_date: new Date().toISOString()
      });

      try {
        await pool.execute(logQuery, [logId, adminId, studentId, actionDetails]);
      } catch (logError) {
        console.warn('Failed to log unblacklist action:', logError);
        // Don't fail the unblacklist operation if logging fails
      }

      // Fetch updated student data
      const [updatedRows] = await pool.execute(selectQuery, [studentId]);

      console.log(`✅ Student ${student.name} (${studentId}) unblacklisted by admin ${adminId}: ${reason}`);

      res.json({
        ...updatedRows[0],
        unblacklist_success: true,
        unblacklist_reason: reason.trim(),
        unblacklist_date: new Date().toISOString()
      });
    }
  } catch (error) {
    console.error('Error unblacklisting student:', error);
    res.status(500).json({ error: 'Failed to unblacklist student' });
  }
});

// Get all enrolled biometric data for duplicate checking
app.get('/api/students/biometric-data', async (req, res) => {
  try {
    if (useMockData) {
      // Mock biometric data
      const students = await mockDataProvider.fetchStudents();
      const biometricStudents = students.filter(s => s.biometric_enrolled).map(s => ({
        id: s.id,
        name: s.name,
        biometric_data: s.biometric_data
      }));
      res.json(biometricStudents);
    } else {
      try {
        const query = `
          SELECT id, name, biometric_data
          FROM students
          WHERE biometric_enrolled = true AND biometric_data IS NOT NULL
        `;
        const rows = await executeQuery(query);

        // Parse biometric_data JSON
        const biometricStudents = rows.map(row => ({
          ...row,
          biometric_data: row.biometric_data ? JSON.parse(row.biometric_data) : null
        }));

        res.json(biometricStudents || []);
      } catch (columnError) {
        // If biometric columns don't exist, return empty array
        console.warn('Biometric columns not found, returning empty array:', columnError.message);
        res.json([]);
      }
    }
  } catch (error) {
    console.error('Error fetching biometric data:', error);
    res.status(500).json({ error: 'Failed to fetch biometric data' });
  }
});

// Get biometric verification logs
app.get('/api/biometric-verification', async (req, res) => {
  try {
    const { student_id, book_copy_id, verification_type, limit = 50 } = req.query;

    if (useMockData) {
      // Mock biometric verification logs
      const mockLogs = [
        {
          id: 'mock-log-1',
          student_id: student_id || 'mock-student-1',
          book_copy_id: book_copy_id || null,
          verification_type: verification_type || 'book_issue',
          verification_method: 'fingerprint',
          verification_status: 'success',
          verified_by: 'system',
          verification_timestamp: new Date().toISOString(),
          borrow_record_id: null,
          additional_data: { mock: true },
          created_at: new Date().toISOString()
        }
      ];
      res.json(mockLogs);
    } else {
      let query = `
        SELECT
          bvl.*,
          s.name as student_name,
          s.admission_number as student_admission,
          s.class as student_class,
          s.email as student_email,
          bk.title as book_title,
          bk.author as book_author,
          bc.isbn as book_isbn,
          bc.id as book_copy_id
        FROM biometric_verification_logs bvl
        LEFT JOIN students s ON bvl.student_id = s.id
        LEFT JOIN book_copies bc ON bvl.book_copy_id = bc.id
        LEFT JOIN books bk ON bc.book_id = bk.id
        WHERE 1=1
      `;

      const params = [];

      if (student_id) {
        query += ' AND bvl.student_id = ?';
        params.push(student_id);
      }

      if (book_copy_id) {
        query += ' AND bvl.book_copy_id = ?';
        params.push(book_copy_id);
      }

      if (verification_type) {
        query += ' AND bvl.verification_type = ?';
        params.push(verification_type);
      }

      query += ' ORDER BY bvl.created_at DESC LIMIT ?';
      params.push(parseInt(limit));

      const rows = await executeQuery(query, params);

      // Parse additional_data JSON
      const logs = rows.map(row => ({
        ...row,
        additional_data: row.additional_data ? JSON.parse(row.additional_data) : null
      }));

      res.json(logs || []);
    }
  } catch (error) {
    console.error('Error fetching biometric verification logs:', error);
    res.status(500).json({ error: 'Failed to fetch biometric verification logs' });
  }
});

// Biometric verification logging route
app.post('/api/biometric-verification', async (req, res) => {
  try {
    const {
      student_id,
      book_copy_id,
      verification_type,
      verification_method,
      verification_status,
      verified_by,
      verification_timestamp,
      borrow_record_id,
      additional_data,
      fingerprint_image,
      face_image,
      device_info
    } = req.body;

    if (useMockData) {
      // Mock biometric verification logging
      console.log('✅ Biometric verification logged (mock):', {
        student_id,
        book_copy_id,
        verification_type,
        verification_status,
        verification_timestamp
      });
      res.json({
        success: true,
        message: 'Biometric verification logged successfully (mock)',
        log_id: 'mock-' + Date.now()
      });
    } else {
      const query = `
        INSERT INTO biometric_verification_logs (
          id, student_id, book_copy_id, verification_type, verification_method,
          verification_status, verified_by, verification_timestamp,
          borrow_record_id, additional_data, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
      `;

      const logId = crypto.randomUUID();
      const values = [
        logId,
        student_id,
        book_copy_id || null,
        verification_type,
        verification_method,
        verification_status,
        verified_by || null,
        verification_timestamp,
        borrow_record_id || null,
        additional_data ? JSON.stringify(additional_data) : null
      ];

      await pool.execute(query, values);

      // Store verification images if provided
      if (fingerprint_image || face_image) {
        const imagePromises = [];

        if (fingerprint_image) {
          imagePromises.push(
            pool.execute(`
              INSERT INTO biometric_verification_images (
                id, verification_log_id, student_id, image_type,
                image_data, image_format, device_info
              ) VALUES (?, ?, ?, 'fingerprint', ?, 'png', ?)
            `, [
              crypto.randomUUID(),
              logId,
              student_id,
              Buffer.from(fingerprint_image.replace(/^data:image\/[a-z]+;base64,/, ''), 'base64'),
              device_info ? JSON.stringify(device_info) : null
            ])
          );
        }

        if (face_image) {
          imagePromises.push(
            pool.execute(`
              INSERT INTO biometric_verification_images (
                id, verification_log_id, student_id, image_type,
                image_data, image_format, device_info
              ) VALUES (?, ?, ?, 'face', ?, 'png', ?)
            `, [
              crypto.randomUUID(),
              logId,
              student_id,
              Buffer.from(face_image.replace(/^data:image\/[a-z]+;base64,/, ''), 'base64'),
              device_info ? JSON.stringify(device_info) : null
            ])
          );
        }

        // Execute image storage operations
        try {
          await Promise.all(imagePromises);
          console.log(`✅ Stored ${imagePromises.length} biometric verification images for log ${logId}`);
        } catch (imageError) {
          console.warn('⚠️ Failed to store biometric verification images:', imageError);
          // Don't fail the logging if image storage fails
        }
      }

      res.json({
        success: true,
        message: 'Biometric verification logged successfully',
        log_id: logId,
        images_stored: !!(fingerprint_image || face_image)
      });
    }
  } catch (error) {
    console.error('Error logging biometric verification:', error);
    res.status(500).json({ error: 'Failed to log biometric verification' });
  }
});

// Biometric enrollment route
app.put('/api/students/:studentId/biometric', async (req, res) => {
  try {
    const { studentId } = req.params;
    const {
      biometric_enrolled,
      biometric_id,
      biometric_data,
      fingerprint_image,
      face_image,
      image_format = 'png',
      image_quality = 90
    } = req.body;

    if (useMockData) {
      // Mock biometric update
      const students = await mockDataProvider.fetchStudents();
      const student = students.find(s => s.id === studentId);

      if (!student) {
        return res.status(404).json({ error: 'Student not found' });
      }

      // Update the student with biometric data
      student.biometric_enrolled = biometric_enrolled;
      student.biometric_id = biometric_id;
      student.biometric_data = biometric_data;
      student.updated_at = new Date().toISOString();

      // Log biometric verification (mock)
      await mockDataProvider.logBiometricVerification();

      res.json({
        success: true,
        message: 'Biometric data updated successfully (mock)'
      });
    } else {
      try {
        const query = `
          UPDATE students
          SET
            biometric_enrolled = ?,
            biometric_id = ?,
            biometric_data = ?,
            biometric_fingerprint_image = ?,
            biometric_face_image = ?,
            biometric_image_format = ?,
            biometric_image_quality = ?,
            biometric_last_capture = NOW(),
            updated_at = NOW()
          WHERE id = ?
        `;

        // Convert base64 images to Buffer if provided
        let fingerprintBuffer = null;
        let faceBuffer = null;

        if (fingerprint_image) {
          // Remove data URL prefix if present (e.g., "data:image/png;base64,")
          const base64Data = fingerprint_image.replace(/^data:image\/[a-z]+;base64,/, '');
          fingerprintBuffer = Buffer.from(base64Data, 'base64');
        }

        if (face_image) {
          const base64Data = face_image.replace(/^data:image\/[a-z]+;base64,/, '');
          faceBuffer = Buffer.from(base64Data, 'base64');
        }

        const values = [
          biometric_enrolled,
          biometric_id || null,
          biometric_data ? JSON.stringify(biometric_data) : null,
          fingerprintBuffer,
          faceBuffer,
          image_format,
          image_quality,
          studentId
        ];

        const [result] = await pool.execute(query, values);

        if (result.affectedRows === 0) {
          return res.status(404).json({ error: 'Student not found' });
        }

        res.json({
          success: true,
          message: 'Biometric data and images updated successfully',
          images_stored: {
            fingerprint: !!fingerprintBuffer,
            face: !!faceBuffer
          }
        });
      } catch (columnError) {
        // If biometric columns don't exist, return appropriate error
        console.warn('Biometric columns not found:', columnError.message);
        res.status(501).json({
          error: 'Biometric functionality not available - database schema needs to be updated'
        });
      }
    }
  } catch (error) {
    console.error('Error updating biometric data:', error);
    res.status(500).json({ error: 'Failed to update biometric data' });
  }
});

// Get biometric images for a student
app.get('/api/students/:studentId/biometric-images', async (req, res) => {
  try {
    const { studentId } = req.params;

    if (useMockData) {
      res.json({
        fingerprint_image: null,
        face_image: null,
        image_format: 'png',
        last_capture: null
      });
    } else {
      const query = `
        SELECT
          biometric_fingerprint_image,
          biometric_face_image,
          biometric_image_format,
          biometric_last_capture
        FROM students
        WHERE id = ?
      `;

      const [rows] = await pool.execute(query, [studentId]);

      if (rows.length === 0) {
        return res.status(404).json({ error: 'Student not found' });
      }

      const student = rows[0];

      // Convert BLOB data to base64 for JSON response
      const response = {
        fingerprint_image: student.biometric_fingerprint_image
          ? `data:image/${student.biometric_image_format || 'png'};base64,${student.biometric_fingerprint_image.toString('base64')}`
          : null,
        face_image: student.biometric_face_image
          ? `data:image/${student.biometric_image_format || 'png'};base64,${student.biometric_face_image.toString('base64')}`
          : null,
        image_format: student.biometric_image_format || 'png',
        last_capture: student.biometric_last_capture
      };

      res.json(response);
    }
  } catch (error) {
    console.error('Error fetching biometric images:', error);
    res.status(500).json({ error: 'Failed to fetch biometric images' });
  }
});

// Store biometric verification images
app.post('/api/biometric-verification/images', async (req, res) => {
  try {
    const {
      verification_log_id,
      student_id,
      image_type,
      image_data,
      image_format = 'png',
      image_quality = 90,
      device_info
    } = req.body;

    if (!student_id || !image_data || !image_type) {
      return res.status(400).json({
        error: 'Missing required fields: student_id, image_data, image_type'
      });
    }

    if (useMockData) {
      res.json({
        success: true,
        message: 'Biometric verification image stored successfully (mock)',
        image_id: 'mock-' + Date.now()
      });
    } else {
      // Convert base64 image to Buffer
      const base64Data = image_data.replace(/^data:image\/[a-z]+;base64,/, '');
      const imageBuffer = Buffer.from(base64Data, 'base64');

      const query = `
        INSERT INTO biometric_verification_images (
          id, verification_log_id, student_id, image_type,
          image_data, image_format, image_quality, device_info
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `;

      const imageId = crypto.randomUUID();
      const values = [
        imageId,
        verification_log_id || null,
        student_id,
        image_type,
        imageBuffer,
        image_format,
        image_quality,
        device_info ? JSON.stringify(device_info) : null
      ];

      await pool.execute(query, values);

      res.json({
        success: true,
        message: 'Biometric verification image stored successfully',
        image_id: imageId
      });
    }
  } catch (error) {
    console.error('Error storing biometric verification image:', error);
    res.status(500).json({ error: 'Failed to store biometric verification image' });
  }
});

// Get biometric verification images
app.get('/api/biometric-verification/images', async (req, res) => {
  try {
    const { student_id, verification_log_id, image_type, limit = 10 } = req.query;

    if (useMockData) {
      res.json([]);
    } else {
      let query = `
        SELECT
          id, verification_log_id, student_id, image_type,
          image_format, image_quality, capture_timestamp,
          verification_status, device_info, created_at
        FROM biometric_verification_images
        WHERE 1=1
      `;

      const params = [];

      if (student_id) {
        query += ' AND student_id = ?';
        params.push(student_id);
      }

      if (verification_log_id) {
        query += ' AND verification_log_id = ?';
        params.push(verification_log_id);
      }

      if (image_type) {
        query += ' AND image_type = ?';
        params.push(image_type);
      }

      query += ' ORDER BY capture_timestamp DESC LIMIT ?';
      params.push(parseInt(limit));

      const [rows] = await pool.execute(query, params);

      // Convert image data to base64 for response (without the actual image data for list view)
      const images = rows.map(row => ({
        ...row,
        has_image_data: !!row.image_data,
        image_size: row.image_data ? row.image_data.length : 0,
        // Remove actual image data from list response for performance
        image_data: undefined
      }));

      res.json(images);
    }
  } catch (error) {
    console.error('Error fetching biometric verification images:', error);
    res.status(500).json({ error: 'Failed to fetch biometric verification images' });
  }
});

// Get specific biometric verification image
app.get('/api/biometric-verification/images/:imageId', async (req, res) => {
  try {
    const { imageId } = req.params;

    if (useMockData) {
      res.status(404).json({ error: 'Image not found (mock)' });
    } else {
      const query = `
        SELECT
          id, verification_log_id, student_id, image_type,
          image_data, image_format, image_quality, capture_timestamp,
          verification_status, device_info, created_at
        FROM biometric_verification_images
        WHERE id = ?
      `;

      const [rows] = await pool.execute(query, [imageId]);

      if (rows.length === 0) {
        return res.status(404).json({ error: 'Biometric verification image not found' });
      }

      const image = rows[0];

      // Convert image data to base64
      const response = {
        ...image,
        image_data: image.image_data
          ? `data:image/${image.image_format || 'png'};base64,${image.image_data.toString('base64')}`
          : null
      };

      res.json(response);
    }
  } catch (error) {
    console.error('Error fetching biometric verification image:', error);
    res.status(500).json({ error: 'Failed to fetch biometric verification image' });
  }
});

// Biometric verification route
app.post('/api/biometric/verify', async (req, res) => {
  try {
    const {
      fingerprint,
      fingerprint_image,
      face_image,
      device_info,
      verification_type = 'verification'
    } = req.body;

    if (!fingerprint) {
      return res.status(400).json({ error: 'Missing fingerprint data' });
    }

    if (useMockData) {
      // Mock verification - return first enrolled student
      const students = await mockDataProvider.fetchStudents();
      const enrolledStudent = students.find(s => s.biometric_enrolled);

      if (enrolledStudent) {
        return res.json({
          success: true,
          studentId: enrolledStudent.id,
          message: 'Biometric verification successful (mock)'
        });
      } else {
        return res.status(401).json({
          success: false,
          message: 'No enrolled biometric data found'
        });
      }
    } else {
      // Fetch all enrolled students with biometric data
      const query = `
        SELECT id, name, admission_number, class, biometric_data
        FROM students
        WHERE biometric_enrolled = true AND biometric_data IS NOT NULL
      `;

      const [rows] = await pool.execute(query);

      if (rows.length === 0) {
        return res.status(401).json({
          success: false,
          message: 'No enrolled biometric data found'
        });
      }

      // Compare fingerprint against enrolled data
      // Note: This is a simplified comparison. In production, use proper biometric matching algorithms
      let matchedStudent = null;

      for (const student of rows) {
        try {
          const biometricData = JSON.parse(student.biometric_data);

          // Simple comparison - check if fingerprint data matches
          // In production, this would use DigitalPersona SDK or similar for proper matching
          if (biometricData && biometricData.fingerprint === fingerprint) {
            matchedStudent = student;
            break;
          }

          // Alternative: check biometric_id match
          if (biometricData && biometricData.biometricId && biometricData.biometricId === fingerprint) {
            matchedStudent = student;
            break;
          }
        } catch (parseError) {
          console.warn(`Failed to parse biometric data for student ${student.id}:`, parseError);
          continue;
        }
      }

      // Create verification log entry
      const logId = crypto.randomUUID();
      const verificationStatus = matchedStudent ? 'success' : 'failed';

      const logQuery = `
        INSERT INTO biometric_verification_logs (
          id, student_id, verification_type, verification_method,
          verification_status, verified_by, verification_timestamp,
          additional_data, created_at, updated_at
        ) VALUES (?, ?, ?, 'fingerprint', ?, 'system', NOW(), ?, NOW(), NOW())
      `;

      const additionalData = {
        fingerprint_length: fingerprint.length,
        device_info: device_info,
        has_fingerprint_image: !!fingerprint_image,
        has_face_image: !!face_image
      };

      await pool.execute(logQuery, [
        logId,
        matchedStudent ? matchedStudent.id : null,
        verification_type,
        verificationStatus,
        JSON.stringify(additionalData)
      ]);

      // Store verification images if provided
      if (fingerprint_image || face_image) {
        const imagePromises = [];

        if (fingerprint_image) {
          imagePromises.push(
            pool.execute(`
              INSERT INTO biometric_verification_images (
                id, verification_log_id, student_id, image_type,
                image_data, image_format, device_info
              ) VALUES (?, ?, ?, 'fingerprint', ?, 'png', ?)
            `, [
              crypto.randomUUID(),
              logId,
              matchedStudent ? matchedStudent.id : null,
              Buffer.from(fingerprint_image.replace(/^data:image\/[a-z]+;base64,/, ''), 'base64'),
              device_info ? JSON.stringify(device_info) : null
            ])
          );
        }

        if (face_image) {
          imagePromises.push(
            pool.execute(`
              INSERT INTO biometric_verification_images (
                id, verification_log_id, student_id, image_type,
                image_data, image_format, device_info
              ) VALUES (?, ?, ?, 'face', ?, 'png', ?)
            `, [
              crypto.randomUUID(),
              logId,
              matchedStudent ? matchedStudent.id : null,
              Buffer.from(face_image.replace(/^data:image\/[a-z]+;base64,/, ''), 'base64'),
              device_info ? JSON.stringify(device_info) : null
            ])
          );
        }

        // Execute image storage operations
        try {
          await Promise.all(imagePromises);
          console.log(`✅ Stored ${imagePromises.length} biometric verification images`);
        } catch (imageError) {
          console.warn('⚠️ Failed to store biometric verification images:', imageError);
          // Don't fail the verification if image storage fails
        }
      }

      if (matchedStudent) {
        return res.json({
          success: true,
          studentId: matchedStudent.id,
          message: 'Biometric verification successful',
          verification_log_id: logId,
          images_stored: !!(fingerprint_image || face_image)
        });
      } else {
        // Log failed verification attempt (without student_id since we don't know who it is)
        console.log('Biometric verification failed: fingerprint not recognized');

        return res.status(401).json({
          success: false,
          message: 'Fingerprint not recognized',
          verification_log_id: logId
        });
      }
    }
  } catch (error) {
    console.error('Error during biometric verification:', error);
    res.status(500).json({ error: 'Biometric verification failed' });
  }
});

// Borrowing routes
app.get('/api/borrowing', async (req, res) => {
  try {
    if (useMockData) {
      const borrowRecords = await mockDataProvider.fetchBorrowRecords();
      res.json(borrowRecords);
    } else {
      const query = `
        SELECT
          br.*,
          b.title as book_title,
          b.author as book_author,
          bc.isbn as book_isbn,
          bc.id as book_copy_id,
          s.name as student_name,
          s.admission_number as student_admission,
          s.class as student_class
        FROM borrow_records br
        LEFT JOIN book_copies bc ON br.book_copy_id = bc.id
        LEFT JOIN books b ON bc.book_id = b.id
        LEFT JOIN students s ON br.student_id = s.id
        ORDER BY br.borrow_date DESC
      `;
      const rows = await executeQuery(query);

      // Transform the flat result to match the expected structure
      const transformedRows = rows.map(row => ({
        ...row,
        books: {
          title: row.book_title,
          author: row.book_author,
          isbn: row.book_isbn,
          copy_id: row.book_copy_id
        },
        students: {
          name: row.student_name,
          admission_number: row.student_admission,
          class: row.student_class
        }
      }));

      res.json(transformedRows || []);
    }
  } catch (error) {
    console.error('Error fetching borrow records:', error);
    res.status(500).json({ error: 'Failed to fetch borrow records' });
  }
});

app.post('/api/borrowing', async (req, res) => {
  try {
    const { book_copy_id, student_id, due_period_value = 24, due_period_unit = 'hours' } = req.body;

    if (useMockData) {
      const newRecord = await mockDataProvider.createBorrowRecord({
        book_copy_id,
        student_id,
        due_period_value,
        due_period_unit
      });
      res.json(newRecord);
    } else {
      // Check if student has any overdue books
      const overdueQuery = `
        SELECT COUNT(*) as count FROM borrow_records
        WHERE student_id = ? AND status = 'borrowed' AND due_date < NOW()
      `;
      const [overdueResult] = await pool.execute(overdueQuery, [student_id]);
      const overdueCount = overdueResult[0]?.count || 0;

      if (overdueCount > 0) {
        return res.status(400).json({
          error: 'Student has overdue books and cannot borrow until they are returned and blacklist is cleared by admin'
        });
      }

      // Check if student is currently blacklisted
      const studentQuery = `
        SELECT blacklisted, blacklist_until FROM students WHERE id = ?
      `;
      const [studentResult] = await pool.execute(studentQuery, [student_id]);
      const student = studentResult[0];

      if (!student) {
        return res.status(404).json({ error: 'Student not found' });
      }

      if (student.blacklisted) {
        const blacklistUntil = student.blacklist_until ? new Date(student.blacklist_until) : null;
        const isCurrentlyBlacklisted = !blacklistUntil || blacklistUntil > new Date();

        if (isCurrentlyBlacklisted) {
          return res.status(400).json({
            error: 'Student is currently blacklisted and cannot borrow books until cleared by admin'
          });
        }
      }

      // Get student details
      const getStudentDetailsQuery = `
        SELECT name, admission_number, class FROM students WHERE id = ?
      `;
      const [studentDetailsResult] = await pool.execute(getStudentDetailsQuery, [student_id]);
      const studentDetails = studentDetailsResult[0];

      if (!studentDetails) {
        return res.status(404).json({ error: 'Student not found' });
      }

      // Check if book copy is available and get book details
      const bookCopyQuery = `
        SELECT bc.status, b.title, b.author, bc.isbn, b.due_period_value, b.due_period_unit
        FROM book_copies bc
        JOIN books b ON bc.book_id = b.id
        WHERE bc.id = ?
      `;
      const [bookCopyResult] = await pool.execute(bookCopyQuery, [book_copy_id]);
      const bookCopy = bookCopyResult[0];

      if (!bookCopy) {
        return res.status(404).json({ error: 'Book copy not found' });
      }

      if (bookCopy.status !== 'available') {
        return res.status(400).json({ error: 'Book copy is not available for borrowing' });
      }

      // Calculate due date
      const borrowDate = new Date();
      const dueDate = calculateDueDate(borrowDate, due_period_value || bookCopy.due_period_value || 24, due_period_unit || bookCopy.due_period_unit || 'hours');

      // Format dates for MySQL (YYYY-MM-DD HH:mm:ss)
      const formatDateForMySQL = (date) => {
        return date.toISOString().slice(0, 19).replace('T', ' ');
      };

      // Create borrow record with denormalized data
      const insertQuery = `
        INSERT INTO borrow_records (
          id, book_copy_id, student_id, borrow_date, due_date, status,
          student_name, student_admission_number, student_class,
          book_title, book_author, book_isbn,
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, 'borrowed', ?, ?, ?, ?, ?, ?, NOW(), NOW())
      `;

      const recordId = crypto.randomUUID();
      await pool.execute(insertQuery, [
        recordId,
        book_copy_id,
        student_id,
        formatDateForMySQL(borrowDate),
        formatDateForMySQL(dueDate),
        studentDetails.name,
        studentDetails.admission_number,
        studentDetails.class,
        bookCopy.title,
        bookCopy.author,
        bookCopy.isbn
      ]);

      // The trigger will automatically update the book copy status

      res.json({
        id: recordId,
        book_copy_id,
        student_id,
        borrow_date: borrowDate.toISOString(),
        due_date: dueDate.toISOString(),
        status: 'borrowed'
      });
    }
  } catch (error) {
    console.error('Error creating borrow record:', error);
    res.status(500).json({ error: 'Failed to create borrow record' });
  }
});

app.put('/api/borrowing/:recordId/return', async (req, res) => {
  try {
    const { recordId } = req.params;

    if (useMockData) {
      const returnedRecord = await mockDataProvider.returnBook(recordId);
      res.json(returnedRecord);
    } else {
      // Get the borrow record to get the book_copy_id
      const recordQuery = `
        SELECT book_copy_id FROM borrow_records WHERE id = ?
      `;
      const [recordResult] = await pool.execute(recordQuery, [recordId]);
      const borrowRecord = recordResult[0];

      if (!borrowRecord) {
        return res.status(404).json({ error: 'Borrow record not found' });
      }

      // Update the borrow record
      const updateRecordQuery = `
        UPDATE borrow_records
        SET return_date = NOW(), status = 'returned', updated_at = NOW()
        WHERE id = ?
      `;
      await pool.execute(updateRecordQuery, [recordId]);

      // The trigger will automatically update the book copy status

      res.json({
        id: recordId,
        book_copy_id: borrowRecord.book_copy_id,
        return_date: new Date().toISOString(),
        status: 'returned'
      });
    }
  } catch (error) {
    console.error('Error returning book:', error);
    res.status(500).json({ error: 'Failed to return book' });
  }
});

// Admin authentication routes - database implementation

// Admin login
app.post('/api/admin/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const clientIP = req.ip || req.connection.remoteAddress || 'unknown';

    // Validate input
    if (!username || !password) {
      return res.status(400).json({
        error: 'Username and password are required'
      });
    }

    // Get admin user from database
    const admin = await getAdminByUsername(username);

    if (!admin) {
      await updateAdminLoginAttempts(username, false, clientIP);
      return res.status(401).json({
        error: 'Invalid credentials'
      });
    }

    // Account locking feature deactivated
    // if (admin.locked_until && new Date(admin.locked_until) > new Date()) {
    //   return res.status(423).json({
    //     error: 'Account is temporarily locked due to too many failed login attempts'
    //   });
    // }

    // Verify password
    const isValidPassword = await verifyPassword(password, admin.password_hash);

    if (!isValidPassword) {
      await updateAdminLoginAttempts(username, false, clientIP);
      return res.status(401).json({
        error: 'Invalid credentials'
      });
    }

    // Update login attempts (success)
    await updateAdminLoginAttempts(username, true, clientIP);

    // Create JWT token
    const jwt = await import('jsonwebtoken');
    const token = jwt.default.sign(
      {
        adminId: admin.id,
        username: admin.username,
        role: admin.role,
        sessionToken: 'admin-session-' + Date.now()
      },
      process.env.JWT_SECRET || 'your-super-secure-jwt-secret-change-this-in-production',
      { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
    );

    return res.json({
      success: true,
      token: token,
      user: {
        id: admin.id,
        username: admin.username,
        email: admin.email,
        role: admin.role,
        lastLogin: admin.last_login || new Date().toISOString()
      },
      expiresAt: new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString()
    });

  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Admin logout
app.post('/api/admin/logout', (req, res) => {
  res.json({ success: true, message: 'Logged out successfully' });
});

// Verify admin session
app.get('/api/admin/verify', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const jwt = await import('jsonwebtoken');
    const decoded = jwt.default.verify(token, process.env.JWT_SECRET || 'your-super-secure-jwt-secret-change-this-in-production');

    // Get fresh admin data from database
    const admin = await getAdminById(decoded.adminId);

    if (!admin) {
      return res.status(401).json({ error: 'Admin account not found' });
    }

    res.json({
      success: true,
      user: {
        id: admin.id,
        username: admin.username,
        email: admin.email,
        role: admin.role,
        lastLogin: admin.last_login || new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Session verification error:', error);
    res.status(401).json({ error: 'Invalid token' });
  }
});

// Get admin profile (protected route)
app.get('/api/admin/profile', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const jwt = await import('jsonwebtoken');
    const decoded = jwt.default.verify(token, process.env.JWT_SECRET || 'your-super-secure-jwt-secret-change-this-in-production');

    // Get fresh admin data from database
    const admin = await getAdminById(decoded.adminId);

    if (!admin) {
      return res.status(401).json({ error: 'Admin account not found' });
    }

    res.json({
      success: true,
      user: {
        id: admin.id,
        username: admin.username,
        email: admin.email,
        role: admin.role,
        lastLogin: admin.last_login || new Date().toISOString(),
        passwordChangedAt: admin.password_changed_at
      }
    });

  } catch (error) {
    console.error('Get profile error:', error);
    res.status(401).json({ error: 'Invalid token' });
  }
});

// Change admin password (protected route)
app.put('/api/admin/password', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const jwt = await import('jsonwebtoken');
    const decoded = jwt.default.verify(token, process.env.JWT_SECRET || 'your-super-secure-jwt-secret-change-this-in-production');

    const { currentPassword, newPassword } = req.body;

    // Validate input
    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        error: 'Current password and new password are required'
      });
    }

    // Get admin from database
    const admin = await getAdminById(decoded.adminId);

    if (!admin) {
      return res.status(401).json({ error: 'Admin account not found' });
    }

    // Get password hash for verification
    const passwordQuery = `SELECT password_hash FROM admin_users WHERE id = ?`;
    const [passwordResult] = await pool.execute(passwordQuery, [decoded.adminId]);
    const passwordHash = passwordResult[0]?.password_hash;

    if (!passwordHash) {
      return res.status(401).json({ error: 'Admin account not found' });
    }

    // Verify current password
    const isCurrentPasswordValid = await verifyPassword(currentPassword, passwordHash);

    if (!isCurrentPasswordValid) {
      return res.status(401).json({
        error: 'Current password is incorrect'
      });
    }

    // Validate new password (get requirements from settings)
    if (newPassword.length < 8) {
      return res.status(400).json({
        error: 'New password must be at least 8 characters long'
      });
    }

    // Update password in database
    const success = await updateAdminPassword(decoded.adminId, newPassword);

    if (!success) {
      return res.status(500).json({ error: 'Failed to update password' });
    }

    res.json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    console.error('Password change error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Change admin username (protected route)
app.put('/api/admin/username', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const jwt = await import('jsonwebtoken');
    const decoded = jwt.default.verify(token, process.env.JWT_SECRET || 'your-super-secure-jwt-secret-change-this-in-production');

    const { currentPassword, newUsername } = req.body;

    // Validate input
    if (!currentPassword || !newUsername) {
      return res.status(400).json({
        error: 'Current password and new username are required'
      });
    }

    // Get admin from database
    const admin = await getAdminById(decoded.adminId);

    if (!admin) {
      return res.status(401).json({ error: 'Admin account not found' });
    }

    // Verify current password
    const isCurrentPasswordValid = await verifyPassword(currentPassword, admin.password_hash);

    if (!isCurrentPasswordValid) {
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

    // Check if username is already taken
    const existingAdmin = await getAdminByUsername(newUsername);
    if (existingAdmin && existingAdmin.id !== decoded.adminId) {
      return res.status(400).json({
        error: 'Username is already taken'
      });
    }

    // Update username in database
    const success = await updateAdminUsername(decoded.adminId, newUsername);

    if (!success) {
      return res.status(500).json({ error: 'Failed to update username' });
    }

    res.json({
      success: true,
      message: 'Username changed successfully'
    });
  } catch (error) {
    console.error('Username change error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Helper function to calculate due date
const calculateDueDate = (borrowDate, duePeriodValue = 24, duePeriodUnit = 'hours') => {
  const borrow = new Date(borrowDate);

  const timeOperations = {
    'hours': () => borrow.setHours(borrow.getHours() + duePeriodValue),
    'days': () => borrow.setDate(borrow.getDate() + duePeriodValue),
    'weeks': () => borrow.setDate(borrow.getDate() + (duePeriodValue * 7)),
    'months': () => borrow.setMonth(borrow.getMonth() + duePeriodValue),
    'years': () => borrow.setFullYear(borrow.getFullYear() + duePeriodValue)
  };

  const operation = timeOperations[duePeriodUnit];
  if (operation) {
    operation();
  } else {
    borrow.setHours(borrow.getHours() + 24); // fallback to 24 hours
  }

  return borrow;
};

// Admin authentication helper functions
const hashPassword = async (password) => {
  const saltRounds = 12;
  return await bcrypt.hash(password, saltRounds);
};

const verifyPassword = async (password, hash) => {
  return await bcrypt.compare(password, hash);
};

const getAdminByUsername = async (username) => {
  try {
    const query = `
      SELECT id, username, email, password_hash, salt, role, is_active,
             last_login, login_attempts, locked_until, password_changed_at
      FROM admin_users
      WHERE username = ? AND is_active = TRUE
    `;
    const [rows] = await pool.execute(query, [username]);
    return rows[0] || null;
  } catch (error) {
    console.error('Error fetching admin by username:', error);
    return null;
  }
};

const getAdminById = async (adminId) => {
  try {
    const query = `
      SELECT id, username, email, role, is_active, last_login, password_changed_at
      FROM admin_users
      WHERE id = ? AND is_active = TRUE
    `;
    const [rows] = await pool.execute(query, [adminId]);
    return rows[0] || null;
  } catch (error) {
    console.error('Error fetching admin by ID:', error);
    return null;
  }
};

const updateAdminLoginAttempts = async (username, success, ipAddress = null) => {
  try {
    if (success) {
      // Reset login attempts and update last login
      const query = `
        UPDATE admin_users
        SET login_attempts = 0, locked_until = NULL, last_login = NOW()
        WHERE username = ?
      `;
      await pool.execute(query, [username]);
    } else {
      // Increment login attempts (but don't lock account)
      const query = `
        UPDATE admin_users
        SET login_attempts = login_attempts + 1
        WHERE username = ?
      `;
      await pool.execute(query, [username]);

      // Account locking feature deactivated
      // const admin = await getAdminByUsername(username);
      // if (admin && admin.login_attempts >= 5) {
      //   const lockoutMinutes = 30; // Could be configurable
      //   const lockoutTime = new Date(Date.now() + lockoutMinutes * 60 * 1000);
      //   const lockQuery = `
      //     UPDATE admin_users
      //     SET locked_until = ?
      //     WHERE username = ?
      //   `;
      //   await pool.execute(lockQuery, [lockoutTime, username]);
      // }
    }

    // Note: login_attempts table not implemented yet
    // Log the attempt could be added later if needed
  } catch (error) {
    console.error('Error updating login attempts:', error);
  }
};

const updateAdminPassword = async (adminId, newPassword) => {
  try {
    const hashedPassword = await hashPassword(newPassword);
    const query = `
      UPDATE admin_users
      SET password_hash = ?, password_changed_at = NOW(), updated_at = NOW()
      WHERE id = ?
    `;
    await pool.execute(query, [hashedPassword, adminId]);
    return true;
  } catch (error) {
    console.error('Error updating admin password:', error);
    return false;
  }
};

const updateAdminUsername = async (adminId, newUsername) => {
  try {
    const query = `
      UPDATE admin_users
      SET username = ?, updated_at = NOW()
      WHERE id = ?
    `;
    await pool.execute(query, [newUsername, adminId]);
    return true;
  } catch (error) {
    console.error('Error updating admin username:', error);
    return false;
  }
};

// Start server
const startServer = async () => {
  const dbConnected = await testConnection();

  app.listen(PORT, () => {
    console.log(`🚀 API Server running on http://localhost:${PORT}`);
    if (useMockData) {
      console.log('📊 Using mock data for development (MySQL not available)');
    } else {
      console.log('🗄️ Using MySQL database');
    }
    console.log(`📚 Books API: http://localhost:${PORT}/api/books`);
    console.log(`👥 Students API: http://localhost:${PORT}/api/students`);
    console.log(`📖 Borrowing API: http://localhost:${PORT}/api/borrowing`);
    console.log(`🔐 Biometric API: http://localhost:${PORT}/api/students/:id/biometric`);
  });
};

startServer().catch(console.error);