const { exec } = require('child_process');
const fs = require('fs').promises;
const path = require('path');
const { promisify } = require('util');
const logger = require('../utils/logger');

const execAsync = promisify(exec);

class TestRunner {
  constructor() {
    this.runningTests = new Map();
  }

  /**
   * Convert recorded Playwright test code to API-compatible format
   * @param {string} recordedTestCode - The recorded test code from Playwright codegen
   * @param {Object} options - Additional options for the conversion
   * @returns {Object} - API-compatible test request object
   */
  convertRecordedTest(recordedTestCode, options = {}) {
    const {
      projectId = 'recorded-test',
      testName = 'Recorded Test',
      browserType = 'chromium',
      headless = true,
      viewport = { width: 1280, height: 720 }
    } = options;

    // Extract the test body from the recorded test
    let testBody = this.extractTestBody(recordedTestCode);

    // Clean and format the test code
    testBody = this.cleanTestCode(testBody);

    return {
      projectId,
      testName,
      testCode: testBody,
      browserType,
      headless,
      viewport
    };
  }

  /**
   * Extract the test body from recorded Playwright test code
   * @param {string} recordedCode - The full recorded test code
   * @returns {string} - Extracted test body
   */
  extractTestBody(recordedCode) {
    // Remove import statements and test wrapper
    let code = recordedCode.trim();

    // Remove import statements
    code = code.replace(/import\s+{[^}]+}\s+from\s+['"][^'"]+['"];\s*/g, '');

    // Extract content from test function
    const testMatch = code.match(/test\([^,]+,\s*async\s*\(\s*{\s*page\s*}\s*\)\s*=>\s*{([\s\S]*?)}\s*\);?\s*$/);
    if (testMatch) {
      return testMatch[1].trim();
    }

