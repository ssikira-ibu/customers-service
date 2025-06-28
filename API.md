# Backend API Overview

This backend provides a RESTful API for managing customers and their related data (phones, addresses, notes, reminders), with authentication. It is suitable for use with a frontend client.

---

## Authentication with Firebase

This backend uses Firebase Authentication for user management and API security:

- **User Signup:**
  - Users sign up via the `/auth/signup` endpoint, providing email, password, and display name.
  - On success, the backend creates the user in Firebase Auth and issues a Firebase custom token (`customToken`).
  - The frontend must exchange this custom token for an ID token using the Firebase Client SDK.

- **User Login:**
  - Login is handled entirely on the frontend using the Firebase Client SDK (e.g., `signInWithEmailAndPassword`).
  - The backend does **not** provide a `/login` endpoint.
  - After login, the frontend obtains an ID token from Firebase.

- **Token Usage:**
  - For all protected endpoints (everything except `/auth/signup` and `/health`), clients must include the Firebase ID token in the `Authorization` header:
    - `Authorization: Bearer <FIREBASE_ID_TOKEN>`
  - The backend verifies this token using the Firebase Admin SDK. If valid, the user's identity is attached to the request context.
  - If the token is missing or invalid, the backend responds with `401 Unauthorized`.

- **Token Verification:**
  - The backend expects a valid Firebase ID token in the `Authorization` header for each request.
  - The token is verified on every request to protected endpoints, ensuring the user is authenticated and authorized.

- **Environment:**
  - The backend initializes the Firebase Admin SDK using credentials provided via the `FIREBASE_CREDENTIALS` environment variable (base64-encoded JSON service account).

### GET `/auth/me`
- **Authentication:** Required (Firebase ID token in Authorization header)
- **Response:** Authenticated user's information (from the database if available, otherwise from the Firebase token)
- **Errors:** 401 (if not authenticated)

---

## Data Models & Schemas

### Customer
- `id` (UUID): Unique identifier
- `userId` (string): Owner (user) ID
- `firstName` (string)
- `lastName` (string)
- `email` (string)
- `createdAt` (ISO 8601 string)
- `updatedAt` (ISO 8601 string)

### CustomerPhone
- `id` (UUID): Unique identifier
- `customerId` (UUID): Associated customer
- `phoneNumber` (string)
- `designation` (string): e.g., 'home', 'work', 'mobile'
- `createdAt` (ISO 8601 string)
- `updatedAt` (ISO 8601 string)

### CustomerAddress
- `id` (UUID): Unique identifier
- `customerId` (UUID): Associated customer
- `street` (string)
- `city` (string)
- `state` (string)
- `postalCode` (string)
- `country` (string)
- `addressType` (string, optional): e.g., 'home', 'work'
- `createdAt` (ISO 8601 string)
- `updatedAt` (ISO 8601 string)

### CustomerNote
- `id` (UUID): Unique identifier
- `customerId` (UUID): Associated customer
- `note` (string)
- `createdAt` (ISO 8601 string)
- `updatedAt` (ISO 8601 string)

### CustomerReminder
- `id` (UUID): Unique identifier
- `customerId` (UUID): Associated customer
- `userId` (string): Owner (user) ID
- `description` (string | null)
- `dueDate` (ISO 8601 string)
- `dateCompleted` (ISO 8601 string | null)
- `priority` ('low' | 'medium' | 'high', default 'medium')
- `createdAt` (ISO 8601 string)
- `updatedAt` (ISO 8601 string)

### User
- `id` (string): Firebase UID
- `email` (string)
- `displayName` (string)
- `emailVerified` (boolean)
- `photoURL` (string, optional)
- `disabled` (boolean)
- `lastSignInTime` (ISO 8601 string, optional)
- `createdAt` (ISO 8601 string)
- `updatedAt` (ISO 8601 string)

---

## Authentication

All endpoints (except `/auth` and `/health`) require authentication via a Firebase custom token (typically sent as a Bearer token in the `Authorization` header).

### POST `/auth/signup`
- **Request:** `{ email, password, displayName }`
- **Response:** `{ message, userId, customToken }`
- **Errors:** 400 (validation), 409 (email exists), 500 (other)

### POST `/auth/login`
- **Request:** `{ email, password }`
- **Response:** `{ userId, customToken }`
- **Errors:** 400 (validation), 401 (invalid credentials), 500 (other)

---

## Health Check

### GET `/health`
- **Response:** `{ status, timestamp, database }`
- **Errors:** 503 (if DB is disconnected)

---

## Customers

All customer endpoints require authentication.

### GET `/customers`
- **Response:** Array of customer summaries with counts (optimized for lists/tables)
- **Includes:** `id`, `firstName`, `lastName`, `email`, `phoneCount`, `addressCount`, `noteCount`, `reminderCount`, `createdAt`, `updatedAt`

### GET `/customers/:customerId`
- **Response:** Full customer object with all related data (phones, addresses, notes, reminders)
- **Errors:** 400 (invalid UUID), 404 (not found), 500 (other)

### POST `/customers`
- **Request:** `{ firstName, lastName, email, phones?, addresses? }`
- **Response:** Created customer object.
- **Errors:** 400 (validation), 409 (duplicate email), 500 (other)

