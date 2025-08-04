# E2E Testing Platform - Complete API Documentation

## Base URL
```
http://localhost:3000
```

## Table of Contents
1. [Health Check](#health-check)
2. [API Documentation](#api-documentation)
3. [Convert Recorded Test](#convert-recorded-test)
4. [Run Test](#run-test)
5. [Get Test Status](#get-test-status)
6. [List All Tests](#list-all-tests)
7. [View Test Report](#view-test-report)
8. [Get Report Information](#get-report-information)
9. [Download Test Report](#download-test-report)
10. [Web Interface](#web-interface)

---

## Health Check

### `GET /health`
Check if the server is running and healthy.

#### cURL Example
```bash
curl -X GET http://localhost:3000/health
```

#### Response
```json
{
  "status": "healthy",
  "timestamp": "2025-08-04T11:02:49.030Z",
  "uptime": 99.051377438,
  "memory": {
    "rss": 78639104,
    "heapTotal": 14618624,
    "heapUsed": 12201144,
    "external": 3788092,
    "arrayBuffers": 1715419
  },
  "platform": "linux",
  "nodeVersion": "v20.18.0"
}
```

---

## API Documentation

### `GET /api/docs`
Get complete API documentation with all endpoints and examples.

#### cURL Example
```bash
curl -X GET http://localhost:3000/api/docs
```

#### Response
```json
{
  "title": "E2E Testing Platform API Documentation",
  "version": "1.0.0",
  "endpoints": {
    "POST /api/test/run": "Execute a Playwright test",
    "POST /api/test/convert": "Convert recorded test to API format",
    "GET /api/test/status/:testId": "Get test execution status",
    "GET /api/download/:filename": "Download test report"
  }
}
```

---

## Convert Recorded Test

### `POST /api/test/convert`
Convert recorded Playwright test code to API-compatible format.

#### Request Body
```json
{
  "recordedTestCode": "string (required) - Raw recorded test code",
  "projectId": "string (optional) - Project identifier",
  "testName": "string (optional) - Test name",
  "browserType": "string (optional) - chromium, firefox, webkit",
  "headless": "boolean (optional) - Run headless",
  "viewport": "object (optional) - Browser viewport",
  "autoExecute": "boolean (optional) - Auto-run after conversion"
}
```

#### cURL Example 1: Convert Only
```bash
curl -X POST http://localhost:3000/api/test/convert \
  -H "Content-Type: application/json" \
  -d '{
    "recordedTestCode": "import { test, expect } from '\''@playwright/test'\'';\n\ntest('\''test'\'', async ({ page }) => {\n  await page.goto('\''https://example.com'\'');\n  await page.click('\''button'\'');\n});",
    "projectId": "my-project",
    "testName": "Example Test"
  }'
```

#### cURL Example 2: Convert and Auto-Execute
```bash
curl -X POST http://localhost:3000/api/test/convert \
  -H "Content-Type: application/json" \
  -d '{
    "recordedTestCode": "import { test, expect } from '\''@playwright/test'\'';\n\ntest('\''test'\'', async ({ page }) => {\n  await page.goto('\''https://todolistme.net/'\'');\n  await page.getByRole('\''textbox'\'', { name: '\''Type and hit Enter to add'\'' }).fill('\''Hello'\'');\n  await page.getByRole('\''textbox'\'', { name: '\''Type and hit Enter to add'\'' }).press('\''Enter'\'');\n});",
    "projectId": "todo-project",
    "testName": "Todo Test",
    "autoExecute": true
  }'
```

#### JavaScript/Node.js Example
```javascript
const response = await fetch('http://localhost:3000/api/test/convert', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    recordedTestCode: `
      import { test, expect } from '@playwright/test';
      
      test('test', async ({ page }) => {
        await page.goto('https://example.com');
        await page.click('button');
      });
    `,
    projectId: 'my-project',
    testName: 'Example Test',
    autoExecute: false
  })
});

const result = await response.json();
console.log(result);
```

#### Response
```json
{
  "success": true,
  "convertedTest": {
    "projectId": "my-project",
    "testName": "Example Test",
    "testCode": "await page.goto('https://example.com');\nawait page.click('button');",
    "browserType": "chromium",
    "headless": true,
    "viewport": {"width": 1280, "height": 720}
  },
  "validation": {
    "isValid": true,
    "issues": [],
    "hasNavigation": true,
    "hasInteractions": true,
    "lineCount": 2
  },
  "message": "Test converted successfully"
}
```

---

## Run Test

### `POST /api/test/run`
Execute a Playwright test with the provided test code.

#### Request Body
```json
{
  "projectId": "string (required) - Project identifier",
  "testName": "string (required) - Test name",
  "testCode": "string (required) - Playwright test code",
  "browserType": "string (optional) - chromium, firefox, webkit",
  "headless": "boolean (optional) - Run headless",
  "viewport": "object (optional) - Browser viewport",
  "callbackUrl": "string (optional) - Callback URL for results"
}
```

#### cURL Example 1: Simple Test
```bash
curl -X POST http://localhost:3000/api/test/run \
  -H "Content-Type: application/json" \
  -d '{
    "projectId": "simple-project",
    "testName": "Simple Test",
    "testCode": "await page.goto('\''https://example.com'\'');\nawait page.click('\''button'\'');",
    "browserType": "chromium",
    "headless": true,
    "viewport": {"width": 1280, "height": 720}
  }'
```

#### cURL Example 2: Complex Todo Test
```bash
curl -X POST http://localhost:3000/api/test/run \
  -H "Content-Type: application/json" \
  -d '{
    "projectId": "todo-project",
    "testName": "Todo List Test",
    "testCode": "await page.goto('\''https://todolistme.net/'\'');\nawait page.getByRole('\''textbox'\'', { name: '\''Type and hit Enter to add'\'' }).click();\nawait page.getByRole('\''textbox'\'', { name: '\''Type and hit Enter to add'\'' }).fill('\''Hello'\'');\nawait page.getByRole('\''textbox'\'', { name: '\''Type and hit Enter to add'\'' }).press('\''Enter'\'');\nawait page.getByRole('\''textbox'\'', { name: '\''Type and hit Enter to add'\'' }).fill('\''Done'\'');\nawait page.getByRole('\''textbox'\'', { name: '\''Type and hit Enter to add'\'' }).press('\''Enter'\'');\nawait page.locator('\''#todo_2'\'').getByRole('\''checkbox'\'').check();",
    "browserType": "chromium",
    "headless": true,
    "viewport": {"width": 1280, "height": 720}
  }'
```

#### JavaScript/Node.js Example
```javascript
const response = await fetch('http://localhost:3000/api/test/run', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    projectId: 'my-project',
    testName: 'My Test',
    testCode: `
      await page.goto('https://example.com');
      await page.getByRole('button', { name: 'Click me' }).click();
      await expect(page.getByText('Success')).toBeVisible();
    `,
    browserType: 'chromium',
    headless: true,
    viewport: { width: 1280, height: 720 }
  })
});

const result = await response.json();
console.log('Test started:', result.testId);
```

#### Response
```json
{
  "testId": "8072d7cc-c374-46dd-94b8-2901dacc5b9a",
  "projectId": "my-project",
  "testName": "My Test",
  "status": "started",
  "timestamp": "2025-08-04T11-02-03-021Z",
  "message": "Test execution started",
  "statusUrl": "/api/test/status/8072d7cc-c374-46dd-94b8-2901dacc5b9a",
  "reportUrls": {
    "info": "http://localhost:3000/api/report/8072d7cc-c374-46dd-94b8-2901dacc5b9a",
    "view": "http://localhost:3000/api/report/8072d7cc-c374-46dd-94b8-2901dacc5b9a/view",
    "direct": "http://localhost:3000/api/report/8072d7cc-c374-46dd-94b8-2901dacc5b9a/html"
  },
  "estimatedCompletion": "30-60 seconds"
}
```

---

## Get Test Status

### `GET /api/test/status/:testId`
Get the current status and results of a running or completed test.

#### cURL Example
```bash
curl -X GET http://localhost:3000/api/test/status/8072d7cc-c374-46dd-94b8-2901dacc5b9a
```

#### JavaScript/Node.js Example
```javascript
const testId = '8072d7cc-c374-46dd-94b8-2901dacc5b9a';
const response = await fetch(`http://localhost:3000/api/test/status/${testId}`);
const status = await response.json();
console.log('Test status:', status);
```

#### Response (Running)
```json
{
  "testId": "8072d7cc-c374-46dd-94b8-2901dacc5b9a",
  "projectId": "my-project",
  "testName": "My Test",
  "status": "running",
  "passed": 0,
  "failed": 0,
  "errors": [],
  "duration": 0,
  "startTime": "2025-08-04T11:02:03.021Z",
  "reportUrls": {
    "info": "http://localhost:3000/api/report/8072d7cc-c374-46dd-94b8-2901dacc5b9a",
    "view": "http://localhost:3000/api/report/8072d7cc-c374-46dd-94b8-2901dacc5b9a/view",
    "direct": "http://localhost:3000/api/report/8072d7cc-c374-46dd-94b8-2901dacc5b9a/html"
  }
}
```

#### Response (Completed)
```json
{
  "testId": "8072d7cc-c374-46dd-94b8-2901dacc5b9a",
  "projectId": "my-project",
  "testName": "My Test",
  "status": "passed",
  "passed": 1,
  "failed": 0,
  "errors": [],
  "duration": 5300,
  "startTime": "2025-08-04T11:02:03.021Z",
  "endTime": "2025-08-04T11:02:08.321Z",
  "downloadUrl": "/api/download/my-project_8072d7cc-c374-46dd-94b8-2901dacc5b9a_2025-08-04T11-02-03-021Z.zip",
  "reportUrls": {
    "info": "http://localhost:3000/api/report/8072d7cc-c374-46dd-94b8-2901dacc5b9a",
    "view": "http://localhost:3000/api/report/8072d7cc-c374-46dd-94b8-2901dacc5b9a/view",
    "direct": "http://localhost:3000/api/report/8072d7cc-c374-46dd-94b8-2901dacc5b9a/html"
  }
}
```

---

## List All Tests

### `GET /api/test/list`
Get a list of all test executions.

#### cURL Example
```bash
curl -X GET http://localhost:3000/api/test/list
```

#### JavaScript/Node.js Example
```javascript
const response = await fetch('http://localhost:3000/api/test/list');
const tests = await response.json();
console.log('All tests:', tests);
```

#### Response
```json
{
  "tests": [
    {
      "testId": "8072d7cc-c374-46dd-94b8-2901dacc5b9a",
      "projectId": "my-project",
      "testName": "My Test",
      "status": "passed",
      "duration": 5300,
      "startTime": "2025-08-04T11:02:03.021Z",
      "endTime": "2025-08-04T11:02:08.321Z"
    },
    {
      "testId": "7f8e9d6c-b273-45cc-83a7-1890cbaa4b8a",
      "projectId": "todo-project",
      "testName": "Todo Test",
      "status": "failed",
      "duration": 3200,
      "startTime": "2025-08-04T10:58:15.123Z",
      "endTime": "2025-08-04T10:58:18.323Z"
    }
  ],
  "total": 2
}
```

---

## View Test Report

### `GET /api/report/:testId/view`
View an interactive test report in a web browser with embedded Playwright HTML report.

#### URL Parameters
- `testId` (string, required) - The UUID of the test execution

#### Browser Access
```
http://localhost:3000/api/report/8072d7cc-c374-46dd-94b8-2901dacc5b9a/view
```

#### Features
- **Interactive Report Viewer**: Embedded Playwright HTML report with full interactivity
- **Test Details**: Complete test information including status, duration, and results
- **Navigation**: Easy access to different report formats and download options
- **Auto-refresh**: Automatically refreshes for running tests until completion
- **Responsive Design**: Works on desktop and mobile devices

#### Response (HTML Page)
Returns a complete HTML page with:
- Test execution summary and statistics
- Interactive Playwright HTML report embedded in iframe
- Action buttons for different report formats
- Navigation back to dashboard

---

## Get Report Information

### `GET /api/report/:testId`
Get comprehensive information about a test report including all available URLs and test details.

#### URL Parameters
- `testId` (string, required) - The UUID of the test execution

#### cURL Example
```bash
curl -X GET http://localhost:3000/api/report/8072d7cc-c374-46dd-94b8-2901dacc5b9a
```

#### JavaScript/Node.js Example
```javascript
const testId = '8072d7cc-c374-46dd-94b8-2901dacc5b9a';
const response = await fetch(`http://localhost:3000/api/report/${testId}`);
const reportInfo = await response.json();
console.log('Report information:', reportInfo);
```

#### Response (Completed Test)
```json
{
  "testId": "8072d7cc-c374-46dd-94b8-2901dacc5b9a",
  "projectId": "my-project",
  "testName": "My Test",
  "status": "passed",
  "reportUrls": {
    "view": "http://localhost:3000/api/report/8072d7cc-c374-46dd-94b8-2901dacc5b9a/view",
    "direct": "http://localhost:3000/api/report/8072d7cc-c374-46dd-94b8-2901dacc5b9a/html",
    "download": "http://localhost:3000/api/download/my-project_8072d7cc-c374-46dd-94b8-2901dacc5b9a_2025-08-04T11-02-03-021Z.zip"
  },
  "testDetails": {
    "duration": 5300,
    "passed": 1,
    "failed": 0,
    "startTime": "2025-08-04T11:02:03.021Z",
    "endTime": "2025-08-04T11:02:08.321Z"
  }
}
```

#### Response (Running Test)
```json
{
  "error": "Test still running",
  "testId": "8072d7cc-c374-46dd-94b8-2901dacc5b9a",
  "status": "running",
  "message": "Test report is not yet available. Please wait for test completion.",
  "statusUrl": "/api/test/status/8072d7cc-c374-46dd-94b8-2901dacc5b9a"
}
```

### `GET /api/report/:testId/html`
Serve the raw Playwright HTML report directly.

#### URL Parameters
- `testId` (string, required) - The UUID of the test execution

#### Browser Access
```
http://localhost:3000/api/report/8072d7cc-c374-46dd-94b8-2901dacc5b9a/html
```

#### Response
Returns the raw Playwright HTML report file with full interactivity, including:
- Test execution timeline
- Screenshots and videos
- Trace viewer integration
- Error details and stack traces
- Performance metrics

---

## Download Test Report

### `GET /api/download/:filename`
Download the test report zip file containing HTML reports, screenshots, videos, and traces.

#### cURL Example
```bash
curl -X GET http://localhost:3000/api/download/my-project_8072d7cc-c374-46dd-94b8-2901dacc5b9a_2025-08-04T11-02-03-021Z.zip \
  -o test-report.zip
```

#### JavaScript/Node.js Example
```javascript
const filename = 'my-project_8072d7cc-c374-46dd-94b8-2901dacc5b9a_2025-08-04T11-02-03-021Z.zip';
const response = await fetch(`http://localhost:3000/api/download/${filename}`);

if (response.ok) {
  const blob = await response.blob();
  // Handle the zip file blob
  console.log('Downloaded report:', blob.size, 'bytes');
} else {
  console.error('Download failed:', response.status);
}
```

#### Response
Binary zip file containing:
- `playwright-report/` - Interactive HTML report
- `test-results/` - Screenshots, videos, traces
- `tests/` - Test specification files
- `result.json` - Structured test results
- `test-results.json` - Playwright native results
- `test-results.xml` - JUnit XML results
- `manifest.json` - File manifest
- `README.md` - Instructions

---

## Web Interface

### `GET /convert`
Access the web-based test converter interface.

#### Browser Access
```
http://localhost:3000/convert
```

#### Features
- Paste recorded Playwright test code
- Configure test options (project ID, test name, browser)
- Real-time validation
- Auto-execution option
- Generated cURL commands
- Copy-paste ready API requests

### `GET /reports`
Access the comprehensive test reports dashboard.

#### Browser Access
```
http://localhost:3000/reports
```

#### Features
- **Test History**: View all test executions with status and timing
- **Interactive Reports**: Direct links to view detailed HTML reports
- **Search & Filter**: Find tests by name, project, or test ID
- **Real-time Updates**: Auto-refresh every 30 seconds
- **Statistics**: Overview of passed, failed, and running tests
- **Quick Actions**: View, download, or check status of any test
- **Responsive Design**: Works on all devices

---

## Error Responses

### Common Error Formats

#### 400 Bad Request
```json
{
  "error": "Missing required fields",
  "required": ["projectId", "testName", "testCode"],
  "received": {
    "projectId": true,
    "testName": false,
    "testCode": true
  }
}
```

#### 404 Not Found
```json
{
  "error": "Test not found",
  "testId": "invalid-test-id",
  "message": "No test found with the provided ID"
}
```

#### 500 Internal Server Error
```json
{
  "error": "Test execution failed",
  "testId": "8072d7cc-c374-46dd-94b8-2901dacc5b9a",
  "message": "Playwright execution error",
  "details": "Browser launch failed"
}
```

---

## Report System Examples

### Example 1: View Report After Test Completion

```bash
# Step 1: Run a test
TEST_RESPONSE=$(curl -s -X POST http://localhost:3000/api/test/run \
  -H "Content-Type: application/json" \
  -d '{
    "projectId": "example-project",
    "testName": "Login Test",
    "testCode": "await page.goto('\''https://example.com/login'\'');\nawait page.fill('\''#username'\'', '\''testuser'\'');\nawait page.fill('\''#password'\'', '\''password123'\'');\nawait page.click('\''button[type=\"submit\"]'\'');\nawait expect(page.getByText('\''Welcome'\'')).toBeVisible();"
  }')

# Extract test ID and report URLs
TEST_ID=$(echo $TEST_RESPONSE | jq -r '.testId')
VIEW_URL=$(echo $TEST_RESPONSE | jq -r '.reportUrls.view')

echo "Test started with ID: $TEST_ID"
echo "Report will be available at: $VIEW_URL"

# Step 2: Wait for test completion
while true; do
  STATUS=$(curl -s http://localhost:3000/api/test/status/$TEST_ID | jq -r '.status')
  echo "Current status: $STATUS"

  if [ "$STATUS" = "passed" ] || [ "$STATUS" = "failed" ]; then
    echo "✅ Test completed! View report at: $VIEW_URL"
    break
  fi

  sleep 3
done
```

### Example 2: Get Report Information

```javascript
async function getReportInfo(testId) {
  try {
    const response = await fetch(`http://localhost:3000/api/report/${testId}`);
    const reportInfo = await response.json();

    if (response.ok) {
      console.log('📊 Report Information:');
      console.log(`Test: ${reportInfo.testName}`);
      console.log(`Status: ${reportInfo.status}`);
      console.log(`Duration: ${reportInfo.testDetails.duration}ms`);
      console.log(`\n🔗 Available URLs:`);
      console.log(`Interactive View: ${reportInfo.reportUrls.view}`);
      console.log(`Direct HTML: ${reportInfo.reportUrls.direct}`);
      if (reportInfo.reportUrls.download) {
        console.log(`Download ZIP: ${reportInfo.reportUrls.download}`);
      }

      return reportInfo;
    } else {
      console.error('❌ Error:', reportInfo.error);
      return null;
    }
  } catch (error) {
    console.error('❌ Failed to get report info:', error.message);
    return null;
  }
}

// Usage
const testId = '8072d7cc-c374-46dd-94b8-2901dacc5b9a';
getReportInfo(testId);
```

### Example 3: Embed Report in Your Application

```html
<!DOCTYPE html>
<html>
<head>
    <title>Test Results Dashboard</title>
    <style>
        .report-container {
            width: 100%;
            height: 600px;
            border: 1px solid #ddd;
            border-radius: 5px;
        }
        .report-frame {
            width: 100%;
            height: 100%;
            border: none;
        }
    </style>
</head>
<body>
    <h1>Test Results</h1>
    <div class="report-container">
        <iframe
            src="http://localhost:3000/api/report/YOUR_TEST_ID/html"
            class="report-frame">
        </iframe>
    </div>

    <p>
        <a href="http://localhost:3000/api/report/YOUR_TEST_ID/view" target="_blank">
            View Full Report
        </a>
    </p>
</body>
</html>
```

---

## Complete Examples

### Example 1: Full Workflow with Convert API

```bash
# Step 1: Convert recorded test
CONVERT_RESPONSE=$(curl -s -X POST http://localhost:3000/api/test/convert \
  -H "Content-Type: application/json" \
  -d '{
    "recordedTestCode": "import { test, expect } from '\''@playwright/test'\'';\n\ntest('\''test'\'', async ({ page }) => {\n  await page.goto('\''https://example.com'\'');\n  await page.click('\''button'\'');\n  await expect(page.getByText('\''Success'\'')).toBeVisible();\n});",
    "projectId": "example-project",
    "testName": "Button Click Test"
  }')

echo "Conversion result: $CONVERT_RESPONSE"

# Step 2: Extract converted test and run it
TEST_DATA=$(echo $CONVERT_RESPONSE | jq -r '.convertedTest')
curl -X POST http://localhost:3000/api/test/run \
  -H "Content-Type: application/json" \
  -d "$TEST_DATA"
```

### Example 2: Convert and Auto-Execute

```bash
curl -X POST http://localhost:3000/api/test/convert \
  -H "Content-Type: application/json" \
  -d '{
    "recordedTestCode": "import { test, expect } from '\''@playwright/test'\'';\n\ntest('\''login test'\'', async ({ page }) => {\n  await page.goto('\''https://example.com/login'\'');\n  await page.fill('\''#username'\'', '\''testuser'\'');\n  await page.fill('\''#password'\'', '\''password123'\'');\n  await page.click('\''button[type=\"submit\"]'\'');\n  await expect(page.getByText('\''Welcome'\'')).toBeVisible();\n});",
    "projectId": "auth-tests",
    "testName": "User Login Test",
    "browserType": "chromium",
    "headless": true,
    "autoExecute": true
  }'
```

### Example 3: Monitor Test Progress

```bash
# Start a test
TEST_RESPONSE=$(curl -s -X POST http://localhost:3000/api/test/run \
  -H "Content-Type: application/json" \
  -d '{
    "projectId": "monitoring-test",
    "testName": "Progress Monitor Test",
    "testCode": "await page.goto('\''https://example.com'\'');\nawait page.waitForTimeout(5000);\nawait page.click('\''button'\'');",
    "browserType": "chromium",
    "headless": true,
    "viewport": {"width": 1280, "height": 720}
  }')

# Extract test ID
TEST_ID=$(echo $TEST_RESPONSE | jq -r '.testId')
echo "Test started with ID: $TEST_ID"

# Monitor progress
while true; do
  STATUS=$(curl -s http://localhost:3000/api/test/status/$TEST_ID | jq -r '.status')
  echo "Current status: $STATUS"

  if [ "$STATUS" = "passed" ] || [ "$STATUS" = "failed" ]; then
    echo "Test completed with status: $STATUS"
    break
  fi

  sleep 2
done

# Get final results
curl -s http://localhost:3000/api/test/status/$TEST_ID | jq '.'
```

---

## Python Examples

### Using requests library

```python
import requests
import json
import time

# Convert and run test
def convert_and_run_test():
    convert_url = "http://localhost:3000/api/test/convert"

    payload = {
        "recordedTestCode": """
import { test, expect } from '@playwright/test';

test('test', async ({ page }) => {
  await page.goto('https://example.com');
  await page.click('button');
  await expect(page.getByText('Success')).toBeVisible();
});
        """,
        "projectId": "python-example",
        "testName": "Python API Test",
        "autoExecute": True
    }

    response = requests.post(convert_url, json=payload)
    result = response.json()

    if result.get('success'):
        print("✅ Test converted and started successfully!")
        if 'autoExecution' in result:
            test_id = result['autoExecution']['testId']
            print(f"Test ID: {test_id}")

            # Monitor test progress
            monitor_test(test_id)
    else:
        print("❌ Test conversion failed:", result.get('error'))

def monitor_test(test_id):
    status_url = f"http://localhost:3000/api/test/status/{test_id}"

    while True:
        response = requests.get(status_url)
        status_data = response.json()

        status = status_data.get('status')
        print(f"Status: {status}")

        if status in ['passed', 'failed']:
            print(f"✅ Test completed: {status}")
            print(f"Duration: {status_data.get('duration')}ms")
            if status_data.get('downloadUrl'):
                print(f"Report: http://localhost:3000{status_data['downloadUrl']}")
            break

        time.sleep(2)

if __name__ == "__main__":
    convert_and_run_test()
```

---

## Rate Limiting

The API includes rate limiting:
- **Limit**: 50 requests per 15 minutes per IP
- **Scope**: Applied to `/api/*` endpoints only
- **Headers**: Rate limit info included in response headers

#### Rate Limit Headers
```
X-RateLimit-Limit: 50
X-RateLimit-Remaining: 49
X-RateLimit-Reset: 1691155200
```

#### Rate Limit Exceeded Response
```json
{
  "error": "Too many requests from this IP, please try again later.",
  "retryAfter": "15 minutes"
}
```

---

## Tips and Best Practices

### 1. JSON Escaping in cURL
- Use single quotes around JSON: `'{"key": "value"}'`
- Escape single quotes in values: `'\''value'\''`
- Or use double quotes and escape: `"{\"key\": \"value\"}"`

### 2. Test Code Guidelines
- Always include `await page.goto()` for navigation
- Use proper Playwright selectors
- Include assertions with `expect()`
- Keep test code focused and atomic

### 3. Error Handling
- Always check response status codes
- Handle rate limiting with exponential backoff
- Monitor test status for long-running tests
- Download reports promptly (they may be cleaned up)

### 4. Performance
- Use `headless: true` for faster execution
- Set appropriate viewport sizes
- Consider parallel execution for multiple tests
- Use the convert API to avoid manual JSON escaping
