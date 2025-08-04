// @ts-check
const { defineConfig, devices } = require('@playwright/test');

/**
 * @see https://playwright.dev/docs/test-configuration
 */
module.exports = defineConfig({
  testDir: './tests',
  timeout: 30 * 1000,
  expect: {
    timeout: 5000,
  },
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  
  reporter: [
    ['html', { 
      outputFolder: './playwright-report',
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
    baseURL: process.env.BASE_URL || 'http://localhost:3000',
    trace: 'on',
    video: 'on',
    screenshot: 'on',
    headless: process.env.HEADLESS !== 'false',
    viewport: { 
      width: 1280, 
      height: 720 
    },
    ignoreHTTPSErrors: true,
    actionTimeout: 10000,
    navigationTimeout: 30000,
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
      testIgnore: process.env.BROWSER_TYPE && process.env.BROWSER_TYPE !== 'firefox' ? '**' : undefined,
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
      testIgnore: process.env.BROWSER_TYPE && process.env.BROWSER_TYPE !== 'webkit' ? '**' : undefined,
    },
  ],

  outputDir: 'test-results/',
  globalSetup: require.resolve('./src/utils/global-setup.js'),
  globalTeardown: require.resolve('./src/utils/global-teardown.js'),
});