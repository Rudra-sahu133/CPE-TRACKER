# CPE Tracker backend

Standalone Node.js and Express API using JavaScript ES modules, with Mongoose for MongoDB connectivity. The server does not start listening until it connects to MongoDB.

## Local MongoDB Atlas setup

1. Create a MongoDB Atlas project and cluster.
2. Create a database user with a strong password and only the database permissions needed by this app.
3. In Atlas Network Access, allow the IP address from which this backend will connect. Avoid `0.0.0.0/0` for production deployments.
4. In Atlas, select **Connect** and copy the Node.js connection string.
5. Copy `.env.example` to `.env` in this directory. Replace `USERNAME`, `PASSWORD`, and `your-cluster.mongodb.net` in `MONGODB_URI` with the values for your Atlas database. URL-encode special characters in the username or password.
6. Keep `.env` private. It is ignored by Git; only `.env.example` with placeholders belongs in source control.

Example configuration keys:

```env
PORT=5000
NODE_ENV=development
FRONTEND_ORIGINS=http://localhost:3000
MONGODB_URI=mongodb+srv://USERNAME:PASSWORD@your-cluster.mongodb.net/cpe_tracker?retryWrites=true&w=majority
AUTH_CSRF_SECRET=replace-with-at-least-32-random-characters
COOKIE_SAME_SITE=lax
```

`FRONTEND_ORIGINS` accepts a comma-separated allowlist of exact origins. In production, set it to the deployed frontend origin or origins. If it is unset in production, browser cross-origin requests are denied.
Set `AUTH_CSRF_SECRET` to a private random value of at least 32 characters. Do not commit `.env`. For the Vercel deployment, browser API calls use the frontend's same-origin `/api` proxy, so keep `COOKIE_SAME_SITE=lax`; `NODE_ENV=production` makes the cookie Secure. Use `none` only for an intentionally direct cross-site browser API deployment, over HTTPS.

## Run

```bash
npm install
npm run dev
```

`npm start` starts the API without file watching. `npm run check` checks JavaScript syntax. Both start commands require a working `MONGODB_URI` and an accessible database.

## Authentication (Phase 1)

- `GET /api/auth/csrf` issues a short-lived pre-authentication CSRF token.
- `POST /api/auth/register` accepts `{ "name", "email", "password" }` and creates an account.
- `POST /api/auth/login` accepts `{ "email", "password" }`.
- `GET /api/auth/session` returns the current user for a valid session.
- `POST /api/auth/logout` revokes the current server-side session.

Registration normalizes email to lowercase, validates the email, and requires a password of at least 12 characters (up to 72 UTF-8 bytes). Only a bcrypt hash is stored. Session IDs are random, stored hashed in MongoDB, expire after seven days, and are sent in an HttpOnly cookie. The cookie is SameSite Lax by default, Secure in production, and scoped to `/api` so it reaches both auth and business endpoints. A session check also upgrades the previous `/api/auth` cookie path and clears the old cookie. State-changing auth requests require a CSRF token in `X-CSRF-Token`; the session endpoint provides the session-bound CSRF token. CORS allows credentials only for exact configured frontend origins. Login attempts are limited to 10 per IP per 15-minute window in this single-process implementation.

**Phase 1 limitation:** The frontend redirects unauthenticated users away from workspace pages, but the existing Professionals and Courses APIs remain unauthenticated and their records are not owner-scoped, as required for this phase. Do not expose this deployment as a multi-user data-isolated application until Phase 2 adds backend authentication and per-user ownership checks to every business API. Existing records are not migrated or assigned to users.

## Health endpoint

`GET http://localhost:5000/api/health` returns the API status and Mongoose connection state (`connected`, `connecting`, `disconnected`, or `disconnecting`). It returns HTTP 200 when connected and HTTP 503 otherwise. It never includes the connection string or credentials.

## Professionals API

- `GET /api/professionals` — list professionals, newest first.
- `POST /api/professionals` — create a professional using JSON fields `name`, `email`, `profession`, `state`, and `licenseExpiry` (`YYYY-MM-DD`).

Names are trimmed and limited to 100 characters. Emails are validated, normalized to lowercase, and unique. Profession must be `CPA` or `Attorney`; state must be a two-letter U.S. state or `DC`; expiry must be a real calendar date. Invalid input returns HTTP 400 with field errors; duplicate email returns HTTP 409. Status is calculated from the expiry date (expired, within 90 days, or active) and does not verify a license with an issuing authority.

## Courses API

- `GET /api/courses` — list courses, newest first.
- `POST /api/courses` — create a course using JSON fields `title`, `provider`, `profession`, and `credits`.

Course titles are trimmed and limited to 180 characters; provider names are trimmed and limited to 120 characters. Profession must be `CPA`, `Attorney`, or `Both`. Credits must be a finite number greater than 0 and no more than 200, with at most two decimal places. Invalid input returns HTTP 400 with field errors. No audit-log entries are generated because this backend has no audit-log mechanism.

## Phase 2: business data isolation

All `/api/professionals` and `/api/courses` routes require the existing authenticated session. `POST` routes also require the session-bound `X-CSRF-Token`. Create requests reject `owner`, `ownerId`, `userId`, and `createdBy`; ownership is assigned by the API from the verified session only. List queries always constrain `owner` to that session, regardless of query parameters. Both schemas require an immutable `owner` reference to `User`, and have owner-oriented indexes.

Existing documents without an `owner` are deliberately preserved and are excluded from both list queries. No record is assigned to a user automatically. They will remain inaccessible through these APIs until an administrator makes and records an explicit assignment decision. If legacy records need to be retained for reference, back them up and create a reviewed, one-time mapping from each record to its intended account before assigning owners; do not infer ownership from the record's contact email.

The old Professional schema had a globally unique `email` index. The new schema defines a unique `{ owner: 1, email: 1 }` index so separate accounts can manage professionals with the same email. Before expecting that behavior, verify the new compound index exists, then manually drop the old `email_1` index from the `professionals` collection. Do not drop the old index until the replacement is confirmed. This index operation preserves documents; it is not performed automatically by the application. Course indexes are created from the owner and creation date fields.

There are no update or delete business routes at this phase. Any future record-by-ID endpoint must query by both `_id` and the authenticated `owner`.

Run `npm test` for API boundary, ownership-query/controller, schema, forged-owner, and validation regression tests. The multi-user tests use isolated in-memory fixtures; they do not connect to Atlas or write database records.
