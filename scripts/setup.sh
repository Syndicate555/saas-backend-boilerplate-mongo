#!/bin/bash

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Script variables
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Emoji support
CHECK="✓"
CROSS="✗"
CLOCK="⏳"
ROCKET="🚀"
DOCKER_ICON="🐳"
COMPUTER="💻"
BOOK="📚"

# Function to print headers
print_header() {
    echo ""
    echo -e "${BLUE}========================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}========================================${NC}"
    echo ""
}

# Function to print success messages
print_success() {
    echo -e "${GREEN}${CHECK} $1${NC}"
}

# Function to print error messages
print_error() {
    echo -e "${RED}${CROSS} $1${NC}"
}

# Function to print warning messages
print_warning() {
    echo -e "${YELLOW}$1${NC}"
}

# Function to print info messages
print_info() {
    echo -e "${CYAN}$1${NC}"
}

# Start script
print_header "SaaS Backend Boilerplate - Setup"

print_info "Welcome to the setup wizard! This script will help you configure your development environment.\n"

# ============================================================
# Check Node.js
# ============================================================
print_info "${CLOCK} Checking Node.js..."
if ! command -v node &> /dev/null; then
    print_error "Node.js is not installed"
    print_info "Please install Node.js 20 or higher from: https://nodejs.org/"
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 20 ]; then
    print_error "Node.js version must be 20 or higher (you have v$NODE_VERSION)"
    print_info "Please upgrade Node.js from: https://nodejs.org/"
    exit 1
fi

print_success "Node.js $(node -v) is installed"

# ============================================================
# Check npm
# ============================================================
print_info "${CLOCK} Checking npm..."
if ! command -v npm &> /dev/null; then
    print_error "npm is not installed"
    exit 1
fi

print_success "npm $(npm -v) is installed"

# ============================================================
# Check MongoDB (optional)
# ============================================================
print_info "${CLOCK} Checking MongoDB connection..."
if command -v mongosh &> /dev/null || command -v mongo &> /dev/null; then
    if mongosh --eval "db.adminCommand('ping')" &> /dev/null 2>&1 || mongo --eval "db.adminCommand('ping')" &> /dev/null 2>&1; then
        print_success "MongoDB is running"
    else
        print_warning "MongoDB appears to be installed but not running"
        print_info "You can start MongoDB with: brew services start mongodb-community (macOS) or sudo systemctl start mongod (Linux)"
        print_info "Or use Docker: docker run -d -p 27017:27017 --name mongodb mongo:latest"
    fi
else
    print_warning "MongoDB client is not installed locally"
    print_info "MongoDB is optional. You can:"
    print_info "  1. Install locally: https://docs.mongodb.com/manual/installation/"
    print_info "  2. Use Docker: docker run -d -p 27017:27017 --name mongodb mongo:latest"
    print_info "  3. Use MongoDB Atlas (cloud): https://www.mongodb.com/cloud/atlas"
fi

# ============================================================
# Create .env file
# ============================================================
print_header "Environment Configuration"

if [ -f "$PROJECT_ROOT/.env" ]; then
    print_warning ".env file already exists"
    read -p "$(echo -e ${CYAN}Do you want to reset it from .env.example? \(y/n\): ${NC})" -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        cp "$PROJECT_ROOT/.env.example" "$PROJECT_ROOT/.env"
        print_success ".env file has been reset from .env.example"
    else
        print_info "Keeping existing .env file"
    fi
else
    cp "$PROJECT_ROOT/.env.example" "$PROJECT_ROOT/.env"
    print_success ".env file created from .env.example"
fi

# ============================================================
# Install dependencies
# ============================================================
print_header "Installing Dependencies"

print_info "${CLOCK} Running npm install..."
cd "$PROJECT_ROOT"
npm install

if [ $? -ne 0 ]; then
    print_error "npm install failed. Please check the error messages above."
    exit 1
fi

print_success "Dependencies installed successfully"

# ============================================================
# Setup choice: Docker vs Local
# ============================================================
print_header "Setup Configuration"

print_info "Choose your setup preference:\n"
echo -e "${CYAN}1)${NC} Docker Setup (Recommended)"
echo -e "   - Database and services run in containers"
echo -e "   - Isolated environment"
echo -e "   - Requires Docker Desktop to be installed\n"

echo -e "${CYAN}2)${NC} Local Setup"
echo -e "   - Services run on your machine"
echo -e "   - Easier debugging"
echo -e "   - Requires MongoDB running locally\n"

