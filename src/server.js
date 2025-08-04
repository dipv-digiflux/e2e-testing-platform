const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const { v4: uuidv4 } = require('uuid');

const TestRunner = require('./services/TestRunner');
const ZipService = require('./services/ZipService');
const logger = require('./utils/logger');
const { convertRecordedTestToAPI, validateTestCode } = require('./utils/testConverter');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet({
  contentSecurityPolicy: false // Disable CSP for file downloads
}));
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // Reduced limit for testing platform
  message: {
    error: 'Too many requests from this IP, please try again later.',
    retryAfter: '15 minutes'
  }
});
app.use('/api/', limiter);

// Serve static files from public directory
app.use(express.static(path.join(__dirname, '../public')));

// Services
const testRunner = new TestRunner();
const zipService = new ZipService();

// Ensure required directories exist
async function initializeDirectories() {
  const dirs = [
    'test-runs',
    'reports',
    'reports/zips',
    'temp'
  ];
  
  for (const dir of dirs) {
    await fs.mkdir(dir, { recursive: true });
  }
}

// Routes
app.get('/', (req, res) => {
  res.json({
    name: 'E2E Testing Platform',
    version: '1.0.0',
    status: 'running',
    endpoints: {
      health: '/health',
      runTest: 'POST /api/test/run',
      convertTest: 'POST /api/test/convert',
      convertUI: 'GET /convert',
      testStatus: 'GET /api/test/status/:testId',
      download: 'GET /api/download/:filename',
      docs: '/api/docs'
    }
  });
});

app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    platform: process.platform,
    nodeVersion: process.version
  });
});

// Serve the test converter interface
app.get('/convert', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/convert-test.html'));
});

app.get('/api/docs', (req, res) => {
  res.json({
    title: 'E2E Testing Platform API Documentation',
    version: '1.0.0',
    endpoints: {
      'POST /api/test/run': {
        description: 'Execute a Playwright test',
        body: {
          projectId: 'string (required) - Project identifier',
          testName: 'string (required) - Name of the test',
          testCode: 'string (required) - Playwright test code',
          browserType: 'string (optional) - chromium, firefox, or webkit (default: chromium)',
          headless: 'boolean (optional) - Run in headless mode (default: true)',
          viewport: 'object (optional) - {width: 1280, height: 720}',
          callbackUrl: 'string (optional) - URL to send results callback'
        },
        response: {
          testId: 'Generated test ID',
          status: 'Test execution status',
          downloadUrl: 'URL to download zip report',
          report: 'Test execution summary'
        }
      },
      'POST /api/test/convert': {
        description: 'Convert recorded Playwright test code to API format',
        body: {
          recordedTestCode: 'string (required) - Raw recorded test code from Playwright codegen',
          projectId: 'string (optional) - Project identifier (default: "recorded-test")',
          testName: 'string (optional) - Name of the test (default: "Recorded Test")',
          browserType: 'string (optional) - chromium, firefox, or webkit (default: chromium)',
          headless: 'boolean (optional) - Run in headless mode (default: true)',
          viewport: 'object (optional) - {width: 1280, height: 720}',
          autoExecute: 'boolean (optional) - Automatically execute the converted test (default: false)'
        },
        response: {
          convertedTest: 'API-compatible test object',
          validation: 'Test validation results',
          testId: 'Generated test ID (if autoExecute is true)'
        }
      },
      'GET /api/test/status/:testId': {
        description: 'Get test execution status',
        response: 'Test status and results'
      },
      'GET /api/download/:filename': {
        description: 'Download test report zip file',
        response: 'Binary zip file'
      }
    },
    example: {
      testCode: `await page.goto('https://example.com');
await page.getByRole('button', { name: 'Click me' }).click();
await expect(page.getByText('Success')).toBeVisible();`
    }
  });
});

