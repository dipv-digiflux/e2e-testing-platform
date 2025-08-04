const archiver = require('archiver');
const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

class ZipService {
  async createZip({ testId, reportPath, zipFileName }) {
    return new Promise(async (resolve, reject) => {
      try {
        const testDir = path.join(__dirname, '../../test-runs', testId);
        const zipsDir = path.join(__dirname, '../../reports/zips');
        const zipPath = path.join(zipsDir, zipFileName);

        // Ensure zips directory exists
        await fs.promises.mkdir(zipsDir, { recursive: true });

        // Create write stream for zip file
        const output = fs.createWriteStream(zipPath);
        const archive = archiver('zip', {
          zlib: { level: 9 } // Maximum compression
        });

        // Handle archive events
        output.on('close', () => {
          const sizeInMB = (archive.pointer() / 1024 / 1024).toFixed(2);
          logger.info(`Zip file created: ${zipFileName} (${sizeInMB} MB)`, { testId });
          resolve(zipPath);
        });

        output.on('error', (err) => {
          logger.error('Zip output stream error', { testId, error: err.message });
          reject(err);
        });

        archive.on('warning', (err) => {
          if (err.code === 'ENOENT') {
            logger.warn('Zip archive warning', { testId, warning: err.message });
          } else {
            logger.error('Zip archive error', { testId, error: err.message });
            reject(err);
          }
        });

        archive.on('error', (err) => {
          logger.error('Zip archive error', { testId, error: err.message });
          reject(err);
        });

        // Pipe archive data to the file
        archive.pipe(output);

        // Add the entire test directory to zip
        logger.info(`Adding test directory to zip: ${testDir}`, { testId });
        
        // Check if test directory exists
        try {
          await fs.promises.access(testDir);
        } catch (error) {
          throw new Error(`Test directory not found: ${testDir}`);
        }

        // Add the playwright-report directory (HTML report)
        // Try multiple possible locations for the HTML report
        const possibleReportDirs = [
          path.join(testDir, 'playwright-report'),
          path.join(testDir, 'test-results', 'playwright-report')
        ];

        let reportAdded = false;
        for (const playwrightReportDir of possibleReportDirs) {
          try {
            await fs.promises.access(playwrightReportDir);
            archive.directory(playwrightReportDir, 'playwright-report');
            logger.info('Added playwright-report to zip', { testId, path: playwrightReportDir });
            reportAdded = true;
            break;
          } catch (error) {
            // Continue to next possible location
          }
        }

        if (!reportAdded) {
          logger.warn('Playwright report directory not found in any expected location', {
            testId,
            searchedPaths: possibleReportDirs
          });
        }

        // Add test-results directory (traces, videos, screenshots)
        const testResultsDir = path.join(testDir, 'test-results');
        try {
          await fs.promises.access(testResultsDir);
          archive.directory(testResultsDir, 'test-results');
          logger.info('Added test-results to zip', { testId });
        } catch (error) {
          logger.warn('Test results directory not found', { testId, path: testResultsDir });
        }

        // Add test files
        const testsDir = path.join(testDir, 'tests');
        try {
          await fs.promises.access(testsDir);
          archive.directory(testsDir, 'tests');
          logger.info('Added tests to zip', { testId });
        } catch (error) {
          logger.warn('Tests directory not found', { testId, path: testsDir });
        }

        // Add individual result files
        const resultFiles = ['result.json', 'test-results.json', 'test-results.xml', 'playwright.config.js'];
        
        for (const fileName of resultFiles) {
          const filePath = path.join(testDir, fileName);
          try {
            await fs.promises.access(filePath);
            archive.file(filePath, { name: fileName });
            logger.info(`Added ${fileName} to zip`, { testId });
          } catch (error) {
            logger.warn(`File not found: ${fileName}`, { testId, path: filePath });
          }
        }

        // Add a manifest file with test information
        const manifest = await this.createManifest(testId, testDir);
        archive.append(JSON.stringify(manifest, null, 2), { name: 'manifest.json' });

        // Add README file
        const readme = this.createReadme(manifest);
        archive.append(readme, { name: 'README.md' });

        // Finalize the archive
        logger.info('Finalizing zip archive', { testId });
        await archive.finalize();

      } catch (error) {
        logger.error('Error creating zip file', { testId, error: error.message, stack: error.stack });
        reject(error);
      }
    });
  }

