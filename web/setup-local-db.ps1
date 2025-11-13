# Setup Local Development Database for Shujia (PowerShell)
# This script helps you set up a safe local database for development

Write-Host "🚀 Setting up local development database for Shujia..." -ForegroundColor Cyan
Write-Host ""

# Check if Docker is installed
$dockerInstalled = Get-Command docker -ErrorAction SilentlyContinue

if ($dockerInstalled) {
    Write-Host "✅ Docker found" -ForegroundColor Green
    Write-Host ""
    Write-Host "Creating PostgreSQL container..." -ForegroundColor Yellow
    
    docker run --name shujia-dev-db `
      -e POSTGRES_PASSWORD=devpassword `
      -e POSTGRES_DB=shujia_dev `
      -p 5432:5432 `
      -d postgres:16
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Database container created successfully!" -ForegroundColor Green
        Write-Host ""
        Write-Host "📝 Add this to your .env file:" -ForegroundColor Yellow
        Write-Host 'DATABASE_URL="postgresql://postgres:devpassword@localhost:5432/shujia_dev?schema=public"' -ForegroundColor White
        Write-Host ""
        Write-Host "⏳ Waiting 5 seconds for database to start..." -ForegroundColor Yellow
        Start-Sleep -Seconds 5
        
        Write-Host ""
        Write-Host "🔄 Running migrations..." -ForegroundColor Yellow
        npx prisma migrate deploy
        
        Write-Host ""
        Write-Host "✅ Setup complete! Your local database is ready." -ForegroundColor Green
        Write-Host ""
        Write-Host "To stop the database:" -ForegroundColor Cyan
        Write-Host "  docker stop shujia-dev-db" -ForegroundColor White
        Write-Host ""
        Write-Host "To start it again:" -ForegroundColor Cyan
        Write-Host "  docker start shujia-dev-db" -ForegroundColor White
        Write-Host ""
        Write-Host "To remove it:" -ForegroundColor Cyan
        Write-Host "  docker rm -f shujia-dev-db" -ForegroundColor White
    } else {
        Write-Host "❌ Failed to create database container" -ForegroundColor Red
        Write-Host "The container might already exist. Try:" -ForegroundColor Yellow
        Write-Host "  docker rm -f shujia-dev-db" -ForegroundColor White
        Write-Host "Then run this script again." -ForegroundColor Yellow
    }
} else {
    Write-Host "❌ Docker not found" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please install Docker or PostgreSQL manually:" -ForegroundColor Yellow
    Write-Host "  - Docker: https://www.docker.com/get-started" -ForegroundColor White
    Write-Host "  - PostgreSQL: https://www.postgresql.org/download/" -ForegroundColor White
    Write-Host ""
    Write-Host "After installing PostgreSQL, create a database:" -ForegroundColor Yellow
    Write-Host "  createdb shujia_dev" -ForegroundColor White
    Write-Host ""
    Write-Host "Then add this to your .env file:" -ForegroundColor Yellow
    Write-Host '  DATABASE_URL="postgresql://postgres:yourpassword@localhost:5432/shujia_dev?schema=public"' -ForegroundColor White
}

