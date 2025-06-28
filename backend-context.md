# Backend API Documentation

## 0. Project Description

Customer Management System is a RESTful API built with Node.js, TypeScript, KoaJS, and PostgreSQL. It provides comprehensive customer management functionality for businesses like dental offices, car mechanics, and hair salons. The system manages customer profiles, contact information, notes, addresses, and reminders with Firebase authentication.

**Tech Stack:**
- Node.js with TypeScript
- KoaJS framework
- PostgreSQL with Sequelize ORM
- Firebase Authentication
- Zod validation
- Pino logging

## 1. Base URL

**Development:** `http://localhost:8080` (default port from app.ts)
**Production:** Environment variable `PORT` (defaults to 8080)

The API listens on all interfaces (`0.0.0.0`) for containerized deployment.

## 2. Authentication Mechanism

### Firebase Authentication

The backend uses Firebase Authentication for user management and API security:

**Signup Process:**
1. Frontend calls `/auth/signup` with email, password, and display name
2. Backend creates user in Firebase Auth and returns a custom token
3. Frontend exchanges custom token for ID token using Firebase Client SDK

**Login Process:**
1. Frontend handles login entirely using Firebase Client SDK
2. No backend login endpoint - use `signInWithEmailAndPassword` from Firebase
3. Frontend obtains ID token after successful login

**Token Usage:**
- Include Firebase ID token in `Authorization` header: `Bearer <FIREBASE_ID_TOKEN>`
- Required for all protected endpoints (everything except `/auth/signup` and `/health`)
- Backend verifies token using Firebase Admin SDK
- Invalid/missing tokens return `401 Unauthorized`

## 3. Available Endpoints

### Authentication Endpoints

#### POST `/auth/signup`
- **Description:** Create new user account
- **Request Body:**
  ```json
  {
    "email": "user@example.com",
    "password": "password123",
    "displayName": "John Doe"
  }
  ```
- **Response:**
  ```json
  {
    "message": "User created successfully",
    "userId": "firebase_uid",
    "customToken": "firebase_custom_token"
  }
  ```
- **Auth Required:** No
- **Status Codes:** 201 (success), 400 (validation), 409 (email exists), 500 (error)

#### POST `/auth/login`
- **Description:** Login user (limited functionality - mainly for testing)
- **Request Body:**
  ```json
  {
    "email": "user@example.com",
    "password": "password123"
  }
  ```
- **Response:**
  ```json
  {
    "message": "Login successful",
    "userId": "firebase_uid",
    "customToken": "firebase_custom_token"
  }
  ```
- **Auth Required:** No
- **Status Codes:** 200 (success), 400 (validation), 401 (invalid credentials), 500 (error)

#### GET `/auth/me`
- **Description:** Get current user information
- **Response:**
  ```json
  {
    "id": "firebase_uid",
    "email": "user@example.com",
    "displayName": "John Doe",
    "emailVerified": true,
    "photoURL": "https://...",
    "disabled": false,
    "lastSignInTime": "2024-01-01T00:00:00.000Z",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
  ```
- **Auth Required:** Yes
- **Status Codes:** 200 (success), 401 (unauthorized), 500 (error)

### Health Check

#### GET `/health`
- **Description:** Health check endpoint
- **Response:**
  ```json
  {
    "status": "ok",
    "timestamp": "2024-01-01T00:00:00.000Z"
  }
  ```
- **Auth Required:** No
- **Status Codes:** 200 (success), 503 (database disconnected)

### Customer Endpoints

#### GET `/customers`
- **Description:** Get all customers for authenticated user with summary data optimized for lists/tables
- **Response:** Array of customer objects with count object containing related resource counts
- **Response Format:**
  ```json
  [
    {
      "id": "uuid",
      "firstName": "John",
      "lastName": "Doe",
      "email": "john@example.com",
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z",
      "count": {
        "phones": 2,
        "addresses": 1,
        "notes": 5,
        "reminders": 3
      }
    }
  ]
  ```
- **Auth Required:** Yes
- **Status Codes:** 200 (success), 401 (unauthorized), 500 (error)

