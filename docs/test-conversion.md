# Test Conversion Guide

This guide explains how to convert recorded Playwright tests to work with the E2E Testing Platform API.

## Overview

The E2E Testing Platform now includes functionality to convert recorded Playwright test code (from `npx playwright codegen`) into the API format that can be executed by the platform.

## Methods to Convert Tests

### 1. Web Interface (Easiest)

Visit `http://localhost:3000/convert` in your browser to use the interactive web interface:

1. Paste your recorded test code
2. Configure test options (project ID, test name, browser, etc.)
3. Click "Convert Test"
4. Optionally enable "Auto Execute" to run the test immediately
5. Copy the generated API request or cURL command

### 2. API Endpoint

Send a POST request to `/api/test/convert`:

```bash
curl -X POST http://localhost:3000/api/test/convert \
  -H "Content-Type: application/json" \
  -d '{
    "recordedTestCode": "import { test, expect } from '\''@playwright/test'\'';\n\ntest('\''test'\'', async ({ page }) => {\n  await page.goto('\''https://example.com'\'');\n  await page.click('\''button'\'');\n});",
    "projectId": "my-project",
    "testName": "My Test",
    "autoExecute": false
  }'
```

### 3. Node.js Utility

Use the conversion utility in your Node.js code:

```javascript
const { convertRecordedTestToAPI } = require('./src/utils/testConverter');

const recordedCode = `
import { test, expect } from '@playwright/test';

test('test', async ({ page }) => {
  await page.goto('https://example.com');
  await page.click('button');
});
`;

const apiRequest = convertRecordedTestToAPI(recordedCode, {
  projectId: 'my-project',
  testName: 'My Test',
  browserType: 'chromium',
  headless: true
});

console.log(JSON.stringify(apiRequest, null, 2));
```

### 4. Command Line Script

Run the example script:

```bash
# Convert and show the result
node examples/convert-recorded-test.js

# Convert and send to API
node examples/convert-recorded-test.js --send
```

## Input Format

The converter accepts various formats of recorded Playwright tests:

### Full Test File
```javascript
import { test, expect } from '@playwright/test';

test('test', async ({ page }) => {
  await page.goto('https://example.com');
  await page.click('button');
});
```

### Test with Describe Block
```javascript
import { test, expect } from '@playwright/test';

test.describe('My Tests', () => {
  test('test', async ({ page }) => {
    await page.goto('https://example.com');
    await page.click('button');
  });
});
```

### Just the Test Body
```javascript
await page.goto('https://example.com');
await page.click('button');
```

## Output Format

The converter produces an API-compatible request object:

```json
{
  "projectId": "my-project",
  "testName": "My Test",
  "testCode": "await page.goto('https://example.com');\nawait page.click('button');",
  "browserType": "chromium",
  "headless": true,
  "viewport": {
    "width": 1280,
    "height": 720
  }
}
```

## Validation

The converter includes validation to check:

- ✅ Test contains navigation (`page.goto()`)
- ✅ Test contains interactions (clicks, fills, etc.)
- ✅ Syntax is valid (balanced parentheses/braces)
- ⚠️ Potential issues or warnings

## Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `projectId` | string | `"recorded-test"` | Project identifier |
| `testName` | string | `"Recorded Test"` | Name of the test |
| `browserType` | string | `"chromium"` | Browser: chromium, firefox, webkit |
| `headless` | boolean | `true` | Run in headless mode |
| `viewport` | object | `{width: 1280, height: 720}` | Browser viewport size |
| `autoExecute` | boolean | `false` | Automatically run the test after conversion |
| `callbackUrl` | string | `null` | URL to receive test completion callback |

## Example Workflow

1. **Record a test** using Playwright codegen:
   ```bash
   npx playwright codegen https://example.com
   ```

2. **Copy the generated code** from the Playwright inspector

3. **Convert using the web interface**:
   - Go to `http://localhost:3000/convert`
   - Paste the code
   - Configure options
   - Click "Convert Test"

4. **Execute the test**:
   - Either enable "Auto Execute" in the converter
   - Or copy the API request and send it manually
   - Or use the generated cURL command

5. **Monitor results**:
   - Check the test status using the provided status URL
   - Download the test report when complete

## Troubleshooting

### Common Issues

1. **"Test does not contain page.goto()"**
   - Make sure your recorded test includes navigation to a webpage

2. **"Mismatched parentheses/braces"**
   - Check that your test code is complete and properly formatted

3. **"Network error"**
   - Ensure the E2E Testing Platform server is running on port 3000

### Getting Help

- Check the validation results in the converter output
- Review the generated test code for syntax issues
- Use the web interface for easier debugging
- Check server logs for detailed error messages

## Advanced Usage

### Batch Conversion

Convert multiple tests at once:

```javascript
const { convertMultipleTests } = require('./examples/convert-recorded-test');

const tests = [
  { code: 'test1 code...', name: 'Test 1', projectId: 'project1' },
  { code: 'test2 code...', name: 'Test 2', projectId: 'project1' }
];

const converted = convertMultipleTests(tests);
```

### Custom Validation

Add your own validation rules:

```javascript
const { validateTestCode } = require('./src/utils/testConverter');

const validation = validateTestCode(testCode);
if (!validation.isValid) {
  console.log('Issues found:', validation.issues);
}
```
