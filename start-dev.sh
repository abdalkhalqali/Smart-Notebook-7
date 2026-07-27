#!/bin/bash
# Wrapper script to run the dev server
# First ensure we're in the right directory, use tsx directly
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR" 2>/dev/null || {
  # Fallback if CWD is broken - use absolute paths
  SCRIPT_DIR="/home/daytona/codebase"
  cd "$SCRIPT_DIR" 2>/dev/null || true
}

# Try local tsx first, then /usr/bin/tsx (global), then pre-compiled server
exec /usr/bin/tsx "$SCRIPT_DIR/server.ts"
