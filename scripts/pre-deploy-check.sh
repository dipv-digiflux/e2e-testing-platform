#!/bin/bash

# Pre-deployment check script for E2E Testing Platform
# This script verifies that all required files and configurations are in place

echo "🔍 E2E Testing Platform - Pre-Deployment Check"
echo "=============================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Counters
PASSED=0
FAILED=0

# Function to check if file exists
check_file() {
    if [ -f "$1" ]; then
        echo -e "${GREEN}✓${NC} $1 exists"
        ((PASSED++))
    else
        echo -e "${RED}✗${NC} $1 is missing"
        ((FAILED++))
    fi
}

# Function to check if directory exists
check_directory() {
    if [ -d "$1" ]; then
        echo -e "${GREEN}✓${NC} $1 directory exists"
        ((PASSED++))
    else
        echo -e "${YELLOW}!${NC} $1 directory missing (will be created automatically)"
    fi
}

# Function to check package.json content
check_package_json() {
    if [ -f "package.json" ]; then
        # Check for required scripts
        if grep -q '"start".*"node src/server.js"' package.json; then
            echo -e "${GREEN}✓${NC} Start script configured correctly"
            ((PASSED++))
        else
            echo -e "${RED}✗${NC} Start script not configured correctly"
            ((FAILED++))
        fi
        
        # Check for Node.js version
        if grep -q '"node".*">=18.0.0"' package.json; then
            echo -e "${GREEN}✓${NC} Node.js version specified correctly"
            ((PASSED++))
        else
            echo -e "${YELLOW}!${NC} Node.js version not specified (recommended: >=18.0.0)"
        fi
        
        # Check for required dependencies
        REQUIRED_DEPS=("express" "@playwright/test" "winston" "cors" "helmet")
        for dep in "${REQUIRED_DEPS[@]}"; do
            if grep -q "\"$dep\"" package.json; then
                echo -e "${GREEN}✓${NC} $dep dependency found"
                ((PASSED++))
            else
                echo -e "${RED}✗${NC} $dep dependency missing"
                ((FAILED++))
            fi
        done
    fi
}

# Function to check Dockerfile
check_dockerfile() {
    if [ -f "Dockerfile" ]; then
        if grep -q "FROM mcr.microsoft.com/playwright" Dockerfile; then
            echo -e "${GREEN}✓${NC} Dockerfile uses Playwright base image"
            ((PASSED++))

            # Check if Playwright version matches between package.json and Dockerfile
            if [ -f "package.json" ]; then
                PACKAGE_VERSION=$(grep -o '"@playwright/test".*"[^"]*"' package.json | grep -o '[0-9]\+\.[0-9]\+\.[0-9]\+')
                DOCKER_VERSION=$(grep -o 'playwright:v[0-9]\+\.[0-9]\+\.[0-9]\+' Dockerfile | grep -o '[0-9]\+\.[0-9]\+\.[0-9]\+')

                if [ "$PACKAGE_VERSION" = "$DOCKER_VERSION" ]; then
                    echo -e "${GREEN}✓${NC} Playwright versions match (package.json: $PACKAGE_VERSION, Dockerfile: $DOCKER_VERSION)"
                    ((PASSED++))
                else
                    echo -e "${RED}✗${NC} Playwright version mismatch (package.json: $PACKAGE_VERSION, Dockerfile: $DOCKER_VERSION)"
                    echo -e "${YELLOW}!${NC} Update Dockerfile to use: mcr.microsoft.com/playwright:v$PACKAGE_VERSION-jammy"
                    ((FAILED++))
                fi
            fi
        else
            echo -e "${RED}✗${NC} Dockerfile doesn't use Playwright base image"
            ((FAILED++))
        fi

        if grep -q "EXPOSE 3000" Dockerfile; then
            echo -e "${GREEN}✓${NC} Dockerfile exposes port 3000"
            ((PASSED++))
        else
            echo -e "${RED}✗${NC} Dockerfile doesn't expose port 3000"
            ((FAILED++))
        fi
    fi
}

# Function to check railway.toml
check_railway_config() {
    if [ -f "railway.toml" ]; then
        if grep -q 'builder = "dockerfile"' railway.toml; then
            echo -e "${GREEN}✓${NC} Railway configured to use Dockerfile"
            ((PASSED++))
        else
            echo -e "${RED}✗${NC} Railway not configured to use Dockerfile"
            ((FAILED++))
        fi
        
        if grep -q 'healthcheckPath = "/health"' railway.toml; then
            echo -e "${GREEN}✓${NC} Health check path configured"
            ((PASSED++))
        else
            echo -e "${RED}✗${NC} Health check path not configured"
            ((FAILED++))
        fi
    fi
}

