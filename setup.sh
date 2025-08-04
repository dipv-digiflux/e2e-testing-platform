#!/bin/bash

# E2E Testing Platform Setup Script
# This script sets up the complete environment for the E2E Testing Platform

set -e

echo "🚀 Setting up E2E Testing Platform..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_header() {
    echo -e "${BLUE}[SETUP]${NC} $1"
}

# Check if running in Docker
if [ -f /.dockerenv ]; then
    print_status "Running inside Docker container"
    IN_DOCKER=true
else
    print_status "Running on host system"
    IN_DOCKER=false
fi

# Create required directories
print_header "Creating directory structure..."
mkdir -p test-runs
mkdir -p reports/zips
mkdir -p logs
mkdir -p temp
mkdir -p examples
mkdir -p scripts

print_status "Directories created successfully"

# Check Node.js version
print_header "Checking Node.js version..."
if command -v node >/dev/null 2>&1; then
    NODE_VERSION=$(node --version)
    print_status "Node.js version: $NODE_VERSION"
    
    # Check if Node.js version is 18 or higher
    NODE_MAJOR=$(echo $NODE_VERSION | cut -d'.' -f1 | sed 's/v//')
    if [ "$NODE_MAJOR" -lt 18 ]; then
        print_error "Node.js 18 or higher is required. Current version: $NODE_VERSION"
        exit 1
    fi
else
    print_error "Node.js not found. Please install Node.js 18 or higher."
    exit 1
fi

# Install dependencies if not in Docker
if [ "$IN_DOCKER" = false ]; then
    print_header "Installing Node.js dependencies..."
    if [ -f package.json ]; then
        npm install
        print_status "Dependencies installed successfully"
    else
        print_error "package.json not found. Please run this script from the project root."
        exit 1
    fi

    # Install Playwright browsers
    print_header "Installing Playwright browsers..."
    npx playwright install chromium firefox webkit
    print_status "Playwright browsers installed successfully"
else
    print_status "Skipping dependency installation (running in Docker)"
fi

