@echo off
setlocal EnableDelayedExpansion

cd /d "%~dp0"

echo ============================================================
echo   Ferrow Foresight - Industrial AI Maintenance OS
echo ============================================================
echo.

:: 1. Check Node.js installation
where node >nul 2>nul
if %errorlevel% neq 0 goto :node_missing

:: 2. Check Node.js version >= 22
set "NODE_MAJOR=0"
for /f %%v in ('node -e "console.log(parseInt(process.versions.node, 10))" 2^>nul') do set "NODE_MAJOR=%%v"

if %NODE_MAJOR% lss 22 goto :node_old

echo [OK] Node.js major version %NODE_MAJOR% detected.

:: 3. First run check: npm ci
if exist "node_modules\" goto :check_build
echo [SETUP] First run detected. Installing dependencies via npm ci...
call npm ci
if %errorlevel% neq 0 goto :npm_ci_failed

:check_build
:: 4. Build application if .next\BUILD_ID is missing
if exist ".next\BUILD_ID" goto :find_port
echo [SETUP] Building application for production via npm run build...
call npm run build
if %errorlevel% neq 0 goto :build_failed

:find_port
:: 5. Find free port starting at 3000
set "PORT=3000"
for /f %%p in ('node -e "const net = require('net'); function check(port) { const s = net.createServer(); s.once('error', () => check(port + 1)); s.once('listening', () => { s.close(); console.log(port); }); s.listen(port); } check(3000);" 2^>nul') do set "PORT=%%p"

if "%PORT%"=="" set "PORT=3000"

echo Starting Ferrow Foresight in production mode on port %PORT%...

if "%CI%"=="true" goto :run_non_interactive
if "%FERROW_NON_INTERACTIVE%"=="true" goto :run_non_interactive
goto :run_interactive

:run_non_interactive
node -e "const cp = require('child_process'), http = require('http'); const p = cp.spawn('npm', ['run', 'start', '--', '-p', process.env.PORT || '%PORT%'], { stdio: 'inherit', shell: true }); function poll(retries) { if (retries <= 0) { console.error('Timeout waiting for server readiness in CI'); p.kill(); process.exit(1); } http.get('http://localhost:' + (process.env.PORT || '%PORT%'), (res) => { if (res.statusCode === 200 || res.statusCode === 307) { console.log('Ready on port ' + (process.env.PORT || '%PORT%')); p.kill(); process.exit(0); } else { setTimeout(() => poll(retries - 1), 500); } }).on('error', () => { setTimeout(() => poll(retries - 1), 500); }); } setTimeout(() => poll(40), 1000);"
exit /b %errorlevel%

:run_interactive
start "Ferrow Foresight Server" cmd /c "npm run start -- -p %PORT%"

echo Waiting for app to become ready...
node -e "const http = require('http'); function poll(retries) { if (retries <= 0) { console.log('Timeout waiting for server'); process.exit(1); } http.get('http://localhost:%PORT%', (res) => { if (res.statusCode === 200 || res.statusCode === 307) { process.exit(0); } else { setTimeout(() => poll(retries - 1), 500); } }).on('error', () => { setTimeout(() => poll(retries - 1), 500); }); } poll(40);"

if %errorlevel% neq 0 goto :startup_timeout

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
exit /b 0

:node_missing
echo [ERROR] Node.js is not installed.
echo Ferrow Foresight requires Node.js 22 or newer.
echo Opening https://nodejs.org ...
if not "%FERROW_NON_INTERACTIVE%"=="true" if not "%CI%"=="true" start https://nodejs.org
if not "%FERROW_NON_INTERACTIVE%"=="true" if not "%CI%"=="true" pause
exit /b 1

:node_old
echo [ERROR] Node.js 22 or newer is required.
echo Current version detected: %NODE_MAJOR%
echo Opening https://nodejs.org ...
if not "%FERROW_NON_INTERACTIVE%"=="true" if not "%CI%"=="true" start https://nodejs.org
if not "%FERROW_NON_INTERACTIVE%"=="true" if not "%CI%"=="true" pause
exit /b 1

:npm_ci_failed
echo [ERROR] npm ci failed.
if not "%FERROW_NON_INTERACTIVE%"=="true" if not "%CI%"=="true" pause
exit /b 1

:build_failed
echo [ERROR] npm run build failed.
if not "%FERROW_NON_INTERACTIVE%"=="true" if not "%CI%"=="true" pause
exit /b 1

:startup_timeout
echo [ERROR] Server failed to start within timeout.
if not "%FERROW_NON_INTERACTIVE%"=="true" if not "%CI%"=="true" pause
exit /b 1