app.post('/api/test/run', async (req, res) => {
  const testId = uuidv4();
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  
  try {
    logger.info(`Starting test execution: ${testId}`, { testId, body: req.body });
    
    const {
      projectId,
      testName,
      testCode,
      browserType = 'chromium',
      headless = true,
      viewport = { width: 1280, height: 720 },
      callbackUrl
    } = req.body;

    // Validate required fields
    if (!projectId || !testName || !testCode) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['projectId', 'testName', 'testCode'],
        received: {
          projectId: !!projectId,
          testName: !!testName,
          testCode: !!testCode
        }
      });
    }

    // Validate browserType
    const validBrowsers = ['chromium', 'firefox', 'webkit'];
    if (!validBrowsers.includes(browserType)) {
      return res.status(400).json({
        error: 'Invalid browser type',
        validBrowsers,
        received: browserType
      });
    }

    // Start test execution (don't await - run async)
    const testPromise = testRunner.runTest({
      testId,
      projectId,
      testName,
      testCode,
      browserType,
      headless,
      viewport
    }).then(async (testResult) => {
      try {
        // Create zip file after test completion
        const zipFileName = `${projectId}_${testId}_${timestamp}.zip`;
        const zipPath = await zipService.createZip({
          testId,
          reportPath: testResult.artifacts.reportPath,
          zipFileName
        });

        testResult.artifacts.zipPath = zipPath;
        testResult.downloadUrl = `/api/download/${zipFileName}`;

        // Send callback if provided
        if (callbackUrl) {
          try {
            const axios = require('axios');
            const callbackData = {
              testId,
              projectId,
              testName,
              status: testResult.status,
              timestamp,
              downloadUrl: `${req.protocol}://${req.get('host')}/api/download/${zipFileName}`,
              report: {
                passed: testResult.passed,
                failed: testResult.failed,
                duration: testResult.duration,
                errors: testResult.errors
              }
            };
            
            await axios.post(callbackUrl, callbackData, {
              timeout: 30000,
              headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'E2E-Testing-Platform/1.0'
              }
            });
            
            logger.info(`Callback sent successfully to ${callbackUrl}`, { testId });
          } catch (callbackError) {
            logger.error('Failed to send callback', { 
              testId, 
              callbackUrl, 
              error: callbackError.message 
            });
          }
        }

        return testResult;
      } catch (error) {
        logger.error('Post-test processing failed', { testId, error: error.message });
        throw error;
      }
    });

    // Return immediate response
    res.status(202).json({
      testId,
      projectId,
      testName,
      status: 'started',
      timestamp,
      message: 'Test execution started',
      statusUrl: `/api/test/status/${testId}`,
      estimatedCompletion: '30-60 seconds'
    });

  } catch (error) {
    logger.error('Test execution startup failed', { 
      testId, 
      error: error.message, 
      stack: error.stack 
    });
    
    res.status(500).json({
      error: 'Test execution startup failed',
      testId,
      message: error.message
    });
  }
});

// Convert recorded test endpoint
app.post('/api/test/convert', async (req, res) => {
  try {
    logger.info('Converting recorded test', { body: req.body });

    const {
      recordedTestCode,
      projectId,
      testName,
      browserType,
      headless,
      viewport,
      autoExecute = false
    } = req.body;

    // Validate required fields
    if (!recordedTestCode) {
      return res.status(400).json({
        error: 'Missing required field: recordedTestCode',
        example: {
          recordedTestCode: "import { test, expect } from '@playwright/test';\n\ntest('test', async ({ page }) => {\n  await page.goto('https://example.com');\n});"
        }
      });
    }

    // Convert the recorded test
    const convertedTest = convertRecordedTestToAPI(recordedTestCode, {
      projectId,
      testName,
      browserType,
      headless,
      viewport
    });

    // Validate the converted test
    const validation = validateTestCode(convertedTest.testCode);

    const response = {
      success: true,
      convertedTest,
      validation,
      message: 'Test converted successfully'
    };

    // If autoExecute is true, run the test immediately
    if (autoExecute) {
      const testId = uuidv4();
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

      // Start test execution (don't await - run async)
      testRunner.runTest({
        testId,
        ...convertedTest
      }).then(async (testResult) => {
        try {
          // Create zip file after test completion
          const zipFileName = `${convertedTest.projectId}_${testId}_${timestamp}.zip`;
          const zipPath = await zipService.createZip({
            testId,
            reportPath: testResult.artifacts.reportPath,
            zipFileName
          });

          testResult.artifacts.zipPath = zipPath;
          testResult.downloadUrl = `/api/download/${zipFileName}`;

          logger.info(`Auto-executed test completed: ${testId}`, {
            status: testResult.status
          });
        } catch (error) {
          logger.error('Post-test processing failed for auto-executed test', {
            testId,
            error: error.message
          });
        }
      }).catch(error => {
        logger.error('Auto-executed test failed', { testId, error: error.message });
      });

      response.autoExecution = {
        testId,
        status: 'started',
        statusUrl: `/api/test/status/${testId}`,
        message: 'Test execution started automatically'
      };
    }

    res.json(response);

  } catch (error) {
    logger.error('Test conversion failed', {
      error: error.message,
      stack: error.stack
    });

    res.status(500).json({
      error: 'Test conversion failed',
      message: error.message,
      details: 'Check that the recorded test code is valid Playwright code'
    });
  }
});

