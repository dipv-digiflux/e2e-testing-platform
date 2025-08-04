#!/usr/bin/env node

/**
 * Helper script to generate properly escaped cURL commands for the E2E Testing Platform
 */

const { convertRecordedTestToAPI } = require('../src/utils/testConverter');

// Your recorded test code
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

function generateCurlCommand(apiRequest, endpoint = '/api/test/run') {
  const jsonString = JSON.stringify(apiRequest);
  
  // Escape single quotes for bash
  const escapedJson = jsonString.replace(/'/g, "'\"'\"'");
  
  return `curl -X POST http://localhost:3000${endpoint} \\
  -H "Content-Type: application/json" \\
  -d '${escapedJson}' | jq`;
}

function generateConvertCurlCommand(recordedTestCode, options = {}) {
  const requestBody = {
    recordedTestCode,
    ...options
  };
  
  return generateCurlCommand(requestBody, '/api/test/convert');
}

function main() {
  console.log('🎭 E2E Testing Platform - cURL Command Generator\n');

  // Method 1: Use the convert API (Recommended)
  console.log('📋 Method 1: Convert and Execute in One Step');
  console.log('============================================');
  
  const convertCurl = generateConvertCurlCommand(recordedTestCode, {
    projectId: 'demo-project',
    testName: 'Todo List Test',
    autoExecute: true  // This will convert AND run the test
  });
  
  console.log(convertCurl);
  console.log('\n');

  // Method 2: Convert first, then use the result
  console.log('📋 Method 2: Convert First, Then Execute');
  console.log('=======================================');
  
  const apiRequest = convertRecordedTestToAPI(recordedTestCode, {
    projectId: 'demo-project',
    testName: 'Todo List Test'
  });
  
  console.log('Step 1 - Convert:');
  const convertOnlyCurl = generateConvertCurlCommand(recordedTestCode, {
    projectId: 'demo-project',
    testName: 'Todo List Test',
    autoExecute: false
  });
  console.log(convertOnlyCurl);
  
  console.log('\nStep 2 - Execute (using converted result):');
  const executeCurl = generateCurlCommand(apiRequest);
  console.log(executeCurl);
  console.log('\n');

  // Method 3: Direct execution (properly escaped)
  console.log('📋 Method 3: Direct Execution (Properly Escaped)');
  console.log('===============================================');
  const directCurl = generateCurlCommand(apiRequest);
  console.log(directCurl);
  console.log('\n');

  // Show the converted test data
  console.log('📊 Converted Test Data:');
  console.log('======================');
  console.log(JSON.stringify(apiRequest, null, 2));
  console.log('\n');

  // Show test code only (for manual copying)
  console.log('🧹 Clean Test Code (for manual use):');
  console.log('===================================');
  console.log(apiRequest.testCode);
  console.log('\n');

  console.log('💡 Tips:');
  console.log('- Method 1 is easiest: converts and runs in one command');
  console.log('- Method 2 gives you more control over the process');
  console.log('- Method 3 is for when you want to manually construct the request');
  console.log('- All commands include `| jq` for pretty JSON formatting');
  console.log('- Remove `| jq` if you don\'t have jq installed');
}

// Export functions for use in other scripts
module.exports = {
  generateCurlCommand,
  generateConvertCurlCommand
};

// Run if called directly
if (require.main === module) {
  main();
}