echo ""
echo "📁 Checking required files..."
echo "-----------------------------"

# Check required files
check_file "package.json"
check_file "package-lock.json"
check_file "Dockerfile"
check_file "railway.toml"
check_file "src/server.js"
check_file "playwright.config.js"

echo ""
echo "📂 Checking directories..."
echo "-------------------------"

# Check required directories
check_directory "src"
check_directory "src/services"
check_directory "src/utils"
check_directory "public"
check_directory "docs"
check_directory "scripts"

# Check auto-created directories
check_directory "logs"
check_directory "test-runs"
check_directory "reports"
check_directory "temp"

echo ""
echo "📋 Checking public HTML files..."
echo "--------------------------------"

# Check public HTML files
PUBLIC_FILES=("index.html" "create-user.html" "create-project.html" "create-test-case.html" "run-tests.html")
for file in "${PUBLIC_FILES[@]}"; do
    check_file "public/$file"
done

echo ""
echo "⚙️  Checking configuration files..."
echo "-----------------------------------"

# Check package.json content
check_package_json

# Check Dockerfile content
check_dockerfile

# Check railway.toml content
check_railway_config

echo ""
echo "🔧 Checking Node.js and npm..."
echo "------------------------------"

# Check Node.js version
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    echo -e "${GREEN}✓${NC} Node.js installed: $NODE_VERSION"
    ((PASSED++))
    
    # Check if version is >= 18
    NODE_MAJOR=$(echo $NODE_VERSION | cut -d'.' -f1 | sed 's/v//')
    if [ "$NODE_MAJOR" -ge 18 ]; then
        echo -e "${GREEN}✓${NC} Node.js version is compatible (>=18)"
        ((PASSED++))
    else
        echo -e "${RED}✗${NC} Node.js version is too old (need >=18)"
        ((FAILED++))
    fi
else
    echo -e "${RED}✗${NC} Node.js not installed"
    ((FAILED++))
fi

# Check npm
if command -v npm &> /dev/null; then
    NPM_VERSION=$(npm --version)
    echo -e "${GREEN}✓${NC} npm installed: $NPM_VERSION"
    ((PASSED++))
else
    echo -e "${RED}✗${NC} npm not installed"
    ((FAILED++))
fi

echo ""
echo "📦 Checking dependencies..."
echo "--------------------------"

# Check if node_modules exists
if [ -d "node_modules" ]; then
    echo -e "${GREEN}✓${NC} Dependencies installed"
    ((PASSED++))
else
    echo -e "${YELLOW}!${NC} Dependencies not installed (run 'npm install')"
fi

# Check if Playwright browsers are installed
if [ -d "node_modules/@playwright" ]; then
    echo -e "${GREEN}✓${NC} Playwright package found"
    ((PASSED++))
else
    echo -e "${RED}✗${NC} Playwright package not found"
    ((FAILED++))
fi

echo ""
echo "🧪 Running basic tests..."
echo "------------------------"

# Test if server can start (syntax check)
if node -c src/server.js 2>/dev/null; then
    echo -e "${GREEN}✓${NC} Server file syntax is valid"
    ((PASSED++))
else
    echo -e "${RED}✗${NC} Server file has syntax errors"
    ((FAILED++))
fi

echo ""
echo "📊 Summary"
echo "=========="
echo -e "Passed: ${GREEN}$PASSED${NC}"
echo -e "Failed: ${RED}$FAILED${NC}"

if [ $FAILED -eq 0 ]; then
    echo ""
    echo -e "${GREEN}🎉 All checks passed! Your project is ready for deployment.${NC}"
    echo ""
    echo "Next steps:"
    echo "1. Commit all changes to your Git repository"
    echo "2. Push to GitHub"
    echo "3. Deploy to Railway following the deployment guide"
    echo "4. Test the deployed application"
    exit 0
else
    echo ""
    echo -e "${RED}❌ Some checks failed. Please fix the issues above before deploying.${NC}"
    echo ""
    echo "Common fixes:"
    echo "- Run 'npm install' to install dependencies"
    echo "- Run 'npx playwright install' to install browsers"
    echo "- Check that all required files are present"
    echo "- Verify configuration files are correct"
    exit 1
fi
