import { Request, Response } from 'express';
import pool, { executeQuery } from '../config/mysql';

// Get all borrow records
export const getBorrowRecords = async (req: Request, res: Response) => {
  try {
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
    const transformedRows = rows.map((row: any) => ({
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
  } catch (error) {
    console.error('Error fetching borrow records:', error);
    res.status(500).json({ error: 'Failed to fetch borrow records' });
  }
};

// Create a new borrow record
export const createBorrowRecord = async (req: Request, res: Response) => {
  try {
    const { book_copy_id, student_id, due_period_value = 24, due_period_unit = 'hours' } = req.body;

    // First, automatically process overdue books to update blacklist status
    try {
      await processOverdueBooks();
    } catch (error) {
      console.warn('Error processing overdue books:', error);
    }

    // Check if student has any overdue books
    const overdueQuery = `
      SELECT COUNT(*) as count FROM borrow_records
      WHERE student_id = ? AND status = 'borrowed' AND due_date < NOW()
    `;
    const [overdueResult] = await pool.execute(overdueQuery, [student_id]);
    const overdueCount = (overdueResult as any)[0]?.count || 0;

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
    const student = (studentResult as any)[0];

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
    const bookCopy = (bookCopyResult as any)[0];

    if (!bookCopy) {
      return res.status(404).json({ error: 'Book copy not found' });
    }

    if (bookCopy.status !== 'available') {
      return res.status(400).json({ error: 'Book copy is not available for borrowing' });
    }

    // Calculate due date based on custom period or book's default settings
    const borrowDate = new Date();
    const dueDateStr = calculateDueDate(
      borrowDate.toISOString(),
      due_period_value || bookCopy.due_period_value || 24,
      due_period_unit || bookCopy.due_period_unit || 'hours'
    );
    const dueDate = new Date(dueDateStr);

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
      status: 'borrowed',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error creating borrow record:', error);
    res.status(500).json({ error: 'Failed to create borrow record' });
  }
};

// Return a book
export const returnBook = async (req: Request, res: Response) => {
  try {
    const { recordId } = req.params;

    // First get the borrow record to get the book_copy_id
    const recordQuery = `
      SELECT book_copy_id FROM borrow_records WHERE id = ?
    `;
    const [recordResult] = await pool.execute(recordQuery, [recordId]);
    const borrowRecord = (recordResult as any)[0];

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
      status: 'returned',
      updated_at: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error returning book:', error);
    res.status(500).json({ error: 'Failed to return book' });
  }
};

// Helper function to calculate due date
const calculateDueDate = (
  borrowDate: string,
  duePeriodValue: number = 24,
  duePeriodUnit: string = 'hours'
): string => {
  const borrow = new Date(borrowDate);

  // ES6: Map for cleaner switch-case alternative
  const timeOperations = new Map([
    ['hours', () => borrow.setHours(borrow.getHours() + duePeriodValue)],
    ['days', () => borrow.setDate(borrow.getDate() + duePeriodValue)],
    ['weeks', () => borrow.setDate(borrow.getDate() + (duePeriodValue * 7))],
    ['months', () => borrow.setMonth(borrow.getMonth() + duePeriodValue)],
    ['years', () => borrow.setFullYear(borrow.getFullYear() + duePeriodValue)]
  ]);

  // ES6: Optional execution with fallback
  const operation = timeOperations.get(duePeriodUnit);
  if (operation) {
    operation();
  } else {
    borrow.setHours(borrow.getHours() + 24); // fallback to 24 hours
  }

  return borrow.toISOString();
};

// Function to check and auto-blacklist overdue students with enhanced logic
const processOverdueBooks = async () => {
  try {
    // First, update borrow records status to overdue (with 1-day grace period)
    const overdueQuery = `
      UPDATE borrow_records
      SET status = 'overdue', updated_at = NOW()
      WHERE status = 'borrowed'
      AND due_date < DATE_SUB(NOW(), INTERVAL 1 DAY)
    `;
    const [overdueResult] = await pool.execute(overdueQuery);
    const overdueCount = (overdueResult as any).affectedRows || 0;

    if (overdueCount > 0) {
      console.log(`📅 Marked ${overdueCount} borrow records as overdue`);
    }

    // Get students with overdue books and calculate severity
    const severityQuery = `
      SELECT
        br.student_id,
        s.name as student_name,
        s.admission_number,
        COUNT(br.id) as overdue_books_count,
        MAX(DATEDIFF(NOW(), br.due_date)) as max_days_overdue,
        AVG(DATEDIFF(NOW(), br.due_date)) as avg_days_overdue
      FROM borrow_records br
      JOIN students s ON br.student_id = s.id
      WHERE br.status = 'overdue'
      AND br.student_id NOT IN (
        SELECT id FROM students WHERE blacklisted = TRUE
      )
      GROUP BY br.student_id, s.name, s.admission_number
    `;
    const [severityResult] = await pool.execute(severityQuery);
    const overdueStudents = severityResult as any[];

    // Process each overdue student with severity-based blacklisting
    for (const student of overdueStudents) {
      let blacklistDays = 7; // Base duration
      let severity = 'low';

      // Determine severity and duration based on overdue metrics
      if (student.overdue_books_count >= 3 || student.max_days_overdue >= 14) {
        blacklistDays = 21; // High severity: 3 weeks
        severity = 'high';
      } else if (student.overdue_books_count >= 2 || student.max_days_overdue >= 7) {
        blacklistDays = 14; // Medium severity: 2 weeks
        severity = 'medium';
      }

      // Apply blacklist with severity-based duration
      const blacklistQuery = `
        UPDATE students
        SET
          blacklisted = TRUE,
          blacklist_until = DATE_ADD(CURRENT_DATE, INTERVAL ${blacklistDays} DAY),
          blacklist_reason = 'Automatic blacklist due to overdue books - ${severity} severity (${student.overdue_books_count} books, max ${student.max_days_overdue} days overdue) - ${blacklistDays} day suspension',
          updated_at = NOW()
        WHERE id = ?
      `;

      await pool.execute(blacklistQuery, [student.student_id]);

      console.log(`🚫 Blacklisted student ${student.student_name} (${student.admission_number}) for ${blacklistDays} days - ${severity} severity`);
    }

    // Auto-unblacklist students who have returned all overdue books
    const unblacklistQuery = `
      UPDATE students
      SET
        blacklisted = FALSE,
        blacklist_until = NULL,
        blacklist_reason = CONCAT('Auto-unblacklisted: All overdue books returned - Previous: ', COALESCE(blacklist_reason, 'No previous reason')),
        updated_at = NOW()
      WHERE blacklisted = TRUE
      AND id NOT IN (
        SELECT DISTINCT student_id
        FROM borrow_records
        WHERE status = 'overdue'
      )
    `;
    const [unblacklistResult] = await pool.execute(unblacklistQuery);
    const unblacklistedCount = (unblacklistResult as any).affectedRows || 0;

    if (unblacklistedCount > 0) {
      console.log(`✅ Auto-unblacklisted ${unblacklistedCount} students who returned all overdue books`);
    }

  } catch (error) {
    console.error('Error processing overdue books:', error);
    throw error;
  }
};