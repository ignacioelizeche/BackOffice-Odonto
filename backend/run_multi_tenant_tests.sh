#!/bin/bash
# Multi-Tenant Testing Script
# Verifies data isolation across different enterprises

echo "=========================================="
echo "Multi-Tenant Data Isolation Testing Guide"
echo "=========================================="
echo ""

API_URL="http://localhost:8000"

echo "Prerequisites:"
echo "  ✓ Backend server running at $API_URL"
echo "  ✓ Database migrated with empresa tables"
echo "  ✓ pytest installed: pip install pytest requests"
echo ""

# Check if server is running
echo "Checking API server..."
if ! curl -s -f "$API_URL/docs" > /dev/null; then
    echo "❌ API server not running at $API_URL"
    echo "Start the backend with: python -m uvicorn app.main:app --reload"
    exit 1
fi
echo "✅ API server is running"
echo ""

# Copy test file if needed
if [ ! -f "tests/test_multi_tenant.py" ]; then
    echo "Creating test file..."
    # Test file creation handled by main tool
fi

echo "Running Multi-Tenant Tests..."
echo "=========================================="
echo ""

# Run pytest with verbose output
python -m pytest tests/test_multi_tenant.py -v -s --tb=short

echo ""
echo "=========================================="
echo "Test Execution Complete!"
echo "=========================================="
