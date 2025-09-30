@echo off
echo Starting Frontend Development Server...
echo ====================================
echo.
echo This will start the Vite development server on port 8080
echo Make sure the API server is running on port 3001
echo.
echo Testing server connectivity:
echo - Frontend: http://localhost:8080
echo - API: http://localhost:3001/api/books
echo.
echo Press any key to continue...
pause >nul

if exist node_modules (
    echo Dependencies found, starting server...
    npm run dev
) else (
    echo Installing dependencies...
    npm install
    echo Starting server...
    npm run dev
)

echo.
echo Server started. You can now access the application at http://localhost:8080
echo Press any key to exit...
pause >nul