#### GET `/customers/:customerId`
- **Description:** Get detailed customer information with all related data
- **Response:** Full customer object with nested phones, addresses, notes, and reminders
- **Auth Required:** Yes
- **Status Codes:** 200 (success), 400 (invalid UUID), 404 (not found), 401 (unauthorized), 500 (error)

#### PUT `/customers/:customerId`
- **Description:** Update customer information (full update)
- **Request Body:**
  ```json
  {
    "firstName": "John",
    "lastName": "Doe", 
    "email": "john@example.com"
  }
  ```
- **Response:** Updated customer object
- **Auth Required:** Yes
- **Status Codes:** 200 (success), 400 (validation), 404 (not found), 409 (duplicate email), 500 (error)

#### PATCH `/customers/:customerId`
- **Description:** Partially update customer information
- **Request Body:** Any subset of customer fields (all optional)
- **Response:** Updated customer object
- **Auth Required:** Yes
- **Status Codes:** 200 (success), 400 (validation), 404 (not found), 409 (duplicate email), 500 (error)

#### POST `/customers`
- **Description:** Create new customer
- **Request Body:**
  ```json
  {
    "firstName": "John",
    "lastName": "Doe",
    "email": "john@example.com",
    "phones": [
      {
        "phoneNumber": "555-1234",
        "designation": "mobile"
      }
    ],
    "addresses": [
      {
        "street": "123 Main St",
        "city": "Anytown",
        "state": "CA",
        "postalCode": "12345",
        "country": "USA",
        "addressType": "home"
      }
    ]
  }
  ```
- **Response:** Created customer object
- **Auth Required:** Yes
- **Status Codes:** 201 (success), 400 (validation), 409 (duplicate email), 500 (error)

#### GET `/customers/search`
- **Description:** Search customers by name, email, or other fields
- **Query Parameters:** `query` (required)
- **Response:** Array of matching customers with relevance ranking
- **Auth Required:** Yes
- **Status Codes:** 200 (success), 400 (validation), 500 (error)

#### DELETE `/customers/:customerId`
- **Description:** Delete customer by ID
- **Auth Required:** Yes
- **Status Codes:** 204 (success), 400 (invalid UUID), 404 (not found), 500 (error)

### Customer Phone Endpoints

#### GET `/customers/:customerId/phones`
- **Description:** Get all phone numbers for a customer
- **Response:** Array of phone objects
- **Auth Required:** Yes
- **Status Codes:** 200 (success), 400 (invalid UUID), 500 (error)

#### POST `/customers/:customerId/phones`
- **Description:** Add phone number to customer
- **Request Body:**
  ```json
  {
    "phoneNumber": "555-1234",
    "designation": "mobile"
  }
  ```
- **Response:** Created phone object
- **Auth Required:** Yes
- **Status Codes:** 201 (success), 400 (validation), 404 (customer not found), 500 (error)

#### GET `/customers/:customerId/phones/:id`
- **Description:** Get specific phone number
- **Response:** Phone object
- **Auth Required:** Yes
- **Status Codes:** 200 (success), 400 (invalid UUID), 404 (not found), 500 (error)

#### PUT `/customers/:customerId/phones/:id`
- **Description:** Update phone number
- **Request Body:** Same as POST
- **Response:** Updated phone object
- **Auth Required:** Yes
- **Status Codes:** 200 (success), 400 (validation), 404 (not found), 500 (error)

#### DELETE `/customers/:customerId/phones/:id`
- **Description:** Delete phone number
- **Auth Required:** Yes
- **Status Codes:** 204 (success), 400 (invalid UUID), 404 (not found), 500 (error)

### Customer Address Endpoints

#### GET `/customers/:customerId/addresses`
- **Description:** Get all addresses for a customer
- **Response:** Array of address objects
- **Auth Required:** Yes
- **Status Codes:** 200 (success), 400 (invalid UUID), 500 (error)

#### POST `/customers/:customerId/addresses`
- **Description:** Add address to customer
- **Request Body:**
  ```json
  {
    "street": "123 Main St",
    "city": "Anytown",
    "state": "CA",
    "postalCode": "12345",
    "country": "USA",
    "addressType": "home"
  }
  ```
- **Response:** Created address object
- **Auth Required:** Yes
- **Status Codes:** 201 (success), 400 (validation), 404 (customer not found), 500 (error)

