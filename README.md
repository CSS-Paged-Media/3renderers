# 3renderers.dev

A powerful, scalable PDF generation API supporting three industry-standard rendering engines: **WeasyPrint**, **Paged.js**, and **Vivliostyle**. Built with Node.js, TypeScript, and Docker.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Node](https://img.shields.io/badge/node-20.x-green.svg)
![Docker](https://img.shields.io/badge/docker-required-blue.svg)

## 🚀 Quick Start

### 1. Clone the Repository
```bash
git clone https://github.com/CSS-Paged-Media/3renderers.git
cd 3renderers
```

### 2. Configure Environment
```bash
# Copy example environment file
cp .env.example .env

# Edit .env with your settings
nano .env
```

Minimum required settings:
```env
NODE_ENV=development
POSTGRES_PASSWORD=your_secure_password_here
```

### 3. Start Services
```bash
# Build and start all services
docker-compose up --build -d

# View logs
docker-compose logs -f

# Check health
curl http://localhost/health
```

### 4. Test the API
```bash
# Simple PDF generation
curl -X POST http://localhost/api/render \
  -H "Content-Type: application/json" \
  -d '{
    "html": "<h1>Hello World</h1>",
    "options": {
      "renderer": "weasyprint",
      "sync": "true"
    }
  }' \
  --output test.pdf

# Open the generated PDF
open test.pdf  # macOS
xdg-open test.pdf  # Linux
```

## 📚 API Documentation

https://www.postman.com/three-renderers/pdf-api/overview


## 🏭 Production Deployment

### 1. Clone and Configure
```bash
# Clone repository
cd /opt
sudo git clone https://github.com/CSS-Paged-Media/3renderers.git
cd 3renderers

# Create production env file
cp .env.example .env.production
nano .env.production
```

**Production .env.production:**
```env
NODE_ENV=production

# Database (CHANGE THESE!)
POSTGRES_HOST=postgres
POSTGRES_PORT=5432
POSTGRES_DB=pdfgen
POSTGRES_USER=pdfuser
POSTGRES_PASSWORD=CHANGE_THIS_TO_SECURE_PASSWORD_XYZ123

# Redis
REDIS_HOST=redis
REDIS_PORT=6379

# Worker
WORKER_CONCURRENCY=5

# API
API_PORT=3000
```
### 2. Start Production Services
```bash
# Load environment
export $(cat .env.production | xargs)

# Build and start
docker-compose -f docker-compose.yml up --build -d

# Check status
docker-compose -f docker-compose.yml ps

# View logs
docker-compose -f docker-compose.yml logs -f
```

## Rebuild cron (optional)
```bash
chmod +x /root/pdf-rendering-service/scripts/update-docker.sh

# Run daily at 2 AM
0 2 * * * /root/pdf-rendering-service/scripts/update-docker.sh
```