# Set proper permissions
print_header "Setting up permissions..."
chmod -R 755 test-runs reports logs temp
chmod +x scripts/*.sh 2>/dev/null || true
print_status "Permissions set successfully"

# Create environment file if it doesn't exist
print_header "Setting up environment configuration..."
if [ ! -f .env ]; then
    cat > .env << EOF
# E2E Testing Platform Environment Configuration
NODE_ENV=development
PORT=3000
LOG_LEVEL=info

# Optional: Uncomment and configure as needed
# BROWSER_TIMEOUT=30000
# MAX_CONCURRENT_TESTS=5
# CLEANUP_INTERVAL=6
# REPORT_RETENTION_HOURS=24
EOF
    print_status "Environment file created (.env)"
else
    print_status "Environment file already exists"
fi

# Create Docker ignore file
print_header "Creating Docker configuration..."
if [ ! -f .dockerignore ]; then
    cat > .dockerignore << EOF
node_modules
npm-debug.log
.git
.gitignore
README.md
.env
.nyc_output
coverage
.nyc_output
.vscode
.DS_Store
test-runs
reports
logs
temp
*.log
EOF
    print_status "Docker ignore file created"
fi

# Create development scripts
print_header "Creating development scripts..."

# Development start script
cat > scripts/dev.sh << 'EOF'
#!/bin/bash
echo "🔧 Starting E2E Testing Platform in development mode..."
export NODE_ENV=development
export LOG_LEVEL=debug
npm run dev
EOF

# Production start script
cat > scripts/start.sh << 'EOF'
#!/bin/bash
echo "🚀 Starting E2E Testing Platform in production mode..."
export NODE_ENV=production
export LOG_LEVEL=info
npm start
EOF

# Test script
cat > scripts/test.sh << 'EOF'
#!/bin/bash
echo "🧪 Running tests..."

# Health check
echo "Testing health endpoint..."
curl -f http://localhost:3000/health || {
    echo "❌ Health check failed. Is the server running?"
    exit 1
}

# API documentation check
echo "Testing API docs endpoint..."
curl -f http://localhost:3000/api/docs || {
    echo "❌ API docs check failed"
    exit 1
}

echo "✅ Basic tests passed"
EOF

# Cleanup script
cat > scripts/cleanup.sh << 'EOF'
#!/bin/bash
echo "🧹 Cleaning up old test files..."

# Remove test runs older than 24 hours
find test-runs -type d -mtime +1 -exec rm -rf {} + 2>/dev/null || true

# Remove old zip files
find reports/zips -type f -name "*.zip" -mtime +1 -delete 2>/dev/null || true

# Remove old log files
find logs -type f -name "*.log" -mtime +7 -delete 2>/dev/null || true

echo "✅ Cleanup completed"
EOF

# Make scripts executable
chmod +x scripts/*.sh
print_status "Development scripts created and made executable"

# Create sample test request
print_header "Creating sample test files..."
cat > examples/sample-request.json << 'EOF'
{
  "projectId": "sample-project",
  "testName": "Basic Website Test",
  "testCode": "await page.goto('https://example.com'); await expect(page.getByRole('heading')).toBeVisible(); await page.screenshot({ path: 'example-screenshot.png' });",
  "browserType": "chromium",
  "headless": true,
  "viewport": {
    "width": 1280,
    "height": 720
  }
}
EOF

# Create sample curl commands
cat > examples/sample-commands.sh << 'EOF'
#!/bin/bash

# Sample API calls for E2E Testing Platform

BASE_URL="http://localhost:3000"

echo "🌐 Testing E2E Platform API endpoints..."

# 1. Health check
echo "1. Health Check:"
curl -s "$BASE_URL/health" | jq '.'

echo -e "\n2. API Documentation:"
curl -s "$BASE_URL/api/docs" | jq '.endpoints | keys'

# 3. Sample test execution
echo -e "\n3. Sample Test Execution:"
RESPONSE=$(curl -s -X POST "$BASE_URL/api/test/run" \
  -H "Content-Type: application/json" \
  -d '{
    "projectId": "curl-test",
    "testName": "Sample Curl Test",
    "testCode": "await page.goto('\''https://example.com'\''); await expect(page.getByRole('\''heading'\'')).toBeVisible();"
  }')

echo "$RESPONSE" | jq '.'

# Extract test ID for status check
TEST_ID=$(echo "$RESPONSE" | jq -r '.testId')

if [ "$TEST_ID" != "null" ] && [ "$TEST_ID" != "" ]; then
    echo -e "\n4. Checking Test Status:"
    sleep 5  # Wait a bit for test to start
    curl -s "$BASE_URL/api/test/status/$TEST_ID" | jq '.'
else
    echo "❌ Failed to get test ID"
fi

echo -e "\n✅ API test completed"
EOF

chmod +x examples/sample-commands.sh
print_status "Sample files created"

# Verify Playwright installation
print_header "Verifying Playwright installation..."
if [ "$IN_DOCKER" = false ]; then
    if npx playwright install --dry-run >/dev/null 2>&1; then
        print_status "Playwright installation verified"
    else
        print_warning "Playwright installation verification failed"
    fi
fi

# Create systemd service file (for production Linux deployment)
print_header "Creating systemd service file..."
cat > scripts/e2e-platform.service << EOF
[Unit]
Description=E2E Testing Platform
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=$(pwd)
Environment=NODE_ENV=production
Environment=PORT=3000
ExecStart=/usr/bin/node src/server.js
Restart=on-failure
RestartSec=10
StandardOutput=syslog
StandardError=syslog
SyslogIdentifier=e2e-platform

[Install]
WantedBy=multi-user.target
EOF
print_status "Systemd service file created (scripts/e2e-platform.service)"

# Create Railway deployment template
print_header "Creating Railway template..."
cat > railway-template.json << EOF
{
  "name": "E2E Testing Platform",
  "description": "Automated end-to-end testing platform with Playwright",
  "repository": "https://github.com/dipv-digiflux/e2e-testing-platform",
  "services": [
    {
      "name": "e2e-platform",
      "source": {
        "type": "github",
        "repo": "dipv-digiflux/e2e-testing-platform"
      },
      "variables": {
        "NODE_ENV": "production",
        "LOG_LEVEL": "info"
      },
      "healthcheck": {
        "path": "/health",
        "timeout": 30
      }
    }
  ]
}
EOF
print_status "Railway template created"

# Final verification
print_header "Running final verification..."

# Check if all required files exist
REQUIRED_FILES=(
    "package.json"
    "src/server.js"
    "src/services/TestRunner.js"
    "src/services/ZipService.js"
    "src/utils/logger.js"
    "Dockerfile"
    "playwright.config.js"
)

MISSING_FILES=()
for file in "${REQUIRED_FILES[@]}"; do
    if [ ! -f "$file" ]; then
        MISSING_FILES+=("$file")
    fi
done

if [ ${#MISSING_FILES[@]} -eq 0 ]; then
    print_status "All required files are present"
else
    print_error "Missing required files:"
    for file in "${MISSING_FILES[@]}"; do
        echo "  - $file"
    done
    exit 1
fi

# Check directory structure
REQUIRED_DIRS=(
    "test-runs"
    "reports"
    "reports/zips"
    "logs"
    "scripts"
    "examples"
)

for dir in "${REQUIRED_DIRS[@]}"; do
    if [ ! -d "$dir" ]; then
        print_error "Missing directory: $dir"
        exit 1
    fi
done

print_status "Directory structure verified"

# Display final instructions
print_header "Setup completed successfully! 🎉"
echo ""
echo "Next steps:"
echo "1. Review the .env file and adjust settings if needed"
echo "2. Start the development server:"
echo "   npm run dev  # or ./scripts/dev.sh"
echo ""
echo "3. Test the API:"
echo "   ./examples/sample-commands.sh"
echo ""
echo "4. For production deployment:"
echo "   - Railway: Push to GitHub and deploy via Railway dashboard"
echo "   - Docker: docker-compose up -d"
echo "   - Manual: ./scripts/start.sh"
echo ""
echo "📚 Documentation:"
echo "   - API Docs: http://localhost:3000/api/docs"
echo "   - Health Check: http://localhost:3000/health"
echo "   - README.md for detailed information"
echo ""
echo "🔧 Useful commands:"
echo "   - npm run dev          # Start development server"
echo "   - npm start           # Start production server"
echo "   - ./scripts/cleanup.sh # Clean old test files"
echo "   - ./scripts/test.sh    # Run basic tests"
echo ""

# Check if jq is available for JSON parsing
if ! command -v jq >/dev/null 2>&1; then
    print_warning "jq is not installed. Install it for better JSON output formatting:"
    print_warning "  Ubuntu/Debian: sudo apt-get install jq"
    print_warning "  MacOS: brew install jq"
    print_warning "  CentOS/RHEL: sudo yum install jq"
fi

print_status "Setup script completed successfully!"
echo ""