  async createManifest(testId, testDir) {
    const manifest = {
      testId,
      createdAt: new Date().toISOString(),
      version: '1.0.0',
      contents: {
        'playwright-report/': 'HTML test report with interactive features',
        'test-results/': 'Raw test artifacts (traces, videos, screenshots)',
        'tests/': 'Test specification files',
        'result.json': 'Structured test execution results',
        'test-results.json': 'Playwright native test results',
        'test-results.xml': 'JUnit XML test results',
        'playwright.config.js': 'Playwright configuration used for this test',
        'manifest.json': 'This manifest file',
        'README.md': 'Instructions for viewing the test results'
      },
      instructions: {
        htmlReport: 'Open playwright-report/index.html in a web browser to view the interactive report',
        traces: 'Open .zip files in test-results/ with Playwright trace viewer',
        videos: 'Video files are in test-results/ directory',
        screenshots: 'Screenshot files are in test-results/ directory'
      }
    };

    // Try to add test result information
    try {
      const resultPath = path.join(testDir, 'result.json');
      const resultData = await fs.promises.readFile(resultPath, 'utf8');
      const testResult = JSON.parse(resultData);
      
      manifest.testInfo = {
        projectId: testResult.projectId,
        testName: testResult.testName,
        status: testResult.status,
        duration: testResult.duration,
        browserType: testResult.browserType,
        startTime: testResult.startTime,
        endTime: testResult.endTime
      };
    } catch (error) {
      logger.warn('Could not read test result for manifest', { testId, error: error.message });
    }

    return manifest;
  }

  createReadme(manifest) {
    return `# Test Results - ${manifest.testInfo?.testName || 'Unknown Test'}

## Test Information
- **Test ID:** ${manifest.testId}
- **Project ID:** ${manifest.testInfo?.projectId || 'Unknown'}
- **Status:** ${manifest.testInfo?.status || 'Unknown'}
- **Duration:** ${manifest.testInfo?.duration ? (manifest.testInfo.duration / 1000).toFixed(2) + 's' : 'Unknown'}
- **Browser:** ${manifest.testInfo?.browserType || 'Unknown'}
- **Generated:** ${new Date(manifest.createdAt).toLocaleString()}

## How to View Results

### 1. HTML Report (Recommended)
Open \`playwright-report/index.html\` in your web browser for an interactive test report with:
- Test execution timeline
- Screenshots and videos
- Error details and stack traces
- Network activity
- Console logs

### 2. Trace Files
Open \`.zip\` files in the \`test-results/\` directory using Playwright's trace viewer:
\`\`\`bash
npx playwright show-trace test-results/trace.zip
\`\`\`

### 3. Videos and Screenshots
- Videos: \`test-results/*.webm\`
- Screenshots: \`test-results/*.png\`

### 4. Raw Results
- \`result.json\` - Structured test results
- \`test-results.json\` - Playwright native results
- \`test-results.xml\` - JUnit XML format

## Directory Structure
\`\`\`
${Object.entries(manifest.contents).map(([path, desc]) => `${path.padEnd(25)} - ${desc}`).join('\n')}
\`\`\`

## Troubleshooting
- If the HTML report doesn't display properly, ensure you're opening it via HTTP (not file://)
- For trace files, make sure you have Playwright installed: \`npm install -g @playwright/test\`
- Videos may require specific codecs to play in your browser

---
Generated by E2E Testing Platform v${manifest.version}
`;
  }

  async getZipInfo(zipPath) {
    try {
      const stats = await fs.promises.stat(zipPath);
      return {
        exists: true,
        size: stats.size,
        sizeInMB: (stats.size / 1024 / 1024).toFixed(2),
        created: stats.birthtime,
        modified: stats.mtime
      };
    } catch (error) {
      return {
        exists: false,
        error: error.message
      };
    }
  }
}

module.exports = ZipService;