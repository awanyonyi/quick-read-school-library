import { Request, Response } from 'express';
import pool, { executeQuery } from '../config/mysql';

// Get all books with copy information
export const getBooks = async (req: Request, res: Response) => {
  try {
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
  } catch (error) {
    console.error('Error fetching books:', error);
    res.status(500).json({ error: 'Failed to fetch books' });
  }
};

// Add a new book with copies
export const addBook = async (req: Request, res: Response) => {
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
        // Generate a 13-digit ISBN (simplified - in real world, use proper ISBN generation)
        const isbn = Math.floor(Math.random() * 9000000000000) + 1000000000000;
        copyInserts.push([copyId, bookId, isbn.toString(), 'available', null]);
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
};