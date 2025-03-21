#!/bin/bash

# Wait for database to be ready
echo "Waiting for database to be ready..."
./scripts/wait-for-it.sh db:5432 -t 60

# Run database migrations
echo "Running database migrations..."
npx sequelize-cli db:migrate

# Start the application in development mode
echo "Starting the application in development mode..."
npm run dev 