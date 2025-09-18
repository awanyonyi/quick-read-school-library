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
    const [updatedRows] = await pool.execute(selectQuery, [studentId]);
    const studentData = updatedRows as any[];

    res.json(studentData[0]);
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

// Unblacklist a student (Admin only)
export const unblacklistStudent = async (req: Request, res: Response) => {
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

    // First, get current student data to log the change
    const selectQuery = `SELECT * FROM students WHERE id = ?`;
    const [rows] = await pool.execute(selectQuery, [studentId]);
    const studentRows = rows as any[];

    if (studentRows.length === 0) {
      return res.status(404).json({ error: 'Student not found' });
    }

    const student = studentRows[0];

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
        blacklist_reason = NULL,
        unblacklist_reason = ?,
        unblacklist_date = NOW(),
        unblacklist_admin_id = ?,
        updated_at = NOW()
      WHERE id = ?
    `;

    await pool.execute(updateQuery, [reason.trim(), adminId, studentId]);

    // Log the unblacklist action
    const logQuery = `
      INSERT INTO admin_actions (
        id, admin_id, action_type, target_type, target_id,
        action_details, created_at
      ) VALUES (?, ?, 'unblacklist', 'student', ?, ?, NOW())
    `;

    const logId = randomUUID();
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
      unblacklist_admin_id: adminId,
      unblacklist_date: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error unblacklisting student:', error);
    res.status(500).json({ error: 'Failed to unblacklist student' });
  }
};