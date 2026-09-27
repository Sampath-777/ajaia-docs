# AI-Assisted Development Workflow

## 1. Purpose

AI assistance was used as part of the engineering workflow for Ajaia Docs. Requirements and priorities were supplied by the project owner. Generated changes and recommendations were reviewed, run, and corrected as needed; AI output was not treated as automatically correct.

## 2. Development approach

Work proceeded incrementally through the following cycle:

```text
Requirements
    -> Decomposition
    -> Architecture
    -> Implementation
    -> Human review
    -> Testing
    -> Debugging
    -> Iteration
```

The project was developed through focused tasks rather than a single end-to-end implementation prompt. The owner kept control of scope and reviewed the working application and documentation.

## 3. Requirements decomposition

The assignment was treated as a set of connected work areas:

- Authentication and session handling
- Document creation, editing, and persistence
- Rich-text editing and autosave
- Sharing and backend authorization
- DOCX import
- Automated and manual verification
- Project documentation and submission status

Deployment was tracked separately and remains pending; no live URL is claimed.

## 4. Architecture planning

The existing backend was inspected before implementing the frontend. That inspection identified the Express route groups, cookie-based JWT authentication, SQLite schema, and document ownership/share model. The frontend was designed to call those APIs and store TipTap JSON without redesigning the backend.

The resulting system uses a React/Vite client, an Express REST API, and SQLite. Authentication and document authorization remain server responsibilities.

## 5. Incremental implementation

Implementation followed the user workflow: authenticate, load documents, create or open a document, edit, autosave, share, and import DOCX. The frontend was built in its own `client` directory, and TipTap was configured for the supported formatting. The API helper centralizes credentialed requests and distinguishes JSON bodies from multipart `FormData` uploads.

Documentation was prepared after inspecting the implemented routes, schema, frontend API calls, and test so the written descriptions could match the code.

## 6. Prompting strategy

Requests were scoped to concrete engineering tasks and included relevant context, constraints, expected behavior, and files to inspect or change. Examples included reviewing the backend without editing it, building the frontend against existing routes, correcting the `/api` route prefix, and preparing the documentation files.

No specific prompt framework or automated prompt-testing system was used.

## 7. Human review

The project owner provided requirements, clarified priorities, reviewed findings, and steered implementation. Code and documentation were checked against the repository. Builds and the available backend test were run where requested, and documentation was corrected when it did not match the implementation.

## 8. Debugging and iteration

One integration issue was that frontend requests needed the `/api` prefix used by the mounted backend routes. The API helper was updated so calls resolve to paths such as `/api/auth/login` and `/api/documents` while preserving the configured backend host.

The request helper also leaves `Content-Type` unset for `FormData`, allowing the browser to supply the multipart boundary required by DOCX upload. This was verified by inspecting the current API helper and import flow.

The backend test covers the unauthenticated documents request and expects `401`. CLI and environment failures were treated as tooling or setup issues rather than application defects unless the application behavior demonstrated otherwise.

## 9. Verification strategy

Verification included the existing automated backend test and frontend production build. The automated test checks that unauthenticated listing, deletion, duplication, and summary requests are rejected; it is not a comprehensive API test suite. API smoke checks also exercised access visibility, duplicate ownership, owner-only deletion, empty/oversized summary validation, and the missing-key response. Manual checks covered the main flows: login, document creation and editing, autosave, reopening, sharing and shared editing, persistence, and DOCX import. A live LLM response was not checked because `OPENAI_API_KEY` is not configured in the current environment.

The production frontend build succeeds. Vite reports a bundle-size advisory above 500 KB; the advisory does not fail the build.

## 10. Scope management

The implementation focused on the required document workflow. Real-time collaboration, CRDT/OT, live cursors, comments, version history, offline editing, advanced Word layout, registration, OAuth, and password recovery were left out of scope. This kept the work centered on authenticated editing and persistence within the assessment window.

## 11. Documentation

The project documentation was reviewed against the current source and verification results:

- `README.md` provides setup, usage, API, testing, and status information.
- `ARCHITECTURE.md` describes components, data, API flows, and trade-offs.
- `AI_WORKFLOW.md` records the actual AI-assisted development approach and known verification scope.
- `SUBMISSION.md` summarizes requirement coverage, demo steps, verification, limitations, and deployment status.

## 12. Engineering principles

- Break requirements into reviewable tasks.
- Inspect existing code before designing around it.
- Verify API paths and data formats against the implementation.
- Review generated changes and run the relevant build or test.
- Distinguish implementation failures from local tooling or setup errors.
- Prefer fixing the root cause over adding workarounds.
- Keep scope focused and document limitations accurately.
