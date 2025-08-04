// global-teardown.js
async function globalTeardown(config) {
  console.log('🧹 Cleaning up test environment...');
  
  // Perform any necessary cleanup
  // This could include closing databases, cleaning temp files, etc.
  
  console.log('✅ Test environment cleanup complete');
}

module.exports = globalTeardown;