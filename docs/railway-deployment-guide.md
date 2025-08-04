# Railway Deployment Guide for E2E Testing Platform

This guide will walk you through deploying the E2E Testing Platform on Railway for free, including all necessary configurations and setup steps.

## Prerequisites

1. **GitHub Account**: Your code should be in a GitHub repository
2. **Railway Account**: Sign up at [railway.app](https://railway.app) (free tier available)
3. **Basic understanding of environment variables**

## What is Railway?

Railway is a modern app hosting platform that makes it easy to deploy applications with minimal configuration. It offers:
- Free tier with generous limits
- Automatic deployments from GitHub
- Built-in CI/CD
- Easy environment variable management
- Automatic HTTPS certificates

## Free Tier Limits

Railway's free tier includes:
- $5 worth of usage per month
- 500 hours of runtime
- 1GB RAM per service
- 1GB disk storage
- Unlimited bandwidth

## Step-by-Step Deployment

### Step 1: Prepare Your Repository

1. **Ensure all required files are in your repository:**
   - `package.json` ✓
   - `Dockerfile` ✓
   - `railway.toml` ✓
   - `src/server.js` ✓
   - All source code and dependencies ✓

2. **Verify your Dockerfile** (already configured):
   ```dockerfile
   FROM mcr.microsoft.com/playwright:v1.40.0-jammy
   WORKDIR /app
   # ... rest of configuration
   ```

3. **Check railway.toml configuration** (already configured):
   ```toml
   [build]
   builder = "dockerfile"
   
   [deploy]
   healthcheckPath = "/health"
   healthcheckTimeout = 30
   restartPolicyType = "on_failure"
   restartPolicyMaxRetries = 3
   ```

### Step 2: Deploy to Railway

#### Option A: Deploy from GitHub (Recommended)

1. **Sign up/Login to Railway:**
   - Go to [railway.app](https://railway.app)
   - Click "Login" and connect with GitHub

2. **Create New Project:**
   - Click "New Project"
   - Select "Deploy from GitHub repo"
   - Choose your repository

3. **Configure Deployment:**
   - Railway will automatically detect the Dockerfile
   - The `railway.toml` file will be used for configuration
   - Click "Deploy"

#### Option B: Deploy with Railway CLI

1. **Install Railway CLI:**
   ```bash
   npm install -g @railway/cli
   ```

2. **Login to Railway:**
   ```bash
   railway login
   ```

3. **Initialize and Deploy:**
   ```bash
   railway init
   railway up
   ```

### Step 3: Configure Environment Variables

1. **In Railway Dashboard:**
   - Go to your project
   - Click on "Variables" tab
   - Add the following variables:

   ```
   NODE_ENV=production
   PORT=3000
   LOG_LEVEL=info
   ```

2. **Optional Variables** (add if needed):
   ```
   WEBHOOK_URL=https://dipv-digiflux-4.app.n8n.cloud/webhook
   MAX_CONCURRENT_TESTS=3
   TEST_TIMEOUT=300000
   ```

### Step 4: Verify Deployment

1. **Check Deployment Status:**
   - In Railway dashboard, monitor the build logs
   - Wait for "Deployed" status

2. **Get Your App URL:**
   - Railway will provide a URL like: `https://your-app-name.up.railway.app`
   - Click on the URL to access your application

3. **Test Health Check:**
   - Visit: `https://your-app-name.up.railway.app/health`
   - Should return: `{"status": "OK", "timestamp": "..."}`

### Step 5: Configure Custom Domain (Optional)

1. **In Railway Dashboard:**
   - Go to "Settings" → "Domains"
   - Click "Add Domain"
   - Enter your custom domain
   - Update your DNS records as instructed

## Post-Deployment Configuration

### 1. Update n8n Webhook URLs

If you're using n8n webhooks, update your webhook URLs to point to your Railway deployment:

```javascript
// In your frontend forms, update webhook URLs
const RAILWAY_BASE_URL = 'https://your-app-name.up.railway.app';
```

### 2. Test All Features

1. **Create User**: Test user creation form
2. **Create Project**: Test project creation
3. **Create Test Case**: Test test case creation
4. **Run Tests**: Test the test execution
5. **Download Reports**: Test report generation and download

### 3. Monitor Logs

1. **In Railway Dashboard:**
   - Go to "Deployments" tab
   - Click on latest deployment
   - View logs in real-time

2. **Check Application Logs:**
   - Monitor for any errors or warnings
   - Verify all services are working correctly

## Troubleshooting

### Common Issues and Solutions

1. **Build Fails:**
   ```
   Error: Docker build failed
   ```
   **Solution:** Check Dockerfile syntax and ensure all files are committed to repository

2. **Health Check Fails:**
   ```
   Error: Health check timeout
   ```
   **Solution:** Verify `/health` endpoint is working locally first

3. **Out of Memory:**
   ```
   Error: Container killed (OOMKilled)
   ```
   **Solution:** Optimize memory usage or upgrade to paid plan

4. **Port Issues:**
   ```
   Error: Port already in use
   ```
   **Solution:** Ensure your app uses `process.env.PORT` (already configured)

### Debugging Steps

1. **Check Build Logs:**
   - Review build process for errors
   - Ensure all dependencies install correctly

2. **Check Runtime Logs:**
   - Monitor application startup
   - Look for connection errors or missing environment variables

3. **Test Locally:**
   - Run `docker build -t e2e-platform .`
   - Run `docker run -p 3000:3000 e2e-platform`
   - Verify everything works before deploying

## Monitoring and Maintenance

### 1. Monitor Usage

- Check Railway dashboard for resource usage
- Monitor free tier limits
- Set up alerts for high usage

### 2. Automatic Deployments

- Railway automatically deploys when you push to your main branch
- Monitor deployment status after each push
- Test functionality after each deployment

### 3. Backup Important Data

- Test results are stored in `/test-runs` directory
- Reports are stored in `/reports` directory
- Consider implementing external storage for important data

## Scaling Considerations

### When to Upgrade

- If you exceed free tier limits
- Need more concurrent test execution
- Require persistent storage
- Need better performance

### Upgrade Options

- **Pro Plan**: $20/month with higher limits
- **Team Plan**: $20/user/month with team features
- **Custom Plans**: For enterprise needs

## Security Best Practices

1. **Environment Variables:**
   - Never commit sensitive data to repository
   - Use Railway's environment variable system

2. **API Security:**
   - The platform includes rate limiting
   - Helmet.js for security headers
   - CORS configuration

3. **Regular Updates:**
   - Keep dependencies updated
   - Monitor security advisories
   - Update Playwright regularly

## Support and Resources

- **Railway Documentation**: [docs.railway.app](https://docs.railway.app)
- **Railway Community**: [Discord](https://discord.gg/railway)
- **Railway Status**: [status.railway.app](https://status.railway.app)

## Next Steps

After successful deployment:

1. Update your README.md with the live URL
2. Test all functionality thoroughly
3. Set up monitoring and alerts
4. Consider implementing CI/CD improvements
5. Plan for scaling if needed

Your E2E Testing Platform should now be live and accessible at your Railway URL!
