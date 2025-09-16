-- Add denormalized student and book details to borrow_records table
-- This improves query performance and provides complete borrowing information

ALTER TABLE borrow_records ADD student_name VARCHAR(255);
ALTER TABLE borrow_records ADD student_admission_number VARCHAR(50);
ALTER TABLE borrow_records ADD student_class VARCHAR(100);
ALTER TABLE borrow_records ADD book_title VARCHAR(500);
ALTER TABLE borrow_records ADD book_author VARCHAR(255);
ALTER TABLE borrow_records ADD book_isbn VARCHAR(20);

-- Add indexes for the new columns
CREATE INDEX idx_borrow_student_name ON borrow_records(student_name);
CREATE INDEX idx_borrow_student_admission ON borrow_records(student_admission_number);
CREATE INDEX idx_borrow_book_title ON borrow_records(book_title);
CREATE INDEX idx_borrow_book_author ON borrow_records(book_author);
CREATE INDEX idx_borrow_book_isbn ON borrow_records(book_isbn);