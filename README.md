# Customer Management System

Customer Management System is a web-based application with associated backend components designed to help businesses like dental offices, car mechanics, and hair salons manage their customer data, appointments, notes, and contact information. This project is built using Node.js, TypeScript, Docker, PostgreSQL, Sequelize, and KoaJS.

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Setup and Installation](#setup-and-installation)
  - [Prerequisites](#prerequisites)
  - [Environment Configuration](#environment-configuration)
  - [Running the application](#running-the-application)
- [Authentication](#authentication)
- [Development](#development)

## Features

- **Customer Profiles:** Manage detailed customer data including first name, last name, email, and multiple phone numbers.
- **Internal Notes:** Support for multiple internal notes per customer to help staff with follow-ups and personalization.
- **RESTful API:** Designed following RESTful best practices, with endpoints for customers and nested resources like phone numbers and notes.
- **Data Validation:** Request bodies are validated using Zod schema validation.
- **Authentication:** Secure endpoints using Firebase Authentication.
- **Scalable & Modular:** Built with a modular architecture using Sequelize models and associations.
- **CORS Support:** Built-in CORS support for cross-origin requests.
- **Security:** Enhanced security with Helmet middleware.

## Tech Stack

- **Runtime:** Node.js (v14 or higher)
- **Framework:** KoaJS v2.16.0 with TypeScript
- **Database:** PostgreSQL with Sequelize v6.37.6
- **Authentication:** Firebase Admin SDK v13.2.0
- **Containerization:** Docker & Docker Compose
- **Validation:** Zod v3.24.2
- **Logging:** Pino v9.6.0
- **Security:** 
  - Helmet v8.0.0
  - CORS (@koa/cors v5.0.0)
- **Development:**
  - TypeScript v5.8.2
  - Nodemon v3.0.0
  - Sequelize CLI v6.6.2

## Setup and Installation

### Prerequisites

- [Node.js](https://nodejs.org/) (v14 or higher)
- [PostgreSQL](https://www.postgresql.org/)
- [Docker](https://www.docker.com/) (optional, for containerized deployment)
- Firebase project credentials

### Environment Configuration

Create a `.env.local` file in the root directory with the following variables:

```env
# Server Configuration
PORT=3000
NODE_ENV=development

# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=your_database_name
DB_USER=your_database_user
DB_PASSWORD=your_database_password

# Firebase Configuration
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_PRIVATE_KEY=your_private_key
FIREBASE_CLIENT_EMAIL=your_client_email
```

### Running the application

1. **Clone the repository**

2. **Install dependencies**
```bash
npm install
```

3. **Development mode**
```bash
npm run dev
```

4. **Production mode**
```bash
npm run build
npm start
```

5. **Using Docker**
```bash
docker-compose up --build
```

This will setup and configure the necessary resources (e.g. postgres, node, etc.), and allow you to access the API on predefined port, e.g. `http://localhost:3000`

## Authentication

The application uses Firebase Authentication for securing endpoints. To make authenticated requests:

1. Include the Firebase ID token in the Authorization header:
```
Authorization: Bearer <your-firebase-token>
```

2. Some endpoints may be public while others require authentication. Check the API documentation for specific endpoint requirements.

## Development

Available npm scripts:

- `npm run dev`: Start the development server with hot-reload
- `npm run build`: Build the TypeScript project
- `npm start`: Run the built application
- `npm run typecheck`: Run TypeScript type checking



