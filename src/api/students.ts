import { Request, Response } from 'express';
import { randomUUID } from 'crypto';
import pool, { executeQuery } from '../config/mysql';

// Get all students
export const getStudents = async (req: Request, res: Response) => {
  try {
    const query = `
      SELECT * FROM students
      ORDER BY created_at DESC
    `;
    const rows = await executeQuery(query);
    res.json(rows || []);
  } catch (error) {
    console.error('Error fetching students:', error);
    res.status(500).json({ error: 'Failed to fetch students' });
  }
};

// Add a new student
export const addStudent = async (req: Request, res: Response) => {
  try {
    const { name, admission_number, email, class: studentClass } = req.body;

    const query = `
      INSERT INTO students (
        id, name, admission_number, email, class,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, NOW(), NOW())
    `;

    const studentId = randomUUID();
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
  } catch (error) {
    console.error('Error adding student:', error);
    res.status(500).json({ error: 'Failed to add student' });
  }
};

// Update a student
export const updateStudent = async (req: Request, res: Response) => {
  try {
    const { studentId } = req.params;
    const { name, admission_number, email, class: studentClass } = req.body;

    const query = `
      UPDATE students
      SET name = ?, admission_number = ?, email = ?, class = ?, updated_at = NOW()
      WHERE id = ?
    `;

    await pool.execute(query, [name, admission_number, email || null, studentClass || null, studentId]);

    // Fetch updated student data
    const selectQuery = `SELECT * FROM students WHERE id = ?`;
    const [rows] = await pool.execute(selectQuery, [studentId]);

    res.json(rows[0]);
  } catch (error) {
    console.error('Error updating student:', error);
    res.status(500).json({ error: 'Failed to update student' });
  }
};

// Delete a student
export const deleteStudent = async (req: Request, res: Response) => {
  try {
    const { studentId } = req.params;

    // Check if student has active borrow records
    const borrowCheckQuery = `
      SELECT COUNT(*) as count FROM borrow_records
      WHERE student_id = ? AND status = 'borrowed'
    `;
    const [borrowCheckResult] = await pool.execute(borrowCheckQuery, [studentId]);
    const activeBorrows = (borrowCheckResult as any)[0]?.count || 0;

    if (activeBorrows > 0) {
      return res.status(400).json({
        error: `Student has ${activeBorrows} active borrow record(s). Please return all books first.`
      });
    }

    const query = `DELETE FROM students WHERE id = ?`;
    await pool.execute(query, [studentId]);

    res.json({ message: 'Student deleted successfully' });
  } catch (error) {
    console.error('Error deleting student:', error);
    res.status(500).json({ error: 'Failed to delete student' });
  }
};

// Unblacklist a student
export const unblacklistStudent = async (req: Request, res: Response) => {
  try {
    const { studentId } = req.params;
    const { reason } = req.body;

    const query = `
      UPDATE students
      SET blacklisted = FALSE, blacklist_until = NULL, blacklist_reason = ?, updated_at = NOW()
      WHERE id = ?
    `;

    await pool.execute(query, [reason, studentId]);

    // Fetch updated student data
    const selectQuery = `SELECT * FROM students WHERE id = ?`;
    const [rows] = await pool.execute(selectQuery, [studentId]);

    res.json(rows[0]);
  } catch (error) {
    console.error('Error unblacklisting student:', error);
    res.status(500).json({ error: 'Failed to unblacklist student' });
  }
};