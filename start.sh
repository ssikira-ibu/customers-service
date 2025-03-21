#!/bin/sh

echo "Waiting for PostgreSQL at $DATABASE_HOST:$DATABASE_PORT..."
dockerize -wait tcp://$DATABASE_HOST:$DATABASE_PORT -timeout 30s

echo "Postgres is up. Running migrations..."
npx sequelize-cli db:migrate

exec "$@"