read -p "$(echo -e ${CYAN}Enter your choice \(1 or 2\): ${NC})" -n 1 -r
echo ""

if [[ $REPLY =~ ^1$ ]]; then
    SETUP_TYPE="docker"
    print_success "Docker setup selected"
elif [[ $REPLY =~ ^2$ ]]; then
    SETUP_TYPE="local"
    print_success "Local setup selected"
else
    print_error "Invalid choice. Defaulting to Docker setup."
    SETUP_TYPE="docker"
fi

# ============================================================
# Next Steps
# ============================================================
print_header "Setup Complete!"

print_success "Your development environment is ready!"
echo ""
print_info "${ROCKET} Next Steps:"
echo ""

if [ "$SETUP_TYPE" = "docker" ]; then
    echo -e "${DOCKER_ICON}  ${CYAN}Docker Setup Instructions:${NC}"
    echo -e "   1. Make sure Docker Desktop is installed and running"
    echo -e "      Download from: ${BLUE}https://www.docker.com/products/docker-desktop${NC}"
    echo ""
    echo -e "   2. Start services with Docker Compose:"
    echo -e "      ${BLUE}npm run docker:up${NC}"
    echo ""
    echo -e "   3. This will start:"
    echo -e "      - MongoDB (port 27017)"
    echo -e "      - Redis (port 6379) - optional"
    echo ""
    echo -e "   4. Run database migrations (in another terminal):"
    echo -e "      ${BLUE}npm run migrate${NC}"
    echo ""
    echo -e "   5. Seed the database with sample data (optional):"
    echo -e "      ${BLUE}npm run seed${NC}"
    echo ""
    echo -e "   6. Start the development server:"
    echo -e "      ${BLUE}npm run dev${NC}"
    echo ""
    echo -e "   7. Your backend will be available at:"
    echo -e "      ${BLUE}http://localhost:3000${NC}"
    echo ""
else
    echo -e "${COMPUTER}  ${CYAN}Local Setup Instructions:${NC}"
    echo -e "   1. Ensure MongoDB is running locally:"
    echo -e "      - macOS with Homebrew: ${BLUE}brew services start mongodb-community${NC}"
    echo -e "      - Linux with systemd: ${BLUE}sudo systemctl start mongod${NC}"
    echo -e "      - Or with Docker: ${BLUE}docker run -d -p 27017:27017 --name mongodb mongo:latest${NC}"
    echo ""
    echo -e "   2. Verify MongoDB is accessible:"
    echo -e "      ${BLUE}mongosh mongodb://localhost:27017${NC}"
    echo ""
    echo -e "   3. Run database migrations:"
    echo -e "      ${BLUE}npm run migrate${NC}"
    echo ""
    echo -e "   4. Seed the database with sample data (optional):"
    echo -e "      ${BLUE}npm run seed${NC}"
    echo ""
    echo -e "   5. Start the development server:"
    echo -e "      ${BLUE}npm run dev${NC}"
    echo ""
    echo -e "   6. Your backend will be available at:"
    echo -e "      ${BLUE}http://localhost:3000${NC}"
    echo ""
fi

echo -e "${BOOK}  ${CYAN}Useful Commands:${NC}"
echo -e "   - Run tests: ${BLUE}npm test${NC}"
echo -e "   - Run tests in watch mode: ${BLUE}npm run test:watch${NC}"
echo -e "   - Generate coverage report: ${BLUE}npm run test:coverage${NC}"
echo -e "   - Run linter: ${BLUE}npm run lint${NC}"
echo -e "   - Fix linting issues: ${BLUE}npm run lint:fix${NC}"
echo -e "   - Format code: ${BLUE}npm run format${NC}"
echo -e "   - Build for production: ${BLUE}npm run build${NC}"
echo ""

if [ "$SETUP_TYPE" = "docker" ]; then
    echo -e "${DOCKER_ICON}  ${CYAN}Docker Compose Commands:${NC}"
    echo -e "   - Stop services: ${BLUE}npm run docker:down${NC}"
    echo -e "   - Rebuild services: ${BLUE}npm run docker:build${NC}"
    echo ""
fi

echo -e "${CYAN}Configuration Files:${NC}"
echo -e "   - Environment variables: ${BLUE}.env${NC}"
echo -e "   - Example variables: ${BLUE}.env.example${NC}"
echo ""

print_info "For more information, check the README.md file"
print_success "${ROCKET} Happy coding!"

echo ""
