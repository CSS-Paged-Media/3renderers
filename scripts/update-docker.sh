#!/bin/bash

# Optional script to update and rebuild Docker containers
# This script pulls the latest code, removes existing containers, 
# and rebuilds them

# Pull latest code from git repository
git pull

# Stop and remove all containers, networks, and volumes
docker-compose down --remove-orphans --volumes

# Build and start containers in detached mode
docker-compose up --build -d