# Ajaia Docs

Ajaia Docs is a lightweight document editor with authentication, rich-text editing, autosave, document sharing, and DOCX import. It uses a React and Vite frontend, a Node.js and Express API, and SQLite for persistence.

## Overview

Users can create and edit documents, reopen saved work, and share documents with another seeded user. The editor stores structured TipTap JSON. DOCX uploads are converted into new editable documents, with formatting simplified to text.

## Features

- **Authentication:** Login, session lookup, and logout using a JWT in an HTTP-only cookie.
- **Document management:** Create, rename, list, open, edit, and persist documents.
- **Document actions:** Search titles, duplicate accessible documents, and delete owned documents.
- **Rich-text editing:** Paragraphs, headings, bold, italic, underline, bulleted lists, and numbered lists.
- **Access details:** View the owner and sharing details permitted for the current user.
- **Autosave:** Debounced saves with visible status feedback.
- **Document statistics:** Live word and character counts from editor text.
- **AI summary:** Request a transient summary through the authenticated backend (requires `OPENAI_API_KEY`).
- **Sharing:** Owners can share documents by email; shared users can edit them.
- **DOCX import:** Upload a DOCX file to create a new editable document.
- **Authorization:** The backend checks document ownership or a share record.

## Tech stack

| Area | Technologies |
| --- | --- |
| Frontend | React, Vite, TipTap, JavaScript, CSS |
| Backend | Node.js, Express, JWT, bcryptjs, Multer, Mammoth |
| Database | SQLite, better-sqlite3 |

## Architecture

```text
Browser (React, Vite, TipTap) -> Express REST API -> SQLite
```

The backend owns authentication, document access checks, persistence, and DOCX processing. See [ARCHITECTURE.md](ARCHITECTURE.md) for details.

## Project structure

```text
.
├── README.md
├── ARCHITECTURE.md
├── AI_WORKFLOW.md
├── SUBMISSION.md
├── client/                 # React/Vite application
└── server/                 # Express API, database, and test
```

## Prerequisites

- Node.js `20.19+` or `22.12+` (required by the installed Vite version)
- npm

## Getting started

Install dependencies from the repository root:

```bash
cd server
npm install
cd ../client
npm install
```

### Backend

Start the API in one terminal:

```bash
cd server
npm run dev
```

The API listens on port `5000` by default and initializes the SQLite schema at startup. The default database file is `server/data/ajaia-docs.db`.

In a second terminal, seed the sample accounts after the server has initialized the database:

```bash
cd server
node src/db/seed.js
```

The backend also accepts optional `PORT`, `JWT_SECRET`, `DB_PATH`, `OPENAI_API_KEY`, and `OPENAI_MODEL` values from `server/.env`. `OPENAI_API_KEY` is required for AI summarization; it is read by the backend and is never sent to the browser. `OPENAI_MODEL` defaults to `gpt-5-mini`.

### Frontend

Start Vite in another terminal:

```bash
cd client
npm run dev
```

The development server is available at `http://localhost:5173`. The API host is currently set in `client/src/api.js` to `http://192.168.31.67:5000`. Change it to the backend host reachable from your browser if needed, and ensure that host's frontend origin is allowed by the backend CORS configuration.

## Seeded accounts

| User | Email | Password |
| --- | --- | --- |
| Alice | `alice@example.com` | `password123` |
| Bob | `bob@example.com` | `password123` |

These credentials are for local assessment use only.

## Usage

1. Sign in as Alice or Bob.
2. Create a document or open one from the sidebar.
3. Edit the title and content; changes are saved automatically.
4. Share a document by entering the other seeded user's email.
5. Sign in as that user to open and edit the shared document.
6. Use **Import DOCX** to create a document from a `.docx` file.

## API overview

All routes are mounted under `/api`.

| Method | Route | Purpose |
| --- | --- | --- |
| `POST` | `/api/auth/login` | Authenticate and set the session cookie |
| `GET` | `/api/auth/me` | Return the authenticated user |
| `POST` | `/api/auth/logout` | Clear the session cookie |
| `GET` | `/api/documents` | List owned and shared documents |
| `POST` | `/api/documents` | Create a document |
| `GET` | `/api/documents/:id` | Retrieve an accessible document |
| `PATCH` | `/api/documents/:id` | Update title and/or content |
| `DELETE` | `/api/documents/:id` | Delete a document as its owner |
| `POST` | `/api/documents/:id/duplicate` | Duplicate an accessible document into the current user's ownership |
| `POST` | `/api/documents/:id/share` | Share with a user by email |
| `POST` | `/api/documents/import` | Import a DOCX file |
| `POST` | `/api/documents/:id/summarize` | Summarize an accessible document through the configured provider |

## Testing

Start the backend, then run:

```bash
cd server
npm test
```

The existing automated test makes an unauthenticated request to the protected documents API and verifies that the response is `401 Unauthorized`. The current test run passes: one test, zero failures.

## Production build

Build the frontend with:

```bash
cd client
npm run build
```

The production build succeeds. Vite reports a bundle-size advisory because the generated JavaScript chunk exceeds 500 KB; this is a warning, not a build failure.

## DOCX import scope

Multer accepts DOCX uploads up to 5 MB, and Mammoth extracts their content. The current importer strips the converted HTML tags and stores the remaining text in a TipTap paragraph. It does not preserve full Word formatting, tables, images, or advanced layout.

## Security and authorization

- Passwords are stored as bcrypt hashes.
- Login places a signed JWT in an HTTP-only cookie.
- Authentication middleware verifies the JWT on protected routes.
- Document routes authorize access by ownership or a corresponding share record.
- SQL statements use bound parameters.

The sample credentials and development JWT secret are not suitable for production. A production deployment should use HTTPS, a strong secret, secure cookie settings, persistent storage, and an appropriate CORS configuration.

## Engineering decisions

- **SQLite** keeps setup and persistence simple for this assignment.
- **TipTap JSON** preserves structured editor content instead of using HTML as the primary stored format.
- **Seeded authentication** supports the document workflow without registration or account recovery flows.
- **Debounced autosave** avoids a request for every keystroke while keeping edits persistent.
- **Lightweight sharing** uses owner-controlled share records and backend access checks.

## Scope and non-goals

The current application does not implement real-time collaboration, CRDT/OT synchronization, live cursors, comments, version history, public links, complex roles, registration, OAuth, password recovery, or offline editing. Full Word compatibility and advanced DOCX conversion are also out of scope.

## Documentation

- [Architecture](ARCHITECTURE.md)
- [AI-assisted development workflow](AI_WORKFLOW.md)
- [Assignment submission](SUBMISSION.md)

## Current status

- Core application implemented and locally verified.
- The automated backend test passes.
- The frontend production build succeeds with a bundle-size advisory warning.
- A production deployment and live URL are pending.
