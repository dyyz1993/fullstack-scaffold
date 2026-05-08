# Docker Configuration Guide

This document describes the Docker setup for create-biomimic-app.

## Prerequisites

- Docker 20.10+
- Docker Compose 2.0+

## Quick Start

### Development Mode (with Hot Reload)

```bash
# Start development environment
docker-compose -f docker-compose.dev.yml up --build

# Or using make
make dev
```

The app will be available at http://localhost:3010

### Production Mode

```bash
# Build and start production containers
docker-compose up -d --build

# Or using make
make prod
# Or
make build
make up
```

## Available Make Commands

```bash
make help          # Show all available commands
make build         # Build production image
make dev           # Start development environment
make prod          # Start production environment
make up            # Alias for prod
make down          # Stop containers
make restart       # Restart production environment
make logs          # Show logs
make clean         # Remove all containers and volumes
make test          # Run tests in Docker
make shell         # Open shell in container
make ps            # Show running containers
```

## Docker Configuration Files

| File                     | Description                               |
| ------------------------ | ----------------------------------------- |
| `Dockerfile`             | Production image with multi-stage build   |
| `Dockerfile.dev`         | Development image with hot reload         |
| `docker-compose.yml`     | Production service orchestration          |
| `docker-compose.dev.yml` | Development service orchestration         |
| `.dockerignore`          | Files excluded from Docker build          |
| `Makefile`               | Convenient commands for Docker operations |

## Environment Variables

Create a `.env` file in the project root:

```env
NODE_ENV=production
PORT=3010
DATABASE_URL=file:./data/biomimic.db
JWT_SECRET=your-secret-key
```

See `.env.example` for all available variables.

## Volume Persistence

The following directories are persisted as volumes:

- `./data` - SQLite database files
- `./logs` - Application logs

## Health Check

The container includes a health check that monitors `/api/health`. If you add this endpoint to your Hono app, Docker will automatically detect unhealthy containers.

## Adding a Health Check Endpoint

Add this to your Hono app:

```typescript
app.get('/api/health', c => {
  return c.json({ status: 'ok', timestamp: new Date().toISOString() })
})
```

## Production Deployment

### Option 1: Docker Compose

```bash
# Build and start
docker-compose up -d

# View logs
docker-compose logs -f

# Stop
docker-compose down
```

### Option 2: Docker directly

```bash
# Build image
docker build -t biomimic-app .

# Run container
docker run -d \
  --name biomimic-app \
  -p 3010:3010 \
  -v $(pwd)/data:/app/data \
  -v $(pwd)/logs:/app/logs \
  --restart unless-stopped \
  biomimic-app
```

## Optional Services

The `docker-compose.yml` includes commented-out services for production use:

- **PostgreSQL** - Replace SQLite with PostgreSQL
- **Redis** - Add caching layer
- **Nginx** - Reverse proxy with SSL support

Uncomment the service blocks to enable them.

## Troubleshooting

### Container won't start

```bash
# Check logs
docker-compose logs app

# Inspect container
docker-compose ps
```

### Hot reload not working

Make sure source files are mounted as read-only (`:ro`) in `docker-compose.dev.yml`.

### Permission issues

The Dockerfile creates a non-root user. Ensure mounted volumes have correct permissions:

```bash
chmod -R 755 data logs
```

## Production Tips

1. **Use specific image tags** instead of `latest`
2. **Enable log rotation** in your Docker daemon config
3. **Set resource limits** in docker-compose.yml:
   ```yaml
   deploy:
     resources:
       limits:
         cpus: '1'
         memory: 512M
   ```
4. **Use environment-specific .env files**
5. **Backup database volumes regularly**

## CI/CD Integration

Example GitHub Actions workflow:

```yaml
name: Docker Build and Push

on:
  push:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Build Docker image
        run: docker build -t biomimic-app .
      - name: Run tests
        run: docker run biomimic-app npm test
```
