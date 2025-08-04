#!/bin/bash
echo "🧹 Cleaning up old test files..."

# Remove test runs older than 24 hours
find test-runs -type d -mtime +1 -exec rm -rf {} + 2>/dev/null || true

# Remove old zip files
find reports/zips -type f -name "*.zip" -mtime +1 -delete 2>/dev/null || true

# Remove old log files
find logs -type f -name "*.log" -mtime +7 -delete 2>/dev/null || true

echo "✅ Cleanup completed"
