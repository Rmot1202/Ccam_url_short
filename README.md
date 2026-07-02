# URL Shortener

A full-stack URL shortener built with React, FastAPI, SQLAlchemy, PostgreSQL, and Redis. The project is organized as a teaching app for interns: HTTP handlers stay thin, business rules live in a service layer, data access is isolated in a repository module, and PostgreSQL remains the source of truth.

## What It Does

A user submits a long URL:

```text
https://www.example.com/products/electronics/laptops/gaming-laptops/item12345
```

The API stores it and returns a short code such as:

```text
http://localhost:8000/abc123
```

When someone visits `/abc123`, the API resolves the code and redirects to the original URL.

## Current Features

- User signup, login, logout, and cookie-based authentication.
- Create short URLs with random codes or custom aliases.
- Validate that submitted URLs are absolute `http` or `https` URLs.
- Reject duplicate aliases with `409 Conflict`.
- Reject reserved or malformed aliases with `400 Bad Request`.
- Optional expiration dates.
- Public redirects.
- Per-link click counters.
- Owner-only link listing, stats, and deletion.
- Redis cache-aside support with graceful fallback if Redis is unavailable.
- Request logging middleware.

## Architecture

```text
Client
  -> REST API / Controller Layer
  -> Service Layer
  -> Repository / Data Access Layer
  -> Database
```

### API Layer

Location: `API/app/main.py`

Responsibilities:

- Define HTTP routes.
- Parse and validate request bodies through Pydantic schemas.
- Enforce authentication on protected endpoints.
- Convert service-layer errors into HTTP status codes.
- Return JSON responses or redirects.

Endpoints:

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| `POST` | `/auth/signup` | No | Create a user account. |
| `POST` | `/auth/login` | No | Set an `access_token` cookie. |
| `POST` | `/auth/logout` | No | Clear the auth cookie. |
| `GET` | `/auth/me` | Yes | Return the current user. |
| `POST` | `/shorten` | Yes | Create a short URL. |
| `GET` | `/links` | Yes | List the current user's links. |
| `GET` | `/{short_code}` | No | Redirect to the original URL. |
| `GET` | `/stats/{short_code}` | Yes | Return stats for an owned link. |
| `DELETE` | `/{short_code}` | Yes | Delete an owned link. |

Useful status codes:

- `201 Created` for successful signup and link creation.
- `400 Bad Request` for invalid URLs, aliases, or expiration dates.
- `401 Unauthorized` for missing or invalid authentication.
- `403 Forbidden` when a user tries to access another user's link stats.
- `404 Not Found` for missing users or short codes.
- `409 Conflict` for duplicate users or aliases.
- `410 Gone` for expired or inactive links.
- `503 Service Unavailable` if random code generation cannot find a unique code.

### Service Layer

Location: `API/app/services.py`

Responsibilities:

- Generate unique random short codes.
- Validate reserved aliases.
- Check alias conflicts.
- Normalize and enforce expiration dates.
- Resolve redirects.
- Mark expired links inactive.
- Increment click counts.
- Read, write, and evict Redis cache entries.

This keeps business decisions out of the HTTP route functions.

### Data Access Layer

Location: `API/app/crud.py`

Responsibilities:

- Create users.
- Authenticate users.
- Create, fetch, update, and delete link rows.
- Commit database transactions.

The repository functions do not decide whether an alias is valid or a link is expired; those rules belong to the service layer.

### Database Layer

Locations:

- `API/app/models.py` for SQLAlchemy models.
- `DB/schema.sql` for PostgreSQL schema.
- `DB/seed.sql` for seed data.

Main tables:

| Table | Purpose |
| --- | --- |
| `users` | Stores account identity and password hashes. |
| `links` | Stores short-code mappings, ownership, expiration, and click counts. |

Important design choices:

- `links.short_code` is the primary key for fast redirect lookups.
- `users.email` is unique.
- `links.user_name`, `links.is_active`, and `links.expires_at` are indexed.
- PostgreSQL should be treated as the source of truth; Redis is only a cache.

## Cache Flow

Redirects use a cache-aside pattern:

```text
Request /abc123
  -> check Redis for abc123
  -> check PostgreSQL for ownership/state/expiration
  -> increment click count
  -> if Redis miss, store abc123 -> original URL
  -> redirect
```

Redis failures do not break core behavior. If Redis is down, redirects continue through PostgreSQL.

## ID Generation Strategy

The current implementation uses six-character random Base62-style strings:

```text
aZ93fK
```

The service checks the database for collisions and retries before returning `503 Service Unavailable`. This is simple and works well for the teaching MVP. A future version could use incrementing IDs encoded as Base62 or a distributed ID generator.

## Analytics

The MVP updates `click_count` synchronously during redirects. This is simple and immediately consistent, but every redirect still writes to the database.

A larger architecture could publish click events to a queue and process analytics asynchronously for browser, geography, and daily traffic reports.

## Project Structure

```text
URL_Shortener/
  API/
    app/
      auth.py
      crud.py
      database.py
      main.py
      models.py
      redis_client.py
      schemas.py
      services.py
    requirements.txt
  DB/
    schema.sql
    seed.sql
  FRONT/
    URL_Shortener_with_Authentication/
      src/
      package.json
      vite.config.ts
```

## Setup

### 1. Create the database

```sql
CREATE DATABASE url_shortener;
```

### 2. Load schema

From the repository root:

```powershell
psql -U postgres -d url_shortener -f DB\schema.sql
psql -U postgres -d url_shortener -f DB\seed.sql
```

### 3. Configure the API

Create `API/.env`:

```env
DATABASE_URL=postgresql://postgres:password@localhost:5432/url_shortener
REDIS_URL=redis://localhost:6379/0
SECRET_KEY=replace-this-with-a-long-random-secret
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=60
```

If `DATABASE_URL` is omitted, the API falls back to a local SQLite file for quick development. PostgreSQL is recommended for the architecture exercise.

### 4. Start the API

```powershell
cd API
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn app.main:app --reload
```

### 5. Start the frontend

```powershell
cd FRONT\URL_Shortener_with_Authentication
npm install
npm run dev
```

Frontend: `http://localhost:5173`

API docs: `http://localhost:8000/docs`

## Example API Usage

### Sign up

```http
POST /auth/signup
Content-Type: application/json
```

```json
{
  "user_name": "intern1",
  "email": "intern1@example.com",
  "password": "password123"
}
```

### Log in

```http
POST /auth/login
Content-Type: application/json
```

```json
{
  "email": "intern1@example.com",
  "password": "password123"
}
```

### Create a short URL

```http
POST /shorten
Content-Type: application/json
```

```json
{
  "original_url": "https://www.example.com/products/electronics/laptops/gaming-laptops/item12345",
  "custom_alias": "abc123",
  "expires_at": "2026-07-03T12:00:00Z",
  "warm_cache": true
}
```

Response:

```json
{
  "short_code": "abc123",
  "original_url": "https://www.example.com/products/electronics/laptops/gaming-laptops/item12345",
  "click_count": 0,
  "cached_in_redis": true
}
```

### Redirect

```http
GET /abc123
```

Returns a `307 Temporary Redirect` to the original URL.

## Development Milestones

### Phase 1 - MVP

- Create short URLs.
- Redirect users.
- Store mappings in a database.

### Phase 2 - Intermediate

- Custom aliases.
- Expiration dates.
- Click counters.
- User accounts.

### Phase 3 - Architecture Focus

- Redis cache-aside flow.
- Analytics processing design.
- Rate limiting.
- Monitoring and structured logging.
