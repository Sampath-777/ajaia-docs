# Ajaia Docs — Assignment Submission

## Project summary

Ajaia Docs is a full-stack document editor built with React, Vite, TipTap, Node.js, Express, and SQLite. It supports seeded-user authentication, document creation and editing, structured rich-text storage, autosave, document sharing, and DOCX import.

The application has been verified locally. A production deployment and live URL have not yet been established.

## Assignment requirements coverage

| Requirement | Implementation | Status |
| --- | --- | --- |
| Authentication | Seeded accounts with bcrypt password hashes and an HTTP-only JWT cookie | Complete |
| Document creation and editing | Protected create, retrieve, rename, and update routes with a TipTap editor | Complete |
| Document search | Case-insensitive client-side title filtering across owned and shared documents | Complete |
| Rich-text editing | Paragraphs, headings, bold, italic, underline, and lists | Complete |
| Persistence and autosave | TipTap JSON stored in SQLite and saved through debounced requests | Complete |
| Delete and duplicate | Owner-only deletion and access-checked copies owned by the requesting user | Complete |
| Access information | Owner sees share recipients; shared users see the owner and their own access | Complete |
| Document statistics | Live word and character counts from editor text | Complete |
| DOCX import | Authenticated upload through Multer and Mammoth, converted to editable text content | Complete with formatting limitations |
| AI summarization | Authenticated server-side provider request; requires `OPENAI_API_KEY` | Implemented; live provider call requires configuration |
| Sharing | Owner can share by email; shared users can edit | Complete |
| Authorization | Backend checks document ownership or a share record | Complete |
| Automated testing | Test rejects unauthenticated access to the protected documents API | Complete; one test |
| Setup documentation | Setup and architecture instructions provided in README and architecture documentation | Complete |
| Deployment | No production/live deployment URL is available | Pending |

## Core features

- Login, current-session lookup, and logout
- Owned and shared document lists
- Create, open, rename, and edit documents
- TipTap structured JSON persistence
- Debounced autosave with save-state feedback
- Title search, word and character counts, deletion, and duplication
- Owner-visible sharing details and shared-user access information
- Sharing with another seeded user
- DOCX upload and text extraction
- Read-only AI-generated summaries when the server has an API key configured

## Technical stack

- **Frontend:** React, Vite, TipTap, JavaScript, CSS
- **Backend:** Node.js, Express, JWT, bcryptjs, Multer, Mammoth
- **Database:** SQLite with better-sqlite3

## Demo credentials

| User | Email | Password |
| --- | --- | --- |
| Alice | `alice@example.com` | `password123` |
| Bob | `bob@example.com` | `password123` |

These seeded credentials are intended for local assessment use.

## Verification

- `cd server && npm test` — passes one test with zero failures. The test verifies that unauthenticated access to `GET /api/documents` returns `401`.
- `cd client && npm run build` — succeeds. Vite reports a bundle-size advisory above 500 KB; the build completes successfully.
- API smoke checks covered access visibility, duplicate ownership, owner-only deletion, empty and oversized summary validation, and the missing-key configuration response.
- Manual verification covered DOCX import, sharing and shared editing, persistence, and the main login and document editing flow. A live LLM response still requires an API key and has not been verified.

The automated test suite is limited and should not be interpreted as comprehensive route or security coverage.

## Demo flow

1. Sign in as Alice.
2. Create a document, edit its title and content, and wait for the save status.
3. Reload or reopen the document to confirm persistence.
4. Share the document with `bob@example.com`.
5. Sign in as Bob and open and edit the shared document.
6. Import a DOCX file and review the resulting text document.

## Documentation

- [README](README.md)
- [Architecture](ARCHITECTURE.md)
- [AI-assisted development workflow](AI_WORKFLOW.md)

## Known limitations

- No real-time collaboration, CRDT/OT synchronization, or offline conflict resolution
- DOCX import extracts text and does not preserve full Word formatting, tables, images, or advanced layout
- Authentication uses seeded accounts; registration, OAuth, and password recovery are not implemented
- No version history or public sharing links
- AI summaries require a valid server-side OpenAI API key; live provider execution is not verified without one
- Deployment and a live URL are pending

## Deployment

**Live URL:** `TO BE ADDED AFTER DEPLOYMENT`

## Final checklist

- [x] Authentication and seeded demo accounts
- [x] Document creation, editing, and persistence
- [x] Rich-text editor and autosave
- [x] Document sharing and server-side authorization
- [x] DOCX import
- [x] Automated test and frontend production build
- [x] Project and architecture documentation
- [ ] Production deployment and live URL
