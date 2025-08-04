#!/bin/bash
echo "🚀 Starting E2E Testing Platform in production mode..."
export NODE_ENV=production
export LOG_LEVEL=info
npm start
