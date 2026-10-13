# 🛡️ MediaVault

A secure, modular, and scalable cloud media management and storage platform built on top of S3-compatible object storage (**MinIO**).

Designed with production-grade engineering principles: stateless backend architecture, asynchronous background processing using **Celery & Redis**, cryptographically signed **Presigned URLs**, strict **multi-tenant data isolation**, and temporary time-limited **share links**.

---

## 🚀 Tech Stack

| Component | Technology | Description |
|---|---|---|
| **Backend Framework** | Python 3.12, Django 5.1, DRF | High-performance, secure REST API |
| **Relational Database** | PostgreSQL 16 | ACID-compliant storage for users, metadata & relationships |
| **Object Storage** | MinIO | High-performance S3-compatible distributed object storage |
| **Async Task Queue** | Celery 5.3+ | Asynchronous job processing (e.g. image thumbnailing) |
| **Message Broker & Cache** | Redis 7 | In-memory message broker for Celery tasks |
| **Authentication** | JWT (`djangorestframework-simplejwt`) | Stateless token authentication (Access + Refresh tokens) |
| **Image Processing** | Pillow (PIL) | Automated image resizing and thumbnail generation |
| **Filtering & Search** | `django-filter` & DRF Filters | Queryset filtering, text search & dynamic pagination |
| **Frontend** | React 19, Vite, TypeScript, Tailwind CSS 4 | Photo library web app (TanStack Query, Motion, React Router) |
| **DevOps & Containerization** | Docker & Docker Compose | Multi-container reproducible local and production setup |

---

## ⚡ Quick Start (Docker)

The entire platform is containerized and ready to run with three simple commands:

```bash
# 1. Create environment file from sample
cp .env.example .env

# 2. Build and launch all services in background
docker compose up -d --build

# 3. Apply database migrations and create the storage bucket
docker compose exec web python manage.py migrate
docker compose exec web python manage.py ensure_bucket
```

Then open **http://localhost:5173** to use the web app.

### 🌐 Service Endpoints & Ports

| Service | Endpoint | Description |
|---|---|---|
| **Web App** | `http://localhost:5173` | React frontend (proxies `/api` to Django) |
| **Django REST API** | `http://localhost:8000` | Main application API |
| **MinIO Console** | `http://localhost:9001` | Object storage web dashboard (Credentials from `.env`) |
| **MinIO S3 API** | `http://localhost:9000` | S3-compatible API endpoint |
| **PostgreSQL** | `localhost:5432` | Relational database |
| **Redis** | `localhost:6379` | In-memory broker |

---

## 🖥️ Frontend

The web app lives in [`frontend/`](frontend/). It's a React + TypeScript single-page app built with Vite and Tailwind CSS.

**Features**
- Sign up / sign in with JWT; access tokens refresh silently in the background
- Photo library grouped by day, with search, sorting, a "Not in Album" filter and infinite scroll
- Upload by button or by dragging photos anywhere onto the window, with per-file progress
- Full-screen viewer: keyboard (← → I Esc) and swipe navigation, download, delete, move to album
- Albums with cover images and photo counts; create, rename, toggle public, delete
- Expiring share links (1 hour – 30 days), a management page with view counts and revoke, and a public `/s/<token>` page for recipients that needs no login
- Light / dark / automatic theme, responsive down to phone width, respects reduced-motion and reduced-transparency settings

**Run it outside Docker** (with the API on `localhost:8000`):

```bash
cd frontend
npm install
npm run dev          # http://localhost:5173
npm run build        # type-check + production bundle in dist/
```

The Vite dev server proxies `/api/*` to Django, so no CORS setup is needed. Set `VITE_API_PROXY` to point it elsewhere. If you serve the built app from a different origin than the API, list that origin in `CORS_ALLOWED_ORIGINS` (comma-separated) in `.env`.

---

## 🧪 Automated Testing

Run the full test suite (30 automated unit & integration tests covering authorization, user isolation, uploads, Celery thumbnail generation, share links, pagination, and filters):

```bash
docker compose exec web python manage.py test
```

---

## 📚 Frontend API Integration Guide

### 🔑 Authentication Header
All protected endpoints require the JWT Access Token provided in the `Authorization` header:

```http
Authorization: Bearer <access_token>
```

---

### 1. Authentication Endpoints (`/api/auth/`)

#### 🔹 Register User
`POST /api/auth/register/`
- **Request Body:**
  ```json
  {
    "email": "user@example.com",
    "password": "StrongPassword123!",
    "first_name": "John",
    "last_name": "Doe"
  }
  ```
- **Response (201 Created):**
  ```json
  {
    "email": "user@example.com",
    "first_name": "John",
    "last_name": "Doe"
  }
  ```

#### 🔹 Login (Obtain JWT Pair)
`POST /api/auth/login/`
- **Request Body:**
  ```json
  {
    "email": "user@example.com",
    "password": "StrongPassword123!"
  }
  ```
- **Response (200 OK):**
  ```json
  {
    "access": "eyJhbGciOiJIUzI1NiIsIn...",
    "refresh": "eyJhbGciOiJIUzI1NiIsIn..."
  }
  ```
> **Frontend Note:** Access tokens expire in 5 minutes; refresh tokens expire in 24 hours.

#### 🔹 Refresh Access Token
`POST /api/auth/refresh/`
- **Request Body:**
  ```json
  {
    "refresh": "<refresh_token>"
  }
  ```
- **Response (200 OK):**
  ```json
  {
    "access": "<new_access_token>"
  }
  ```

#### 🔹 Current User Profile
`GET /api/auth/me/` (Requires Authorization Header)
- **Response (200 OK):**
  ```json
  {
    "email": "user@example.com",
    "first_name": "John",
    "last_name": "Doe"
  }
  ```

---

### 2. Media Files (`/api/files/`)

#### 🔹 Upload Media File
`POST /api/files/`
- **Content-Type:** `multipart/form-data`
- **Parameters:**
  - `file`: The binary file (Required - max size: 10MB)
  - `album`: Album ID (Optional - `number`)
- **Response (201 Created):**
  ```json
  {
    "id": 1,
    "owner": 4,
    "file": "http://localhost:9000/mediavault-bucket/users/4/d81c...png",
    "url": "http://localhost:9000/mediavault/users/4/d81c...png?X-Amz-Signature=...",
    "thumbnail_url": null,
    "album": null,
    "original_name": "avatar.png",
    "content_type": "image/png",
    "size": 154200,
    "created_at": "2026-10-12T15:00:00Z"
  }
  ```
> `url` and `thumbnail_url` are presigned, browser-reachable URLs that are valid for one hour. `thumbnail_url` is `null` until the background thumbnail job finishes.

> **Architecture Note:** When an image is uploaded, Celery asynchronously triggers thumbnail generation (200x200) in the background without blocking the HTTP response.

#### 🔹 List Files (Pagination, Filter, Search & Ordering)
`GET /api/files/`
- **Query Parameters:**
  - `page`: Page number (Default: 1)
  - `page_size`: Number of items per page (Default: 10, Max: 100)
  - `search`: Case-insensitive search on `original_name` (`?search=report`)
  - `content_type`: Filter by mime type (`?content_type=image` or `?content_type=application/pdf`)
  - `album`: Filter by album ID (`?album=2`)
  - `no_album`: Filter unassigned files (`?no_album=true`)
  - `min_size` / `max_size`: Filter by file size in bytes (`?min_size=1024&max_size=5242880`)
  - `created_after` / `created_before`: Filter by ISO datetime (`?created_after=2026-01-01T00:00:00Z`)
  - `ordering`: Sort field (`?ordering=-created_at`, `?ordering=size`, `?ordering=original_name`)
- **Response (200 OK):**
  ```json
  {
    "count": 45,
    "next": "http://localhost:8000/api/files/?page=2",
    "previous": null,
    "results": [
      {
        "id": 1,
        "owner": 4,
        "file": "http://localhost:9000/mediavault-bucket/users/4/...",
        "album": 2,
        "original_name": "project_report.pdf",
        "content_type": "application/pdf",
        "size": 2048500,
        "created_at": "2026-10-12T14:20:00Z"
      }
    ]
  }
  ```