app.get('/api/test/status/:testId', async (req, res) => {
  try {
    const { testId } = req.params;
    const status = await testRunner.getTestStatus(testId);
    
    // Add download URL if zip exists
    if (status.status !== 'running' && !status.downloadUrl) {
      const timestamp = new Date(status.startTime).toISOString().replace(/[:.]/g, '-');
      const zipFileName = `${status.projectId}_${testId}_${timestamp}.zip`;
      const zipPath = path.join(__dirname, '../reports/zips', zipFileName);
      
      try {
        await fs.access(zipPath);
        status.downloadUrl = `/api/download/${zipFileName}`;
      } catch (error) {
        // Zip not ready yet
        logger.info('Zip file not ready yet', { testId, zipFileName });
      }
    }
    
    res.json(status);
  } catch (error) {
    logger.error('Failed to get test status', { testId: req.params.testId, error: error.message });
    res.status(404).json({ 
      error: 'Test not found',
      testId: req.params.testId 
    });
  }
});

app.get('/api/download/:filename', async (req, res) => {
  try {
    const filename = req.params.filename;
    
    // Validate filename format
    if (!/^[a-zA-Z0-9_\-]+\.zip$/.test(filename)) {
      return res.status(400).json({ error: 'Invalid filename format' });
    }
    
    const filePath = path.join(__dirname, '../reports/zips', filename);
    
    // Check if file exists
    await fs.access(filePath);
    
    // Get file info
    const stats = await fs.stat(filePath);
    const zipInfo = await zipService.getZipInfo(filePath);
    
    // Set appropriate headers
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', stats.size);
    res.setHeader('Cache-Control', 'no-cache');
    
    logger.info(`Download started: ${filename}`, { 
      size: zipInfo.sizeInMB + 'MB',
      userAgent: req.get('User-Agent') 
    });
    
    // Stream the file
    const fileStream = require('fs').createReadStream(filePath);
    fileStream.pipe(res);
    
    fileStream.on('end', () => {
      logger.info(`Download completed: ${filename}`);
    });
    
    fileStream.on('error', (error) => {
      logger.error(`Download error: ${filename}`, { error: error.message });
      if (!res.headersSent) {
        res.status(500).json({ error: 'Download failed' });
      }
    });
    
  } catch (error) {
    logger.error('Download error', { filename: req.params.filename, error: error.message });
    res.status(404).json({ 
      error: 'File not found',
      filename: req.params.filename 
    });
  }
});

app.get('/api/test/list', async (req, res) => {
  try {
    const testRunsDir = path.join(__dirname, '../test-runs');
    const entries = await fs.readdir(testRunsDir);
    
    const tests = [];
    for (const entry of entries) {
      try {
        const resultPath = path.join(testRunsDir, entry, 'result.json');
        const resultData = await fs.readFile(resultPath, 'utf8');
        const testResult = JSON.parse(resultData);
        
        tests.push({
          testId: testResult.testId,
          projectId: testResult.projectId,
          testName: testResult.testName,
          status: testResult.status,
          duration: testResult.duration,
          startTime: testResult.startTime,
          endTime: testResult.endTime
        });
      } catch (error) {
        // Skip invalid entries
        continue;
      }
    }
    
    // Sort by start time, newest first
    tests.sort((a, b) => new Date(b.startTime) - new Date(a.startTime));
    
    res.json({
      total: tests.length,
      tests: tests.slice(0, 100) // Limit to latest 100 tests
    });
    
  } catch (error) {
    logger.error('Failed to list tests', { error: error.message });
    res.status(500).json({ error: 'Failed to retrieve test list' });
  }
});

