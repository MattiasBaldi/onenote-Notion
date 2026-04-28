#!/bin/bash

# Run all individual service tests
# Usage: bash tests/run-all.sh

echo "=================================================="
echo "OneNote to Notion - Complete Test Suite"
echo "=================================================="

PASSED=0
FAILED=0

echo ""
echo "1. Testing OneNote Service..."
if node tests/onenote.test.js; then
  ((PASSED++))
else
  ((FAILED++))
fi

echo ""
echo "2. Testing Notion Service..."
if node tests/notion.test.js; then
  ((PASSED++))
else
  ((FAILED++))
fi

echo ""
echo "3. Testing Agent Service (Gemini)..."
if node tests/agent.test.js; then
  ((PASSED++))
else
  ((FAILED++))
fi

echo ""
echo "4. Testing API Integration..."
if node tests/api-integration.test.js; then
  ((PASSED++))
else
  ((FAILED++))
fi

echo ""
echo "=================================================="
echo "Test Summary: $PASSED passed, $FAILED failed"
echo "=================================================="

if [ $FAILED -gt 0 ]; then
  exit 1
else
  echo ""
  echo "All tests passed! System is ready to use."
  echo ""
  echo "Next steps:"
  echo "  o2n auth login           # Sign in to OneNote"
  echo "  o2n list notebooks       # List your notebooks"
  echo "  o2n sync preview         # Preview what will sync"
  echo "  o2n sync apply -y        # Run the sync"
  echo ""
  exit 0
fi