#### 🔹 Get Direct Download URL (Presigned S3 URL)
`GET /api/files/<id>/download/`
- Generates a time-limited cryptographically signed URL for direct download from MinIO. Prevents streaming load bottlenecks on the Django backend.
- Add `?download=1` to have the URL force a file download (`Content-Disposition: attachment`).
- **Response (200 OK):**
  ```json
  {
    "download_url": "http://localhost:9000/mediavault-bucket/users/4/...?X-Amz-Signature=...",
    "expires_in": 3600
  }
  ```

#### 🔹 File Details, Moving & Deletion
- Get details: `GET /api/files/<id>/`
- Move to another album: `PATCH /api/files/<id>/` with `{"album": 2}` (or `{"album": null}` to remove it from its album). Only your own albums are accepted.
- Delete file (deletes DB record and removes object from MinIO): `DELETE /api/files/<id>/` (Status: `204 No Content`)

---

### 3. Albums (`/api/albums/`)

#### 🔹 Create Album
`POST /api/albums/`
- **Request Body:**
  ```json
  {
    "title": "Summer Vacation 2026",
    "description": "Trip photos & videos",
    "is_public": false
  }
  ```
- **Response (201 Created):**
  ```json
  {
    "id": 1,
    "owner": 4,
    "title": "Summer Vacation 2026",
    "description": "Trip photos & videos",
    "is_public": false,
    "media_count": 0,
    "cover_url": null,
    "created_at": "2026-10-12T14:30:00Z",
    "updated_at": "2026-10-12T14:30:00Z"
  }
  ```

#### 🔹 List Albums
`GET /api/albums/`
- **Query Parameters:** `search` (on `title` and `description`), `is_public` (`true`/`false`), `ordering` (`title`, `-created_at`), and pagination (`page`, `page_size`).

#### 🔹 Album Details, Updates & Deletion
- Get details: `GET /api/albums/<id>/`
- Update: `PATCH /api/albums/<id>/` with any of `title`, `description`, `is_public`
- Delete album: `DELETE /api/albums/<id>/`

---

### 4. Temporary Share Links (`/api/share-links/` & `/api/share/`)

Secure, time-limited file sharing without requiring the recipient to register or log in.

#### 🔹 Create Share Link (Owner only)
`POST /api/share-links/`
- **Request Body:**
  ```json
  {
    "media_file": 1,
    "expires_at": "2026-10-13T20:00:00Z"
  }
  ```
  *(If `expires_at` is omitted, defaults to 24 hours from creation).*
- **Response (201 Created):**
  ```json
  {
    "id": 1,
    "media_file": 1,
    "token": "a8fbc891045a47e7bca2d89b37c6888ef391...",
    "created_at": "2026-10-12T16:00:00Z",
    "expires_at": "2026-10-13T16:00:00Z",
    "views_count": 0,
    "is_expired": false
  }
  ```

#### 🔹 List & Revoke Share Links
- List user's links: `GET /api/share-links/`
- Revoke / delete link: `DELETE /api/share-links/<id>/`

#### 🔹 Public Access by Token (No Authentication Required)
`GET /api/share/<token>/`
- Public endpoint for external recipients.
- Automatically increments `views_count`.
- If the token is expired, returns `410 Gone`.
- **Response (200 OK):**
  ```json
  {
    "download_url": "http://localhost:9000/mediavault-bucket/users/4/...?X-Amz-Signature=...",
    "original_name": "vacation_photo.jpg",
    "content_type": "image/jpeg",
    "size": 345000,
    "expires_at": "2026-10-13T16:00:00Z",
    "views_count": 1
  }
  ```

---

## 🗺️ Project Roadmap

1. ✅ Project setup & Docker Compose orchestration
2. ✅ Custom JWT authentication & registration
3. ✅ MinIO S3-compatible object storage connection
4. ✅ Secure file upload with size & mime validation
5. ✅ Presigned URL generation for direct downloads
6. ✅ Albums & granular multi-tenant permission isolation
7. ✅ Asynchronous thumbnail generation with Celery & Redis
8. ✅ Temporary share links with expiration & view tracking
9. ✅ Dynamic pagination, multi-criteria filtering & search
10. ✅ React web frontend
11. ⏳ Swagger / OpenAPI documentation & GitHub Actions CI
