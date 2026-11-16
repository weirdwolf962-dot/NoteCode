<div align="center">

<img src="public/logo.png" alt="NoteCode logo" width="120" />

# NoteCode

**Create & share your code easily.**

Write a snippet, run it, and share it with a single link.

Built by **Quantum Coders**

</div>

---

## Overview

NoteCode is a lightweight code-sharing playground. Paste or write code in a Monaco-powered editor, run it right in the browser, and share a permanent link. Sign in with Google to keep a personal library of everything you have shared.

## Features

- **Monaco editor** with light and dark themes
- **Instant sharing** – every snippet gets a permalink (`/<snippet-id>`)
- **Google sign-in** (Firebase Auth) and a personal "My Snippets" library
- **Live preview** for HTML, CSS and Markdown, with console output captured
- **In-browser execution**
  - Python (Pyodide / WebAssembly)
  - SQL (SQLite via sql.js)
  - JSON and XML validation
- **JavaScript / TypeScript execution** on self-hosted deployments (see notes below)
- Code formatting with Prettier
- Responsive layout for desktop and mobile

## Supported languages

HTML · CSS · JavaScript · TypeScript · JSON · Python · SQL · Markdown · XML

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | React 19, Vite, Tailwind CSS, Monaco Editor |
| Backend | Node.js, Express |
| Database | PostgreSQL with Drizzle ORM |
| Auth | Firebase Authentication |
| Hosting | Vercel (serverless) or any Node host / Cloud Run |

## Project structure

```
notecode/
├── api/index.ts            # Vercel serverless entry
├── server.ts               # Node server (local dev, VPS, Cloud Run)
├── vercel.json             # Vercel routing and build config
├── firebase-applet-config.json
├── src/
│   ├── app.ts              # Express API routes
│   ├── App.tsx             # React workspace
│   ├── components/         # Editor, header, terminal, snippets drawer
│   ├── contexts/           # Auth context
│   ├── db/                 # Drizzle schema, queries, pool
│   ├── lib/                # Firebase client and admin setup
│   ├── middleware/         # Auth middleware
│   └── utils/              # Runners, formatter, snippet helpers (+ tests)
└── public/
```

## Getting started

**Prerequisites:** Node.js 22+ and a PostgreSQL database.

1. Install dependencies:
   ```bash
   npm install
   ```
2. Create a `.env` file (see `.env.example`):
   ```env
   SQL_HOST=localhost
   SQL_USER=postgres
   SQL_PASSWORD=your-password
   SQL_DB_NAME=notecode

   # Only needed to run migrations
   SQL_ADMIN_USER=postgres
   SQL_ADMIN_PASSWORD=your-password
   ```
3. Create the database tables:
   ```bash
   npx drizzle-kit push --config src/db/drizzle.config.ts
   ```
4. Start the dev server:
   ```bash
   npm run dev
   ```
   Open http://localhost:3000.

## Environment variables

| Variable | Required | Description |
|---|---|---|
| `SQL_HOST` | Yes | Postgres host (use the pooled host on serverless) |
| `SQL_USER` | Yes | Database user |
| `SQL_PASSWORD` | Yes | Database password |
| `SQL_DB_NAME` | Yes | Database name |
| `SQL_PORT` | No | Defaults to `5432` |
| `SQL_SSL` | Hosted DBs | Set to `true` for Neon, Supabase, etc. |
| `PG_POOL_MAX` | No | Connections per instance (default 5, or 1 on Vercel) |
| `PG_STATEMENT_TIMEOUT_MS` | No | Set to `0` if your pooler rejects it |
| `ENABLE_SERVER_EXECUTION` | No | Server-side JS/TS execution. Keep off unless isolated |
| `FIREBASE_SERVICE_ACCOUNT_JSON` | No | Only for features needing admin credentials |

Firebase web configuration lives in `firebase-applet-config.json`; no Firebase environment variables are required.

> **Connection budget:** each server instance keeps its own pool, so total connections = instances × `PG_POOL_MAX`. Keep that below your database's `max_connections`.

## Deploying to Vercel

1. Create a PostgreSQL database (for example on [Neon](https://neon.com)) and enable connection pooling.
2. Run the table setup once from your machine (step 3 above) against that database.
3. Push the repo to GitHub, then in Vercel choose **Add New → Project** and import it.
4. Add these environment variables:
   ```env
   SQL_HOST=your-pooled-host
   SQL_USER=your-user
   SQL_PASSWORD=your-password
   SQL_DB_NAME=your-db
   SQL_SSL=true
   ```
5. Deploy, then add your Vercel domain in **Firebase Console → Authentication → Settings → Authorized domains**.
6. Verify `https://<your-app>.vercel.app/api/health` returns `{"ok":true}`.

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start the development server |
| `npm run build` | Build the frontend into `dist/` |
| `npm start` | Start the production server |
| `npm run lint` | Type-check with TypeScript |

## Notes

- **JavaScript/TypeScript execution** runs on the server and is disabled on Vercel, where serverless functions cannot spawn processes. Python, SQL, HTML, CSS, Markdown, JSON and XML run entirely in the browser.
- Never enable server-side execution on a public deployment without proper isolation.

## Team

Built with care by **Quantum Coders**.

## License

All rights reserved by Quantum Coders unless a license file states otherwise.