    // If no test wrapper found, assume it's already the test body
    return code;
  }

  /**
   * Clean and format test code for API consumption
   * @param {string} testCode - Raw test code
   * @returns {string} - Cleaned test code
   */
  cleanTestCode(testCode) {
    return testCode
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0)
      .join('\n');
  }

  async runTest(options) {
    const {
      testId,
      projectId,
      testName,
      testCode,
      browserType = 'chromium',
      headless = true,
      viewport = { width: 1280, height: 720 }
    } = options;

    logger.info(`Starting test: ${testName}`, { testId, projectId });

    const startTime = Date.now();
    const testResult = {
      testId,
      projectId,
      testName,
      status: 'running',
      passed: 0,
      failed: 0,
      errors: [],
      duration: 0,
      artifacts: {
        reportPath: '',
        zipPath: ''
      },
      browserType,
      viewport,
      startTime: new Date().toISOString()
    };

    this.runningTests.set(testId, testResult);

    try {
      // Create test directory structure
      const testDir = path.join(__dirname, '../../test-runs', testId);
      const testsDir = path.join(testDir, 'tests');
      
      await fs.mkdir(testsDir, { recursive: true });

      // Generate test file
      const testFilePath = path.join(testsDir, `${testName.replace(/[^a-zA-Z0-9]/g, '_')}.spec.js`);
      const testFileContent = this.generateTestFile(testName, testCode);
      
      await fs.writeFile(testFilePath, testFileContent);

      // Create custom playwright config for this test run
      const configPath = path.join(testDir, 'playwright.config.js');
      const configContent = this.generatePlaywrightConfig({
        testDir: './tests',
        outputDir: './test-results',
        reportDir: './playwright-report',
        browserType,
        headless,
        viewport
      });
      
      await fs.writeFile(configPath, configContent);

      // Set environment variables
      const env = {
        ...process.env,
        BROWSER_TYPE: browserType,
        HEADLESS: headless.toString(),
        VIEWPORT_WIDTH: viewport.width.toString(),
        VIEWPORT_HEIGHT: viewport.height.toString(),
        PWTEST_OUTPUT_DIR: path.join(testDir, 'test-results'),
        PWTEST_HTML_REPORT_OPEN: 'never'
      };

      // Run Playwright test
      const command = `npx playwright test --config="${configPath}"`;
      
      logger.info(`Executing command: ${command}`, { testId, cwd: testDir });

      const { stdout, stderr } = await execAsync(command, {
        cwd: testDir,
        env,
        timeout: 300000 // 5 minutes timeout
      });

      logger.info('Playwright execution completed', { testId, stdout: stdout.slice(0, 1000) });

      // Parse test results
      const resultsPath = path.join(testDir, 'test-results.json');
      let playwrightResults = null;
      
      try {
        const resultsContent = await fs.readFile(resultsPath, 'utf8');
        playwrightResults = JSON.parse(resultsContent);
      } catch (error) {
        logger.warn('Could not parse test results JSON', { testId, error: error.message });
      }

      // Update test result based on Playwright results
      if (playwrightResults) {
        const suite = playwrightResults.suites?.[0];
        if (suite) {
          const spec = suite.specs?.[0];
          if (spec) {
            const test = spec.tests?.[0];
            if (test) {
              const result = test.results?.[0];
              if (result) {
                testResult.status = result.status === 'passed' ? 'passed' : 'failed';
                testResult.passed = result.status === 'passed' ? 1 : 0;
                testResult.failed = result.status === 'passed' ? 0 : 1;
                testResult.duration = result.duration || 0;
                
                if (result.error) {
                  testResult.errors.push({
                    message: result.error.message || 'Test failed',
                    stack: result.error.stack || '',
                    timestamp: new Date().toISOString()
                  });
                }
              }
            }
          }
        }
      }

      // If no parsed results, determine status from stderr
      if (!playwrightResults) {
        testResult.status = stderr.includes('failed') || stderr.includes('error') ? 'failed' : 'passed';
        testResult.passed = testResult.status === 'passed' ? 1 : 0;
        testResult.failed = testResult.status === 'failed' ? 1 : 0;
        
        if (stderr) {
          testResult.errors.push({
            message: 'Test execution error',
            stack: stderr,
            timestamp: new Date().toISOString()
          });
        }
      }

      // Set artifact paths
      testResult.artifacts.reportPath = path.join(testDir, 'playwright-report');
      
      logger.info(`Test completed: ${testName}`, { 
        testId, 
        status: testResult.status,
        duration: testResult.duration 
      });

    } catch (error) {
      testResult.status = 'failed';
      testResult.failed = 1;
      testResult.passed = 0;
      testResult.errors.push({
        message: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString()
      });

      logger.error(`Test execution failed: ${testName}`, { 
        testId, 
        error: error.message,
        stderr: error.stderr 
      });
    } finally {
      // Calculate final duration if not set
      if (!testResult.duration) {
        testResult.duration = Date.now() - startTime;
      }
      
      testResult.endTime = new Date().toISOString();
      this.runningTests.set(testId, testResult);

      // Save test result
      try {
        const testDir = path.join(__dirname, '../../test-runs', testId);
        const resultPath = path.join(testDir, 'result.json');
        await fs.writeFile(resultPath, JSON.stringify(testResult, null, 2));
      } catch (error) {
        logger.error('Failed to save test result', { testId, error: error.message });
      }
    }

    return testResult;
  }

  generateTestFile(testName, testCode) {
    const sanitizedTestName = testName.replace(/[^a-zA-Z0-9\s]/g, '').trim();
    
    // Clean the test code and ensure it's properly formatted
    let cleanedCode = testCode.trim();
    
    // Remove any surrounding function wrapper if present
    cleanedCode = cleanedCode.replace(/^async\s*\(\s*{\s*page\s*}\s*\)\s*=>\s*{/, '');
    cleanedCode = cleanedCode.replace(/}$/, '');
    
    // Remove any leading/trailing braces
    cleanedCode = cleanedCode.replace(/^{/, '').replace(/}$/, '');
    
    // Ensure proper indentation
    cleanedCode = cleanedCode
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0)
      .map(line => `    ${line}`)
      .join('\n');

    return `const { test, expect } = require('@playwright/test');

test.describe('${sanitizedTestName}', () => {
  test('${sanitizedTestName}', async ({ page }) => {
    try {
${cleanedCode}
    } catch (error) {
      console.error('Test execution error:', error);
      throw error;
    }
  });
});`;
  }

  generatePlaywrightConfig({ testDir, outputDir, reportDir, browserType, headless, viewport }) {
    return `const { defineConfig, devices } = require('@playwright/test');

module.exports = defineConfig({
  testDir: '${testDir}',
  timeout: 30 * 1000,
  expect: {
    timeout: 5000,
  },
  fullyParallel: false,
  retries: 0,
  workers: 1,

  reporter: [
    ['html', {
      outputFolder: '${reportDir}',
      open: 'never'
    }],
    ['json', {
      outputFile: 'test-results.json'
    }],
    ['junit', {
      outputFile: 'test-results.xml'
    }]
  ],
  
  use: {
    trace: 'on',
    video: 'on', 
    screenshot: 'on',
    headless: ${headless},
    viewport: { width: ${viewport.width}, height: ${viewport.height} },
    ignoreHTTPSErrors: true,
    actionTimeout: 10000,
    navigationTimeout: 30000,
  },

  projects: [
    {
      name: '${browserType}',
      use: { 
        ...devices[${this.getDeviceConfig(browserType)}] 
      },
    },
  ],

  outputDir: '${outputDir}',
});`;
  }

  getDeviceConfig(browserType) {
    switch (browserType.toLowerCase()) {
      case 'firefox':
        return "'Desktop Firefox'";
      case 'webkit':
      case 'safari':
        return "'Desktop Safari'";
      case 'chromium':
      case 'chrome':
      default:
        return "'Desktop Chrome'";
    }
  }

  async getTestStatus(testId) {
    if (this.runningTests.has(testId)) {
      return this.runningTests.get(testId);
    }

    // Try to load from file
    try {
      const resultPath = path.join(__dirname, '../../test-runs', testId, 'result.json');
      const resultData = await fs.readFile(resultPath, 'utf8');
      return JSON.parse(resultData);
    } catch (error) {
      throw new Error('Test not found');
    }
  }
}

module.exports = TestRunner;