#!/bin/bash
echo "🔧 Starting E2E Testing Platform in development mode..."
export NODE_ENV=development
export LOG_LEVEL=debug
npm run dev
