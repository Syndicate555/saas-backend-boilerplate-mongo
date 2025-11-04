# SaaS Backend Boilerplate - Systems Architecture

> **Version**: 1.0
> **Database**: MongoDB
> **Framework**: Express.js + TypeScript
> **Auth**: Clerk (with dev mode fallback)

---

## Table of Contents

1. [Overview](#overview)
2. [High-Level Architecture](#high-level-architecture)
3. [Core Components](#core-components)
4. [Request Flow](#request-flow)
5. [Database Architecture](#database-architecture)
6. [Feature Development Pattern](#feature-development-pattern)
7. [Authentication & Authorization](#authentication--authorization)
8. [Error Handling System](#error-handling-system)
9. [Module System](#module-system)
10. [Adding New Features](#adding-new-features)
11. [Best Practices](#best-practices)

---

## Overview

This boilerplate provides a **production-ready, modular backend architecture** designed for rapid SaaS MVP development. It follows clean architecture principles with clear separation of concerns, comprehensive error handling, and type safety throughout.

### Key Characteristics

- **Type-Safe**: Strict TypeScript with zero type errors
- **Modular**: Optional modules load conditionally based on environment
- **Production-Ready**: Security, logging, monitoring, audit trails
- **Developer-Friendly**: Works locally with minimal setup
- **Scalable**: Feature-based structure that grows with your app

---

## High-Level Architecture

### System Overview

```mermaid
graph TB
    subgraph "Client Layer"
        CLIENT[Client Application]
    end

    subgraph "API Gateway Layer"
        LB[Load Balancer]
        NGINX[NGINX/Reverse Proxy]
    end

    subgraph "Application Layer"
        APP[Express.js Server]

        subgraph "Core System"
            MIDDLEWARE[Middleware Stack]
            ERROR[Error Handler]
            LOGGER[Winston Logger]
        end

        subgraph "Business Logic"
            FEATURES[Features Layer]
            SERVICES[Service Layer]
        end

        subgraph "Optional Modules"
            AUTH[Auth Module]
            PAYMENTS[Payments Module]
            UPLOADS[Uploads Module]
            REALTIME[Real-time Module]
            JOBS[Jobs Module]
            EMAIL[Email Module]
            RBAC[RBAC Module]
        end
    end

    subgraph "Data Layer"
        MONGO[(MongoDB)]
        REDIS[(Redis Cache)]
        S3[AWS S3]
    end

    subgraph "External Services"
        CLERK[Clerk Auth]
        STRIPE[Stripe]
        SENDGRID[SendGrid]
        SENTRY[Sentry]
    end

    CLIENT --> LB
    LB --> NGINX
    NGINX --> APP

    APP --> MIDDLEWARE
    MIDDLEWARE --> FEATURES
    FEATURES --> SERVICES
    SERVICES --> MONGO

    APP --> AUTH
    AUTH --> CLERK

    APP --> PAYMENTS
    PAYMENTS --> STRIPE

    APP --> UPLOADS
    UPLOADS --> S3

    APP --> JOBS
    JOBS --> REDIS

    APP --> EMAIL
    EMAIL --> SENDGRID

    ERROR --> SENTRY
    LOGGER --> SENTRY

    SERVICES --> REDIS

    style CLIENT fill:#e1f5ff
    style APP fill:#fff4e1
    style MONGO fill:#c8e6c9
    style REDIS fill:#ffcdd2
    style CLERK fill:#f3e5f5
    style STRIPE fill:#e1bee7
```

### Application Structure

```mermaid
graph LR
    subgraph "Entry Point"
        INDEX[index.ts]
    end

    subgraph "Core"
        SERVER[server.ts]
        CONFIG[config/]
        MIDDLEWARE[middleware/]
        TYPES[types/]
        UTILS[utils/]
    end

    subgraph "Database"
        CONNECTION[connection.ts]
        MODELS[models/]
    end

    subgraph "Modules"
        AUTH_MOD[auth/]
        PAY_MOD[payments/]
        UP_MOD[uploads/]
        RT_MOD[realtime/]
        JOB_MOD[jobs/]
        EM_MOD[email/]
        RB_MOD[rbac/]
    end

    subgraph "Features"
        FEATURE[example/]
        MODEL[model.ts]
        SCHEMA[schema.ts]
        SERVICE[service.ts]
        CONTROLLER[controller.ts]
        ROUTES[routes.ts]
    end

    INDEX --> SERVER
    INDEX --> CONNECTION
    SERVER --> CONFIG
    SERVER --> MIDDLEWARE

    FEATURE --> MODEL
    FEATURE --> SCHEMA
    FEATURE --> SERVICE
    FEATURE --> CONTROLLER
    FEATURE --> ROUTES

    ROUTES --> MIDDLEWARE
    CONTROLLER --> SERVICE
    SERVICE --> MODELS

    style INDEX fill:#ffeb3b
    style SERVER fill:#ff9800
    style FEATURE fill:#4caf50
```

---

## Core Components

### Component Hierarchy

```mermaid
graph TD
    subgraph "Configuration Layer"
        ENV[env.ts<br/>Zod Validation]
        DATABASE_CONFIG[database.ts<br/>DB Abstraction]
        REDIS_CONFIG[redis.ts<br/>Cache Client]
        LOGGER_CONFIG[logger.ts<br/>Winston Setup]
    end

    subgraph "Middleware Layer"
        ERROR_HANDLER[errorHandler.ts<br/>Global Error Handler]
        VALIDATE[validate.ts<br/>Zod Schemas]
        ASYNC_HANDLER[asyncHandler.ts<br/>Promise Wrapper]
        RATE_LIMITER[rateLimiter.ts<br/>Rate Limiting]
        REQUEST_LOGGER[requestLogger.ts<br/>Request Logging]
        NOT_FOUND[notFound.ts<br/>404 Handler]
    end

    subgraph "Type System"
        ERRORS[errors.ts<br/>Custom Errors]
        EXPRESS_TYPES[express.d.ts<br/>Type Extensions]
        SHARED_TYPES[index.ts<br/>Shared Types]
    end

    subgraph "Utilities"
        API_RESPONSE[apiResponse.ts<br/>Response Helpers]
        PAGINATION[pagination.ts<br/>Pagination Logic]
    end

    ENV --> DATABASE_CONFIG
    ENV --> REDIS_CONFIG
    ENV --> LOGGER_CONFIG

    LOGGER_CONFIG --> REQUEST_LOGGER
    LOGGER_CONFIG --> ERROR_HANDLER

    ERRORS --> ERROR_HANDLER
    ERRORS --> VALIDATE

    EXPRESS_TYPES --> MIDDLEWARE_LAYER
    SHARED_TYPES --> MIDDLEWARE_LAYER

    style ENV fill:#fff59d
    style ERROR_HANDLER fill:#ef5350
    style VALIDATE fill:#66bb6a
```

### Middleware Stack Order

```mermaid
graph TD
    START[Incoming Request] --> TRUST_PROXY[Trust Proxy]
    TRUST_PROXY --> HELMET[Helmet<br/>Security Headers]
    HELMET --> CORS[CORS<br/>Origin Check]
    CORS --> BODY_PARSER[Body Parser<br/>JSON/URL-encoded]
    BODY_PARSER --> COMPRESSION[Compression<br/>gzip responses]
    COMPRESSION --> RATE_LIMIT[Rate Limiter<br/>/api routes]
    RATE_LIMIT --> REQUEST_LOG[Request Logger<br/>Winston]
    REQUEST_LOG --> RESPONSE_HELPERS[Response Helpers<br/>res.success()]
    RESPONSE_HELPERS --> ROUTES[Route Matching]

    ROUTES --> ROUTE_AUTH{Auth Required?}
    ROUTE_AUTH -->|Yes| REQUIRE_AUTH[requireAuth]
    ROUTE_AUTH -->|No| ROUTE_VALIDATE
    REQUIRE_AUTH --> ROUTE_VALIDATE{Validation?}

    ROUTE_VALIDATE -->|Yes| VALIDATE_MW[validate Middleware]
    ROUTE_VALIDATE -->|No| ROUTE_ROLE
    VALIDATE_MW --> ROUTE_ROLE{Role Check?}

    ROUTE_ROLE -->|Yes| REQUIRE_ROLE[requireRole/Permission]
    ROUTE_ROLE -->|No| CONTROLLER
    REQUIRE_ROLE --> CONTROLLER[Controller Handler]

    CONTROLLER --> SERVICE[Service Layer]
    SERVICE --> DATABASE[(Database)]
    DATABASE --> RESPONSE[Send Response]

    CONTROLLER -.->|Error| ERROR_HANDLER[Error Handler]
    SERVICE -.->|Error| ERROR_HANDLER
    DATABASE -.->|Error| ERROR_HANDLER
    ERROR_HANDLER --> ERROR_RESPONSE[Error Response]

    ROUTES -.->|No Match| NOT_FOUND_HANDLER[404 Handler]
    NOT_FOUND_HANDLER --> NOT_FOUND_RESPONSE[404 Response]

    style START fill:#4caf50
    style ERROR_HANDLER fill:#f44336
    style CONTROLLER fill:#2196f3
    style SERVICE fill:#ff9800
    style DATABASE fill:#9c27b0
```

---

## Request Flow

### Complete Request Journey

```mermaid
sequenceDiagram
    participant Client
    participant Express
    participant Middleware
    participant Auth
    participant Validator
    participant Controller
    participant Service
    participant Model
    participant DB as MongoDB
    participant Audit as AuditLog
    participant Logger

    Client->>Express: POST /api/examples
    Note over Client,Express: Authorization: Bearer {token}<br/>Body: {name, description}

    Express->>Middleware: Security middleware
    Note over Express,Middleware: Helmet, CORS, Body Parser,<br/>Compression, Rate Limiter

    Middleware->>Auth: requireAuth middleware
    Auth->>Auth: Extract Bearer token
    Auth->>Auth: Verify JWT (Clerk or Mock)
    Auth->>Model: Find or create user
    Model->>DB: findOne({clerkId})
    DB-->>Model: User document
    Model-->>Auth: User object
    Auth->>Express: Attach req.user

    Express->>Validator: validate(createExampleSchema)
    Validator->>Validator: Parse & validate req.body
    alt Validation fails
        Validator-->>Client: 400 Validation Error
    end
    Validator->>Express: Valid data

    Express->>Controller: exampleController.create()
    Controller->>Service: exampleService.create(userId, data)

    Service->>Model: Check duplicate name
    Model->>DB: findOne({userId, name})
    DB-->>Model: null (no duplicate)
    Model-->>Service: No conflict

    Service->>Model: Create example
    Model->>DB: insertOne()
    DB-->>Model: Created document
    Model-->>Service: Example object

    Service->>Audit: Log creation
    Audit->>DB: insertOne(auditLog)
    DB-->>Audit: Logged

    Service->>Logger: Log success
    Logger->>Logger: Write to console/file

    Service-->>Controller: Created example
    Controller->>Controller: Format response
    Controller-->>Client: 201 Created<br/>{success: true, data: {...}}

    Note over Client,Logger: Request logged with<br/>status, duration, user ID
```

### Error Handling Flow

```mermaid
graph TD
    START[Error Thrown] --> ERROR_TYPE{Error Type?}

    ERROR_TYPE -->|ZodError| ZOD_HANDLER[ValidationError Handler]
    ERROR_TYPE -->|MongoError| MONGO_HANDLER[MongoDB Error Handler]
    ERROR_TYPE -->|Custom Error| CUSTOM_HANDLER[Custom Error Handler]
    ERROR_TYPE -->|Unknown| GENERIC_HANDLER[Generic Error Handler]

    ZOD_HANDLER --> FORMAT_ZOD[Format field errors<br/>400 Bad Request]
    MONGO_HANDLER --> CHECK_MONGO{Error Code?}
    CHECK_MONGO -->|11000| DUPLICATE[409 Conflict]
    CHECK_MONGO -->|Other| SERVER_ERROR[500 Server Error]

    CUSTOM_HANDLER --> MAP_STATUS[Map to HTTP Status]
    MAP_STATUS --> AUTH_401[401 Unauthorized]
    MAP_STATUS --> FORBIDDEN_403[403 Forbidden]
    MAP_STATUS --> NOT_FOUND_404[404 Not Found]
    MAP_STATUS --> CONFLICT_409[409 Conflict]

    GENERIC_HANDLER --> HIDE_DETAILS[Hide internal details<br/>500 Server Error]

    FORMAT_ZOD --> LOG_ERROR
    DUPLICATE --> LOG_ERROR
    SERVER_ERROR --> LOG_ERROR
    AUTH_401 --> LOG_ERROR
    FORBIDDEN_403 --> LOG_ERROR
    NOT_FOUND_404 --> LOG_ERROR
    CONFLICT_409 --> LOG_ERROR
    HIDE_DETAILS --> LOG_ERROR

    LOG_ERROR[Log to Winston + Sentry] --> CHECK_ENV{Environment?}

    CHECK_ENV -->|Development| INCLUDE_STACK[Include stack trace]
    CHECK_ENV -->|Production| HIDE_STACK[Hide stack trace]

    INCLUDE_STACK --> RESPONSE
    HIDE_STACK --> RESPONSE

    RESPONSE[Send JSON Error Response]
    RESPONSE --> END[End]

    style START fill:#f44336
    style LOG_ERROR fill:#ff9800
    style RESPONSE fill:#2196f3
```

---

## Database Architecture

### MongoDB Schema Design

```mermaid
erDiagram
    User ||--o{ Example : creates
    User ||--o{ AuditLog : generates
    User {
        ObjectId _id PK
        string clerkId UK
        string email UK
        string name
        enum role
        enum subscription
        string stripeCustomerId
        json metadata
        date lastLoginAt
        boolean emailVerified
        string profileImage
        date deletedAt
        date createdAt
        date updatedAt
    }

    Example {
        ObjectId _id PK
        ObjectId userId FK
        string name
        string description
        enum status
        array tags
        json metadata
        boolean isPublic
        number viewCount
        date publishedAt
        date deletedAt
        date createdAt
        date updatedAt
    }

    AuditLog {
        ObjectId _id PK
        ObjectId userId FK
        string userEmail
        enum action
        string resource
        string resourceId
        json metadata
        json changes
        string ipAddress
        string userAgent
        string requestId
        number duration
        number statusCode
        string error
        date createdAt
    }
```

### Index Strategy

```mermaid
graph TD
    subgraph "User Model Indexes"
        U1[clerkId: unique]
        U2[email: unique]
        U3[role + subscription: compound]
        U4[deletedAt: sparse]
    end

    subgraph "Example Model Indexes"
        E1[userId + status: compound]
        E2[userId + createdAt: compound]
        E3[tags: multi-key]
        E4[publishedAt: sparse]
        E5[name + description: text search]
        E6[deletedAt: sparse]
    end

    subgraph "AuditLog Model Indexes"
        A1[userId + createdAt: compound]
        A2[resource + resourceId: compound]
        A3[action + createdAt: compound]
        A4[requestId]
        A5[createdAt: TTL 90 days]
    end

    style U1 fill:#4caf50
    style U2 fill:#4caf50
    style E1 fill:#2196f3
    style E5 fill:#ff9800
    style A5 fill:#f44336
```

### Database Operations Pattern

```mermaid
graph LR
    subgraph "Service Layer"
        SERVICE[Service Method]
    end

    subgraph "Model Layer"
        INSTANCE[Instance Methods<br/>canEdit, publish,<br/>archive, softDelete]
        STATIC[Static Methods<br/>findByUser, search,<br/>getPopular, getStats]
        MIDDLEWARE[Mongoose Middleware<br/>pre-save, pre-find]
    end

    subgraph "Database"
        MONGO[(MongoDB)]
    end

    SERVICE --> STATIC
    STATIC --> MIDDLEWARE
    MIDDLEWARE --> MONGO

    MONGO --> INSTANCE
    INSTANCE --> SERVICE

    style SERVICE fill:#ff9800
    style STATIC fill:#2196f3
    style INSTANCE fill:#4caf50
    style MONGO fill:#9c27b0
```

---

## Feature Development Pattern

### Feature Layer Architecture

```mermaid
graph TD
    subgraph "Feature Directory: /features/example/"
        ROUTES_FILE[example.routes.ts<br/>Route Definitions]
        CONTROLLER_FILE[example.controller.ts<br/>HTTP Handlers]
        SERVICE_FILE[example.service.ts<br/>Business Logic]
        MODEL_FILE[example.model.ts<br/>Mongoose Model]
        SCHEMA_FILE[example.schema.ts<br/>Zod Schemas]
        TEST_FILE[example.test.ts<br/>Tests]
    end

    ROUTES_FILE --> |uses| CONTROLLER_FILE
    ROUTES_FILE --> |validates with| SCHEMA_FILE
    CONTROLLER_FILE --> |calls| SERVICE_FILE
    SERVICE_FILE --> |queries| MODEL_FILE
    TEST_FILE -.->|tests| ROUTES_FILE
    TEST_FILE -.->|tests| SERVICE_FILE

    style ROUTES_FILE fill:#e1f5fe
    style CONTROLLER_FILE fill:#fff3e0
    style SERVICE_FILE fill:#f3e5f5
    style MODEL_FILE fill:#e8f5e9
    style SCHEMA_FILE fill:#fff9c4
    style TEST_FILE fill:#fce4ec
```

### Feature Component Interaction

```mermaid
sequenceDiagram
    participant Routes as Routes Layer
    participant MW as Middleware
    participant Controller as Controller Layer
    participant Service as Service Layer
    participant Model as Model Layer
    participant DB as MongoDB

    Note over Routes: Define URL patterns<br/>Chain middleware
    Routes->>MW: Apply middleware stack

    Note over MW: 1. Authentication<br/>2. Validation<br/>3. Rate Limiting<br/>4. Permission Check
    MW->>Controller: Pass validated request

    Note over Controller: Extract request data<br/>Call service method<br/>Format response
    Controller->>Service: Business operation

    Note over Service: - Business rules<br/>- Permission checks<br/>- Orchestrate operations<br/>- Audit logging
    Service->>Model: Database operation

    Note over Model: - Schema validation<br/>- Instance methods<br/>- Static methods<br/>- Middleware hooks
    Model->>DB: MongoDB query
    DB-->>Model: Result
    Model-->>Service: Formatted data
    Service-->>Controller: Business result
    Controller-->>Routes: HTTP response
```

### Layer Responsibilities

```mermaid
graph TB
    subgraph "Routes Layer"
        R1[Define URL patterns]
        R2[Chain middleware]
        R3[Map to controllers]
    end

    subgraph "Controller Layer"
        C1[Extract req data]
        C2[Call service methods]
        C3[Format responses]
        C4[Handle HTTP specifics]
    end

    subgraph "Service Layer"
        S1[Business logic]
        S2[Permission checks]
        S3[Orchestrate operations]
        S4[Transaction handling]
        S5[Audit logging]
        S6[Error handling]
    end

    subgraph "Model Layer"
        M1[Schema definition]
        M2[Validation rules]
        M3[Instance methods]
        M4[Static methods]
        M5[Query building]
        M6[Indexes]
    end

    R1 --> C1
    R2 --> C2
    R3 --> C3

    C1 --> S1
    C2 --> S2
    C3 --> S3
    C4 --> S4

    S1 --> M1
    S2 --> M2
    S3 --> M3
    S4 --> M4
    S5 --> M5
    S6 --> M6

    style R1 fill:#e3f2fd
    style C1 fill:#fff3e0
    style S1 fill:#f3e5f5
    style M1 fill:#e8f5e9
```

---

## Authentication & Authorization

### Authentication Flow

```mermaid
sequenceDiagram
    participant Client
    participant API
    participant Auth as requireAuth MW
    participant Clerk
    participant UserModel
    participant DB as MongoDB

    Client->>API: Request with Bearer token
    API->>Auth: Extract token

    alt Development Mode (no Clerk keys)
        Auth->>Auth: Use mock user
        Auth->>API: Attach mock user to req
    else Production Mode
        Auth->>Clerk: Verify JWT
        Clerk-->>Auth: Session data (clerkId)

        Auth->>Clerk: Get user details
        Clerk-->>Auth: Clerk user object

        Auth->>UserModel: findOne({clerkId})
        UserModel->>DB: Query
        DB-->>UserModel: User or null

        alt User exists
            UserModel-->>Auth: User object
            Auth->>UserModel: Update lastLoginAt
            UserModel->>DB: Update
        else User not found
            Auth->>UserModel: Create user
            UserModel->>DB: Insert
            DB-->>UserModel: Created user
            UserModel-->>Auth: User object
        end

        Auth->>API: Attach user to req.user
    end

    API->>API: Continue to next middleware
```

### Authorization Patterns

```mermaid
graph TD
    START[Request] --> AUTH_CHECK{Authenticated?}

    AUTH_CHECK -->|No| RETURN_401[401 Unauthorized]
    AUTH_CHECK -->|Yes| ROLE_CHECK{Role Check<br/>Required?}

    ROLE_CHECK -->|No| PERMISSION_CHECK
    ROLE_CHECK -->|Yes| CHECK_ROLE{Has Role?}

    CHECK_ROLE -->|No| RETURN_403[403 Forbidden]
    CHECK_ROLE -->|Yes| PERMISSION_CHECK{Permission<br/>Required?}

    PERMISSION_CHECK -->|No| OWNERSHIP_CHECK
    PERMISSION_CHECK -->|Yes| CHECK_PERM{Has Permission?}

    CHECK_PERM -->|No| RETURN_403
    CHECK_PERM -->|Yes| OWNERSHIP_CHECK{Ownership<br/>Required?}

    OWNERSHIP_CHECK -->|No| ALLOW
    OWNERSHIP_CHECK -->|Yes| CHECK_OWNER{Is Owner?}

    CHECK_OWNER -->|No| RETURN_403
    CHECK_OWNER -->|Yes| ALLOW[Allow Access]

    ALLOW --> CONTROLLER[Controller Handler]

    style START fill:#4caf50
    style RETURN_401 fill:#f44336
    style RETURN_403 fill:#ff9800
    style ALLOW fill:#4caf50
    style CONTROLLER fill:#2196f3
```

### RBAC System

```mermaid
graph LR
    subgraph "Roles"
        ADMIN[Admin<br/>All Permissions]
        ORGANIZER[Organizer<br/>Event Management]
        JUDGE[Judge<br/>Scoring Only]
        USER[User<br/>Basic Access]
    end

    subgraph "Permissions"
        P1[events.create]
        P2[events.update]
        P3[events.delete]
        P4[events.read]
        P5[scores.submit]
        P6[scores.read]
        P7[users.manage]
    end

    ADMIN --> P1
    ADMIN --> P2
    ADMIN --> P3
    ADMIN --> P4
    ADMIN --> P5
    ADMIN --> P6
    ADMIN --> P7

    ORGANIZER --> P1
    ORGANIZER --> P2
    ORGANIZER --> P4
    ORGANIZER --> P6

    JUDGE --> P4
    JUDGE --> P5
    JUDGE --> P6

    USER --> P4

    style ADMIN fill:#f44336
    style ORGANIZER fill:#ff9800
    style JUDGE fill:#2196f3
    style USER fill:#4caf50
```

---

## Error Handling System

### Error Class Hierarchy

```mermaid
classDiagram
    class BaseError {
        +string message
        +number statusCode
        +string code
        +any details
        +boolean isOperational
    }

    class ValidationError {
        +statusCode: 400
        +code: VALIDATION_ERROR
        +details: ZodError[]
    }

    class AuthError {
        +statusCode: 401
        +code: UNAUTHORIZED
    }

    class ForbiddenError {
        +statusCode: 403
        +code: FORBIDDEN
    }

    class NotFoundError {
        +statusCode: 404
        +code: NOT_FOUND
    }

    class ConflictError {
        +statusCode: 409
        +code: CONFLICT
    }

    class RateLimitError {
        +statusCode: 429
        +code: RATE_LIMIT_EXCEEDED
    }

    class InternalError {
        +statusCode: 500
        +code: INTERNAL_ERROR
    }

    BaseError <|-- ValidationError
    BaseError <|-- AuthError
    BaseError <|-- ForbiddenError
    BaseError <|-- NotFoundError
    BaseError <|-- ConflictError
    BaseError <|-- RateLimitError
    BaseError <|-- InternalError
```

### Error Response Flow

```mermaid
graph TD
    ERROR[Error Thrown] --> ASYNC_HANDLER[asyncHandler catches]
    ASYNC_HANDLER --> NEXT[next(error)]
    NEXT --> ERROR_HANDLER[Global Error Handler]

    ERROR_HANDLER --> LOG{Log Error}
    LOG --> WINSTON[Winston Logger]
    LOG --> SENTRY[Sentry]

    ERROR_HANDLER --> FORMAT[Format Error Response]
    FORMAT --> STATUS[Set HTTP Status Code]
    FORMAT --> MESSAGE[User-friendly message]
    FORMAT --> DETAILS{Include Details?}

    DETAILS -->|Development| STACK[Include stack trace]
    DETAILS -->|Production| NO_STACK[Hide stack trace]

    STACK --> RESPONSE
    NO_STACK --> RESPONSE
    STATUS --> RESPONSE
    MESSAGE --> RESPONSE

    RESPONSE[Send JSON Response]

    style ERROR fill:#f44336
    style ERROR_HANDLER fill:#ff9800
    style RESPONSE fill:#2196f3
```

---

## Module System

### Optional Module Loading

```mermaid
graph TD
    START[Application Bootstrap] --> CHECK_ENV[Check Environment Variables]

    CHECK_ENV --> FEATURES{Build Feature Flags}

    FEATURES --> AUTH_FLAG{CLERK_SECRET_KEY?}
    AUTH_FLAG -->|Yes| LOAD_AUTH[Load Auth Module]
    AUTH_FLAG -->|No| MOCK_AUTH[Use Mock Auth]

    FEATURES --> REDIS_FLAG{REDIS_URL?}
    REDIS_FLAG -->|Yes| LOAD_REDIS[Connect Redis]
    REDIS_FLAG -->|No| SKIP_REDIS[Memory Fallback]

    FEATURES --> STRIPE_FLAG{STRIPE_SECRET_KEY?}
    STRIPE_FLAG -->|Yes| LOAD_STRIPE[Load Payments Module]
    STRIPE_FLAG -->|No| SKIP_STRIPE[Skip Payments]

    FEATURES --> S3_FLAG{AWS_ACCESS_KEY_ID?}
    S3_FLAG -->|Yes| LOAD_S3[Load Uploads Module]
    S3_FLAG -->|No| SKIP_S3[Skip Uploads]

    FEATURES --> EMAIL_FLAG{SENDGRID_API_KEY?}
    EMAIL_FLAG -->|Yes| LOAD_EMAIL[Load Email Module]
    EMAIL_FLAG -->|No| SKIP_EMAIL[Skip Email]

    LOAD_AUTH --> MOUNT_ROUTES
    MOCK_AUTH --> MOUNT_ROUTES
    LOAD_REDIS --> MOUNT_ROUTES
    SKIP_REDIS --> MOUNT_ROUTES
    LOAD_STRIPE --> MOUNT_ROUTES
    SKIP_STRIPE --> MOUNT_ROUTES
    LOAD_S3 --> MOUNT_ROUTES
    SKIP_S3 --> MOUNT_ROUTES
    LOAD_EMAIL --> MOUNT_ROUTES
    SKIP_EMAIL --> MOUNT_ROUTES

    MOUNT_ROUTES[Mount Routes] --> START_SERVER[Start Server]

    style START fill:#4caf50
    style LOAD_AUTH fill:#2196f3
    style LOAD_STRIPE fill:#ff9800
    style START_SERVER fill:#4caf50
```

### Module Dependencies

```mermaid
graph TB
    subgraph "Core Modules (Always Loaded)"
        CONFIG[Config]
        DATABASE[Database]
        LOGGER[Logger]
        MIDDLEWARE[Middleware]
    end

    subgraph "Optional Modules"
        AUTH[Auth Module]
        PAYMENTS[Payments Module]
        UPLOADS[Uploads Module]
        REALTIME[Real-time Module]
        JOBS[Jobs Module]
        EMAIL[Email Module]
        RBAC[RBAC Module]
    end

    CONFIG --> DATABASE
    CONFIG --> LOGGER
    CONFIG --> AUTH
    CONFIG --> PAYMENTS
    CONFIG --> UPLOADS
    CONFIG --> EMAIL

    DATABASE --> AUTH
    DATABASE --> PAYMENTS

    LOGGER --> MIDDLEWARE
    LOGGER --> AUTH
    LOGGER --> PAYMENTS
    LOGGER --> JOBS

    MIDDLEWARE --> AUTH
    MIDDLEWARE --> RBAC

    AUTH --> REALTIME
    AUTH --> RBAC

    DATABASE --> JOBS
    LOGGER --> JOBS

    style CONFIG fill:#ffeb3b
    style DATABASE fill:#4caf50
    style AUTH fill:#2196f3
    style PAYMENTS fill:#ff9800
```

---

## Adding New Features

### Step-by-Step Feature Creation

```mermaid
graph TD
    START[Start New Feature] --> COPY[Copy Example Feature]
    COPY --> RENAME[Rename Files & Classes]

    RENAME --> STEP1[Step 1: Define Model]
    STEP1 --> MODEL_SCHEMA[Create Mongoose Schema]
    MODEL_SCHEMA --> MODEL_METHODS[Add Instance Methods]
    MODEL_METHODS --> MODEL_STATIC[Add Static Methods]
    MODEL_STATIC --> MODEL_INDEX[Define Indexes]

    MODEL_INDEX --> STEP2[Step 2: Define Schemas]
    STEP2 --> ZOD_CREATE[Create Schema]
    ZOD_CREATE --> ZOD_UPDATE[Update Schema]
    ZOD_UPDATE --> ZOD_QUERY[Query Schema]
    ZOD_QUERY --> ZOD_TYPES[Export Types]

    ZOD_TYPES --> STEP3[Step 3: Implement Service]
    STEP3 --> SERVICE_CREATE[create method]
    SERVICE_CREATE --> SERVICE_READ[getById, list methods]
    SERVICE_READ --> SERVICE_UPDATE[update method]
    SERVICE_UPDATE --> SERVICE_DELETE[delete method]
    SERVICE_DELETE --> SERVICE_CUSTOM[Custom business logic]

    SERVICE_CUSTOM --> STEP4[Step 4: Create Controller]
    STEP4 --> CTRL_EXTRACT[Extract request data]
    CTRL_EXTRACT --> CTRL_CALL[Call service methods]
    CTRL_CALL --> CTRL_RESPONSE[Format responses]

    CTRL_RESPONSE --> STEP5[Step 5: Define Routes]
    STEP5 --> ROUTES_PUBLIC[Public routes]
    ROUTES_PUBLIC --> ROUTES_AUTH[Authenticated routes]
    ROUTES_AUTH --> ROUTES_ADMIN[Admin routes]
    ROUTES_ADMIN --> ROUTES_MIDDLEWARE[Chain middleware]

    ROUTES_MIDDLEWARE --> STEP6[Step 6: Register Routes]
    STEP6 --> MOUNT[Mount in index.ts]

    MOUNT --> STEP7[Step 7: Write Tests]
    STEP7 --> TEST_CREATE[Test CRUD operations]
    TEST_CREATE --> TEST_VALIDATE[Test validation]
    TEST_VALIDATE --> TEST_AUTH[Test auth/permissions]
    TEST_AUTH --> TEST_EDGE[Test edge cases]

    TEST_EDGE --> DONE[Feature Complete]

    style START fill:#4caf50
    style STEP1 fill:#e8f5e9
    style STEP2 fill:#fff9c4
    style STEP3 fill:#f3e5f5
    style STEP4 fill:#fff3e0
    style STEP5 fill:#e1f5fe
    style STEP6 fill:#fce4ec
    style STEP7 fill:#ffebee
    style DONE fill:#4caf50
```

### Feature Template Checklist

```mermaid
graph LR
    subgraph "File Checklist"
        F1[✓ model.ts]
        F2[✓ schema.ts]
        F3[✓ service.ts]
        F4[✓ controller.ts]
        F5[✓ routes.ts]
        F6[✓ test.ts]
    end

    subgraph "Code Checklist"
        C1[✓ TypeScript types]
        C2[✓ Zod validation]
        C3[✓ Error handling]
        C4[✓ Audit logging]
        C5[✓ Permission checks]
        C6[✓ Pagination support]
        C7[✓ Soft deletes]
        C8[✓ Indexes defined]
    end

    subgraph "Test Checklist"
        T1[✓ Happy path]
        T2[✓ Validation errors]
        T3[✓ Auth errors]
        T4[✓ Permission errors]
        T5[✓ Edge cases]
        T6[✓ >80% coverage]
    end

    F1 --> C1
    F2 --> C2
    F3 --> C3
    F4 --> C4
    F5 --> C5
    F6 --> T1

    style F1 fill:#4caf50
    style C1 fill:#2196f3
    style T1 fill:#ff9800
```

---

## Best Practices

### Code Organization Principles

```mermaid
mindmap
    root((Best Practices))
        Separation of Concerns
            Models: Data layer
            Services: Business logic
            Controllers: HTTP layer
            Routes: URL mapping
        Type Safety
            Strict TypeScript
            Zod validation
            No 'any' types
            Inferred types
        Error Handling
            Custom error classes
            Global error handler
            Async wrappers
            Detailed logging
        Security
            Input validation
            Rate limiting
            Authentication
            Authorization
            Audit logging
        Performance
            Database indexes
            Query optimization
            Redis caching
            Response compression
        Testing
            Unit tests
            Integration tests
            >80% coverage
            Mock external services
        Documentation
            Code comments
            API documentation
            Architecture diagrams
            README files
```

### Development Workflow

```mermaid
graph TD
    START[Start Development] --> LOCAL[Local Setup]
    LOCAL --> ENV[Configure .env]
    ENV --> DOCKER[docker-compose up]

    DOCKER --> DEVELOP{Development Task}

    DEVELOP -->|New Feature| NEW_FEATURE[Follow Feature Pattern]
    DEVELOP -->|Bug Fix| FIX_BUG[Fix & Add Test]
    DEVELOP -->|Refactor| REFACTOR[Refactor & Test]

    NEW_FEATURE --> WRITE_CODE[Write Code]
    FIX_BUG --> WRITE_CODE
    REFACTOR --> WRITE_CODE

    WRITE_CODE --> LINT[npm run lint]
    LINT --> LINT_OK{Passes?}
    LINT_OK -->|No| FIX_LINT[Fix Lint Errors]
    FIX_LINT --> LINT
    LINT_OK -->|Yes| TEST

    TEST[npm run test] --> TEST_OK{Passes?}
    TEST_OK -->|No| FIX_TEST[Fix Tests]
    FIX_TEST --> TEST
    TEST_OK -->|Yes| BUILD

    BUILD[npm run build] --> BUILD_OK{Builds?}
    BUILD_OK -->|No| FIX_BUILD[Fix Build Errors]
    FIX_BUILD --> BUILD
    BUILD_OK -->|Yes| COMMIT

    COMMIT[git commit] --> PUSH[git push]
    PUSH --> CI[GitHub Actions CI]
    CI --> DEPLOY{Deploy?}

    DEPLOY -->|Yes| PRODUCTION[Deploy to Production]
    DEPLOY -->|No| DONE[Done]

    style START fill:#4caf50
    style LINT_OK fill:#ff9800
    style TEST_OK fill:#ff9800
    style BUILD_OK fill:#ff9800
    style PRODUCTION fill:#2196f3
    style DONE fill:#4caf50
```

### Monitoring & Observability

```mermaid
graph TB
    subgraph "Application Metrics"
        HEALTH[Health Checks<br/>/health endpoint]
        METRICS[Metrics<br/>/metrics endpoint]
        LOGS[Structured Logs<br/>Winston]
    end

    subgraph "Error Tracking"
        SENTRY_APP[Sentry<br/>Error reporting]
        AUDIT[Audit Logs<br/>Database]
    end

    subgraph "Performance Monitoring"
        REQUEST_TIME[Request Duration]
        DB_QUERY[Query Performance]
        CACHE_HIT[Cache Hit Rate]
    end

    subgraph "Alerting"
        ERROR_ALERT[Error Rate Alerts]
        UPTIME_ALERT[Uptime Monitoring]
        PERF_ALERT[Performance Degradation]
    end

    HEALTH --> UPTIME_ALERT
    METRICS --> PERF_ALERT
    LOGS --> SENTRY_APP
    SENTRY_APP --> ERROR_ALERT

    REQUEST_TIME --> METRICS
    DB_QUERY --> METRICS
    CACHE_HIT --> METRICS

    style HEALTH fill:#4caf50
    style SENTRY_APP fill:#f44336
    style METRICS fill:#2196f3
```

---

## Summary

### Architecture Strengths

1. **Type Safety**: Strict TypeScript + Zod validation throughout
2. **Modular**: Optional modules load based on environment
3. **Testable**: Clear separation of concerns, easy to mock
4. **Scalable**: Feature-based structure grows with your app
5. **Observable**: Comprehensive logging and error tracking
6. **Secure**: Authentication, authorization, rate limiting, audit logs
7. **Production-Ready**: Error handling, monitoring, CI/CD

### Quick Reference

| Component | Purpose | Location |
|-----------|---------|----------|
| **Core Config** | Environment, DB, Logger | `src/core/config/` |
| **Middleware** | Request processing | `src/core/middleware/` |
| **Database** | MongoDB models | `src/database/mongodb/` |
| **Auth** | Clerk integration | `src/modules/auth/` |
| **Features** | Business logic | `src/features/*/` |
| **Tests** | Test suites | `tests/` |

### Adding Your First Feature

1. Copy `src/features/example` to `src/features/yourfeature`
2. Rename all files and classes
3. Define your model schema in `model.ts`
4. Create Zod schemas in `schema.ts`
5. Implement business logic in `service.ts`
6. Add HTTP handlers in `controller.ts`
7. Define routes in `routes.ts`
8. Register routes in `src/index.ts`
9. Write tests in `test.ts`
10. Run `npm test` and `npm run build`

### Key Files to Study

- **`src/features/example/example.service.ts`** - Complete CRUD pattern
- **`src/core/server.ts`** - Application setup
- **`src/core/middleware/errorHandler.ts`** - Error handling
- **`src/database/mongodb/models/User.ts`** - Model patterns
- **`src/modules/auth/middleware.ts`** - Authentication flow

---

**Ready to build your SaaS MVP!** 🚀
