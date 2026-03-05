#!/bin/bash
# Quick start script for Docker development setup

set -e

echo "🐳 BackOffice Odonto - Docker Development Setup"
echo "================================================"
echo ""

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

echo "✅ Docker and Docker Compose are installed"
echo ""

# Copy .env.local if it doesn't exist
if [ ! -f .env.local ]; then
    echo "📝 Creating .env.local from .env.example..."
    cp .env.example .env.local
    echo "✅ .env.local created"
else
    echo "✅ .env.local already exists"
fi

echo ""
echo "🚀 Starting Docker containers..."
docker-compose up -d

echo ""
echo "⏳ Waiting for services to be ready..."
sleep 10

echo ""
echo "✅ All services started!"
echo ""
echo "================================================"
echo "📌 Access your application:"
echo "   Frontend:  http://localhost:3000"
echo "   Backend:   http://localhost:8000"
echo "   Database:  localhost:5432"
echo ""
echo "📊 Useful commands:"
echo "   View logs:        docker-compose logs -f"
echo "   Stop containers:  docker-compose down"
echo "   Rebuild images:   docker-compose build --no-cache"
echo ""