### PUT `/customers/:customerId`
- **Request:** `{ firstName?, lastName?, email? }` (all fields optional)
- **Response:** Updated customer object.
- **Errors:** 400 (validation), 404 (not found), 409 (duplicate email), 500 (other)

### PATCH `/customers/:customerId`
- **Request:** `{ firstName?, lastName?, email? }` (all fields optional)
- **Response:** Updated customer object.
- **Errors:** 400 (validation), 404 (not found), 409 (duplicate email), 500 (other)

### DELETE `/customers/:customerId`
- **Response:** 204 No Content
- **Errors:** 400 (invalid UUID), 404 (not found), 500 (other)

### GET `/customers/search`
- **Query Parameters:** `query` (required)
- **Response:** Array of customers matching search criteria
- **Errors:** 400 (validation), 500 (other)

---

## Customer Phones

### GET `/customers/:customerId/phones`
- **Response:** Array of phone objects for the customer.

### POST `/customers/:customerId/phones`
- **Request:** `{ phoneNumber, designation }`
- **Response:** Created phone object.
- **Errors:** 400 (validation), 404 (customer not found), 500 (other)

### GET `/customers/:customerId/phones/:id`
- **Response:** Phone object.
- **Errors:** 400 (invalid UUID), 404 (not found), 500 (other)

### PUT `/customers/:customerId/phones/:id`
- **Request:** `{ phoneNumber, designation }`
- **Response:** Updated phone object.
- **Errors:** 400 (validation), 404 (not found), 500 (other)

### DELETE `/customers/:customerId/phones/:id`
- **Response:** 204 No Content
- **Errors:** 400 (invalid UUID), 404 (not found), 500 (other)

---

## Customer Addresses

### GET `/customers/:customerId/addresses`
- **Response:** Array of address objects for the customer.

### POST `/customers/:customerId/addresses`
- **Request:** `{ street, city, state, postalCode, country, addressType? }`
- **Response:** Created address object.
- **Errors:** 400 (validation), 404 (customer not found), 500 (other)

### GET `/customers/:customerId/addresses/:id`
- **Response:** Address object.
- **Errors:** 400 (invalid UUID), 404 (not found), 500 (other)

### PUT `/customers/:customerId/addresses/:id`
- **Request:** `{ street, city, state, postalCode, country, addressType? }`
- **Response:** Updated address object.
- **Errors:** 400 (validation), 404 (not found), 500 (other)

### DELETE `/customers/:customerId/addresses/:id`
- **Response:** 204 No Content
- **Errors:** 400 (invalid UUID), 404 (not found), 500 (other)

---

## Customer Notes

### GET `/customers/:customerId/notes`
- **Response:** Array of note objects for the customer (ordered by creation date, newest first).

### POST `/customers/:customerId/notes`
- **Request:** `{ note }`
- **Response:** Created note object.
- **Errors:** 400 (validation), 404 (customer not found), 500 (other)

### GET `/customers/:customerId/notes/:id`
- **Response:** Note object.
- **Errors:** 400 (invalid UUID), 404 (not found), 500 (other)

### PUT `/customers/:customerId/notes/:id`
- **Request:** `{ note }`
- **Response:** Updated note object.
- **Errors:** 400 (validation), 404 (not found), 500 (other)

### DELETE `/customers/:customerId/notes/:id`
- **Response:** 204 No Content
- **Errors:** 400 (invalid UUID), 404 (not found), 500 (other)

---

## Customer Reminders

### GET `/customers/:customerId/reminders`
- **Response:** Array of reminder objects for the customer (ordered by completion status, then due date).

### POST `/customers/:customerId/reminders`
- **Request:** `{ description?, dueDate, priority? }`
- **Response:** Created reminder object.
- **Errors:** 400 (validation), 404 (customer not found), 500 (other)

### GET `/customers/:customerId/reminders/:id`
- **Response:** Reminder object.
- **Errors:** 400 (invalid UUID), 404 (not found), 500 (other)

### PUT `/customers/:customerId/reminders/:id`
- **Request:** `{ description?, dueDate, priority? }`
- **Response:** Updated reminder object.
- **Errors:** 400 (validation), 404 (not found), 500 (other)

### PATCH `/customers/:customerId/reminders/:id`
- **Request:** `{ description?, dueDate?, priority?, dateCompleted? }` (all fields optional)
- **Response:** Updated reminder object.
- **Notes:** Use `dateCompleted: null` to mark as incomplete, `dateCompleted: "2024-01-01T00:00:00Z"` to mark as complete
- **Errors:** 400 (validation), 404 (not found), 500 (other)

### DELETE `/customers/:customerId/reminders/:id`
- **Response:** 204 No Content
- **Errors:** 400 (invalid UUID), 404 (not found), 500 (other)

---

## Common Error Responses
- `{ error: string }` or `{ errors: [ { message: string, ... } ] }`
- 400: Validation or bad input
- 401: Unauthorized (missing/invalid token)
- 404: Resource not found
- 409: Conflict (e.g., duplicate email)
- 500: Internal server error

---

## Notes
- All IDs are UUIDs.
- All endpoints (except `/auth` and `/health`) require authentication.
- All POST/PUT/PATCH/DELETE endpoints expect and return JSON.
- Timestamps are in ISO 8601 format.
- Customer list endpoint returns summary data optimized for tables/lists.
- Customer detail endpoint returns full data with all related resources.
- Reminder completion is handled via PATCH with `dateCompleted` field. 