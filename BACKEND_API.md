# Tulis.app Backend API Specification

> API specification for the Tulis.app Node.js backend that powers InkShelf cloud sync.

This document provides complete API specifications for backend developers to implement the Tulis.app cloud service.

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Authentication](#authentication)
4. [API Endpoints](#api-endpoints)
5. [Data Models](#data-models)
6. [Sync Protocol](#sync-protocol)
7. [Error Handling](#error-handling)
8. [Rate Limiting](#rate-limiting)
9. [Database Schema](#database-schema)
10. [Deployment](#deployment)

---

## Overview

### Purpose
Tulis.app provides cloud sync, backup, and publishing services for the InkShelf browser extension. The backend is designed to be:

- **Stateless**: All state stored in database
- **RESTful**: Standard HTTP methods and status codes
- **Offline-friendly**: Supports batch sync with conflict resolution
- **Scalable**: Designed for horizontal scaling

### Tech Stack (Recommended)
- **Runtime**: Node.js 18+ (LTS)
- **Framework**: Express.js or Fastify
- **Database**: PostgreSQL (primary) + Redis (cache/sessions)
- **Authentication**: JWT with refresh tokens
- **File Storage**: S3-compatible (AWS S3, MinIO, Cloudflare R2)
- **API Documentation**: OpenAPI 3.0 / Swagger

### Base URL
```
Production: https://api.tulis.app
Staging:    https://api-staging.tulis.app
Development: http://localhost:3000
```

---

## Architecture

### System Diagram
```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   InkShelf      │────▶│   API Gateway   │────▶│   Auth Service  │
│   Extension     │     │   (Rate Limit)  │     │   (JWT/OAuth)   │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                               │
                               ▼
                        ┌─────────────────┐
                        │   Main API      │
                        │   (Node.js)     │
                        └─────────────────┘
                               │
              ┌────────────────┼────────────────┐
              ▼                ▼                ▼
       ┌───────────┐    ┌───────────┐    ┌───────────┐
       │ PostgreSQL│    │   Redis   │    │  S3/R2    │
       │ (Primary) │    │  (Cache)  │    │ (Backup)  │
       └───────────┘    └───────────┘    └───────────┘
```

### Service Components

| Service | Responsibility |
|---------|---------------|
| **API Gateway** | Rate limiting, request routing, SSL termination |
| **Auth Service** | User registration, login, token management |
| **Document Service** | CRUD operations for documents |
| **Sync Service** | Batch sync, conflict resolution |
| **Group Service** | Group management |
| **Publish Service** | Public article publishing |
| **Backup Service** | Bulk export/import |

---

## Authentication

### Authentication Flow

```
┌──────────┐                              ┌──────────┐
│  Client  │                              │  Server  │
└────┬─────┘                              └────┬─────┘
     │                                         │
     │  POST /auth/register                    │
     │  {email, password, name}                │
     │────────────────────────────────────────▶│
     │                                         │
     │  201 {user, accessToken, refreshToken}  │
     │◀────────────────────────────────────────│
     │                                         │
     │  GET /documents                         │
     │  Authorization: Bearer <accessToken>    │
     │────────────────────────────────────────▶│
     │                                         │
     │  200 {documents: [...]}                 │
     │◀────────────────────────────────────────│
     │                                         │
     │  (Token expires)                        │
     │                                         │
     │  POST /auth/refresh                     │
     │  {refreshToken}                         │
     │────────────────────────────────────────▶│
     │                                         │
     │  200 {accessToken, refreshToken}        │
     │◀────────────────────────────────────────│
```

### Token Configuration

| Token | Lifetime | Storage (Client) |
|-------|----------|-----------------|
| Access Token | 15 minutes | Memory only |
| Refresh Token | 30 days | localStorage (encrypted) |

### JWT Payload Structure

```json
{
  "sub": "user_abc123",
  "email": "user@example.com",
  "name": "John Doe",
  "iat": 1703520000,
  "exp": 1703520900,
  "type": "access"
}
```

---

## API Endpoints

### Authentication

#### POST /api/auth/register
Create a new user account.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "name": "John Doe"
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "user_abc123",
      "email": "user@example.com",
      "name": "John Doe",
      "createdAt": "2025-12-25T00:00:00Z"
    },
    "accessToken": "eyJhbG...",
    "refreshToken": "eyJhbG..."
  }
}
```

**Errors:**
- `400` - Invalid email or password format
- `409` - Email already registered

---

#### POST /api/auth/login
Authenticate existing user.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "user_abc123",
      "email": "user@example.com",
      "name": "John Doe",
      "createdAt": "2025-12-25T00:00:00Z"
    },
    "accessToken": "eyJhbG...",
    "refreshToken": "eyJhbG..."
  }
}
```

**Errors:**
- `401` - Invalid credentials
- `429` - Too many login attempts

---

#### POST /api/auth/refresh
Refresh access token.

**Request:**
```json
{
  "refreshToken": "eyJhbG..."
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbG...",
    "refreshToken": "eyJhbG..."
  }
}
```

**Errors:**
- `401` - Invalid or expired refresh token

---

#### POST /api/auth/logout
Invalidate refresh token.

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Request:**
```json
{
  "refreshToken": "eyJhbG..."
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

---

#### GET /api/auth/me
Get current user profile.

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "user_abc123",
    "email": "user@example.com",
    "name": "John Doe",
    "createdAt": "2025-12-25T00:00:00Z",
    "stats": {
      "documentCount": 42,
      "groupCount": 5,
      "publishedCount": 3
    }
  }
}
```

---

### Documents

#### GET /api/documents
List all documents for the authenticated user.

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `groupId` | string | - | Filter by group |
| `tag` | string | - | Filter by tag |
| `status` | string | - | Filter by status (draft/saved/published) |
| `starred` | boolean | - | Filter starred only |
| `search` | string | - | Search in title/content |
| `page` | number | 1 | Page number |
| `limit` | number | 50 | Items per page (max 100) |
| `sort` | string | `-updatedAt` | Sort field (prefix `-` for desc) |

**Response (200):**
```json
{
  "success": true,
  "data": {
    "documents": [
      {
        "id": "doc_xyz789",
        "docId": "capture:1703520000_abc123",
        "title": "Article Title",
        "content": "# Markdown content...",
        "url": "https://example.com/article",
        "groupId": "group_abc123",
        "groupName": "Research",
        "tags": ["javascript", "tutorial"],
        "starred": true,
        "status": "saved",
        "createdAt": "2025-12-25T00:00:00Z",
        "updatedAt": "2025-12-25T01:00:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 50,
      "total": 42,
      "totalPages": 1
    }
  }
}
```

---

#### GET /api/documents/:id
Get a single document.

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "doc_xyz789",
    "docId": "capture:1703520000_abc123",
    "title": "Article Title",
    "content": "# Full markdown content...",
    "url": "https://example.com/article",
    "groupId": "group_abc123",
    "groupName": "Research",
    "tags": ["javascript", "tutorial"],
    "starred": true,
    "status": "saved",
    "createdAt": "2025-12-25T00:00:00Z",
    "updatedAt": "2025-12-25T01:00:00Z"
  }
}
```

**Errors:**
- `404` - Document not found

---

#### POST /api/documents
Create a new document.

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Request:**
```json
{
  "docId": "capture:1703520000_abc123",
  "title": "Article Title",
  "content": "# Markdown content...",
  "url": "https://example.com/article",
  "groupId": "group_abc123",
  "tags": ["javascript", "tutorial"],
  "starred": false
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "id": "doc_xyz789",
    "docId": "capture:1703520000_abc123",
    "title": "Article Title",
    "content": "# Markdown content...",
    "url": "https://example.com/article",
    "groupId": "group_abc123",
    "groupName": "Research",
    "tags": ["javascript", "tutorial"],
    "starred": false,
    "status": "draft",
    "createdAt": "2025-12-25T00:00:00Z",
    "updatedAt": "2025-12-25T00:00:00Z"
  }
}
```

---

#### PUT /api/documents/:id
Update a document.

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Request:**
```json
{
  "title": "Updated Title",
  "content": "# Updated content...",
  "groupId": "group_def456",
  "tags": ["javascript", "advanced"],
  "starred": true
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "doc_xyz789",
    "title": "Updated Title",
    "content": "# Updated content...",
    "updatedAt": "2025-12-25T02:00:00Z"
  }
}
```

---

#### DELETE /api/documents/:id
Delete a document.

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Response (200):**
```json
{
  "success": true,
  "message": "Document deleted successfully"
}
```

---

### Groups

#### GET /api/groups
List all groups for the authenticated user.

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "groups": [
      {
        "id": "group_abc123",
        "name": "Research",
        "color": "#4A90D9",
        "icon": "folder",
        "order": 0,
        "documentCount": 15,
        "createdAt": "2025-12-25T00:00:00Z"
      },
      {
        "id": "group_def456",
        "name": "Tech Articles",
        "color": "#50C878",
        "icon": "code",
        "order": 1,
        "documentCount": 8,
        "createdAt": "2025-12-25T00:00:00Z"
      }
    ]
  }
}
```

---

#### POST /api/groups
Create a new group.

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Request:**
```json
{
  "name": "Reading List",
  "color": "#FF6B6B",
  "icon": "book"
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "id": "group_ghi789",
    "name": "Reading List",
    "color": "#FF6B6B",
    "icon": "book",
    "order": 2,
    "documentCount": 0,
    "createdAt": "2025-12-25T00:00:00Z"
  }
}
```

---

#### PUT /api/groups/:id
Update a group.

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Request:**
```json
{
  "name": "Must Read",
  "color": "#FFD700",
  "order": 0
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "group_ghi789",
    "name": "Must Read",
    "color": "#FFD700",
    "order": 0
  }
}
```

---

#### DELETE /api/groups/:id
Delete a group (documents move to Uncategorized).

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `moveToGroup` | string | `default` | Group to move documents to |

**Response (200):**
```json
{
  "success": true,
  "message": "Group deleted, 5 documents moved to Uncategorized"
}
```

---

### Sync

#### POST /api/sync
Batch sync documents (primary sync endpoint).

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Request:**
```json
{
  "clientTimestamp": 1703520000000,
  "lastSyncTimestamp": 1703500000000,
  "changes": [
    {
      "docId": "capture:1703520000_abc123",
      "action": "upsert",
      "data": {
        "title": "Article Title",
        "content": "# Content...",
        "url": "https://example.com",
        "groupId": "group_abc123",
        "tags": ["tag1"],
        "starred": false,
        "updatedAt": 1703520000000
      }
    },
    {
      "docId": "capture:1703400000_def456",
      "action": "delete",
      "updatedAt": 1703519000000
    }
  ]
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "serverTimestamp": 1703520500000,
    "applied": [
      {
        "docId": "capture:1703520000_abc123",
        "cloudId": "doc_xyz789",
        "status": "created"
      }
    ],
    "conflicts": [
      {
        "docId": "capture:1703400000_def456",
        "resolution": "server_wins",
        "serverData": {
          "title": "Server version",
          "updatedAt": 1703520000000
        }
      }
    ],
    "serverChanges": [
      {
        "cloudId": "doc_abc123",
        "docId": "capture:1703300000_xyz789",
        "action": "upsert",
        "data": {
          "title": "New from another device",
          "content": "# Content...",
          "updatedAt": 1703510000000
        }
      }
    ]
  }
}
```

---

#### GET /api/sync/status
Get sync status and pending changes count.

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "lastSyncTimestamp": 1703520000000,
    "pendingUploads": 0,
    "pendingDownloads": 3,
    "serverDocumentCount": 42
  }
}
```

---

### Publish

#### POST /api/publish
Publish a document publicly.

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Request:**
```json
{
  "documentId": "doc_xyz789",
  "visibility": "public",
  "slug": "my-article-title",
  "allowComments": false
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "id": "pub_abc123",
    "documentId": "doc_xyz789",
    "url": "https://tulis.app/p/username/my-article-title",
    "visibility": "public",
    "slug": "my-article-title",
    "views": 0,
    "publishedAt": "2025-12-25T00:00:00Z"
  }
}
```

---

#### GET /api/publish
List published articles.

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "publications": [
      {
        "id": "pub_abc123",
        "documentId": "doc_xyz789",
        "title": "My Article Title",
        "url": "https://tulis.app/p/username/my-article-title",
        "visibility": "public",
        "views": 150,
        "publishedAt": "2025-12-25T00:00:00Z"
      }
    ]
  }
}
```

