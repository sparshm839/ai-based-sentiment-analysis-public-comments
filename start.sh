#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────
#  start.sh  –  run backend (FastAPI) + frontend (Vite) together
#  Usage: bash start.sh
# ─────────────────────────────────────────────────────────────

set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
BACKEND_DIR="$ROOT/backend"
FRONTEND_DIR="$ROOT/frontend/clarity-sentiment-analyzer-main"

BACKEND_PORT=8000
FRONTEND_PORT=5173

# ── colours ──────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
CYAN='\033[0;36m'; BOLD='\033[1m'; RESET='\033[0m'

info()    { echo -e "${CYAN}[INFO]${RESET}  $*"; }
success() { echo -e "${GREEN}[OK]${RESET}    $*"; }
warn()    { echo -e "${YELLOW}[WARN]${RESET}  $*"; }
error()   { echo -e "${RED}[ERROR]${RESET} $*" >&2; }

# ── cleanup on exit ──────────────────────────────────────────
BACKEND_PID=""
FRONTEND_PID=""

cleanup() {
  echo ""
  info "Shutting down servers..."
  [[ -n "$BACKEND_PID"  ]] && kill "$BACKEND_PID"  2>/dev/null && info "Backend stopped  (PID $BACKEND_PID)"
  [[ -n "$FRONTEND_PID" ]] && kill "$FRONTEND_PID" 2>/dev/null && info "Frontend stopped (PID $FRONTEND_PID)"
  exit 0
}
trap cleanup SIGINT SIGTERM EXIT

# ── helpers ───────────────────────────────────────────────────
port_in_use() {
  # returns 0 (true) if a process is LISTENING on the port (ignores TIME_WAIT etc.)
  netstat -ano 2>/dev/null | grep -E ":$1\s+.*LISTENING" -q || \
  powershell -Command "
    Get-NetTCPConnection -LocalPort $1 -State Listen -ErrorAction SilentlyContinue |
    Select-Object -First 1
  " 2>/dev/null | grep -q "Listen"
}

wait_for_port() {
  local port=$1 label=$2 retries=30
  info "Waiting for $label on port $port..."
  for i in $(seq 1 $retries); do
    if powershell -Command "
      try { \$null = New-Object System.Net.Sockets.TcpClient('127.0.0.1', $port); exit 0 }
      catch { exit 1 }
    " 2>/dev/null; then
      success "$label is up."
      return 0
    fi
    sleep 1
  done
  error "$label did not start within ${retries}s. Check the log above for errors."
  return 1
}

# ── pre-flight checks ─────────────────────────────────────────
echo -e "\n${BOLD}=== Sentiment Analysis — Local Dev Server ===${RESET}\n"

# Python
if ! command -v py &>/dev/null; then
  error "Python not found. Install Python 3.9+ and add it to PATH."
  exit 1
fi

# uvicorn
if ! py -m uvicorn --version &>/dev/null; then
  error "uvicorn not found. Run:  pip install uvicorn"
  exit 1
fi

# Node / npm
if ! command -v npm &>/dev/null; then
  error "npm not found. Install Node.js (https://nodejs.org) and add it to PATH."
  exit 1
fi

# node_modules present?
if [[ ! -d "$FRONTEND_DIR/node_modules" ]]; then
  warn "node_modules missing — running npm install first..."
  (cd "$FRONTEND_DIR" && npm install) || { error "npm install failed."; exit 1; }
fi

# Port conflicts
if port_in_use $BACKEND_PORT; then
  error "Port $BACKEND_PORT is already in use (backend needs it)."
  error "Kill the process holding it, or change BACKEND_PORT at the top of this script."
  exit 1
fi
if port_in_use $FRONTEND_PORT; then
  error "Port $FRONTEND_PORT is already in use (frontend needs it)."
  error "Kill the process holding it, or change FRONTEND_PORT at the top of this script."
  exit 1
fi

# ── start backend ─────────────────────────────────────────────
info "Starting FastAPI backend on http://localhost:$BACKEND_PORT ..."
(
  cd "$BACKEND_DIR"
  python -m uvicorn api:app --host 0.0.0.0 --port $BACKEND_PORT --reload
) >> "$ROOT/backend.log" 2>&1 &
BACKEND_PID=$!

# Give uvicorn a moment, then verify it actually started
sleep 2
if ! kill -0 "$BACKEND_PID" 2>/dev/null; then
  error "Backend process died immediately. Last 20 lines of backend.log:"
  tail -20 "$ROOT/backend.log" >&2
  exit 1
fi

wait_for_port $BACKEND_PORT "FastAPI backend" || { tail -20 "$ROOT/backend.log" >&2; exit 1; }

# ── start frontend ────────────────────────────────────────────
info "Starting Vite frontend on http://localhost:$FRONTEND_PORT ..."
(
  cd "$FRONTEND_DIR"
  npm run dev -- --port $FRONTEND_PORT
) >> "$ROOT/frontend.log" 2>&1 &
FRONTEND_PID=$!

sleep 3
if ! kill -0 "$FRONTEND_PID" 2>/dev/null; then
  error "Frontend process died immediately. Last 20 lines of frontend.log:"
  tail -20 "$ROOT/frontend.log" >&2
  exit 1
fi

wait_for_port $FRONTEND_PORT "Vite frontend" || { tail -20 "$ROOT/frontend.log" >&2; exit 1; }

# ── all up ────────────────────────────────────────────────────
echo ""
echo -e "${GREEN}${BOLD}Both servers are running!${RESET}"
echo -e "  Frontend  →  ${BOLD}http://localhost:$FRONTEND_PORT${RESET}"
echo -e "  Backend   →  ${BOLD}http://localhost:$BACKEND_PORT${RESET}"
echo -e "  API docs  →  ${BOLD}http://localhost:$BACKEND_PORT/docs${RESET}"
echo ""
echo -e "Logs:  ${CYAN}backend.log${RESET}  /  ${CYAN}frontend.log${RESET}  (project root)"
echo -e "Press ${BOLD}Ctrl+C${RESET} to stop both servers.\n"

# ── tail both logs to the terminal ───────────────────────────
tail -f "$ROOT/backend.log" "$ROOT/frontend.log" &
TAIL_PID=$!

# Wait for either server to die unexpectedly
while true; do
  if ! kill -0 "$BACKEND_PID" 2>/dev/null; then
    error "Backend crashed! Last 30 lines of backend.log:"
    tail -30 "$ROOT/backend.log" >&2
    kill "$FRONTEND_PID" 2>/dev/null
    kill "$TAIL_PID"    2>/dev/null
    exit 1
  fi
  if ! kill -0 "$FRONTEND_PID" 2>/dev/null; then
    error "Frontend crashed! Last 30 lines of frontend.log:"
    tail -30 "$ROOT/frontend.log" >&2
    kill "$BACKEND_PID" 2>/dev/null
    kill "$TAIL_PID"    2>/dev/null
    exit 1
  fi
  sleep 3
done
