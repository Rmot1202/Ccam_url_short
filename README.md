# URL Shortener

A full-stack URL shortener built with React, FastAPI, PostgreSQL, and Redis.

## Features

- Shorten long URLs into compact links.
- Redirect short links to the original URL.
- Store mappings in PostgreSQL.
- Cache hot redirects in Redis.
- Track click counts.
- Optional expiration dates.
- Clean layered architecture: frontend, API, database.

## Tech Stack

- Frontend: React
- Backend: FastAPI
- Database: PostgreSQL
- Cache: Redis
- ORM: SQLAlchemy
- Validation: Pydantic

## Project Structure

```text
URL_Shortener/
  DB/
    schema.sql
    seed.sql
  API/
    app/
      __init__.py
      database.py
      models.py
      schemas.py
      crud.py
      redis_client.py
      main.py
    requirements.txt
    .env
    venv/
  frontend/
    src/
    public/
    package.json
```

## Database

The `DB` folder contains the PostgreSQL schema and seed data.

### Tables

- `users`
- `links`
- `click_events` optional for analytics

## API

The API exposes these endpoints:

- `POST /shorten`
- `GET /{short_code}`
- `GET /stats/{short_code}`
- `DELETE /{short_code}`

## Redis

Redis is used as a cache for short-code lookups.

Flow:
1. Check Redis.
2. If hit, redirect immediately.
3. If miss, check PostgreSQL.
4. Store result in Redis.
5. Redirect.

## Requirements

- Python 3.12+
- PostgreSQL 18+
- Redis
- Node.js 18+ for frontend

## Setup

### 1. Start PostgreSQL

Make sure PostgreSQL is running.

### 2. Create database

Open `psql` and run:

```sql
CREATE DATABASE url_shortener;
```

### 3. Load schema

From the `DB` folder:

```powershell
psql -U postgres -d url_shortener -f schema.sql
psql -U postgres -d url_shortener -f seed.sql
```

### 4. Start Redis

Make sure Redis is running on `localhost:6379`.

### 5. Start the API

```powershell
cd API
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn app.main:app --reload
```

### 6. Start the frontend

```powershell
cd frontend
npm install
npm run dev
```

## Environment Variables

### API `.env`

```env
DATABASE_URL=postgresql://postgres:password@localhost:5432/url_shortener
REDIS_URL=redis://localhost:6379/0
```

## Example Usage

### Create a short URL

```http
POST /shorten
```

Request:

```json
{
  "user_id": 1,
  "original_url": "https://www.example.com/products/electronics/laptops/gaming-laptops/item12345"
}
```

Response:

```json
{
  "short_code": "abc123",
  "original_url": "https://www.example.com/products/electronics/laptops/gaming-laptops/item12345"
}
```

### Redirect

Visit:

```text
GET /abc123
```

The user is redirected to the original URL.

## Notes

- PostgreSQL is the source of truth.
- Redis is only a cache.
- The app uses a layered design so frontend, API, and database logic stay separate.

## Future Work

- Custom aliases
- Expiration handling
- User authentication
- Rate limiting
- Analytics dashboard
- Docker Compose setup