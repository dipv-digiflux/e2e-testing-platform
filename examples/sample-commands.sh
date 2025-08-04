#!/bin/bash

# Sample API calls for E2E Testing Platform

BASE_URL="http://localhost:3000"

echo "🌐 Testing E2E Platform API endpoints..."

# 1. Health check
echo "1. Health Check:"
curl -s "$BASE_URL/health" | jq '.'

echo -e "\n2. API Documentation:"
curl -s "$BASE_URL/api/docs" | jq '.endpoints | keys'

# 3. Sample test execution
echo -e "\n3. Sample Test Execution:"
RESPONSE=$(curl -s -X POST "$BASE_URL/api/test/run" \
  -H "Content-Type: application/json" \
  -d '{
    "projectId": "curl-test",
    "testName": "Sample Curl Test",
    "testCode": "await page.goto('\''https://example.com'\''); await expect(page.getByRole('\''heading'\'')).toBeVisible();"
  }')

echo "$RESPONSE" | jq '.'

# Extract test ID for status check
TEST_ID=$(echo "$RESPONSE" | jq -r '.testId')

if [ "$TEST_ID" != "null" ] && [ "$TEST_ID" != "" ]; then
    echo -e "\n4. Checking Test Status:"
    sleep 5  # Wait a bit for test to start
    curl -s "$BASE_URL/api/test/status/$TEST_ID" | jq '.'
else
    echo "❌ Failed to get test ID"
fi

echo -e "\n✅ API test completed"
