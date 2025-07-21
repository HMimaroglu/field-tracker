#!/bin/bash

# Field Tracker Deployment Script
# This script helps deploy Field Tracker in different environments

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Default values
ENVIRONMENT=${1:-"development"}
PROFILE=""

echo -e "${GREEN}🚀 Field Tracker Deployment Script${NC}"
echo -e "${YELLOW}Environment: ${ENVIRONMENT}${NC}"

# Check if Docker and Docker Compose are installed
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker is not installed. Please install Docker first.${NC}"
    exit 1
fi

if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    echo -e "${RED}❌ Docker Compose is not installed. Please install Docker Compose first.${NC}"
    exit 1
fi

# Function to check if .env file exists
check_env_file() {
    if [ ! -f .env ]; then
        echo -e "${YELLOW}⚠️  No .env file found. Creating from template...${NC}"
        cp .env.example .env
        echo -e "${YELLOW}⚠️  Please edit .env file with your configuration before continuing.${NC}"
        echo -e "${YELLOW}⚠️  Important: Change default passwords and secrets!${NC}"
        
        read -p "Press Enter to continue after editing .env file..."
    fi
}

# Function to create necessary directories
create_directories() {
    echo -e "${YELLOW}📁 Creating necessary directories...${NC}"
    mkdir -p licenses
    mkdir -p nginx/ssl
    chmod 755 licenses nginx/ssl
}

# Function to pull/build images
build_images() {
    echo -e "${YELLOW}🔨 Building Docker images...${NC}"
    
    if [ "$ENVIRONMENT" = "development" ]; then
        docker-compose build
    else
        docker-compose build --no-cache
    fi
}

# Function to start services
start_services() {
    echo -e "${YELLOW}🚀 Starting Field Tracker services...${NC}"
    
    # Set profile based on environment
    if [ "$ENVIRONMENT" = "production" ]; then
        PROFILE="--profile nginx"
    fi
    
    docker-compose $PROFILE up -d
    
    # Wait for services to be healthy
    echo -e "${YELLOW}⏳ Waiting for services to be ready...${NC}"
    sleep 10
    
    # Check health
    echo -e "${YELLOW}🔍 Checking service health...${NC}"
    
    # Check database
    if docker-compose exec -T postgres pg_isready -U field_tracker -d field_tracker; then
        echo -e "${GREEN}✅ Database is ready${NC}"
    else
        echo -e "${RED}❌ Database is not ready${NC}"
    fi
    
    # Check API server
    if curl -f http://localhost:${SERVER_PORT:-3000}/health > /dev/null 2>&1; then
        echo -e "${GREEN}✅ API Server is ready${NC}"
    else
        echo -e "${RED}❌ API Server is not ready${NC}"
    fi
    
    # Check Admin Dashboard
    if curl -f http://localhost:${ADMIN_PORT:-3001} > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Admin Dashboard is ready${NC}"
    else
        echo -e "${RED}❌ Admin Dashboard is not ready${NC}"
    fi
}

# Function to show deployment info
show_info() {
    echo -e "${GREEN}"
    echo "🎉 Field Tracker deployment completed!"
    echo ""
    echo "📊 Service URLs:"
    echo "   • API Server: http://localhost:${SERVER_PORT:-3000}"
    echo "   • Admin Dashboard: http://localhost:${ADMIN_PORT:-3001}"
    echo "   • API Health Check: http://localhost:${SERVER_PORT:-3000}/health"
    echo ""
    echo "🔑 Default Credentials:"
    echo "   • Admin Password: Check your .env file for ADMIN_PASSWORD"
    echo ""
    echo "📖 Next Steps:"
    echo "   1. Upload your license file through the admin dashboard"
    echo "   2. Create worker accounts"
    echo "   3. Create job codes"
    echo "   4. Workers can now use the mobile app to track time"
    echo ""
    echo "🛠️  Management Commands:"
    echo "   • View logs: docker-compose logs -f"
    echo "   • Stop services: docker-compose down"
    echo "   • Update services: ./scripts/deploy.sh"
    echo "   • Backup data: ./scripts/backup.sh"
    echo ""
    echo -e "${NC}"
}

# Main deployment flow
main() {
    check_env_file
    create_directories
    build_images
    start_services
    show_info
}

# Run main function
main

echo -e "${GREEN}✅ Deployment script completed!${NC}"