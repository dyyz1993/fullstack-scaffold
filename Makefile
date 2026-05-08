.PHONY: help build up down restart logs clean dev prod test

help: ## Show this help message
	@echo 'Usage: make [target]'
	@echo ''
	@echo 'Available targets:'
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "  %-20s %s\n", $$1, $$2}' $(MAKEFILE_LIST)

build: ## Build production Docker image
	docker-compose build

dev: ## Start development environment with hot reload
	docker-compose -f docker-compose.dev.yml up --build

prod: ## Start production environment
	docker-compose up -d

up: prod ## Alias for prod

down: ## Stop and remove containers
	docker-compose down
	docker-compose -f docker-compose.dev.yml down

restart: down prod ## Restart production environment

logs: ## Show logs from running containers
	docker-compose logs -f

clean: ## Stop and remove all containers, networks, and volumes
	docker-compose down -v
	docker-compose -f docker-compose.dev.yml down -v

test: ## Run tests in Docker
	docker-compose run --rm app npm test

shell: ## Open shell in running container
	docker-compose exec app sh

ps: ## Show running containers
	docker-compose ps