---

#### DELETE /api/publish/:id
Unpublish an article.

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Response (200):**
```json
{
  "success": true,
  "message": "Article unpublished successfully"
}
```

---

### Backup

#### POST /api/backup/export
Generate a backup of all user data.

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Request:**
```json
{
  "format": "zip",
  "includePublished": true
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "downloadUrl": "https://api.tulis.app/backup/download/backup_abc123.zip",
    "expiresAt": "2025-12-26T00:00:00Z",
    "size": 1048576,
    "documentCount": 42
  }
}
```

---

#### POST /api/backup/import
Import data from backup.

**Headers:**
```
Authorization: Bearer <accessToken>
Content-Type: multipart/form-data
```

**Request:**
```
file: <backup.zip>
strategy: merge | replace
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "imported": 42,
    "skipped": 3,
    "errors": [],
    "groups": 5
  }
}
```

---

### Tags

#### GET /api/tags
Get all tags with usage counts.

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "tags": [
      { "name": "javascript", "count": 15 },
      { "name": "tutorial", "count": 8 },
      { "name": "web-capture", "count": 42 }
    ]
  }
}
```

---

#### PUT /api/tags/rename
Rename a tag across all documents.

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Request:**
```json
{
  "oldName": "js",
  "newName": "javascript"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "documentsUpdated": 12
  }
}
```

---

## Data Models

### User
```typescript
interface User {
  id: string;           // Primary key (UUID)
  email: string;        // Unique, indexed
  passwordHash: string; // bcrypt hash
  name: string;
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt: Date;
  settings: {
    theme: 'light' | 'dark';
    syncEnabled: boolean;
    autoSync: boolean;
  };
}
```

### Document
```typescript
interface Document {
  id: string;           // Primary key (UUID)
  userId: string;       // Foreign key -> User
  docId: string;        // Client-generated ID (indexed)
  title: string;
  content: string;      // Markdown content
  url: string;          // Source URL
  groupId: string;      // Foreign key -> Group
  tags: string[];       // Array of tag names
  starred: boolean;
  status: 'draft' | 'saved' | 'published';
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null; // Soft delete
}
```

### Group
```typescript
interface Group {
  id: string;           // Primary key (UUID)
  userId: string;       // Foreign key -> User
  name: string;
  color: string;        // Hex color
  icon: string;         // Icon name
  order: number;        // Sort order
  createdAt: Date;
  updatedAt: Date;
}
```

### Publication
```typescript
interface Publication {
  id: string;           // Primary key (UUID)
  userId: string;       // Foreign key -> User
  documentId: string;   // Foreign key -> Document
  slug: string;         // URL slug (unique per user)
  visibility: 'public' | 'private' | 'unlisted';
  views: number;
  allowComments: boolean;
  publishedAt: Date;
  updatedAt: Date;
}
```

### SyncLog
```typescript
interface SyncLog {
  id: string;           // Primary key (UUID)
  userId: string;       // Foreign key -> User
  action: 'push' | 'pull';
  documentsCount: number;
  clientTimestamp: Date;
  serverTimestamp: Date;
  status: 'success' | 'partial' | 'failed';
  details: object;      // JSON with details
}
```

---

## Sync Protocol

### Last-Write-Wins Algorithm

```javascript
function resolveConflict(localDoc, serverDoc) {
  const localTime = localDoc.updatedAt;
  const serverTime = serverDoc.updatedAt;
  
  if (localTime > serverTime) {
    return { winner: 'local', action: 'push' };
  } else if (serverTime > localTime) {
    return { winner: 'server', action: 'pull' };
  } else {
    // Same timestamp - server wins (arbitrary but consistent)
    return { winner: 'server', action: 'pull' };
  }
}
```

### Sync States

| State | Description | Action |
|-------|-------------|--------|
| `synced` | Document matches server | None |
| `pending_push` | Local changes not uploaded | Push to server |
| `pending_pull` | Server has newer version | Pull from server |
| `conflict` | Both changed since last sync | Resolve conflict |

### Offline Queue

When offline, changes are queued locally:

```javascript
interface SyncQueueItem {
  id: string;
  docId: string;
  action: 'create' | 'update' | 'delete';
  data: Partial<Document>;
  timestamp: number;
  retryCount: number;
}
```

Queue processing rules:
1. Process in FIFO order
2. Retry failed items up to 3 times
3. On repeated failure, mark for manual resolution
4. Clear queue item on successful sync

---

## Error Handling

### Error Response Format

```json
{
  "success": false,
  "error": {
    "code": "DOCUMENT_NOT_FOUND",
    "message": "The requested document does not exist",
    "details": {
      "documentId": "doc_xyz789"
    }
  }
}
```

### Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `VALIDATION_ERROR` | 400 | Invalid request data |
| `UNAUTHORIZED` | 401 | Missing or invalid token |
| `FORBIDDEN` | 403 | Insufficient permissions |
| `NOT_FOUND` | 404 | Resource not found |
| `CONFLICT` | 409 | Resource already exists |
| `RATE_LIMITED` | 429 | Too many requests |
| `INTERNAL_ERROR` | 500 | Server error |
| `SYNC_CONFLICT` | 409 | Sync conflict detected |

---

## Rate Limiting

### Limits

| Endpoint | Limit | Window |
|----------|-------|--------|
| `/auth/*` | 10 requests | 1 minute |
| `/sync` | 60 requests | 1 minute |
| `/documents` | 100 requests | 1 minute |
| `/backup/export` | 5 requests | 1 hour |
| All others | 300 requests | 1 minute |

### Response Headers

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1703520060
```

### Rate Limit Exceeded Response

```json
{
  "success": false,
  "error": {
    "code": "RATE_LIMITED",
    "message": "Too many requests",
    "details": {
      "retryAfter": 45
    }
  }
}
```

---

## Database Schema

### PostgreSQL Schema

```sql
-- Users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_login_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_users_email ON users(email);

-- Groups table
CREATE TABLE groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  color VARCHAR(7) DEFAULT '#4A90D9',
  icon VARCHAR(50) DEFAULT 'folder',
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_groups_user ON groups(user_id);

-- Documents table
CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  doc_id VARCHAR(255) NOT NULL,
  title VARCHAR(500) NOT NULL,
  content TEXT NOT NULL,
  url TEXT,
  group_id UUID REFERENCES groups(id) ON DELETE SET NULL,
  tags TEXT[] DEFAULT '{}',
  starred BOOLEAN DEFAULT FALSE,
  status VARCHAR(20) DEFAULT 'draft',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted_at TIMESTAMP WITH TIME ZONE,
  
  CONSTRAINT unique_user_doc_id UNIQUE (user_id, doc_id)
);

CREATE INDEX idx_documents_user ON documents(user_id);
CREATE INDEX idx_documents_doc_id ON documents(doc_id);
CREATE INDEX idx_documents_group ON documents(group_id);
CREATE INDEX idx_documents_tags ON documents USING GIN(tags);
CREATE INDEX idx_documents_updated ON documents(updated_at);
CREATE INDEX idx_documents_starred ON documents(user_id, starred) WHERE starred = TRUE;

-- Publications table
CREATE TABLE publications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  slug VARCHAR(255) NOT NULL,
  visibility VARCHAR(20) DEFAULT 'public',
  views INTEGER DEFAULT 0,
  allow_comments BOOLEAN DEFAULT FALSE,
  published_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT unique_user_slug UNIQUE (user_id, slug)
);

CREATE INDEX idx_publications_user ON publications(user_id);
CREATE INDEX idx_publications_document ON publications(document_id);

-- Refresh tokens table
CREATE TABLE refresh_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash VARCHAR(255) NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  revoked_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_refresh_tokens_user ON refresh_tokens(user_id);
CREATE INDEX idx_refresh_tokens_hash ON refresh_tokens(token_hash);

-- Sync logs table
CREATE TABLE sync_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  action VARCHAR(20) NOT NULL,
  documents_count INTEGER DEFAULT 0,
  client_timestamp TIMESTAMP WITH TIME ZONE,
  server_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  status VARCHAR(20) DEFAULT 'success',
  details JSONB DEFAULT '{}'
);

CREATE INDEX idx_sync_logs_user ON sync_logs(user_id);
CREATE INDEX idx_sync_logs_timestamp ON sync_logs(server_timestamp);

-- Default group trigger
CREATE OR REPLACE FUNCTION create_default_group()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO groups (id, user_id, name, color, icon, sort_order)
  VALUES (
    gen_random_uuid(),
    NEW.id,
    'Uncategorized',
    '#808080',
    'folder',
    -1
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER after_user_insert
AFTER INSERT ON users
FOR EACH ROW
EXECUTE FUNCTION create_default_group();

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at
BEFORE UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_documents_updated_at
BEFORE UPDATE ON documents
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_groups_updated_at
BEFORE UPDATE ON groups
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
```

---

## Deployment

### Environment Variables

```bash
# Server
NODE_ENV=production
PORT=3000
API_VERSION=v1

# Database
DATABASE_URL=postgresql://user:pass@host:5432/tulis
REDIS_URL=redis://host:6379

# Authentication
JWT_SECRET=your-256-bit-secret
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=30d

# Storage (S3-compatible)
S3_ENDPOINT=https://s3.amazonaws.com
S3_BUCKET=tulis-backups
S3_ACCESS_KEY=your-access-key
S3_SECRET_KEY=your-secret-key

# Rate Limiting
RATE_LIMIT_WINDOW=60000
RATE_LIMIT_MAX=100

# CORS
CORS_ORIGINS=chrome-extension://,https://tulis.app

# Logging
LOG_LEVEL=info
```

### Docker Compose (Development)

```yaml
version: '3.8'

services:
  api:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=development
      - DATABASE_URL=postgresql://postgres:postgres@db:5432/tulis
      - REDIS_URL=redis://redis:6379
    depends_on:
      - db
      - redis
    volumes:
      - .:/app
      - /app/node_modules

  db:
    image: postgres:15-alpine
    environment:
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=postgres
      - POSTGRES_DB=tulis
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

volumes:
  pgdata:
```

### Health Check Endpoint

```
GET /api/health

Response (200):
{
  "status": "healthy",
  "version": "1.0.0",
  "timestamp": "2025-12-25T00:00:00Z",
  "services": {
    "database": "healthy",
    "redis": "healthy",
    "storage": "healthy"
  }
}
```

---

## Security Considerations (Future)

The following security features are planned for future implementation:

1. **End-to-end encryption** - Client-side encryption before upload
2. **Two-factor authentication** - TOTP support
3. **GDPR compliance** - Data export, deletion requests
4. **Audit logging** - Track all data access
5. **IP allowlisting** - Restrict API access
6. **Content security policy** - Prevent XSS in published content

---

## Changelog

### v1.0.0 (Initial Release)
- User authentication (register, login, refresh)
- Document CRUD operations
- Group management
- Tag management
- Sync endpoint with last-write-wins
- Publishing functionality
- Backup export/import

---

## Contact

For questions about this API specification:
- **Email**: api@tulis.app
- **GitHub Issues**: https://github.com/nicholaslwjl/tulis-api/issues
