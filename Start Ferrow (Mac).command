#!/usr/bin/env bash

# Ferrow Foresight - macOS One-Click Production Launcher
cd "$(dirname "$0")" || exit 1

echo "============================================================"
echo "  Ferrow Foresight - Industrial AI Maintenance OS"
echo "============================================================"
echo ""

# 1. Check Node.js installation
if ! command -v node &> /dev/null; then
  echo "❌ Node.js is not installed."
  echo "   Ferrow Foresight requires Node.js 22 or newer."
  echo "   Opening https://nodejs.org in your browser..."
  if command -v open &> /dev/null && [ -z "$CI" ]; then
    open "https://nodejs.org"
  fi
  exit 1
fi

# 2. Check Node.js version >= 22
NODE_VER=$(node -v | sed 's/^v//')
NODE_MAJOR=$(echo "$NODE_VER" | cut -d. -f1)

if [ "$NODE_MAJOR" -lt 22 ]; then
  echo "❌ Node.js 22 or newer is required."
  echo "   Current version detected: v$NODE_VER"
  echo "   Opening https://nodejs.org in your browser..."
  if command -v open &> /dev/null && [ -z "$CI" ]; then
    open "https://nodejs.org"
  fi
  exit 1
fi

echo "✅ Node.js v$NODE_VER detected."

# 3. First run check: npm ci & npm run build
if [ ! -d "node_modules" ]; then
  echo "📦 First run: installing dependencies (npm ci)..."
  npm ci || exit 1
fi

if [ ! -f ".next/BUILD_ID" ]; then
  echo "🔨 First run: building application for production (npm run build)..."
  npm run build || exit 1
fi

# 4. Find free port starting at 3000
PORT=$(node -e "
  const net = require('net');
  function check(port) {
    const s = net.createServer();
    s.once('error', () => check(port + 1));
    s.once('listening', () => { s.close(); console.log(port); });
    s.listen(port);
  }
  check(3000);
")

if [ -z "$PORT" ]; then
  PORT=3000
fi

echo "🚀 Starting Ferrow Foresight in production mode on port $PORT..."

# If running in non-interactive CI smoke test mode
if [ "$CI" = "true" ] || [ "$FERROW_NON_INTERACTIVE" = "true" ]; then
  npm run start -- -p "$PORT" &
  APP_PID=$!
  trap 'kill $APP_PID 2>/dev/null; exit 0' INT TERM EXIT
  for i in {1..40}; do
    STATUS=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:$PORT" 2>/dev/null || echo "000")
    if [ "$STATUS" = "200" ] || [ "$STATUS" = "307" ]; then
      echo "✅ Ferrow Foresight is ready (HTTP $STATUS) on port $PORT in CI."
      kill $APP_PID 2>/dev/null
      exit 0
    fi
    sleep 0.5
  done
  echo "❌ Server failed to start within timeout in CI."
  kill $APP_PID 2>/dev/null
  exit 1
fi

# Interactive mode
npm run start -- -p "$PORT" &
APP_PID=$!
trap 'echo ""; echo "Stopping Ferrow Foresight..."; kill $APP_PID 2>/dev/null; exit 0' INT TERM EXIT

echo "⏳ Waiting for app to become ready..."
READY=0
for i in {1..40}; do
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:$PORT" 2>/dev/null || echo "000")
  if [ "$STATUS" = "200" ] || [ "$STATUS" = "307" ]; then
    READY=1
    break
  fi
  sleep 0.5
done

if [ "$READY" -eq 1 ]; then
  echo ""
  echo "============================================================"
  echo "  ✅ Ferrow Foresight is live at: http://localhost:$PORT"
  echo "============================================================"
  echo ""
  if command -v open &> /dev/null; then
    echo "🌐 Opening your browser..."
    open "http://localhost:$PORT"
  fi
  echo ""
  echo "💡 To stop Ferrow Foresight: close this terminal window or press Ctrl+C."
  echo ""
  wait $APP_PID
else
  echo "❌ Error: Server failed to start within 20 seconds."
  kill $APP_PID 2>/dev/null
  exit 1
fi
