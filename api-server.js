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

// API Routes

// Books routes
app.get('/api/books', async (req, res) => {
  try {
    if (useMockData) {
      const books = await mockDataProvider.fetchBooks();
      res.json(books);
    } else {
      const query = `
        SELECT * FROM books
        ORDER BY created_at DESC
      `;
      const rows = await executeQuery(query);
      res.json(rows || []);
    }
  } catch (error) {
    console.error('Error fetching books:', error);
    res.status(500).json({ error: 'Failed to fetch books' });
  }
});

app.post('/api/books', async (req, res) => {
  try {
    const { title, author, isbn, category, total_copies, due_period_value = 24, due_period_unit = 'hours' } = req.body;

    const query = `
      INSERT INTO books (
        id, title, author, isbn, category,
        total_copies, available_copies,
        due_period_value, due_period_unit,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
    `;

    const bookId = crypto.randomUUID();
    const values = [
      bookId,
      title,
      author,
      isbn || null,
      category || null,
      total_copies,
      total_copies, // available_copies starts as total_copies
      due_period_value,
      due_period_unit
    ];

    await pool.execute(query, values);

    res.json({
      id: bookId,
      title,
      author,
      isbn,
      category,
      total_copies,
      available_copies: total_copies,
      due_period_value,
      due_period_unit,
      created_at: new Date(),
      updated_at: new Date()
    });
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
    }
  } catch (error) {
    console.error('Error fetching biometric data:', error);
    res.status(500).json({ error: 'Failed to fetch biometric data' });
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
          b.isbn as book_isbn,
          s.name as student_name,
          s.admission_number as student_admission,
          s.class as student_class
        FROM borrow_records br
        LEFT JOIN books b ON br.book_id = b.id
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
          isbn: row.book_isbn
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
    const { book_id, student_id, due_period_value = 24, due_period_unit = 'hours' } = req.body;

    if (useMockData) {
      const newRecord = await mockDataProvider.createBorrowRecord({
        book_id,
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

      // Check if book is available
      const bookQuery = `
        SELECT available_copies, due_period_value, due_period_unit FROM books WHERE id = ?
      `;
      const [bookResult] = await pool.execute(bookQuery, [book_id]);
      const book = bookResult[0];

      if (!book) {
        return res.status(404).json({ error: 'Book not found' });
      }

      if (book.available_copies <= 0) {
        return res.status(400).json({ error: 'Book is not available for borrowing' });
      }

      // Calculate due date
      const borrowDate = new Date();
      const dueDate = calculateDueDate(borrowDate, due_period_value || book.due_period_value || 24, due_period_unit || book.due_period_unit || 'hours');

      // Create borrow record
      const insertQuery = `
        INSERT INTO borrow_records (
          id, book_id, student_id, borrow_date, due_date, status,
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, 'borrowed', NOW(), NOW())
      `;

      const recordId = crypto.randomUUID();
      await pool.execute(insertQuery, [
        recordId,
        book_id,
        student_id,
        borrowDate.toISOString(),
        dueDate.toISOString()
      ]);

      // Update book availability
      const updateQuery = `
        UPDATE books SET available_copies = available_copies - 1 WHERE id = ?
      `;
      await pool.execute(updateQuery, [book_id]);

      res.json({
        id: recordId,
        book_id,
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
      // Get the borrow record to get the book_id
      const recordQuery = `
        SELECT book_id FROM borrow_records WHERE id = ?
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

      // Increment book availability
      const updateBookQuery = `
        UPDATE books SET available_copies = available_copies + 1 WHERE id = ?
      `;
      await pool.execute(updateBookQuery, [borrowRecord.book_id]);

      res.json({
        id: recordId,
        book_id: borrowRecord.book_id,
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