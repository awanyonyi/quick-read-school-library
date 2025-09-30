@echo off
cd /d %~dp0
echo Starting API Server...
echo ====================
echo.
echo This will start the API server on port 3001
echo Make sure MySQL is running on port 3306
echo.
echo Testing server connectivity:
echo - API: http://localhost:3001/api/books
echo - Health check: http://localhost:3001/api/health
echo.
echo Press any key to continue...
pause >nul

if exist node_modules (
    echo Dependencies found, starting server...
    node api-server.js
) else (
    echo Installing dependencies...
    npm install
    echo Starting server...
    node api-server.js
)

echo.
echo Server started. You can now use the API endpoints.
echo Press any key to exit...
pause >nul