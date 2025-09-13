# 📚 Quick Read School Library Management System

A modern, secure library management system with biometric authentication built with React, TypeScript, Vite, and MySQL.

## ✨ Features

- 📖 **Book Management** - Add, update, and track book inventory
- 👥 **Student Management** - Manage student records and profiles
- 📚 **Borrowing System** - Issue and return books with due date tracking
- 🔐 **Biometric Authentication** - Secure login using fingerprint/face recognition
- 📊 **Dashboard Analytics** - Real-time statistics and reports
- 🎨 **Modern UI** - Beautiful interface built with Tailwind CSS and shadcn/ui

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- MySQL 8.0+
- npm or yarn

### Installation & Setup

1. **Clone and Install**
   ```bash
   git clone <repository-url>
   cd quick-read-school-library
   npm install
   ```

2. **Database Setup**
   ```bash
   # Create MySQL database
   mysql -u root -p
   CREATE DATABASE school_library;
   exit;

   # Run schema
   mysql -u root -p school_library < database/mysql-schema-simple.sql
   ```

3. **Environment Configuration**
   Create `.env` file:
   ```env
   # Database
   DB_HOST=localhost
   DB_USER=root
   DB_PASSWORD=your_password
   DB_NAME=school_library
   DB_PORT=3306

   # API Server
   API_PORT=3001
   VITE_API_URL=http://localhost:3001/api
   ```

4. **Start the Application**
   ```bash
   # Terminal 1: Start API server
   npm run api

   # Terminal 2: Start frontend
   npm run dev
   ```

5. **Access the Application**
   - Frontend: http://localhost:8080
   - API Server: http://localhost:3001

## 📋 API Documentation

See [API_SETUP.md](./API_SETUP.md) for comprehensive API documentation and setup instructions.

## 🏗️ Architecture

```
├── Frontend (React + TypeScript + Vite)
│   ├── src/
│   │   ├── components/     # React components
│   │   ├── utils/         # Utilities and API client
│   │   └── types/         # TypeScript definitions
│   └── public/            # Static assets
│
├── Backend (Node.js + Express)
│   ├── api-server.js      # Main API server
│   ├── database/          # MySQL schema files
│   └── scripts/           # Setup and migration scripts
│
└── Database (MySQL)
    ├── books              # Book inventory
    ├── students           # Student records
    ├── borrow_records     # Borrowing transactions
    └── biometric_verification_logs  # Authentication logs
```

## 🔧 Available Scripts

- `npm run dev` - Start development server
- `npm run api` - Start API server
- `npm run build` - Build for production
- `npm run setup` - Run setup checks
- `npm run migrate` - Migrate from Supabase

## 🔒 Security Features

- Biometric authentication (fingerprint/face)
- Secure API endpoints with validation
- CORS protection
- Input sanitization
- SQL injection prevention

## 🐛 Troubleshooting

### Common Issues

1. **"Failed to fetch" Error**
   - Ensure API server is running: `npm run api`
   - Check API URL in `.env` file

2. **Database Connection Failed**
   - Verify MySQL server is running
   - Check database credentials
   - Ensure database exists

3. **Biometric Device Not Found**
   - Check USB connections
   - Verify device drivers
   - Test with browser console

See [API_SETUP.md](./API_SETUP.md) for detailed troubleshooting.

## 📈 Recent Updates

- ✅ **Fixed 500 Internal Server Error** - Separated server-side code from client bundle
- ✅ **Added API Server** - Dedicated backend for database operations
- ✅ **Biometric Integration** - Complete biometric enrollment and verification
- ✅ **Modern Architecture** - Clean separation between frontend and backend

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 📞 Support

For support and questions:
- Check the troubleshooting section
- Review the API documentation
- Open an issue on GitHub

---

**Built with ❤️ for educational institutions**
