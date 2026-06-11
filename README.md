# Smart Connects

A starter full-stack scaffold for the Smart Connects project.

## Stack

- Frontend: Next.js + TypeScript + Tailwind CSS
- Backend: Node.js + Express + TypeScript
- Database: PostgreSQL

## Setup

1. Start Postgres:
   ```bash
   docker compose up -d
   ```
2. Backend:
   ```bash
   cd backend
   npm install
   cp .env.example .env
   npm run dev
   ```
3. Frontend:
   ```bash
   cd frontend
   npm installnpm run dev
```

> **Note:** The frontend runs on port **3001** by default (port 3000 is used by Docker infrastructure).

## Notes

- The backend includes a sample `schema.sql` for PostgreSQL tables.
- The frontend provides a Tailwind-based landing page shell.
