# Database Migration Guide

This guide explains how to migrate data from Supabase to MySQL for the School Library Management System.

## Prerequisites

1. **MySQL Database**: Ensure MySQL is installed and running
2. **Node.js**: Version 14 or higher
3. **Environment Variables**: Create a `.env` file in the project root with:

```env
# MySQL Configuration
DB_HOST=localhost
DB_USER=your_mysql_username
DB_PASSWORD=your_mysql_password
DB_NAME=school_library

# Supabase Configuration
SUPABASE_URL=your_supabase_project_url
SUPABASE_ANON_KEY=your_supabase_anon_key
```

## Migration Steps

### 1. Set up MySQL Database

First, create the MySQL database and run the schema:

```bash
# Create database
mysql -u root -p -e "CREATE DATABASE school_library;"

# Run the schema (choose one based on your needs)
mysql -u root -p school_library < database/mysql-schema.sql
# OR for simple schema:
mysql -u root -p school_library < database/mysql-schema-simple.sql
```

### 2. Install Dependencies

```bash
npm install mysql2 @supabase/supabase-js dotenv
```

### 3. Run the Migration

```bash
cd quick-read-school-library
node database/migrate-from-supabase.js
```

## What Gets Migrated

The migration script migrates the following data:

1. **Students**: All student records with their details
2. **Books**: Book metadata (title, author, category) and creates individual book copies with unique ISBNs
3. **Borrow Records**: All borrowing history, mapped to specific book copies
4. **Biometric Logs**: Verification logs, mapped to book copies where possible
5. **System Settings**: Default library settings and configurations
6. **User Roles**: Default user roles and permissions

## Schema Changes

The new schema implements unique ISBNs per book copy:

- **books**: Contains book metadata (title, author, category)
- **book_copies**: Each physical copy with unique ISBN and status
- **borrow_records**: References `book_copy_id` instead of `book_id`
- **biometric_verification_logs**: References `book_copy_id` for tracking

## Migration Logic

### Books Migration
- Creates book metadata in `books` table
- Generates unique 13-digit ISBNs for each copy
- Sets copy status based on original `available_copies` count

### Borrow Records Migration
- Maps each borrow record to a specific book copy
- Prefers available copies, falls back to any copy if needed

### Biometric Logs Migration
- Maps logs to book copies via borrow record relationships
- Falls back to finding any copy of the referenced book

## Troubleshooting

### Common Issues

1. **Connection Errors**: Verify environment variables and database credentials
2. **Missing Tables**: Ensure Supabase tables exist and are accessible
3. **Duplicate Data**: The script uses `ON DUPLICATE KEY UPDATE` to handle existing data

### Logs
The migration script provides detailed console output:
- ✅ Success messages for each migrated record
- ❌ Error messages for failed migrations
- 📊 Progress counters

## Post-Migration

After successful migration:

1. **Verify Data**: Check that all records were migrated correctly
2. **Update Application**: Ensure your application code uses the new schema
3. **Test Functionality**: Verify borrowing, returning, and reporting work correctly
4. **Backup**: Create a backup of your migrated MySQL database

## Rollback

If you need to rollback:

```sql
-- Drop and recreate database
DROP DATABASE school_library;
CREATE DATABASE school_library;
-- Re-run schema and migration
```

## Support

For issues with migration, check:
1. Environment variables are correctly set
2. Database connections are working
3. Supabase project has the required tables and data
4. MySQL user has sufficient permissions