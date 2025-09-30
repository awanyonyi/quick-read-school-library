# Student Blacklisting System

## Overview

The Student Blacklisting System automatically identifies students with overdue books and temporarily restricts their borrowing privileges for 14 days. This system helps maintain library discipline and ensures timely return of borrowed materials.

## Features

### 🔄 Automated Blacklisting
- **Daily Processing**: System automatically runs daily to check for overdue books
- **14-Day Lockout**: Students with overdue books are blacklisted for 14 days
- **Severity Tracking**: Tracks number of overdue books and days overdue
- **Automatic Recovery**: Students are automatically unblacklisted when all overdue books are returned

### 🚫 Borrowing Restrictions
- **Real-time Checking**: Borrowing attempts are blocked for blacklisted students
- **Clear Error Messages**: Students receive informative messages about their blacklist status
- **Grace Period**: 1-day grace period before marking books as overdue

### 👨‍💼 Admin Management
- **Manual Unblacklisting**: Admins can unblacklist students with valid reasons
- **Audit Logging**: All blacklist actions are logged for accountability
- **Status Monitoring**: Real-time view of blacklisted students and their status

## How It Works

### 1. Daily Automated Process
```sql
-- Runs daily via MySQL Event Scheduler
CREATE EVENT daily_auto_blacklist
ON SCHEDULE EVERY 1 DAY
DO CALL auto_blacklist_overdue_students();
```

The stored procedure:
- Updates borrow records older than 1 day to 'overdue' status
- Identifies students with overdue books
- Blacklists them for 14 days with detailed reason
- Automatically unblacklists students who returned all overdue books

### 2. Borrowing Restrictions
When a student attempts to borrow a book:
1. System checks for overdue books
2. Verifies blacklist status and expiration date
3. Blocks borrowing if currently blacklisted
4. Provides clear error message with unblacklist date

### 3. Admin Unblacklisting
Admins can manually unblacklist students:
1. Navigate to Admin Dashboard → Blacklist Management
2. Select the student to unblacklist
3. Provide a valid reason for unblacklisting
4. Action is logged for audit purposes

## Database Schema

### Students Table
```sql
CREATE TABLE students (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  admission_number VARCHAR(50) UNIQUE NOT NULL,
  blacklisted TINYINT(1) DEFAULT 0,
  blacklist_until DATETIME NULL,
  blacklist_reason TEXT,
  unblacklist_reason TEXT,
  unblacklist_date DATETIME NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

### Admin Actions Table (Audit Log)
```sql
CREATE TABLE admin_actions (
  id VARCHAR(36) PRIMARY KEY,
  admin_id VARCHAR(36) NOT NULL,
  action_type VARCHAR(50) NOT NULL,
  target_type VARCHAR(50) NOT NULL,
  target_id VARCHAR(36) NOT NULL,
  action_details JSON,
  ip_address VARCHAR(45),
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## Usage Instructions

### For Students
1. **Check Status**: Attempt to borrow a book to see if you're blacklisted
2. **Return Overdue Books**: Return all overdue books to be automatically unblacklisted
3. **Wait Period**: Blacklist automatically expires after 14 days

### For Librarians
1. **Process Overdue Books**: Click "Process Overdue Books" in Blacklist Management
2. **Monitor Status**: View blacklisted students and their status
3. **Contact Students**: Notify students about their blacklist status

### For Admins
1. **Unblacklist Students**: Use the unblacklist feature with valid reasons
2. **Review Audit Logs**: Check admin_actions table for all blacklist activities
3. **Monitor System**: Ensure daily processing is running correctly

## API Endpoints

### Process Overdue Books
```http
POST /api/process-overdue
```

### Create Borrow Record (with blacklist checking)
```http
POST /api/borrow-records
Content-Type: application/json

{
  "book_copy_id": "copy-uuid",
  "student_id": "student-uuid",
  "due_period_value": 24,
  "due_period_unit": "hours"
}
```

### Unblacklist Student (Admin only)
```http
PUT /api/students/{studentId}/unblacklist
Content-Type: application/json

{
  "reason": "Valid reason for unblacklisting"
}
```

## Configuration

### Database Settings
- **Event Scheduler**: Must be enabled (`SET GLOBAL event_scheduler = ON;`)
- **Daily Processing**: Runs at midnight daily
- **Grace Period**: 1 day before marking books as overdue

### Blacklist Duration
- **Standard Duration**: 14 days for all overdue violations
- **Auto-Unblacklist**: When all overdue books are returned
- **Manual Override**: Admins can unblacklist with valid reasons

## Monitoring and Maintenance

### Daily Checks
1. Verify event scheduler is running
2. Check for failed blacklist processing
3. Monitor number of blacklisted students
4. Review audit logs for unusual activity

### Troubleshooting
1. **Event Not Running**: Check MySQL event scheduler status
2. **Students Not Blacklisted**: Verify overdue book processing
3. **Borrowing Not Blocked**: Check blacklist status validation
4. **Audit Logs Missing**: Verify admin action logging

### Performance Considerations
- Event scheduler runs daily at low traffic times
- Blacklist checking happens on every borrow attempt
- Audit logging adds minimal overhead
- Database indexes on key fields for fast queries

## Security Features

### Access Control
- Only admins can unblacklist students
- All unblacklist actions require valid reasons
- Audit trail for all blacklist modifications

### Data Integrity
- Atomic transactions for blacklist operations
- Validation of all input data
- Consistent error handling and logging

## Testing

### Test Script
Run the comprehensive test script:
```bash
node scripts/test-blacklisting-workflow.js
```

### Manual Testing
1. Create a borrow record with past due date
2. Run "Process Overdue Books"
3. Verify student is blacklisted
4. Attempt to borrow another book (should be blocked)
5. Return the overdue book
6. Verify student is automatically unblacklisted

## Future Enhancements

### Planned Features
- Email notifications for blacklisted students
- Progressive discipline (warnings before blacklisting)
- Fine calculation and integration
- Bulk unblacklisting operations
- Advanced reporting and analytics

### Configuration Options
- Customizable blacklist duration
- Configurable grace periods
- Adjustable severity thresholds
- Integration with student information systems

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Review audit logs for error patterns
3. Verify database event scheduler status
4. Test with the provided test script
5. Contact system administrator if issues persist