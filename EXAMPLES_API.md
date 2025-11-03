# Examples API Documentation

This document provides complete documentation for the Examples API endpoints included with the SaaS Backend Boilerplate.

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Quick Start](#quick-start)
3. [Authentication](#authentication)
4. [API Endpoints](#api-endpoints)
5. [Testing Guide](#testing-guide)
6. [Error Handling](#error-handling)

---

## Prerequisites

### Start MongoDB

The API requires MongoDB to be running. Choose one of the following options:

**Option 1: Using Docker Compose (Recommended)**
```bash
docker-compose up -d mongo redis
```

**Option 2: Using Docker directly**
```bash
docker run -d -p 27017:27017 --name mongodb mongo:7
```

**Option 3: Local MongoDB Installation**
```bash
# macOS
brew services start mongodb-community

# Linux
sudo systemctl start mongod

# Windows
net start MongoDB
```

### Start the Development Server

```bash
npm install
npm run dev
```

The server will start on `http://localhost:3000`

---

## Quick Start

### Test the API is Running

```bash
curl http://localhost:3000/health
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2025-11-03T06:00:00.000Z",
  "services": {
    "database": true
  },
  "uptime": 12.345
}
```

---

## Authentication

In **development mode** (without Clerk configured), authentication is automatically mocked with a test user:

```json
{
  "id": "dev-user-id",
  "email": "dev@example.com",
  "role": "admin"
}
```

This means:
- All endpoints work without providing an `Authorization` header
- All examples are owned by the mock user
- Authentication is automatically handled by the middleware

For **production**, configure Clerk authentication by adding the following to your `.env`:

```env
CLERK_SECRET_KEY=sk_test_...
CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_WEBHOOK_SECRET=whsec_...
```

---

## API Endpoints

### Base URL
```
http://localhost:3000/api/examples
```

### 1. List Examples

Get a paginated list of examples owned by the authenticated user.

**Endpoint:** `GET /api/examples`

**Query Parameters:**
- `page` (number, optional): Page number (default: 1)
- `limit` (number, optional): Items per page (default: 20)
- `status` (string, optional): Filter by status (`draft`, `published`, `archived`)
- `sortBy` (string, optional): Sort field (`createdAt`, `name`, `publishedAt`)
- `sortOrder` (string, optional): Sort order (`asc`, `desc`)

**Example Request:**
```bash
curl "http://localhost:3000/api/examples?page=1&limit=10&status=published"
```

**Example Response:**
```json
{
  "success": true,
  "message": "Examples retrieved successfully",
  "data": [
    {
      "id": "507f1f77bcf86cd799439011",
      "name": "My First Example",
      "description": "This is a sample example",
      "userId": "dev-user-id",
      "status": "published",
      "tags": ["sample", "tutorial"],
      "metadata": {},
      "isPublic": true,
      "publishedAt": "2025-11-03T06:00:00.000Z",
      "viewCount": 42,
      "createdAt": "2025-11-01T10:00:00.000Z",
      "updatedAt": "2025-11-03T06:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 25,
    "pages": 3
  }
}
```

---

### 2. Get Example by ID

Retrieve a single example by its ID.

**Endpoint:** `GET /api/examples/:id`

**Path Parameters:**
- `id` (string, required): Example ID (MongoDB ObjectId)

**Example Request:**
```bash
curl http://localhost:3000/api/examples/507f1f77bcf86cd799439011
```

**Example Response:**
```json
{
  "success": true,
  "message": "Example retrieved successfully",
  "data": {
    "id": "507f1f77bcf86cd799439011",
    "name": "My First Example",
    "description": "This is a sample example",
    "userId": "dev-user-id",
    "status": "published",
    "tags": ["sample", "tutorial"],
    "metadata": {},
    "isPublic": true,
    "publishedAt": "2025-11-03T06:00:00.000Z",
    "viewCount": 43,
    "createdAt": "2025-11-01T10:00:00.000Z",
    "updatedAt": "2025-11-03T06:00:00.000Z"
  }
}
```

---

### 3. Create Example

Create a new example.

**Endpoint:** `POST /api/examples`

**Request Body:**
```json
{
  "name": "My New Example",
  "description": "A detailed description of this example",
  "status": "draft",
  "tags": ["api", "example", "tutorial"],
  "metadata": {
    "category": "tutorial",
    "difficulty": "beginner"
  },
  "isPublic": false
}
```

**Field Descriptions:**
- `name` (string, **required**): Example name (max 100 characters)
- `description` (string, optional): Description (max 500 characters)
- `status` (string, optional): Status (`draft`, `published`, `archived`) - default: `draft`
- `tags` (array, optional): Array of tags
- `metadata` (object, optional): Custom metadata
- `isPublic` (boolean, optional): Whether example is public - default: `false`

**Example Request:**
```bash
curl -X POST http://localhost:3000/api/examples \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Authentication Tutorial",
    "description": "Learn how to implement JWT authentication",
    "status": "draft",
    "tags": ["auth", "jwt", "security"],
    "metadata": {
      "difficulty": "intermediate",
      "estimatedTime": "30 minutes"
    }
  }'
```

**Example Response:**
```json
{
  "success": true,
  "message": "Example created successfully",
  "data": {
    "id": "507f1f77bcf86cd799439012",
    "name": "Authentication Tutorial",
    "description": "Learn how to implement JWT authentication",
    "userId": "dev-user-id",
    "status": "draft",
    "tags": ["auth", "jwt", "security"],
    "metadata": {
      "difficulty": "intermediate",
      "estimatedTime": "30 minutes"
    },
    "isPublic": false,
    "viewCount": 0,
    "createdAt": "2025-11-03T06:30:00.000Z",
    "updatedAt": "2025-11-03T06:30:00.000Z"
  }
}
```

---

### 4. Update Example

Update an existing example. You can only update your own examples.

**Endpoint:** `PUT /api/examples/:id`

**Path Parameters:**
- `id` (string, required): Example ID

**Request Body** (all fields optional):
```json
{
  "name": "Updated Example Name",
  "description": "Updated description",
  "status": "published",
  "tags": ["updated", "tags"],
  "metadata": {
    "version": "2.0"
  },
  "isPublic": true
}
```

**Example Request:**
```bash
curl -X PUT http://localhost:3000/api/examples/507f1f77bcf86cd799439012 \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Advanced Authentication Tutorial",
    "status": "published",
    "isPublic": true
  }'
```

**Example Response:**
```json
{
  "success": true,
  "message": "Example updated successfully",
  "data": {
    "id": "507f1f77bcf86cd799439012",
    "name": "Advanced Authentication Tutorial",
    "description": "Learn how to implement JWT authentication",
    "userId": "dev-user-id",
    "status": "published",
    "tags": ["auth", "jwt", "security"],
    "metadata": {
      "difficulty": "intermediate",
      "estimatedTime": "30 minutes"
    },
    "isPublic": true,
    "publishedAt": "2025-11-03T06:35:00.000Z",
    "viewCount": 0,
    "createdAt": "2025-11-03T06:30:00.000Z",
    "updatedAt": "2025-11-03T06:35:00.000Z"
  }
}
```

---

### 5. Delete Example

Soft delete an example. The example will not be permanently deleted, just marked as deleted.

**Endpoint:** `DELETE /api/examples/:id`

**Path Parameters:**
- `id` (string, required): Example ID

**Example Request:**
```bash
curl -X DELETE http://localhost:3000/api/examples/507f1f77bcf86cd799439012
```

**Example Response:**
```json
{
  "success": true,
  "message": "Example deleted successfully"
}
```

---

### 6. Get Popular Examples

Get a list of the most popular public examples based on view count.

**Endpoint:** `GET /api/examples/popular`

**Query Parameters:**
- `limit` (number, optional): Number of results (default: 10)

**Example Request:**
```bash
curl "http://localhost:3000/api/examples/popular?limit=5"
```

**Example Response:**
```json
{
  "success": true,
  "message": "Popular examples retrieved successfully",
  "data": [
    {
      "id": "507f1f77bcf86cd799439011",
      "name": "Getting Started Guide",
      "description": "Complete guide to getting started",
      "userId": "dev-user-id",
      "status": "published",
      "tags": ["tutorial", "beginner"],
      "isPublic": true,
      "viewCount": 1250,
      "publishedAt": "2025-10-01T10:00:00.000Z",
      "createdAt": "2025-10-01T09:00:00.000Z",
      "updatedAt": "2025-11-03T06:00:00.000Z"
    }
  ]
}
```

---

### 7. Get My Examples

Get all examples owned by the authenticated user.

**Endpoint:** `GET /api/examples/mine`

**Query Parameters:**
- `page` (number, optional): Page number (default: 1)
- `limit` (number, optional): Items per page (default: 20)

**Example Request:**
```bash
curl "http://localhost:3000/api/examples/mine?page=1&limit=20"
```

**Example Response:**
```json
{
  "success": true,
  "message": "User examples retrieved successfully",
  "data": [
    {
      "id": "507f1f77bcf86cd799439011",
      "name": "My Private Example",
      "description": "This is my private example",
      "userId": "dev-user-id",
      "status": "draft",
      "tags": ["personal"],
      "isPublic": false,
      "viewCount": 5,
      "createdAt": "2025-11-01T10:00:00.000Z",
      "updatedAt": "2025-11-03T06:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 15,
    "pages": 1
  }
}
```

---

### 8. Get User Statistics

Get statistics about the user's examples.

**Endpoint:** `GET /api/examples/stats`

**Example Request:**
```bash
curl http://localhost:3000/api/examples/stats
```

**Example Response:**
```json
{
  "success": true,
  "message": "Statistics retrieved successfully",
  "data": {
    "total": 25,
    "byStatus": {
      "draft": 10,
      "published": 12,
      "archived": 3
    },
    "totalViews": 3450,
    "publicExamples": 12,
    "privateExamples": 13
  }
}
```

---

### 9. Publish Example

Publish a draft example, making it public and setting the published date.

**Endpoint:** `POST /api/examples/:id/publish`

**Path Parameters:**
- `id` (string, required): Example ID

**Example Request:**
```bash
curl -X POST http://localhost:3000/api/examples/507f1f77bcf86cd799439012/publish
```

**Example Response:**
```json
{
  "success": true,
  "message": "Example published successfully",
  "data": {
    "id": "507f1f77bcf86cd799439012",
    "name": "My Example",
    "status": "published",
    "isPublic": true,
    "publishedAt": "2025-11-03T06:40:00.000Z",
    "updatedAt": "2025-11-03T06:40:00.000Z"
  }
}
```

---

### 10. Archive Example

Archive an example, making it private and changing status to archived.

**Endpoint:** `POST /api/examples/:id/archive`

**Path Parameters:**
- `id` (string, required): Example ID

**Example Request:**
```bash
curl -X POST http://localhost:3000/api/examples/507f1f77bcf86cd799439012/archive
```

**Example Response:**
```json
{
  "success": true,
  "message": "Example archived successfully",
  "data": {
    "id": "507f1f77bcf86cd799439012",
    "name": "My Example",
    "status": "archived",
    "isPublic": false,
    "updatedAt": "2025-11-03T06:45:00.000Z"
  }
}
```

---

### 11. Bulk Delete Examples

Delete multiple examples at once.

**Endpoint:** `POST /api/examples/bulk-delete`

**Request Body:**
```json
{
  "ids": [
    "507f1f77bcf86cd799439012",
    "507f1f77bcf86cd799439013",
    "507f1f77bcf86cd799439014"
  ]
}
```

**Example Request:**
```bash
curl -X POST http://localhost:3000/api/examples/bulk-delete \
  -H "Content-Type: application/json" \
  -d '{
    "ids": [
      "507f1f77bcf86cd799439012",
      "507f1f77bcf86cd799439013"
    ]
  }'
```

**Example Response:**
```json
{
  "success": true,
  "message": "2 examples deleted successfully",
  "data": {
    "deleted": 2,
    "failed": 0
  }
}
```

---

### 12. Admin: Get All Examples

Admin-only endpoint to get all examples including deleted ones.

**Endpoint:** `GET /api/examples/admin/all`

**Query Parameters:**
- `page` (number, optional): Page number (default: 1)
- `limit` (number, optional): Items per page (default: 50)
- `includeDeleted` (boolean, optional): Include soft-deleted examples (default: false)

**Example Request:**
```bash
curl "http://localhost:3000/api/examples/admin/all?includeDeleted=true"
```

**Example Response:**
```json
{
  "success": true,
  "message": "All examples retrieved successfully",
  "data": [
    {
      "id": "507f1f77bcf86cd799439011",
      "name": "Example 1",
      "userId": "dev-user-id",
      "status": "published",
      "deletedAt": null
    },
    {
      "id": "507f1f77bcf86cd799439012",
      "name": "Deleted Example",
      "userId": "dev-user-id",
      "status": "draft",
      "deletedAt": "2025-11-03T06:50:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 125,
    "pages": 3
  }
}
```

---

## Testing Guide

### Complete CRUD Test Workflow

Here's a complete workflow to test all CRUD operations:

#### 1. Create an Example

```bash
curl -X POST http://localhost:3000/api/examples \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Example",
    "description": "Testing the API",
    "tags": ["test"],
    "metadata": {"test": true}
  }'
```

Save the returned `id` for subsequent requests.

#### 2. Get the Example

```bash
# Replace EXAMPLE_ID with the ID from step 1
curl http://localhost:3000/api/examples/EXAMPLE_ID
```

#### 3. Update the Example

```bash
curl -X PUT http://localhost:3000/api/examples/EXAMPLE_ID \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Updated Test Example",
    "description": "Updated description",
    "status": "published"
  }'
```

#### 4. Publish the Example

```bash
curl -X POST http://localhost:3000/api/examples/EXAMPLE_ID/publish
```

#### 5. List All Examples

```bash
curl "http://localhost:3000/api/examples?status=published"
```

#### 6. Get My Examples

```bash
curl http://localhost:3000/api/examples/mine
```

#### 7. Get Statistics

```bash
curl http://localhost:3000/api/examples/stats
```

#### 8. Archive the Example

```bash
curl -X POST http://localhost:3000/api/examples/EXAMPLE_ID/archive
```

#### 9. Delete the Example

```bash
curl -X DELETE http://localhost:3000/api/examples/EXAMPLE_ID
```

---

### Using Postman

1. **Import Collection**: Create a new Postman collection
2. **Set Base URL**: `http://localhost:3000/api/examples`
3. **No Auth Required**: In development mode, authentication is mocked

**Suggested Environment Variables:**
```json
{
  "base_url": "http://localhost:3000",
  "example_id": "507f1f77bcf86cd799439011"
}
```

---

## Error Handling

### Error Response Format

All errors follow this format:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "stack": "Stack trace (development only)",
    "requestId": "uuid-v4-request-id"
  }
}
```

### Common Error Codes

| HTTP Status | Error Code | Description |
|-------------|------------|-------------|
| 400 | `VALIDATION_ERROR` | Request validation failed |
| 401 | `AUTH_ERROR` | Authentication required or failed |
| 403 | `FORBIDDEN` | Insufficient permissions |
| 404 | `NOT_FOUND` | Resource not found |
| 409 | `CONFLICT` | Resource conflict (duplicate, etc.) |
| 500 | `INTERNAL_ERROR` | Server error |

### Example Error Responses

**Validation Error:**
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": [
      {
        "field": "name",
        "message": "Name is required"
      },
      {
        "field": "description",
        "message": "Description cannot exceed 500 characters"
      }
    ]
  }
}
```

**Not Found Error:**
```json
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "Example with ID 507f1f77bcf86cd799439011 not found"
  }
}
```

**Forbidden Error:**
```json
{
  "success": false,
  "error": {
    "code": "FORBIDDEN",
    "message": "You do not have permission to modify this example"
  }
}
```

---

## Advanced Features

### Soft Delete

Examples are soft-deleted by default:
- Deleted examples remain in the database with `deletedAt` timestamp
- They're automatically excluded from queries
- Admins can view deleted examples with `includeDeleted=true`
- Examples can be restored by setting `deletedAt` to `null`

### Text Search

The Example model supports full-text search:

```javascript
const results = await Example.search('authentication tutorial', {
  status: 'published',
  isPublic: true,
  limit: 10
});
```

### View Tracking

View counts are automatically incremented when examples are retrieved:

```javascript
await Example.incrementViewCount(exampleId);
```

---

## Code Examples

### Using the Example Model Directly

```typescript
import { Example } from './features/example/example.model';

// Find examples by user
const userExamples = await Example.findByUser('user-id', {
  status: 'published',
  limit: 10,
  skip: 0,
  sort: { createdAt: -1 }
});

// Search examples
const searchResults = await Example.search('tutorial', {
  status: 'published',
  isPublic: true,
  limit: 20
});

// Get popular examples
const popular = await Example.getPopular(10);

// Check if user can edit
const example = await Example.findById(id);
if (example.canEdit(userId)) {
  await example.publish();
}
```

---

## Next Steps

1. **Start MongoDB** using one of the methods in [Prerequisites](#prerequisites)
2. **Test the endpoints** using curl or Postman
3. **Explore the code** in `/src/features/example/` to understand the implementation
4. **Create your own feature** following the same pattern
5. **Read the main guide** in the previous documentation for detailed instructions

---

## Support

For issues or questions:
- Check the logs: The server provides detailed logs for debugging
- Review the code: All example code is in `/src/features/example/`
- Check MongoDB: Ensure MongoDB is running and accessible

---

## Summary

The Examples API provides a complete CRUD implementation with:
- **12 endpoints** covering all common operations
- **Pagination** for list endpoints
- **Filtering and sorting** support
- **Soft delete** functionality
- **Role-based access** (admin endpoints)
- **View tracking** and statistics
- **Full validation** with Zod schemas
- **Comprehensive error handling**

This serves as a production-ready template for building your own features!