#### GET `/customers/:customerId/addresses/:id`
- **Description:** Get specific address
- **Response:** Address object
- **Auth Required:** Yes
- **Status Codes:** 200 (success), 400 (invalid UUID), 404 (not found), 500 (error)

#### PUT `/customers/:customerId/addresses/:id`
- **Description:** Update address
- **Request Body:** Same as POST
- **Response:** Updated address object
- **Auth Required:** Yes
- **Status Codes:** 200 (success), 400 (validation), 404 (not found), 500 (error)

#### DELETE `/customers/:customerId/addresses/:id`
- **Description:** Delete address
- **Auth Required:** Yes
- **Status Codes:** 204 (success), 400 (invalid UUID), 404 (not found), 500 (error)

### Customer Note Endpoints

#### GET `/customers/:customerId/notes`
- **Description:** Get all notes for a customer
- **Response:** Array of note objects
- **Auth Required:** Yes
- **Status Codes:** 200 (success), 400 (invalid UUID), 500 (error)

#### POST `/customers/:customerId/notes`
- **Description:** Add note to customer
- **Request Body:**
  ```json
  {
    "note": "Customer prefers morning appointments"
  }
  ```
- **Response:** Created note object
- **Auth Required:** Yes
- **Status Codes:** 201 (success), 400 (validation), 404 (customer not found), 500 (error)

#### GET `/customers/:customerId/notes/:id`
- **Description:** Get specific note
- **Response:** Note object
- **Auth Required:** Yes
- **Status Codes:** 200 (success), 400 (invalid UUID), 404 (not found), 500 (error)

#### PUT `/customers/:customerId/notes/:id`
- **Description:** Update note
- **Request Body:** Same as POST
- **Response:** Updated note object
- **Auth Required:** Yes
- **Status Codes:** 200 (success), 400 (validation), 404 (not found), 500 (error)

#### DELETE `/customers/:customerId/notes/:id`
- **Description:** Delete note
- **Auth Required:** Yes
- **Status Codes:** 204 (success), 400 (invalid UUID), 404 (not found), 500 (error)

### Customer Reminder Endpoints

#### GET `/customers/:customerId/reminders`
- **Description:** Get all reminders for a customer
- **Response:** Array of reminder objects (ordered by completion status, due date, priority)
- **Auth Required:** Yes
- **Status Codes:** 200 (success), 400 (invalid UUID), 404 (customer not found), 500 (error)

#### POST `/customers/:customerId/reminders`
- **Description:** Create reminder for customer
- **Request Body:**
  ```json
  {
    "description": "Call to check on service satisfaction",
    "dueDate": "2024-01-15T10:00:00.000Z",
    "priority": "medium"
  }
  ```
- **Notes:** 
  - `description` is required (1-1000 characters)
  - `priority` is optional (defaults to "medium")
  - `dueDate` must be ISO 8601 format
- **Response:** Created reminder object
- **Auth Required:** Yes
- **Status Codes:** 201 (success), 400 (validation), 404 (customer not found), 500 (error)

#### GET `/customers/:customerId/reminders/:id`
- **Description:** Get specific reminder
- **Response:** Reminder object
- **Auth Required:** Yes
- **Status Codes:** 200 (success), 400 (invalid UUID), 404 (not found), 500 (error)

#### PUT `/customers/:customerId/reminders/:id`
- **Description:** Update reminder (full update)
- **Request Body:** Same as POST (all fields required)
- **Response:** Updated reminder object
- **Auth Required:** Yes
- **Status Codes:** 200 (success), 400 (validation), 404 (not found), 500 (error)

#### PATCH `/customers/:customerId/reminders/:id`
- **Description:** Partially update reminder (including completion status)
- **Request Body:**
  ```json
  {
    "description": "Updated description",
    "dueDate": "2024-01-20T10:00:00.000Z",
    "priority": "high",
    "dateCompleted": "2024-01-15T10:00:00.000Z"
  }
  ```
- **Notes:**
  - All fields are optional
  - Use `dateCompleted: null` to mark as incomplete
  - Use `dateCompleted: "ISO_DATE"` to mark as complete
