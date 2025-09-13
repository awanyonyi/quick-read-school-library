import { Request, Response } from 'express';
import pool, { executeQuery } from '../config/mysql';

// Get all books
export const getBooks = async (req: Request, res: Response) => {
  try {
    const query = `
      SELECT * FROM books
      ORDER BY created_at DESC
    `;
    const rows = await executeQuery(query);
    res.json(rows || []);
  } catch (error) {
    console.error('Error fetching books:', error);
    res.status(500).json({ error: 'Failed to fetch books' });
  }
};

// Add a new book
export const addBook = async (req: Request, res: Response) => {
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
};