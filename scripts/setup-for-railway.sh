#!/bin/bash

# Setup script for Railway deployment
# This script prepares the E2E Testing Platform for Railway deployment

echo "🚀 E2E Testing Platform - Railway Setup"
echo "======================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print step
print_step() {
    echo -e "\n${BLUE}📋 Step $1: $2${NC}"
    echo "----------------------------------------"
}

# Function to print success
print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

# Function to print warning
print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

# Function to print error
print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    print_error "package.json not found. Please run this script from the project root directory."
    exit 1
fi

print_step "1" "Installing Dependencies"

# Install npm dependencies
if npm install; then
    print_success "Dependencies installed successfully"
else
    print_error "Failed to install dependencies"
    exit 1
fi

print_step "2" "Installing Playwright Browsers"

# Install Playwright browsers
if npx playwright install; then
    print_success "Playwright browsers installed successfully"
else
    print_error "Failed to install Playwright browsers"
    exit 1
fi

print_step "3" "Creating Required Directories"

# Create directories that might not exist
DIRS=("logs" "test-runs" "reports" "reports/zips" "temp")
for dir in "${DIRS[@]}"; do
    if mkdir -p "$dir"; then
        print_success "Created directory: $dir"
    else
        print_warning "Could not create directory: $dir"
    fi
done

print_step "4" "Verifying Configuration Files"

# Check if railway.toml exists and is configured correctly
if [ -f "railway.toml" ]; then
    print_success "railway.toml found"
else
    print_warning "railway.toml not found, creating default configuration..."
    cat > railway.toml << EOF
[build]
builder = "dockerfile"

[deploy]
healthcheckPath = "/health"
healthcheckTimeout = 30
restartPolicyType = "on_failure"
restartPolicyMaxRetries = 3

[env]
NODE_ENV = "production"
PORT = "3000"
LOG_LEVEL = "info"
EOF
    print_success "Created railway.toml with default configuration"
fi

# Check if Dockerfile exists
if [ -f "Dockerfile" ]; then
    print_success "Dockerfile found"
else
    print_error "Dockerfile not found. This is required for Railway deployment."
    exit 1
fi

print_step "5" "Testing Local Setup"

# Test if the server can start (syntax check)
if node -c src/server.js; then
    print_success "Server syntax is valid"
else
    print_error "Server has syntax errors"
    exit 1
fi

# Test if all required files are present
REQUIRED_FILES=("src/server.js" "package.json" "Dockerfile" "railway.toml")
for file in "${REQUIRED_FILES[@]}"; do
    if [ -f "$file" ]; then
        print_success "Required file found: $file"
    else
        print_error "Required file missing: $file"
        exit 1
    fi
done

print_step "6" "Environment Variables Setup"

echo "The following environment variables will be set in Railway:"
echo "- NODE_ENV=production"
echo "- PORT=3000 (or Railway auto-assigned)"
echo "- LOG_LEVEL=info"
echo ""
echo "Optional variables you might want to add in Railway dashboard:"
echo "- WEBHOOK_URL=https://dipv-digiflux-4.app.n8n.cloud/webhook"
echo "- MAX_CONCURRENT_TESTS=3"
echo "- TEST_TIMEOUT=300000"

print_step "7" "Git Repository Check"

# Check if this is a git repository
if [ -d ".git" ]; then
    print_success "Git repository detected"
    
    # Check if there are uncommitted changes
    if git diff --quiet && git diff --staged --quiet; then
        print_success "No uncommitted changes"
    else
        print_warning "You have uncommitted changes. Consider committing them before deployment."
        echo "Uncommitted files:"
        git status --porcelain
    fi
    
    # Check if we have a remote origin
    if git remote get-url origin &>/dev/null; then
        ORIGIN_URL=$(git remote get-url origin)
        print_success "Remote origin configured: $ORIGIN_URL"
    else
        print_warning "No remote origin configured. You'll need to push to GitHub for Railway deployment."
    fi
else
    print_warning "Not a git repository. You'll need to initialize git and push to GitHub for Railway deployment."
    echo "To initialize git:"
    echo "  git init"
    echo "  git add ."
    echo "  git commit -m 'Initial commit'"
    echo "  git remote add origin <your-github-repo-url>"
    echo "  git push -u origin main"
fi

print_step "8" "Running Pre-deployment Check"

# Run the pre-deployment check script
if [ -f "scripts/pre-deploy-check.sh" ]; then
    if bash scripts/pre-deploy-check.sh; then
        print_success "Pre-deployment check passed"
    else
        print_error "Pre-deployment check failed"
        exit 1
    fi
else
    print_warning "Pre-deployment check script not found"
fi

echo ""
echo -e "${GREEN}🎉 Setup Complete!${NC}"
echo "=================="
echo ""
echo "Your E2E Testing Platform is now ready for Railway deployment!"
echo ""
echo -e "${BLUE}Next Steps:${NC}"
echo "1. 📤 Push your code to GitHub (if not already done)"
echo "2. 🌐 Go to https://railway.app and sign up/login"
echo "3. 🔗 Connect your GitHub repository"
echo "4. 🚀 Deploy with one click"
echo "5. ⚙️  Configure environment variables in Railway dashboard"
echo "6. 🧪 Test your deployed application"
echo ""
echo -e "${BLUE}Useful Commands:${NC}"
echo "- Test locally: npm start"
echo "- Run pre-deploy check: bash scripts/pre-deploy-check.sh"
echo "- View logs: tail -f logs/app.log"
echo ""
echo -e "${BLUE}Documentation:${NC}"
echo "- Railway Deployment Guide: docs/railway-deployment-guide.md"
echo "- README: README.md"
echo "- API Documentation: docs/api-documentation.md"
echo ""
echo -e "${GREEN}Happy Testing! 🧪✨${NC}"
