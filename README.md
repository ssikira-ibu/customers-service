# Customer Management System

Customer Management System is a web-based application with associated backend components designed to help businesses like dental offices, car mechanics, and hair salons manage their customer data, appointments, notes, and contact information. This project is built using Node.js, TypeScript, Docker, PostgreSQL, Sequelize, and KoaJS.

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Setup and Installation](#setup-and-installation)
  - [Prerequisites](#prerequisites)
  - [Running the application](#running-the-application)

## Features

- **Customer Profiles:** Manage detailed customer data including first name, last name, email, and multiple phone numbers.
- **Internal Notes:** Support for multiple internal notes per customer to help staff with follow-ups and personalization.
- **RESTful API:** Designed following RESTful best practices, with endpoints for customers and nested resources like phone numbers and notes.
- **Data Validation:** Request bodies are validated using Zod to ensure proper data structure.
- **Scalable & Modular:** Built with a modular architecture using Sequelize models and associations.

## Tech Stack

- **Backend:** Node.js, KoaJS, TypeScript
- **Database:** PostgreSQL (with Sequelize ORM)
- **Containerization:** Docker
- **Validation:** Zod

## Setup and Installation

### Prerequisites

- [Node.js](https://nodejs.org/) (v14 or higher)
- [PostgreSQL](https://www.postgresql.org/)
- [Docker](https://www.docker.com/) (optional, for containerized deployment)

### Running the application

1. **Clone the repository**

2. **Install dependencies**

```
npm install
```

3. **Run the application**

Build and run the container:

```
docker-compose up --build
```

This will setup and configure the neccessary resources (e.g. postgres, node, etc.), and allow you to access the API on predefined port, e.g. `http://localhost:3000`



