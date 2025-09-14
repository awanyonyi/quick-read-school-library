-- Migration script to implement unique ISBN per book copy
-- Run this script to migrate existing data to the new schema

-- Step 1: Create the new book_copies table
CREATE TABLE book_copies (
  id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  book_id VARCHAR(36) NOT NULL,
  isbn VARCHAR(20) UNIQUE NOT NULL,
  status VARCHAR(20) DEFAULT 'available' CHECK (status IN ('available', 'borrowed', 'lost', 'damaged')),
  condition_notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE,
  INDEX idx_book_id (book_id),
  INDEX idx_isbn (isbn),
  INDEX idx_status (status)
);

-- Step 2: Migrate existing books to create book copies
DELIMITER //

CREATE PROCEDURE migrate_books_to_copies()
BEGIN
  DECLARE done INT DEFAULT FALSE;
  DECLARE book_id_val VARCHAR(36);
  DECLARE total_copies_val INT;
  DECLARE available_copies_val INT;
  DECLARE copy_counter INT;
  DECLARE new_isbn VARCHAR(20);
  DECLARE copy_id VARCHAR(36);

  -- Cursor to iterate through all books
  DECLARE book_cursor CURSOR FOR
    SELECT id, total_copies, available_copies FROM books;

  DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = TRUE;

  OPEN book_cursor;

  book_loop: LOOP
    FETCH book_cursor INTO book_id_val, total_copies_val, available_copies_val;

    IF done THEN
      LEAVE book_loop;
    END IF;

    -- Create book copies for this book
    SET copy_counter = 1;
    WHILE copy_counter <= total_copies_val DO
      -- Generate unique ISBN (13-digit number)
      SET new_isbn = LPAD(FLOOR(RAND() * 9000000000000) + 1000000000000, 13, '0');

      -- Ensure ISBN is unique
      WHILE EXISTS (SELECT 1 FROM book_copies WHERE isbn = new_isbn) DO
        SET new_isbn = LPAD(FLOOR(RAND() * 9000000000000) + 1000000000000, 13, '0');
      END WHILE;

      -- Determine status: first 'available_copies' are available, rest are borrowed
      SET copy_id = UUID();

      IF copy_counter <= available_copies_val THEN
        INSERT INTO book_copies (id, book_id, isbn, status, created_at, updated_at)
        VALUES (copy_id, book_id_val, new_isbn, 'available', NOW(), NOW());
      ELSE
        INSERT INTO book_copies (id, book_id, isbn, status, created_at, updated_at)
        VALUES (copy_id, book_id_val, new_isbn, 'borrowed', NOW(), NOW());
      END IF;

      SET copy_counter = copy_counter + 1;
    END WHILE;

  END LOOP;

  CLOSE book_cursor;
END;
//

DELIMITER ;

-- Execute the migration
CALL migrate_books_to_copies();

-- Drop the procedure
DROP PROCEDURE migrate_books_to_copies;

-- Step 3: Update borrow_records to reference book_copy_id
-- This is a simplified approach - assign each borrow record to the first available copy of the book
-- In a real scenario, you might need more sophisticated logic

DELIMITER //

CREATE PROCEDURE update_borrow_records()
BEGIN
  DECLARE done INT DEFAULT FALSE;
  DECLARE borrow_id_val VARCHAR(36);
  DECLARE book_id_val VARCHAR(36);
  DECLARE copy_id_val VARCHAR(36);

  DECLARE borrow_cursor CURSOR FOR
    SELECT id, book_id FROM borrow_records WHERE book_copy_id IS NULL OR book_copy_id = '';

  DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = TRUE;

  OPEN borrow_cursor;

  borrow_loop: LOOP
    FETCH borrow_cursor INTO borrow_id_val, book_id_val;

    IF done THEN
      LEAVE borrow_loop;
    END IF;

    -- Find an available copy for this book (prefer available status)
    SELECT id INTO copy_id_val
    FROM book_copies
    WHERE book_id = book_id_val
    ORDER BY
      CASE WHEN status = 'available' THEN 1
           WHEN status = 'borrowed' THEN 2
           ELSE 3 END,
      created_at ASC
    LIMIT 1;

    IF copy_id_val IS NOT NULL THEN
      UPDATE borrow_records SET book_copy_id = copy_id_val WHERE id = borrow_id_val;
    END IF;

  END LOOP;

  CLOSE borrow_cursor;
END;
//

DELIMITER ;

-- Execute the update
CALL update_borrow_records();

-- Drop the procedure
DROP update_borrow_records;

-- Step 4: Update biometric_verification_logs to reference book_copy_id
UPDATE biometric_verification_logs bvl
JOIN borrow_records br ON bvl.borrow_record_id = br.id
SET bvl.book_copy_id = br.book_copy_id
WHERE bvl.book_copy_id IS NULL OR bvl.book_copy_id = '';

-- Step 5: Remove old columns from books table
ALTER TABLE books DROP COLUMN total_copies;
ALTER TABLE books DROP COLUMN available_copies;

-- Step 6: Update triggers (they should already be updated in the schema file)

-- Step 7: Clean up any remaining NULL book_copy_id references
-- This is optional and depends on your data integrity requirements
DELETE FROM borrow_records WHERE book_copy_id IS NULL OR book_copy_id = '';
DELETE FROM biometric_verification_logs WHERE book_copy_id IS NULL OR book_copy_id = '';

-- Add NOT NULL constraint to book_copy_id columns
ALTER TABLE borrow_records MODIFY COLUMN book_copy_id VARCHAR(36) NOT NULL;
ALTER TABLE biometric_verification_logs MODIFY COLUMN book_copy_id VARCHAR(36) NULL;

COMMIT;