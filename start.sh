#!/bin/sh

# For Cloud Run with Cloud SQL, we don't need to wait for external database
# The connection is handled via Unix socket or Cloud SQL Proxy
echo "Starting customers service..."

# Set default environment variables for Cloud Run
export NODE_ENV=${NODE_ENV:-production}

# Run database migrations if DATABASE_URL is available
if [ -n "$DATABASE_URL" ]; then
    echo "Running database migrations..."
    npx sequelize-cli db:migrate
else
    echo "No DATABASE_URL found, skipping migrations"
fi

# Execute the main application
exec "$@"
