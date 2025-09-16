import express from 'express';
import mysql from 'mysql2/promise';
import cors from 'cors';
import dotenv from 'dotenv';
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
  acquireTimeout: 60000,
  timeout: 60000,
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
    const { title, author, category, total_copies, due_period_value = 24, due_period_unit = 'hours' } = req.body;

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

      // Generate unique ISBNs for each copy
      const copyInserts = [];
      const copyIds = [];

      for (let i = 0; i < total_copies; i++) {
        const copyId = crypto.randomUUID();
        const isbn = await generateUniqueISBN();

        copyInserts.push([copyId, bookId, isbn, 'available', null]);
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
      additional_data
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
      res.json({ success: true, message: 'Biometric verification logged successfully (mock)' });
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

      res.json({
        success: true,
        message: 'Biometric verification logged successfully',
        log_id: logId
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
    const { biometric_enrolled, biometric_id, biometric_data } = req.body;

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
            updated_at = NOW()
          WHERE id = ?
        `;

        const values = [
          biometric_enrolled,
          biometric_id || null,
          biometric_data ? JSON.stringify(biometric_data) : null,
          studentId
        ];

        const [result] = await pool.execute(query, values);

        if (result.affectedRows === 0) {
          return res.status(404).json({ error: 'Student not found' });
        }

        res.json({
          success: true,
          message: 'Biometric data updated successfully'
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

      // Check if book copy is available and get due period settings
      const bookCopyQuery = `
        SELECT bc.status, b.due_period_value, b.due_period_unit
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

      // Create borrow record
      const insertQuery = `
        INSERT INTO borrow_records (
          id, book_copy_id, student_id, borrow_date, due_date, status,
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, 'borrowed', NOW(), NOW())
      `;

      const recordId = crypto.randomUUID();
      await pool.execute(insertQuery, [
        recordId,
        book_copy_id,
        student_id,
        borrowDate.toISOString(),
        dueDate.toISOString()
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