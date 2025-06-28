# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Core Development
- `npm run dev` - Start development server with hot-reload
- `npm run build` - Build TypeScript project 
- `npm run typecheck` - Run TypeScript type checking (no build)
- `npm start` - Run the built application

### Testing
- `npm test` - Run all tests
- `npm run test:watch` - Run tests in watch mode
- `npm run test:coverage` - Run tests with coverage report

### Database
- Database migrations are in `sequelize/migrations/`
- Uses Sequelize with PostgreSQL
- Models are defined in `src/db/` directory

## Architecture Overview

This is a REST API for customer management built with:
- **Framework**: KoaJS with TypeScript
- **Database**: PostgreSQL with Sequelize ORM
- **Authentication**: Firebase Authentication
- **Validation**: Zod schemas
- **Logging**: Pino logger

### Key Directories
- `src/routes/` - API route handlers organized by resource
- `src/db/` - Database models and database initialization
- `src/middleware/` - Authentication and logging middleware
- `src/config/` - Configuration files (Firebase, environment)
- `src/__tests__/` - Test files

### Database Models
Core models with relationships:
- `Customer` (main entity) 
- `CustomerPhone` (many-to-one with Customer)
- `CustomerAddress` (many-to-one with Customer) 
- `CustomerNote` (many-to-one with Customer)
- `CustomerReminder` (many-to-one with Customer)
- `User` (links to Firebase users)

### Authentication Flow
- Uses Firebase Authentication with custom tokens
- Signup endpoint creates Firebase user and returns custom token
- All protected endpoints require Firebase ID token in Authorization header
- Middleware validates tokens and attaches user to context

### API Structure
- RESTful design with nested resources
- Main customer endpoints at `/customers`
- Nested resources at `/customers/:id/{phones,addresses,notes,reminders}`
- Full customer details include all related data
- Customer list endpoint returns summary data optimized for tables

### Environment Configuration
- Uses `.env.local` for development environment variables
- Firebase credentials via `FIREBASE_CREDENTIALS` (base64-encoded)
- Database connection via `DB_*` environment variables
- Runs on port from `PORT` env var (defaults to 8080)

### CORS Configuration
- Automatically allows localhost origins during development
- Supports credentials for authentication
- Production origins must be explicitly configured in `src/app.ts`
- Allows standard HTTP methods (GET, POST, PUT, PATCH, DELETE, OPTIONS)