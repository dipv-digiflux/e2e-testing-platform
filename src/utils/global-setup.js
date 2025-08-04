// global-setup.js
const fs = require('fs');
const path = require('path');

async function globalSetup(config) {
  console.log('🔧 Setting up test environment...');
  
  // Ensure output directories exist
  const outputDir = config.outputDir || 'test-results';
  const reportDir = path.join(process.cwd(), 'playwright-report');
  
  await fs.promises.mkdir(outputDir, { recursive: true });
  await fs.promises.mkdir(reportDir, { recursive: true });
  
  // Log environment info
  console.log(`📁 Output directory: ${outputDir}`);
  console.log(`📊 Report directory: ${reportDir}`);
  console.log(`🌐 Browser: ${process.env.BROWSER_TYPE || 'chromium'}`);
  console.log(`👁️  Headless: ${process.env.HEADLESS || 'true'}`);
  console.log(`📱 Viewport: ${process.env.VIEWPORT_WIDTH || 1280}x${process.env.VIEWPORT_HEIGHT || 720}`);
  
  console.log('✅ Test environment setup complete');
}

module.exports = globalSetup;