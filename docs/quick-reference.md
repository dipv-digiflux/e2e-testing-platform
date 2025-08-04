# E2E Testing Platform - Quick Reference

## 🚀 Deployment Quick Start

### Railway Deployment (Recommended - Free)
```bash
# 1. Setup for deployment
bash scripts/setup-for-railway.sh

# 2. Verify everything is ready
bash scripts/pre-deploy-check.sh

# 3. Deploy to Railway
# - Go to https://railway.app
# - Connect GitHub repository
# - Deploy with one click
```

### Local Development
```bash
# Install dependencies
npm install
npx playwright install

# Start development server
npm run dev

# Access at http://localhost:3000
```

## 📋 User Workflow

### For End Users (No Technical Knowledge)
1. **Create User** → Fill name, email, role
2. **Create Project** → Add project name, description, base URL
3. **Create Test Case** → Select project, add test details
4. **Run Tests** → Select project and tests, execute
5. **Download Report** → Get test results and screenshots

### For Developers
1. **API Integration** → Use REST endpoints
2. **Webhook Setup** → Configure n8n integration
3. **Custom Tests** → Write Playwright test scripts
4. **Automation** → Set up CI/CD pipelines

## 🔗 Important URLs

### Local Development
- **Homepage**: http://localhost:3000
- **Health Check**: http://localhost:3000/health
- **API Docs**: http://localhost:3000/api/docs

### Production (Replace with your Railway URL)
- **Homepage**: https://your-app.up.railway.app
- **Health Check**: https://your-app.up.railway.app/health
- **API Docs**: https://your-app.up.railway.app/api/docs

## 📡 API Endpoints

### Core Endpoints
```bash
# Users
POST /api/users              # Create user
GET  /api/users              # List users

# Projects  
POST /api/projects           # Create project
GET  /api/projects           # List projects

# Test Cases
POST /api/test-cases         # Create test case
GET  /api/test-cases         # List all test cases
GET  /api/test-cases/:projectId  # Get project test cases

# Test Execution
POST /api/run-tests          # Run tests
GET  /api/reports/:testId    # Get test report
GET  /api/download/:testId   # Download report
DELETE /api/report/:testId   # Delete test report

# Utilities
GET  /health                 # Health check
POST /api/convert-test       # Convert recorded test
```

### Example API Calls
```bash
# Create a user
curl -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -d '{"name": "John Doe", "email": "john@example.com", "role": "tester"}'

# Create a project
curl -X POST http://localhost:3000/api/projects \
  -H "Content-Type: application/json" \
  -d '{"name": "My App", "description": "Test project", "baseUrl": "https://example.com"}'

# Run tests
curl -X POST http://localhost:3000/api/run-tests \
  -H "Content-Type: application/json" \
  -d '{"projectId": "project-id", "testCaseIds": ["test-1", "test-2"]}'
```

## ⚙️ Environment Variables

### Required for Production
```bash
NODE_ENV=production
PORT=3000
LOG_LEVEL=info
```

### Optional Configuration
```bash
WEBHOOK_URL=https://dipv-digiflux-4.app.n8n.cloud/webhook
MAX_CONCURRENT_TESTS=3
TEST_TIMEOUT=300000
```

## 🛠 Troubleshooting

### Common Issues

#### "Tests not running"
```bash
# Install Playwright browsers
npx playwright install
```

#### "Port 3000 already in use"
```bash
# Kill process on port 3000
lsof -ti:3000 | xargs kill -9

# Or use different port
PORT=3001 npm start
```

#### "Out of memory"
```bash
# Reduce concurrent tests
MAX_CONCURRENT_TESTS=1

# Or increase Docker memory limits
```

#### "Build fails on Railway"
- Check all files are committed to Git
- Verify Dockerfile syntax
- Check package.json dependencies

### Debug Commands
```bash
# Check syntax
node -c src/server.js

# View logs
tail -f logs/app.log

# Test health endpoint
curl http://localhost:3000/health

# Run pre-deployment check
bash scripts/pre-deploy-check.sh
```

## 📁 File Structure

### Key Files
```
├── src/server.js              # Main application
├── package.json               # Dependencies
├── Dockerfile                 # Container config
├── railway.toml               # Railway config
├── playwright.config.js       # Test config
└── README.md                  # Documentation
```

### Directories
```
├── public/                    # Web interface
├── src/services/              # Business logic
├── src/utils/                 # Utilities
├── docs/                      # Documentation
├── scripts/                   # Deployment scripts
├── test-runs/                 # Test results
├── reports/                   # Generated reports
└── logs/                      # Application logs
```

## 🔐 Security Features

- **Rate Limiting**: 50 requests per 15 minutes
- **Helmet.js**: Security headers
- **CORS**: Cross-origin protection
- **Input Validation**: Sanitized inputs
- **File Upload Limits**: 10MB max

## 📊 Performance Tips

- **Parallel Tests**: Run multiple tests concurrently
- **Resource Monitoring**: Check memory and CPU usage
- **Cleanup**: Old test results are auto-cleaned
- **Optimization**: Use efficient selectors in tests

## 🆘 Getting Help

### Documentation
- **Full README**: README.md
- **Railway Guide**: docs/railway-deployment-guide.md
- **API Docs**: docs/api-documentation.md
- **Deployment Checklist**: docs/deployment-checklist.md

### Support Channels
- **GitHub Issues**: Report bugs and feature requests
- **GitHub Discussions**: Ask questions
- **Railway Support**: For deployment issues

## 🎯 Best Practices

### For End Users
1. Use descriptive test names
2. Organize tests by project
3. Run tests regularly
4. Review test reports
5. Keep test cases updated

### For Developers
1. Follow REST API conventions
2. Handle errors gracefully
3. Use environment variables
4. Write comprehensive tests
5. Monitor application performance

### For Deployment
1. Run pre-deployment checks
2. Test locally first
3. Monitor after deployment
4. Set up proper logging
5. Plan for scaling

---

**Quick Links:**
- [Full Documentation](../README.md)
- [Railway Deployment Guide](railway-deployment-guide.md)
- [API Documentation](api-documentation.md)
- [Deployment Checklist](deployment-checklist.md)
