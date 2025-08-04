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
