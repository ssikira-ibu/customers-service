#!/bin/sh

# Cloud Run startup script for customers service
echo '{"severity":"INFO","message":"Starting customers service container"}'

# Set default environment variables
export NODE_ENV=${NODE_ENV:-production}
echo '{"severity":"INFO","message":"Environment: '${NODE_ENV}'"}'

# Database migrations run automatically during application startup
# via the initializeDatabase() function in src/db/database.ts
echo '{"severity":"INFO","message":"Database migrations handled automatically by application"}'

echo '{"severity":"INFO","message":"Starting Node.js application"}'

# Execute the main application
exec "$@"