// Webhook endpoint for n8n integration
app.post('/api/webhook/n8n', async (req, res) => {
  try {
    logger.info('Received n8n webhook', { body: req.body });
    
    const { projectId, testName, testCode, ...options } = req.body;
    
    if (!projectId || !testName || !testCode) {
      return res.status(400).json({
        error: 'Missing required fields for n8n webhook',
        required: ['projectId', 'testName', 'testCode']
      });
    }
    
    // Forward to main test endpoint
    const testResponse = await fetch(`${req.protocol}://${req.get('host')}/api/test/run`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        projectId,
        testName,
        testCode,
        ...options,
        callbackUrl: req.body.callbackUrl || `${req.protocol}://${req.get('host')}/api/webhook/callback`
      })
    });
    
    const result = await testResponse.json();
    res.json(result);
    
  } catch (error) {
    logger.error('n8n webhook error', { error: error.message });
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

app.post('/api/webhook/callback', (req, res) => {
  logger.info('Test completion callback received', { body: req.body });
  res.json({ received: true });
});

// Cleanup old test runs (older than 24 hours)
async function cleanupOldTests() {
  try {
    const testRunsDir = path.join(__dirname, '../test-runs');
    const zipsDir = path.join(__dirname, '../reports/zips');
    const cutoffTime = Date.now() - (24 * 60 * 60 * 1000); // 24 hours ago
    
    // Cleanup test runs
    const entries = await fs.readdir(testRunsDir);
    for (const entry of entries) {
      const entryPath = path.join(testRunsDir, entry);
      const stats = await fs.stat(entryPath);
      
      if (stats.isDirectory() && stats.mtime.getTime() < cutoffTime) {
        await fs.rm(entryPath, { recursive: true, force: true });
        logger.info(`Cleaned up old test run: ${entry}`);
      }
    }
    
    // Cleanup old zip files
    const zipFiles = await fs.readdir(zipsDir);
    for (const zipFile of zipFiles) {
      const zipPath = path.join(zipsDir, zipFile);
      const stats = await fs.stat(zipPath);
      
      if (stats.mtime.getTime() < cutoffTime) {
        await fs.unlink(zipPath);
        logger.info(`Cleaned up old zip file: ${zipFile}`);
      }
    }
    
  } catch (error) {
    logger.error('Cleanup error', { error: error.message });
  }
}

// Error handling middleware
app.use((error, req, res, next) => {
  logger.error('Unhandled error', { 
    error: error.message, 
    stack: error.stack,
    url: req.url,
    method: req.method
  });
  
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong',
    requestId: req.id || 'unknown'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ 
    error: 'Route not found',
    path: req.path,
    method: req.method,
    availableEndpoints: [
      'GET /',
      'GET /health',
      'GET /api/docs',
      'POST /api/test/run',
      'GET /api/test/status/:testId',
      'GET /api/test/list',
      'GET /api/download/:filename',
      'POST /api/webhook/n8n'
    ]
  });
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  await cleanupOldTests();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully');
  await cleanupOldTests();
  process.exit(0);
});

// Initialize and start server
async function startServer() {
  try {
    await initializeDirectories();
    
    app.listen(PORT, () => {
      logger.info(`E2E Testing Platform started on port ${PORT}`);
      console.log(`🚀 Server running on http://localhost:${PORT}`);
      console.log(`📚 API Documentation: http://localhost:${PORT}/api/docs`);
      console.log(`💡 Health Check: http://localhost:${PORT}/health`);
    });
    
    // Schedule cleanup every 6 hours
    setInterval(cleanupOldTests, 6 * 60 * 60 * 1000);
    
  } catch (error) {
    logger.error('Failed to start server', { error: error.message });
    process.exit(1);
  }
}

startServer();

module.exports = app;