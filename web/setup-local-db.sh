#!/bin/bash

# Setup Local Development Database for Shujia
# This script helps you set up a safe local database for development

echo "🚀 Setting up local development database for Shujia..."
echo ""

# Check if Docker is installed
if command -v docker &> /dev/null; then
    echo "✅ Docker found"
    echo ""
    echo "Creating PostgreSQL container..."
    
    docker run --name shujia-dev-db \
      -e POSTGRES_PASSWORD=devpassword \
      -e POSTGRES_DB=shujia_dev \
      -p 5432:5432 \
      -d postgres:16
    
    if [ $? -eq 0 ]; then
        echo "✅ Database container created successfully!"
        echo ""
        echo "📝 Add this to your .env file:"
        echo "DATABASE_URL=\"postgresql://postgres:devpassword@localhost:5432/shujia_dev?schema=public\""
        echo ""
        echo "⏳ Waiting 5 seconds for database to start..."
        sleep 5
        
        echo ""
        echo "🔄 Running migrations..."
        npx prisma migrate deploy
        
        echo ""
        echo "✅ Setup complete! Your local database is ready."
        echo ""
        echo "To stop the database:"
        echo "  docker stop shujia-dev-db"
        echo ""
        echo "To start it again:"
        echo "  docker start shujia-dev-db"
        echo ""
        echo "To remove it:"
        echo "  docker rm -f shujia-dev-db"
    else
        echo "❌ Failed to create database container"
        echo "The container might already exist. Try:"
        echo "  docker rm -f shujia-dev-db"
        echo "Then run this script again."
    fi
else
    echo "❌ Docker not found"
    echo ""
    echo "Please install Docker or PostgreSQL manually:"
    echo "  - Docker: https://www.docker.com/get-started"
    echo "  - PostgreSQL: https://www.postgresql.org/download/"
    echo ""
    echo "After installing PostgreSQL, create a database:"
    echo "  createdb shujia_dev"
    echo ""
    echo "Then add this to your .env file:"
    echo "  DATABASE_URL=\"postgresql://postgres:yourpassword@localhost:5432/shujia_dev?schema=public\""
fi

