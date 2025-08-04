#!/usr/bin/env node

/**
 * Example script showing how to convert recorded Playwright test to API format
 */

const { convertRecordedTestToAPI, validateTestCode } = require('../src/utils/testConverter');
const axios = require('axios');

// Your recorded test code from Playwright codegen
const recordedTestCode = `
import { test, expect } from '@playwright/test';

test('test', async ({ page }) => {
  await page.goto('https://todolistme.net/');
  await page.getByRole('textbox', { name: 'Type and hit Enter to add' }).click();
  await page.getByRole('textbox', { name: 'Type and hit Enter to add' }).fill('Hello');
  await page.getByRole('textbox', { name: 'Type and hit Enter to add' }).press('Enter');
  await page.getByRole('textbox', { name: 'Type and hit Enter to add' }).fill('Done');
  await page.getByRole('textbox', { name: 'Type and hit Enter to add' }).press('Enter');
  await page.getByRole('textbox', { name: 'Type and hit Enter to add' }).fill('No');
  await page.getByRole('textbox', { name: 'Type and hit Enter to add' }).press('Enter');
  await page.getByRole('textbox', { name: 'Type and hit Enter to add' }).fill('This is Good');
  await page.getByRole('textbox', { name: 'Type and hit Enter to add' }).press('Enter');
  await page.locator('#todo_2').getByRole('checkbox').check();
  await page.locator('#todo_3').getByRole('checkbox').check();
  await page.locator('#todo_4').getByRole('checkbox').check();
});
`;

async function main() {
  console.log('🎭 Converting recorded Playwright test to API format...\n');

  // Convert the recorded test
  const apiRequest = convertRecordedTestToAPI(recordedTestCode, {
    projectId: 'todo-app-test',
    testName: 'Todo List Management Test',
    browserType: 'chromium',
    headless: true,
    viewport: { width: 1280, height: 720 }
  });

  console.log('📋 Generated API Request:');
  console.log(JSON.stringify(apiRequest, null, 2));

  // Validate the test code
  const validation = validateTestCode(apiRequest.testCode);
  console.log('\n✅ Validation Results:');
  console.log(`Valid: ${validation.isValid}`);
  console.log(`Has Navigation: ${validation.hasNavigation}`);
  console.log(`Has Interactions: ${validation.hasInteractions}`);
  console.log(`Line Count: ${validation.lineCount}`);
  
  if (validation.issues.length > 0) {
    console.log('Issues found:');
    validation.issues.forEach(issue => console.log(`  - ${issue}`));
  }

  // Show the cleaned test code
  console.log('\n🧹 Cleaned Test Code:');
  console.log('```javascript');
  console.log(apiRequest.testCode);
  console.log('```');

  // Example of how to send to your API
  console.log('\n🚀 Example API Call:');
  console.log(`
const response = await fetch('http://localhost:3000/api/test/run', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(${JSON.stringify(apiRequest, null, 2)})
});

const result = await response.json();
console.log('Test started:', result.testId);
`);

  // Optionally, actually send the request if server is running
  const shouldSendRequest = process.argv.includes('--send');
  if (shouldSendRequest) {
    try {
      console.log('\n📡 Sending request to API...');
      const response = await axios.post('http://localhost:3000/api/test/run', apiRequest);
      console.log('✅ Test started successfully!');
      console.log('Test ID:', response.data.testId);
      console.log('Status URL:', `http://localhost:3000${response.data.statusUrl}`);
    } catch (error) {
      console.error('❌ Failed to send request:', error.message);
      if (error.code === 'ECONNREFUSED') {
        console.log('💡 Make sure the server is running: npm start');
      }
    }
  } else {
    console.log('\n💡 To actually send the request, run: node examples/convert-recorded-test.js --send');
  }
}

// Additional utility functions for different scenarios

/**
 * Convert multiple recorded tests at once
 */
function convertMultipleTests(recordedTests) {
  return recordedTests.map((test, index) => {
    return convertRecordedTestToAPI(test.code, {
      projectId: test.projectId || `test-project-${index + 1}`,
      testName: test.name || `Test ${index + 1}`,
      ...test.options
    });
  });
}

/**
 * Create a batch request for multiple tests
 */
function createBatchRequest(recordedTests) {
  const convertedTests = convertMultipleTests(recordedTests);
  
  return {
    batch: true,
    tests: convertedTests,
    options: {
      parallel: false, // Run tests sequentially
      stopOnFailure: false
    }
  };
}

// Export for use in other scripts
module.exports = {
  convertRecordedTestToAPI,
  convertMultipleTests,
  createBatchRequest
};

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}
