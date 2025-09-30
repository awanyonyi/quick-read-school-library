@echo off
cd /d %~dp0
echo Starting DigitalPersona Backend Server...
echo =========================================
echo.
echo This will start the DigitalPersona WebSocket server on port 52181
echo Make sure the fingerprint reader is connected and DigitalPersona drivers are installed
echo.
echo Testing server connectivity:
echo - Health check: http://localhost:52181/health
echo - WebSocket test: http://localhost:52181/test-websocket
echo.
echo Press any key to continue...
pause >nul

cd digitalpersona-backend
if exist node_modules (
    echo Dependencies found, starting server...
    node server.js
) else (
    echo Installing dependencies...
    npm install
    echo Starting server...
    node server.js
)

echo.
echo Server started. You can now use the biometric authentication features.
echo If you encounter connection issues, the system will automatically switch to mock mode.
echo Press any key to exit...
pause >nul