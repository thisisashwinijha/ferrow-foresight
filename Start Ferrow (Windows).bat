@echo off
setlocal enabledelayedexpansion

cd /d "%~dp0"

echo ============================================================
echo   Ferrow Foresight - Industrial AI Maintenance OS
echo ============================================================
echo.

:: 1. Check Node.js installation
where node >nul 2>nul
if %errorlevel% neq 0 (
  echo [ERROR] Node.js is not installed.
  echo Ferrow Foresight requires Node.js 22 or newer.
  echo Opening https://nodejs.org ...
  start https://nodejs.org
  pause
  exit /b 1
)

:: 2. Check Node.js version >= 22
for /f "tokens=*" %%v in ('node -e "const v = parseInt(process.versions.node.split('.')[0], 10); console.log(v >= 22 ? 'OK' : 'OLD ' + process.version);"') do set NODE_CHECK=%%v

if not "!NODE_CHECK!"=="OK" (
  echo [ERROR] Node.js 22 or newer is required.
  echo Current version: !NODE_CHECK!
  echo Opening https://nodejs.org ...
  start https://nodejs.org
  pause
  exit /b 1
)

echo [OK] Node.js !NODE_CHECK! detected.

:: 3. First run check: npm ci & npm run build
if not exist "node_modules\" (
  echo [SETUP] First run detected. Installing dependencies (npm ci)...
  call npm ci
  if %errorlevel% neq 0 (
    echo [ERROR] npm ci failed.
    pause
    exit /b 1
  )
)

if not exist ".next\BUILD_ID" (
  echo [SETUP] Building application for production (npm run build)...
  call npm run build
  if %errorlevel% neq 0 (
    echo [ERROR] npm run build failed.
    pause
    exit /b 1
  )
)

:: 4. Find free port starting at 3000
for /f "tokens=*" %%p in ('node -e "const net = require('net'); function check(port) { const s = net.createServer(); s.once('error', () => check(port + 1)); s.once('listening', () => { s.close(); console.log(port); }); s.listen(port); } check(3000);"') do set PORT=%%p

if "%PORT%"=="" set PORT=3000

echo Starting Ferrow Foresight in production mode on port %PORT%...

if "%CI%"=="true" (
  node -e "const cp = require('child_process'), http = require('http'); const p = cp.spawn('npm', ['run', 'start', '--', '-p', '%PORT%'], { stdio: 'inherit', shell: true }); function poll(retries) { if (retries <= 0) { console.error('Timeout in CI'); p.kill(); process.exit(1); } http.get('http://localhost:%PORT%', (res) => { if (res.statusCode === 200 || res.statusCode === 307) { console.log('Ready on port %PORT%'); p.kill(); process.exit(0); } else { setTimeout(() => poll(retries - 1), 500); } }).on('error', () => { setTimeout(() => poll(retries - 1), 500); }); } setTimeout(() => poll(40), 1000);"
  exit /b %errorlevel%
)

if "%FERROW_NON_INTERACTIVE%"=="true" (
  node -e "const cp = require('child_process'), http = require('http'); const p = cp.spawn('npm', ['run', 'start', '--', '-p', '%PORT%'], { stdio: 'inherit', shell: true }); function poll(retries) { if (retries <= 0) { console.error('Timeout in CI'); p.kill(); process.exit(1); } http.get('http://localhost:%PORT%', (res) => { if (res.statusCode === 200 || res.statusCode === 307) { console.log('Ready on port %PORT%'); p.kill(); process.exit(0); } else { setTimeout(() => poll(retries - 1), 500); } }).on('error', () => { setTimeout(() => poll(retries - 1), 500); }); } setTimeout(() => poll(40), 1000);"
  exit /b %errorlevel%
)

start "Ferrow Foresight Server" cmd /c "npm run start -- -p %PORT%"

:: 5. Wait for server readiness and open browser
echo Waiting for app to become ready...
node -e "const http = require('http'); function poll(retries) { if (retries <= 0) { console.log('Timeout waiting for server'); process.exit(1); } http.get('http://localhost:%PORT%', (res) => { if (res.statusCode === 200 || res.statusCode === 307) { process.exit(0); } else { setTimeout(() => poll(retries - 1), 500); } }).on('error', () => { setTimeout(() => poll(retries - 1), 500); }); } poll(40);"

if %errorlevel% equ 0 (
  echo.
  echo ============================================================
  echo   Ferrow Foresight is live at: http://localhost:%PORT%
  echo ============================================================
  echo.
  echo Opening browser...
  start http://localhost:%PORT%
  echo.
  echo To stop Ferrow Foresight: close the server command window.
  echo.
) else (
  echo [ERROR] Server failed to start within timeout.
  pause
)
