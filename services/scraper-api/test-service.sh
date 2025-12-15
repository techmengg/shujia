#!/bin/bash

# Quick test script for the scraper API

echo "🧪 Testing Shujia Scraper API..."
echo ""

BASE_URL="http://localhost:3001"

# Test 1: Health check
echo "Test 1: Health Check"
curl -s $BASE_URL/health | json_pp
echo ""
echo ""

# Test 2: Get providers
echo "Test 2: Get Providers"
curl -s $BASE_URL/manga/providers | json_pp
echo ""
echo ""

# Test 3: Get manga by ID (One Piece from MangaUpdates)
echo "Test 3: Get Manga by ID"
curl -s "$BASE_URL/manga/mangaupdates/55099564912" | json_pp | head -50
echo ""
echo ""

# Test 4: Search (when implemented)
echo "Test 4: Search"
curl -s "$BASE_URL/manga/search?q=one+piece&providers=mangaupdates" | json_pp
echo ""

echo "✅ Tests complete!"

