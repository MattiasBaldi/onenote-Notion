#!/bin/bash

# Simple test runner for API layers
# Usage: bash tests/test-apis.sh

set -e

echo "=== OneNote to Notion - API Layer Tests ==="
echo ""

# Check environment
echo "1. Checking environment variables..."
check_env() {
  if [ -z "${!1}" ]; then
    echo "  ✗ $1 not set"
    return 1
  fi
  echo "  ✓ $1 is set"
  return 0
}

check_env "NOTION_TOKEN" || EXIT=1
check_env "ONENOTE_CLIENT_ID" || EXIT=1
check_env "OPENAI_API_KEY" || EXIT=1
check_env "CONTEXT7_API_KEY" || EXIT=1

if [ "$EXIT" = "1" ]; then
  echo ""
  echo "Missing environment variables. Create .env with:"
  echo "  NOTION_TOKEN=..."
  echo "  ONENOTE_CLIENT_ID=..."
  echo "  OPENAI_API_KEY=..."
  echo "  CONTEXT7_API_KEY=..."
  exit 1
fi

echo ""
echo "2. Running integration tests..."
node tests/api-integration.test.js

echo ""
echo "3. Checking CLI..."
if command -v o2n &> /dev/null; then
  echo "  ✓ o2n command available"
  o2n --help | head -3
else
  echo "  ✗ o2n command not found"
  echo "    Run: npm link"
  exit 1
fi

echo ""
echo "=== All checks passed ==="
