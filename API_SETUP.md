# API Server Setup Guide

## 🚀 Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Set Up Environment Variables
Create a `.env` file in the project root with your database configuration:
```env
# Database Configuration
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=school_library
DB_PORT=3306

# API Server Configuration
API_PORT=3001

# Frontend API URL (for Vite)
VITE_API_URL=http://localhost:3001/api
```

### 3. Set Up MySQL Database
1. Install MySQL server if not already installed
2. Create a database named `school_library`
3. Run the database schema:
   ```bash
   mysql -u root -p < database/mysql-schema-simple.sql
   ```

### 4. Start the API Server
```bash
npm run api
```

You should see:
```
🚀 API Server running on http://localhost:3001
📚 Books API: http://localhost:3001/api/books
👥 Students API: http://localhost:3001/api/students
📖 Borrowing API: http://localhost:3001/api/borrowing
🔐 Biometric API: http://localhost:3001/api/students/:id/biometric
```

### 5. Start the Frontend (in a separate terminal)
 ```bash
 npm run dev
 ```

### 6. Set Up Admin Authentication (Optional)
 ```bash
 # Set up admin authentication system
 npm run setup-admin-security

 # Test admin login
 node scripts/test-admin-login.js
 ```

 **Default Admin Credentials:**
 - Username: `Maryland_library`
 - Password: `***Sheila_library***`

 See [ADMIN_LOGIN_SETUP.md](../ADMIN_LOGIN_SETUP.md) for comprehensive admin setup instructions.

## 📋 Available Scripts

- `npm run dev` - Start the Vite development server (port 5173)
- `npm run api` - Start the API server (port 3001)
- `npm run build` - Build the frontend for production
- `npm run setup` - Run setup checks
- `npm run migrate` - Migrate data from Supabase

## 🔧 API Endpoints

### Books
- `GET /api/books` - Get all books
- `POST /api/books` - Add a new book

### Students
- `GET /api/students` - Get all students
- `POST /api/students` - Add a new student
- `PUT /api/students/:id/biometric` - Update biometric data

### Borrowing
- `GET /api/borrowing` - Get all borrow records
- `POST /api/borrowing` - Create a new borrow record
- `PUT /api/borrowing/:recordId/return` - Return a book

### Admin Authentication
- `POST /api/admin/login` - Admin login
- `GET /api/admin/verify` - Verify admin session token
- `GET /api/admin/profile` - Get admin profile information
- `PUT /api/admin/password` - Change admin password
- `PUT /api/admin/username` - Change admin username
- `POST /api/admin/logout` - Logout admin session

## 🐛 Troubleshooting

### "Failed to fetch" Error
If you see "Failed to fetch" errors:
1. Make sure the API server is running: `npm run api`
2. Check that the API server started successfully (no database connection errors)
3. Verify the API URL in your `.env` file matches the server port

### Database Connection Issues
If the API server fails to start:
1. Ensure MySQL server is running
2. Check your database credentials in `.env`
3. Verify the database exists: `CREATE DATABASE school_library;`
4. Run the schema: `mysql -u root -p school_library < database/mysql-schema-simple.sql`

### CORS Issues
If you see CORS-related errors:
1. The API server includes CORS middleware by default
2. Make sure you're accessing the frontend from `http://localhost:5173`
3. The API server runs on `http://localhost:3001`

### Admin Authentication Issues
If you encounter admin login problems:
1. Verify default credentials: `Maryland_library` / `***Sheila_library***`
2. Ensure admin setup script has been run: `npm run setup-admin-security`
3. Check API server is running on port 3001
4. Verify JWT_SECRET is set in environment variables
5. See [ADMIN_LOGIN_SETUP.md](../ADMIN_LOGIN_SETUP.md) for detailed troubleshooting

## 🔒 Security Notes

- The API server includes CORS protection
- Biometric data is stored as JSON in the database
- All API endpoints validate input data
- Database credentials should never be committed to version control
- Admin authentication uses JWT tokens with 8-hour expiration
- See [ADMIN_SECURITY_README.md](../ADMIN_SECURITY_README.md) for comprehensive security documentation

## 📊 Database Schema

The application uses the following main tables:
- `books` - Book inventory
- `students` - Student information
- `borrow_records` - Borrowing transactions
- `biometric_verification_logs` - Biometric authentication logs

See `database/mysql-schema-simple.sql` for the complete schema.

## 📚 Additional Resources

- [README.md](../README.md) - Main project documentation and setup guide
- [ADMIN_LOGIN_SETUP.md](../ADMIN_LOGIN_SETUP.md) - Complete admin setup guide
- [ADMIN_SECURITY_README.md](../ADMIN_SECURITY_README.md) - Admin security documentation