- **Response:** Updated reminder object
- **Auth Required:** Yes
- **Status Codes:** 200 (success), 400 (validation), 404 (not found), 500 (error)

#### DELETE `/customers/:customerId/reminders/:id`
- **Description:** Delete reminder
- **Auth Required:** Yes
- **Status Codes:** 204 (success), 400 (invalid UUID), 404 (not found), 500 (error)

### Global Reminder Endpoints

#### GET `/reminders/analytics`
- **Description:** Get global analytics for all user's reminders across all customers
- **Response:**
  ```json
  {
    "counts": {
      "total": 45,
      "active": 22,
      "overdue": 8,
      "completed": 15
    },
    "completionRate": 0.33
  }
  ```
- **Notes:**
  - `active` = total - completed (includes overdue)
  - `overdue` = incomplete reminders past due date
  - `completionRate` = completed / total (0-1 decimal)
- **Auth Required:** Yes
- **Status Codes:** 200 (success), 401 (unauthorized), 500 (error)

#### GET `/reminders`
- **Description:** Get global list of reminders across all customers with filtering
- **Query Parameters:**
  - `status`: `active`, `overdue`, `completed`, or `all` (default: `all`)
  - `include`: `customer` to include customer details in response
- **Response:** Array of reminder objects
- **Response Format (with include=customer):**
  ```json
  [
    {
      "id": "uuid",
      "description": "Follow up call",
      "dueDate": "2024-01-15T10:00:00.000Z",
      "priority": "high",
      "dateCompleted": null,
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z",
      "customer": {
        "id": "uuid",
        "firstName": "John",
        "lastName": "Doe",
        "email": "john@example.com"
      }
    }
  ]
  ```
- **Usage Examples:**
  - `GET /reminders?include=customer` - All reminders with customer data
  - `GET /reminders?status=active&include=customer` - Active reminders only
  - `GET /reminders?status=overdue` - Overdue reminders without customer data
- **Auth Required:** Yes
- **Status Codes:** 200 (success), 400 (validation), 401 (unauthorized), 500 (error)

## 4. Error Response Format

### Standard Error Format
```json
{
  "error": "Error message"
}
```

### Validation Error Format
```json
{
  "errors": [
    {
      "code": "invalid_type",
      "expected": "string",
      "received": "undefined",
      "path": ["email"],
      "message": "Required"
    }
  ]
}
```

### HTTP Status Codes
- **200:** Success
- **201:** Created
- **204:** No Content (successful deletion)
- **400:** Bad Request (validation errors, invalid UUID)
- **401:** Unauthorized (missing/invalid token)
- **404:** Not Found (resource doesn't exist)
- **409:** Conflict (duplicate email)
- **500:** Internal Server Error
- **503:** Service Unavailable (database disconnected)

## 5. Notable Conventions

### Data Formats
- **IDs:** All IDs are UUIDs (version 4)
- **Dates:** ISO 8601 format (`YYYY-MM-DDTHH:mm:ss.sssZ`)
- **Content-Type:** `application/json` for all requests/responses

### Authentication
- **Header:** `Authorization: Bearer <FIREBASE_ID_TOKEN>`
- **Token Expiry:** Firebase ID tokens expire after 1 hour
- **Refresh:** Frontend should handle token refresh using Firebase SDK

### Data Relationships
- All customer-related data (phones, addresses, notes, reminders) are scoped to the authenticated user
- Customer deletion cascades to all related data
- Users can only access their own customer data

### Search Functionality
- Full-text search using PostgreSQL full-text search vectors
- Fuzzy matching using trigram similarity
- Results ranked by relevance score
- Search across customer names, emails, and other indexed fields

### Reminder Priorities
- **Values:** `low`, `medium`, `high`
- **Default:** `medium`
- **Ordering:** High priority reminders appear first

### Phone/Address Designations
- **Phone:** `home`, `work`, `mobile`, etc.
- **Address:** `home`, `work`, etc.
- These are free-form strings, not enumerated values

### CORS
- Backend includes CORS headers for cross-origin requests
- `Access-Control-Allow-Origin: *`
- Supports `GET`, `POST`, `PUT`, `DELETE`, `OPTIONS` methods
- Includes `Authorization` header in allowed headers 