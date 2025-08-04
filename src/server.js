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
      dashboard: 'GET /dashboard',
      health: '/health',
      runTest: 'POST /api/test/run',
      convertTest: 'POST /api/test/convert',
      convertUI: 'GET /convert',
      createUserUI: 'GET /create-user',
      createProjectUI: 'GET /create-project',
      createTestCaseUI: 'GET /create-test-case',
      runTestsUI: 'GET /run-tests',
      reportsUI: 'GET /reports',
      testStatus: 'GET /api/test/status/:testId',
      reportInfo: 'GET /api/report/:testId',
      reportView: 'GET /api/report/:testId/view',
      reportHtml: 'GET /api/report/:testId/html',
      download: 'GET /api/download/:filename',
      webhookRunTests: 'POST /webhook-test/run-tests',
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

// Serve the main dashboard
app.get('/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Serve the test converter interface
app.get('/convert', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/convert-test.html'));
});

// Serve the user creation interface
app.get('/create-user', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/create-user.html'));
});

// Serve the project creation interface
app.get('/create-project', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/create-project.html'));
});

// Serve the test case creation interface
app.get('/create-test-case', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/create-test-case.html'));
});

// Serve the run tests interface
app.get('/run-tests', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/run-tests.html'));
});

// Serve the reports dashboard
app.get('/reports', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/reports.html'));
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

        // Update the stored test result with zip information
        try {
          const testDir = path.join(__dirname, '../test-runs', testId);
          const resultPath = path.join(testDir, 'result.json');
          await fs.writeFile(resultPath, JSON.stringify(testResult, null, 2));

          // Also update the in-memory cache
          testRunner.runningTests.set(testId, testResult);

          logger.info('Updated test result with zip information', { testId, zipFileName });
        } catch (saveError) {
          logger.error('Failed to save updated test result', { testId, error: saveError.message });
        }

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

    // Return immediate response with report URLs
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const zipFileName = `${projectId}_${testId}_${timestamp}.zip`;

    res.status(202).json({
      testId,
      projectId,
      testName,
      status: 'started',
      timestamp,
      message: 'Test execution started',
      statusUrl: `${baseUrl}/api/test/status/${testId}`,
      reportUrls: {
        info: `${baseUrl}/api/report/${testId}`,
        view: `${baseUrl}/api/report/${testId}/view`,
        direct: `${baseUrl}/api/report/${testId}/html`,
        download: `${baseUrl}/api/download/${zipFileName}` // Will be available after test completion
      },
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

          // Update the stored test result with zip information
          try {
            const testDir = path.join(__dirname, '../test-runs', testId);
            const resultPath = path.join(testDir, 'result.json');
            await fs.writeFile(resultPath, JSON.stringify(testResult, null, 2));

            // Also update the in-memory cache
            testRunner.runningTests.set(testId, testResult);

            logger.info('Updated auto-executed test result with zip information', { testId, zipFileName });
          } catch (saveError) {
            logger.error('Failed to save updated auto-executed test result', { testId, error: saveError.message });
          }

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

      const baseUrl = `${req.protocol}://${req.get('host')}`;
      const zipFileName = `${convertedTest.projectId}_${testId}_${timestamp}.zip`;

      response.autoExecution = {
        testId,
        status: 'started',
        statusUrl: `${baseUrl}/api/test/status/${testId}`,
        reportUrls: {
          info: `${baseUrl}/api/report/${testId}`,
          view: `${baseUrl}/api/report/${testId}/view`,
          direct: `${baseUrl}/api/report/${testId}/html`,
          download: `${baseUrl}/api/download/${zipFileName}` // Will be available after test completion
        },
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
    const baseUrl = `${req.protocol}://${req.get('host')}`;

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

    // Add report URLs with full domain
    status.reportUrls = {
      info: `${baseUrl}/api/report/${testId}`,
      view: `${baseUrl}/api/report/${testId}/view`,
      direct: `${baseUrl}/api/report/${testId}/html`
    };

    // Ensure download URL includes full domain if it exists
    if (status.downloadUrl && !status.downloadUrl.startsWith('http')) {
      status.downloadUrl = `${baseUrl}${status.downloadUrl}`;
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

// Serve HTML reports directly via URL
app.get('/api/report/:testId', async (req, res) => {
  try {
    const { testId } = req.params;

    // Validate testId format (UUID)
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(testId)) {
      return res.status(400).json({ error: 'Invalid test ID format' });
    }

    // Get test status to verify it exists
    let testStatus;
    try {
      testStatus = await testRunner.getTestStatus(testId);
    } catch (error) {
      return res.status(404).json({
        error: 'Test not found',
        testId,
        message: 'No test found with the provided ID'
      });
    }

    // Check if test is completed
    if (testStatus.status === 'running') {
      return res.status(202).json({
        error: 'Test still running',
        testId,
        status: testStatus.status,
        message: 'Test report is not yet available. Please wait for test completion.',
        statusUrl: `/api/test/status/${testId}`
      });
    }

    // Check if HTML report exists
    const reportPath = path.join(__dirname, '../test-runs', testId, 'playwright-report', 'index.html');
    try {
      await fs.access(reportPath);
    } catch (error) {
      return res.status(404).json({
        error: 'Report not found',
        testId,
        message: 'HTML report file does not exist or has been cleaned up'
      });
    }

    // Return report information and URLs
    const baseUrl = `${req.protocol}://${req.get('host')}`;

    // Ensure download URL includes full domain
    let downloadUrl = null;
    if (testStatus.downloadUrl) {
      downloadUrl = testStatus.downloadUrl.startsWith('http')
        ? testStatus.downloadUrl
        : `${baseUrl}${testStatus.downloadUrl}`;
    }

    res.json({
      testId,
      projectId: testStatus.projectId,
      testName: testStatus.testName,
      status: testStatus.status,
      reportUrls: {
        view: `${baseUrl}/api/report/${testId}/view`,
        direct: `${baseUrl}/api/report/${testId}/html`,
        download: downloadUrl
      },
      testDetails: {
        duration: testStatus.duration,
        passed: testStatus.passed,
        failed: testStatus.failed,
        startTime: testStatus.startTime,
        endTime: testStatus.endTime
      }
    });

  } catch (error) {
    logger.error('Report endpoint error', {
      testId: req.params.testId,
      error: error.message
    });

    res.status(500).json({
      error: 'Failed to get report information',
      testId: req.params.testId,
      message: error.message
    });
  }
});

// Serve HTML report viewer interface
app.get('/api/report/:testId/view', async (req, res) => {
  try {
    const { testId } = req.params;

    // Validate testId format (UUID)
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(testId)) {
      return res.status(400).send(`
        <html><body>
          <h1>Invalid Test ID</h1>
          <p>The provided test ID format is invalid.</p>
          <a href="/">← Back to Dashboard</a>
        </body></html>
      `);
    }

    // Get test status
    let testStatus;
    try {
      testStatus = await testRunner.getTestStatus(testId);
    } catch (error) {
      return res.status(404).send(`
        <html><body>
          <h1>Test Not Found</h1>
          <p>No test found with ID: ${testId}</p>
          <a href="/">← Back to Dashboard</a>
        </body></html>
      `);
    }

    // Check if test is completed
    if (testStatus.status === 'running') {
      return res.send(`
        <html>
          <head>
            <title>Test Report - ${testStatus.testName}</title>
            <meta http-equiv="refresh" content="5">
            <style>
              body { font-family: Arial, sans-serif; max-width: 800px; margin: 50px auto; padding: 20px; }
              .status { padding: 20px; background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 5px; }
            </style>
          </head>
          <body>
            <h1>Test Report - ${testStatus.testName}</h1>
            <div class="status">
              <h2>⏳ Test Still Running</h2>
              <p>Test ID: ${testId}</p>
              <p>Project: ${testStatus.projectId}</p>
              <p>Status: ${testStatus.status}</p>
              <p>This page will automatically refresh every 5 seconds until the test completes.</p>
            </div>
            <a href="/">← Back to Dashboard</a>
          </body>
        </html>
      `);
    }

    // Check if HTML report exists
    const reportPath = path.join(__dirname, '../test-runs', testId, 'playwright-report', 'index.html');
    try {
      await fs.access(reportPath);
    } catch (error) {
      return res.status(404).send(`
        <html><body>
          <h1>Report Not Available</h1>
          <p>HTML report for test ${testId} is not available or has been cleaned up.</p>
          <a href="/">← Back to Dashboard</a>
        </body></html>
      `);
    }

    // Generate report viewer HTML
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const reportViewerHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Test Report - ${testStatus.testName}</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            margin: 0;
            padding: 0;
            background-color: #f5f5f5;
        }
        .header {
            background: white;
            padding: 20px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            margin-bottom: 20px;
        }
        .header h1 {
            margin: 0 0 10px 0;
            color: #333;
        }
        .test-info {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin-bottom: 20px;
        }
        .info-card {
            background: #f8f9fa;
            padding: 15px;
            border-radius: 5px;
            border-left: 4px solid #007bff;
        }
        .info-card.passed { border-left-color: #28a745; }
        .info-card.failed { border-left-color: #dc3545; }
        .info-label {
            font-weight: bold;
            color: #666;
            font-size: 12px;
            text-transform: uppercase;
            margin-bottom: 5px;
        }
        .info-value {
            font-size: 16px;
            color: #333;
        }
        .actions {
            margin-bottom: 20px;
        }
        .btn {
            display: inline-block;
            padding: 10px 20px;
            margin-right: 10px;
            background: #007bff;
            color: white;
            text-decoration: none;
            border-radius: 5px;
            font-size: 14px;
        }
        .btn:hover {
            background: #0056b3;
        }
        .btn.secondary {
            background: #6c757d;
        }
        .btn.secondary:hover {
            background: #545b62;
        }
        .report-frame {
            width: 100%;
            height: calc(100vh - 300px);
            border: 1px solid #ddd;
            border-radius: 5px;
            background: white;
        }
        .container {
            max-width: 1400px;
            margin: 0 auto;
            padding: 0 20px;
        }
    </style>
</head>
<body>
    <div class="header">
        <div class="container">
            <h1>📊 Test Report: ${testStatus.testName}</h1>
            <div class="test-info">
                <div class="info-card">
                    <div class="info-label">Test ID</div>
                    <div class="info-value">${testId}</div>
                </div>
                <div class="info-card">
                    <div class="info-label">Project</div>
                    <div class="info-value">${testStatus.projectId}</div>
                </div>
                <div class="info-card ${testStatus.status}">
                    <div class="info-label">Status</div>
                    <div class="info-value">${testStatus.status.toUpperCase()}</div>
                </div>
                <div class="info-card">
                    <div class="info-label">Duration</div>
                    <div class="info-value">${testStatus.duration}ms</div>
                </div>
                <div class="info-card ${testStatus.passed > 0 ? 'passed' : ''}">
                    <div class="info-label">Passed</div>
                    <div class="info-value">${testStatus.passed}</div>
                </div>
                <div class="info-card ${testStatus.failed > 0 ? 'failed' : ''}">
                    <div class="info-label">Failed</div>
                    <div class="info-value">${testStatus.failed}</div>
                </div>
            </div>
            <div class="actions">
                <a href="${baseUrl}/api/report/${testId}/html" target="_blank" class="btn">🔗 Open Report in New Tab</a>
                ${testStatus.downloadUrl ? `<a href="${baseUrl}${testStatus.downloadUrl}" class="btn secondary">📦 Download Full Report</a>` : ''}
                <a href="${baseUrl}/" class="btn secondary">← Back to Dashboard</a>
            </div>
        </div>
    </div>
    <div class="container">
        <iframe src="${baseUrl}/api/report/${testId}/html" class="report-frame" frameborder="0"></iframe>
    </div>
</body>
</html>`;

    res.send(reportViewerHtml);

  } catch (error) {
    logger.error('Report viewer error', {
      testId: req.params.testId,
      error: error.message
    });

    res.status(500).send(`
      <html><body>
        <h1>Error Loading Report</h1>
        <p>Failed to load report for test ${req.params.testId}</p>
        <p>Error: ${error.message}</p>
        <a href="/">← Back to Dashboard</a>
      </body></html>
    `);
  }
});

// Serve raw HTML report files
app.get('/api/report/:testId/html', async (req, res) => {
  try {
    const { testId } = req.params;

    // Validate testId format (UUID)
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(testId)) {
      return res.status(400).send('Invalid test ID format');
    }

    // Check if HTML report exists
    const reportPath = path.join(__dirname, '../test-runs', testId, 'playwright-report', 'index.html');
    try {
      await fs.access(reportPath);
    } catch (error) {
      return res.status(404).send('Report not found');
    }

    // Serve the HTML report file
    res.sendFile(reportPath);

  } catch (error) {
    logger.error('HTML report serving error', {
      testId: req.params.testId,
      error: error.message
    });

    res.status(500).send('Failed to serve HTML report');
  }
});

// Serve static assets for HTML reports (CSS, JS, images, etc.)
app.use('/api/report/:testId/*', (req, res, next) => {
  const { testId } = req.params;

  // Validate testId format (UUID)
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(testId)) {
    return res.status(400).send('Invalid test ID format');
  }

  // Skip if this is one of our API endpoints
  const remainingPath = req.params[0];
  if (remainingPath === 'view' || remainingPath === 'html' || remainingPath === '') {
    return next();
  }

  // Serve static files from the playwright-report directory
  const reportAssetsPath = path.join(__dirname, '../test-runs', testId, 'playwright-report');
  const filePath = path.join(reportAssetsPath, remainingPath);

  // Security check: ensure the file path is within the report directory
  const normalizedReportPath = path.normalize(reportAssetsPath);
  const normalizedFilePath = path.normalize(filePath);

  if (!normalizedFilePath.startsWith(normalizedReportPath)) {
    return res.status(403).send('Access denied');
  }

  // Check if file exists and serve it
  fs.access(filePath)
    .then(() => {
      res.sendFile(filePath);
    })
    .catch(() => {
      res.status(404).send('Asset not found');
    });
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

// Webhook endpoint for external test execution (like from n8n run-tests webhook)
app.post('/webhook-test/run-tests', async (req, res) => {
  try {
    logger.info('Received external run-tests webhook', { body: req.body });

    const {
      project_id,
      test_case_ids,
      run_by_user_id,
      base_url,
      ...options
    } = req.body;

    if (!project_id || !test_case_ids || !Array.isArray(test_case_ids) || test_case_ids.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields for run-tests webhook',
        required: ['project_id', 'test_case_ids (array)']
      });
    }

    // For now, we'll create a simple test execution
    // In a real implementation, you'd fetch test cases from a database
    const testId = uuidv4();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const baseUrl = `${req.protocol}://${req.get('host')}`;

    // Create a sample test based on the provided information
    const testName = `Test Run for Project ${project_id}`;
    const testCode = `
      await page.goto('${base_url || 'https://example.com'}');
      await page.waitForLoadState('networkidle');
      await expect(page).toHaveTitle(/.*/);
    `;

    // Start test execution using the existing test runner
    const testPromise = testRunner.runTest({
      testId,
      projectId: project_id,
      testName,
      testCode,
      browserType: options.browserType || 'chromium',
      headless: options.headless !== false,
      viewport: options.viewport || { width: 1280, height: 720 }
    }).then(async (testResult) => {
      try {
        // Create zip file after test completion
        const zipFileName = `${project_id}_${testId}_${timestamp}.zip`;
        const zipPath = await zipService.createZip({
          testId,
          reportPath: testResult.artifacts.reportPath,
          zipFileName
        });

        testResult.artifacts.zipPath = zipPath;
        testResult.downloadUrl = `/api/download/${zipFileName}`;

        // Update the stored test result with zip information
        try {
          const testDir = path.join(__dirname, '../test-runs', testId);
          const resultPath = path.join(testDir, 'result.json');
          await fs.writeFile(resultPath, JSON.stringify(testResult, null, 2));

          // Also update the in-memory cache
          testRunner.runningTests.set(testId, testResult);

          logger.info('Updated webhook test result with zip information', { testId, zipFileName });
        } catch (saveError) {
          logger.error('Failed to save updated webhook test result', { testId, error: saveError.message });
        }

        logger.info(`Webhook test completed: ${testId}`, {
          status: testResult.status
        });

        return testResult;
      } catch (error) {
        logger.error('Post-test processing failed for webhook test', { testId, error: error.message });
        throw error;
      }
    });

    // Return immediate response with full URLs
    res.status(200).json({
      success: true,
      run_id: testId,
      status: 'started',
      message: 'Test execution started successfully',
      test_count: test_case_ids.length,
      estimated_completion: '30-60 seconds',
      results_url: `${baseUrl}/api/report/${testId}`,
      status_url: `${baseUrl}/api/test/status/${testId}`,
      report_urls: {
        info: `${baseUrl}/api/report/${testId}`,
        view: `${baseUrl}/api/report/${testId}/view`,
        direct: `${baseUrl}/api/report/${testId}/html`
      }
    });

  } catch (error) {
    logger.error('Webhook run-tests error', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Webhook processing failed',
      message: error.message
    });
  }
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
      'GET /dashboard',
      'GET /health',
      'GET /api/docs',
      'GET /convert',
      'GET /create-user',
      'GET /create-project',
      'GET /create-test-case',
      'GET /run-tests',
      'GET /reports',
      'POST /api/test/run',
      'GET /api/test/status/:testId',
      'GET /api/test/list',
      'GET /api/report/:testId',
      'GET /api/report/:testId/view',
      'GET /api/report/:testId/html',
      'GET /api/download/:filename',
      'POST /api/webhook/n8n',
      'POST /webhook-test/run-tests'
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