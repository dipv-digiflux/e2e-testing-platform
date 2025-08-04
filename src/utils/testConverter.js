/**
 * Utility for converting recorded Playwright tests to API-compatible format
 */

/**
 * Convert recorded Playwright test code to API request format
 * @param {string} recordedTestCode - The recorded test code from Playwright codegen
 * @param {Object} options - Configuration options
 * @returns {Object} - API-compatible test request object
 */
function convertRecordedTestToAPI(recordedTestCode, options = {}) {
  const {
    projectId = 'recorded-test',
    testName = 'Recorded Test',
    browserType = 'chromium',
    headless = true,
    viewport = { width: 1280, height: 720 },
    callbackUrl = null
  } = options;

  // Extract and clean the test body
  const testBody = extractAndCleanTestBody(recordedTestCode);

  const apiRequest = {
    projectId,
    testName,
    testCode: testBody,
    browserType,
    headless,
    viewport
  };

  // Add callback URL if provided
  if (callbackUrl) {
    apiRequest.callbackUrl = callbackUrl;
  }

  return apiRequest;
}

/**
 * Extract the test body from recorded Playwright test code
 * @param {string} recordedCode - The full recorded test code
 * @returns {string} - Extracted and cleaned test body
 */
function extractAndCleanTestBody(recordedCode) {
  let code = recordedCode.trim();
  
  // Remove import statements
  code = code.replace(/import\s+{[^}]+}\s+from\s+['"][^'"]+['"];\s*/g, '');
  
  // Try to extract from test function wrapper
  const testFunctionPatterns = [
    // Pattern: test('name', async ({ page }) => { ... });
    /test\([^,]+,\s*async\s*\(\s*{\s*page\s*}\s*\)\s*=>\s*{([\s\S]*?)}\s*\);?\s*$/,
    // Pattern: test.describe block with test inside
    /test\.describe\([^,]+,\s*\(\)\s*=>\s*{[\s\S]*?test\([^,]+,\s*async\s*\(\s*{\s*page\s*}\s*\)\s*=>\s*{([\s\S]*?)}\s*\);?[\s\S]*?}\s*\);?\s*$/,
    // Pattern: just the async function part
    /async\s*\(\s*{\s*page\s*}\s*\)\s*=>\s*{([\s\S]*?)}\s*;?\s*$/
  ];

  for (const pattern of testFunctionPatterns) {
    const match = code.match(pattern);
    if (match) {
      return cleanTestCode(match[1]);
    }
  }
  
  // If no wrapper found, assume it's already the test body and clean it
  return cleanTestCode(code);
}

/**
 * Clean and format test code
 * @param {string} testCode - Raw test code
 * @returns {string} - Cleaned test code
 */
function cleanTestCode(testCode) {
  return testCode
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0 && !line.startsWith('//')) // Remove empty lines and comments
    .join('\n');
}

/**
 * Generate a sample API request from recorded test
 * @param {string} recordedTestCode - The recorded test code
 * @param {Object} customOptions - Custom options to override defaults
 * @returns {Object} - Complete API request object with example values
 */
function generateSampleAPIRequest(recordedTestCode, customOptions = {}) {
  const defaultOptions = {
    projectId: 'my-project',
    testName: 'Automated Test from Recording',
    browserType: 'chromium',
    headless: true,
    viewport: { width: 1280, height: 720 }
  };

  const options = { ...defaultOptions, ...customOptions };
  return convertRecordedTestToAPI(recordedTestCode, options);
}

/**
 * Validate that the converted test code looks reasonable
 * @param {string} testCode - The test code to validate
 * @returns {Object} - Validation result with isValid boolean and issues array
 */
function validateTestCode(testCode) {
  const issues = [];
  const lines = testCode.split('\n');

  // Check for common Playwright patterns
  const hasPageGoto = /await\s+page\.goto\s*\(/.test(testCode);
  const hasPageActions = /await\s+page\.(click|fill|press|getByRole|locator)/.test(testCode);
  
  if (!hasPageGoto) {
    issues.push('Test does not contain page.goto() - may not navigate to any page');
  }
  
  if (!hasPageActions) {
    issues.push('Test does not contain any page interactions');
  }

  // Check for syntax issues
  const openParens = (testCode.match(/\(/g) || []).length;
  const closeParens = (testCode.match(/\)/g) || []).length;
  if (openParens !== closeParens) {
    issues.push('Mismatched parentheses detected');
  }

  const openBraces = (testCode.match(/\{/g) || []).length;
  const closeBraces = (testCode.match(/\}/g) || []).length;
  if (openBraces !== closeBraces) {
    issues.push('Mismatched braces detected');
  }

  return {
    isValid: issues.length === 0,
    issues,
    hasNavigation: hasPageGoto,
    hasInteractions: hasPageActions,
    lineCount: lines.length
  };
}

module.exports = {
  convertRecordedTestToAPI,
  extractAndCleanTestBody,
  cleanTestCode,
  generateSampleAPIRequest,
  validateTestCode
};
