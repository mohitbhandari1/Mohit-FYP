# Smart Connects Backend

## Setup

1. Copy `.env.example` to `.env` and update values if needed.
2. Install dependencies:
   ```bash
   cd backend
   npm install
   ```
3. Start Postgres locally or with Docker:
   ```bash
   docker compose up -d
   ```
4. Create the database schema:
   ```bash
   psql -h localhost -U postgres -d smart_connects -f schema.sql
   ```
5. Run the backend:
   ```bash
   npm run dev
   ```

## API Endpoints

- `GET /api/health` — check backend and database connectivity
- `GET /api/communities` — list communities
- `POST /api/communities` — create a new community
- `GET /api/communities/:id` — get community details
- `GET /api/events` — list events
- `POST /api/events` — create a new event
- `GET /api/users` — list users
- `POST /api/users/register` — create a user

## Seed data

Run sample data insertion after the database schema is ready:
```bash
npm run seed
```
