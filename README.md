# E2E Testing Platform

A comprehensive end-to-end testing platform built with Node.js, Express, and Playwright. This platform allows users to create, manage, and execute automated tests through a web interface.

## 🚀 Live Demo

**Platform URL**: [Your Railway Deployment URL]

## 📋 Table of Contents

- [Features](#features)
- [Quick Start](#quick-start)
- [For End Users](#for-end-users)
- [For Developers](#for-developers)
- [API Documentation](#api-documentation)
- [Deployment](#deployment)
- [Architecture](#architecture)
- [Contributing](#contributing)
- [Support](#support)

## ✨ Features

### Core Functionality
- **User Management**: Create and manage test users
- **Project Organization**: Organize tests by projects
- **Test Case Management**: Create and manage test cases
- **Automated Test Execution**: Run tests with Playwright
- **Real-time Reporting**: Generate and download test reports
- **Webhook Integration**: Integration with n8n workflows

### Technical Features
- **Web-based Interface**: No installation required for end users
- **RESTful API**: Full API access for automation
- **Docker Support**: Easy deployment and scaling
- **Rate Limiting**: Built-in protection against abuse
- **Logging**: Comprehensive logging system
- **Security**: Helmet.js security headers and CORS support

## 🚀 Quick Start

### For End Users (No Technical Knowledge Required)

1. **Access the Platform**: Go to [Your Platform URL]
2. **Create a User**: Click "Create User" and fill in your details
3. **Create a Project**: Set up a project to organize your tests
4. **Add Test Cases**: Create test cases for your application
5. **Run Tests**: Execute your tests and download reports

### For Developers

#### Prerequisites
- Node.js 18+ 
- Docker (optional)
- Git

#### Local Development Setup

```bash
# Clone the repository
git clone https://github.com/your-username/e2e-test-platform.git
cd e2e-test-platform

# Install dependencies
npm install

# Install Playwright browsers
npx playwright install

# Start development server
npm run dev
```

The platform will be available at `http://localhost:3000`

#### Docker Setup

```bash
# Build and run with Docker
docker build -t e2e-platform .
docker run -p 3000:3000 e2e-platform
```

## 👥 For End Users

### Getting Started Guide

#### Step 1: Create a User
1. Navigate to the platform homepage
2. Click on "Create User"
3. Fill in your details:
   - **Name**: Your full name
   - **Email**: Your email address
   - **Role**: Your role (tester, developer, etc.)
4. Click "Create User"

#### Step 2: Create a Project
1. Click on "Create Project"
2. Fill in project details:
   - **Project Name**: Name of your application/project
   - **Description**: Brief description of what you're testing
   - **Base URL**: The URL of your application
3. Click "Create Project"

#### Step 3: Create Test Cases
1. Click on "Create Test Case"
2. Select your project from the dropdown
3. Fill in test details:
   - **Test Name**: Descriptive name for your test
   - **Description**: What the test does
   - **Test Steps**: Detailed steps for the test **(record using Playwright CRX)**
4. Click "Create Test Case"

#### Step 4: Run Tests
1. Click on "Run Tests"
2. Select your project and test cases
3. Click "Run Selected Tests"
4. Wait for tests to complete
5. Download the generated report

### Understanding Test Reports

Test reports include:
- **Test Results**: Pass/Fail status for each test
- **Screenshots**: Visual evidence of test execution
- **Execution Time**: How long each test took
- **Error Details**: Information about any failures
- **Summary Statistics**: Overall test run statistics

### Best Practices for End Users

1. **Organize Tests by Project**: Keep related tests together
2. **Use Descriptive Names**: Make test names clear and specific
3. **Regular Testing**: Run tests frequently to catch issues early
4. **Review Reports**: Always check test reports for insights
5. **Keep Tests Updated**: Update tests when your application changes

## 🛠 For Developers

### Technology Stack

- **Backend**: Node.js, Express.js
- **Testing**: Playwright
- **Frontend**: HTML, CSS, JavaScript
- **Containerization**: Docker
- **Logging**: Winston
- **Security**: Helmet.js, CORS, Rate Limiting

### Project Structure

```
e2e-test-platform/
├── src/
│   ├── server.js              # Main server file
│   ├── services/              # Business logic services
│   │   ├── TestRunner.js      # Test execution service
│   │   └── ZipService.js      # Report packaging service
│   └── utils/                 # Utility functions
│       ├── logger.js          # Logging configuration
│       └── testConverter.js   # Test conversion utilities
├── public/                    # Frontend files
│   ├── index.html            # Homepage
│   ├── create-user.html      # User creation form
│   ├── create-project.html   # Project creation form
│   ├── create-test-case.html # Test case creation form
│   └── run-tests.html        # Test execution interface
├── docs/                     # Documentation
├── scripts/                  # Deployment and utility scripts
├── test-runs/               # Test execution results
├── reports/                 # Generated reports
└── temp/                    # Temporary files
```

### API Endpoints

#### User Management
- `POST /api/users` - Create a new user
- `GET /api/users` - List all users

#### Project Management
- `POST /api/projects` - Create a new project
- `GET /api/projects` - List all projects

#### Test Case Management
- `POST /api/test-cases` - Create a new test case
- `GET /api/test-cases` - List all test cases
- `GET /api/test-cases/:projectId` - Get test cases for a project

#### Test Execution
- `POST /api/run-tests` - Execute selected tests
- `GET /api/reports/:testId` - Get test report
- `GET /api/download/:testId` - Download test report
- `DELETE /api/report/:testId` - Delete test report and files

#### Utility Endpoints
- `GET /health` - Health check endpoint
- `POST /api/convert-test` - Convert recorded tests to API format

### Environment Variables

```bash
NODE_ENV=production          # Environment mode
PORT=3000                   # Server port
LOG_LEVEL=info             # Logging level
WEBHOOK_URL=               # n8n webhook URL (optional)
MAX_CONCURRENT_TESTS=3     # Maximum concurrent test execution
TEST_TIMEOUT=300000        # Test timeout in milliseconds
```

### Development Commands

```bash
npm start          # Start production server
npm run dev        # Start development server with nodemon
npm test          # Run Playwright tests
```

### Deployment Scripts

```bash
# Setup for Railway deployment
bash scripts/setup-for-railway.sh

# Pre-deployment verification
bash scripts/pre-deploy-check.sh

# Development setup
bash scripts/dev.sh

# Production startup
bash scripts/start.sh
```

### Adding New Features

1. **Create Feature Branch**: `git checkout -b feature/new-feature`
2. **Implement Changes**: Add your code changes
3. **Test Thoroughly**: Ensure all tests pass
4. **Update Documentation**: Update relevant docs
5. **Submit Pull Request**: Create PR for review

## 📚 API Documentation

Detailed API documentation is available in [`docs/api-documentation.md`](docs/api-documentation.md).

### Quick API Examples

#### Create a User
```bash
curl -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -d '{"name": "John Doe", "email": "john@example.com", "role": "tester"}'
```

#### Run Tests
```bash
curl -X POST http://localhost:3000/api/run-tests \
  -H "Content-Type: application/json" \
  -d '{"projectId": "project-id", "testCaseIds": ["test-1", "test-2"]}'
```

## 🚀 Deployment

### Railway Deployment (Recommended)

For detailed deployment instructions, see [`docs/railway-deployment-guide.md`](docs/railway-deployment-guide.md).

**Quick Setup for Railway:**
```bash
# Run the setup script to prepare for deployment
bash scripts/setup-for-railway.sh

# Verify everything is ready
bash scripts/pre-deploy-check.sh
```

**Quick Deploy to Railway:**
1. Fork this repository
2. Run the setup script: `bash scripts/setup-for-railway.sh`
3. Sign up at [railway.app](https://railway.app)
4. Connect your GitHub repository
5. Deploy with one click

### Docker Deployment

```bash
# Build image
docker build -t e2e-platform .

# Run container
docker run -p 3000:3000 -e NODE_ENV=production e2e-platform
```

### Manual Deployment

```bash
# Install dependencies
npm ci --only=production

# Install Playwright browsers
npx playwright install

# Start server
npm start
```

## 🏗 Architecture

### High-Level Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Web Browser   │────│  Express Server │────│   Playwright    │
│   (Frontend)    │    │   (Backend)     │    │  (Test Runner)  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                │
                                │
                       ┌─────────────────┐
                       │   File System   │
                       │ (Reports/Logs)  │
                       └─────────────────┘
```

### Key Components

1. **Web Interface**: HTML forms for user interaction
2. **Express Server**: RESTful API and static file serving
3. **Test Runner**: Playwright-based test execution engine
4. **Report Generator**: Creates downloadable test reports
5. **Webhook Integration**: n8n workflow integration

## 🤝 Contributing

We welcome contributions! Please see our contributing guidelines:

1. **Fork the Repository**
2. **Create Feature Branch**: `git checkout -b feature/amazing-feature`
3. **Commit Changes**: `git commit -m 'Add amazing feature'`
4. **Push to Branch**: `git push origin feature/amazing-feature`
5. **Open Pull Request**

### Development Guidelines

- Follow existing code style
- Add tests for new features
- Update documentation
- Ensure all tests pass

## 📞 Support

### Getting Help

- **Documentation**: Check the `docs/` directory
- **Issues**: Create a GitHub issue for bugs or feature requests
- **Discussions**: Use GitHub Discussions for questions

### Common Issues

1. **Tests Not Running**: Check Playwright installation
2. **Port Conflicts**: Ensure port 3000 is available
3. **Memory Issues**: Increase Docker memory limits
4. **Browser Issues**: Run `npx playwright install`

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Playwright Team**: For the excellent testing framework
- **Express.js Community**: For the robust web framework
- **Railway**: For easy deployment platform
- **Contributors**: Thanks to all contributors who help improve this platform

## 🔧 Configuration

### Advanced Configuration

#### Custom Test Timeouts
```javascript
// In your test files, you can set custom timeouts
test.setTimeout(60000); // 60 seconds
```

#### Environment-Specific Settings
```bash
# Development
NODE_ENV=development
LOG_LEVEL=debug

# Production
NODE_ENV=production
LOG_LEVEL=info
```

#### Webhook Configuration
```bash
# n8n Integration
WEBHOOK_URL=https://dipv-digiflux-4.app.n8n.cloud/webhook
WEBHOOK_SECRET=your-secret-key
```

### Performance Tuning

- **Concurrent Tests**: Adjust `MAX_CONCURRENT_TESTS` based on your server capacity
- **Memory Limits**: Monitor memory usage and adjust Docker limits
- **Timeout Settings**: Configure appropriate timeouts for your test scenarios

## 🔍 Monitoring and Logging

### Log Files
- `logs/app.log` - Application logs
- `logs/error.log` - Error logs
- `logs/exceptions.log` - Unhandled exceptions
- `logs/rejections.log` - Unhandled promise rejections

### Monitoring Endpoints
- `GET /health` - Health check
- `GET /metrics` - Application metrics (if implemented)

### Log Levels
- `error` - Error messages only
- `warn` - Warnings and errors
- `info` - General information (recommended for production)
- `debug` - Detailed debugging information

## 🧪 Testing

### Running Tests Locally

```bash
# Run all tests
npm test

# Run specific test file
npx playwright test tests/example.spec.js

# Run tests in headed mode (with browser UI)
npx playwright test --headed

# Run tests with debugging
npx playwright test --debug
```

### Test Structure

```javascript
// Example test structure
const { test, expect } = require('@playwright/test');

test('example test', async ({ page }) => {
  await page.goto('https://example.com');
  await expect(page).toHaveTitle(/Example/);
});
```

## 🔐 Security

### Security Features
- **Rate Limiting**: Prevents API abuse
- **Helmet.js**: Security headers
- **CORS**: Cross-origin request handling
- **Input Validation**: Sanitizes user inputs
- **File Upload Limits**: Prevents large file attacks

### Security Best Practices
1. Keep dependencies updated
2. Use environment variables for secrets
3. Enable HTTPS in production
4. Monitor for security vulnerabilities
5. Implement proper authentication (if needed)

## 📊 Performance

### Optimization Tips
1. **Parallel Test Execution**: Run tests concurrently
2. **Resource Management**: Monitor CPU and memory usage
3. **Caching**: Implement caching for frequently accessed data
4. **Database Optimization**: Use efficient data storage
5. **CDN**: Use CDN for static assets in production

### Scaling Considerations
- **Horizontal Scaling**: Deploy multiple instances
- **Load Balancing**: Distribute traffic across instances
- **Database Scaling**: Consider external database for large datasets
- **Queue System**: Implement job queues for heavy operations

## 🌐 Browser Support

### Supported Browsers
- **Chromium** (Chrome, Edge)
- **Firefox**
- **Safari** (WebKit)

### Mobile Testing
- **Mobile Chrome**
- **Mobile Safari**
- **Device Emulation**

## 📱 Mobile and Responsive Testing

```javascript
// Example mobile test
test('mobile test', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 667 });
  await page.goto('https://example.com');
  // Test mobile-specific functionality
});
```

## 🔄 CI/CD Integration

### GitHub Actions Example

```yaml
name: E2E Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npx playwright install
      - run: npm test
```

### Railway Auto-Deploy
- Automatic deployments on git push
- Environment-specific configurations
- Rollback capabilities

## 📈 Roadmap

### Upcoming Features
- [ ] User authentication and authorization
- [ ] Test scheduling and cron jobs
- [ ] Advanced reporting and analytics
- [ ] Integration with more CI/CD platforms
- [ ] Mobile app for test monitoring
- [ ] AI-powered test generation
- [ ] Performance testing capabilities
- [ ] Visual regression testing

### Version History
- **v1.0.0** - Initial release with core functionality
- **v1.1.0** - Added webhook integration
- **v1.2.0** - Enhanced reporting features

## 🆘 Troubleshooting

### Common Problems and Solutions

#### Problem: Tests fail to start
```bash
Error: Browser not found
```
**Solution:**
```bash
npx playwright install
```

#### Problem: Port already in use
```bash
Error: listen EADDRINUSE :::3000
```
**Solution:**
```bash
# Kill process using port 3000
lsof -ti:3000 | xargs kill -9
# Or use different port
PORT=3001 npm start
```

#### Problem: Out of memory
```bash
Error: Process killed (OOM)
```
**Solution:**
- Reduce concurrent tests
- Increase Docker memory limits
- Optimize test code

#### Problem: Slow test execution
**Solutions:**
- Run tests in parallel
- Optimize selectors
- Reduce wait times
- Use faster assertions

### Debug Mode

```bash
# Enable debug logging
DEBUG=* npm start

# Playwright debug mode
npx playwright test --debug
```

## 📞 Community and Support

### Getting Help
- **GitHub Issues**: Report bugs and request features
- **Discussions**: Ask questions and share ideas
- **Wiki**: Community-maintained documentation
- **Stack Overflow**: Tag questions with `e2e-testing-platform`

### Contributing Guidelines
1. Read the contributing guide
2. Follow code style guidelines
3. Write tests for new features
4. Update documentation
5. Submit pull requests

### Code of Conduct
We are committed to providing a welcoming and inclusive environment for all contributors.

---

**Made with ❤️ for the testing community**

*Last updated: 2025-08-04*
