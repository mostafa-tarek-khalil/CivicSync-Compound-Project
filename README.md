# CivicSync — Smart Compound Management System

A full-stack compound (gated community) management platform. CivicSync gives a residential
compound one place to run **resident onboarding, maintenance tickets, technician offers,
billing, visitor access control, notifications and real-time chat** — instead of spreading
them across phone calls, paper logs and group chats.

* **Backend:** Node.js + Express 5 + MongoDB (Mongoose) + Socket.IO
* **Frontend:** Angular (standalone components, zoneless change detection)
* **Team task division and per-contributor evidence:** see [`TASKS.md`](./TASKS.md)

---

## Overview

CivicSync is a role-based web application for managing a residential compound.

**The problem it addresses.** Compound operations normally run on disconnected tools: a
guard's paper visitor log, the manager's spreadsheet of units, phone calls for maintenance,
and no shared record of who paid what. That makes it hard to answer basic questions — is
this visitor expected? has this job been assigned? who approved this account?

**Target users**

| User | What they need |
| ---- | -------------- |
| **Resident** | Report maintenance issues, invite and approve visitors, see and pay invoices |
| **Technician** | Find available jobs, quote for them, negotiate, and resolve work |
| **Security** | Verify visitor passes at the gate and confirm entry/exit |
| **Admin** | Approve accounts, manage buildings/units, issue invoices, oversee everything and pull reports |

**Overall concept.** Accounts are created by self-registration and stay `PENDING` until an
admin activates them. Residents are bound to exactly one unit, and a unit has at most one
resident. Maintenance tickets flow from a resident to competing technician offers, through
negotiation, to an accepted offer and a resolved job, optionally ending in a review and an
invoice. Visitors either request access themselves (email OTP → resident approval → QR pass)
or are invited by a resident, and security verifies the QR pass at the gate.

## Key Features

Everything listed below is implemented in the current codebase.

**Authentication & Authorization**
* Email + password registration, JWT login, `/me`, profile update, change password
* Forgot/reset password by email link (SHA-256 hashed token, 15-minute expiry)
* JWT-protected routes via `authMiddleware`; role enforcement via `roleMiddleware(...roles)`
* Admin-only account approval: `PENDING → ACTIVE` or `REJECTED`; only `ACTIVE` accounts can log in
* Frontend role-aware `authGuard`, JWT `authInterceptor`, and role-based navigation

**Compound Management**
* Buildings with number, name, floor count, description, image and unit count
* Units with building reference, unit number, floor, type (`APARTMENT` / `VILLA`) and status (`OCCUPIED` / `VACANT`)
* Unique constraint: one building number, and one unit number per building; a unit can have only one resident

**Maintenance Tickets**
* Resident creates a ticket (title, category, description, priority, optional attachment)
* Technician offer flow: create, update, withdraw offers with price, duration and note
* Price negotiation thread per offer with an accept action on one offer
* Assignment to the offering technician, then start / resolve / close
* Skip action so a technician can pass on a job
* Resident review (1–5 rating + comment) that updates the technician's rolling rating
* Chat between resident and technician while the ticket is open, locking on resolve/close

**Invoices & Payments**
* Admin-created invoices for a resident (amount, due date, description, optional unit)
* Optional link to a maintenance ticket (unique + sparse index)
* Statuses `PENDING → PAYMENT_SUBMITTED → PAID`, plus `OVERDUE` and `CANCELLED`
* Resident submits a payment reference; admin confirms payment
* Realtime `INVOICE_*` notifications to the resident, admin and assigned technician
* Resident dashboard "Paid" figure derived from a single service so it cannot drift

**Visitor Access Control**
* Two entry paths: public visitor request, or a resident inviting a visitor directly
* Public visitor request flow targeted at an occupied unit only
* Email OTP (6 digits, bcrypt-hashed, 5-minute expiry, max 5 attempts)
* Resident `approve` / `reject` decision; approval immediately issues the QR pass and visitor chat token
* QR pass is a 32-byte random token (bcrypt-hashed at rest), 30-minute validity
* QR becomes available only **1 hour before** the scheduled visit time
* Security scan → check-in → check-out with a strict state machine
* Automatic expiry sweep for stale pending (OTP) and un-scanned QR visits
* Visitor tracking by request ID + email, and a lookup by email

**Notifications**
* 21 notification types covering visitors, maintenance, offers, chat and invoices
* In-app list, unread count, mark-as-read, mark-all-read, delete
* Pushed live over Socket.IO on the `notification:new` event

**Chat**
* Direct (1:1), group (`COMPOUND` and per `BUILDING`) and visitor conversations
* Message read state, delete-for-me and delete-for-everyone, hide conversation for me
* Real-time delivery over Socket.IO
* Visitor chat authenticated with a `visitorChatToken`, not a JWT (visitors have no account)

**Reports**
* Admin aggregate report and a full compound report (users, buildings, units, maintenance, invoices)
* CSV export builder on the frontend

**Dashboards**
* Role-specific dashboards for Resident, Technician, Admin and Security

---

## User Roles

Four roles, defined identically in `backend/models/user.js` and `frontend/src/app/core/models/status.ts`.

| Role | Purpose | Main modules | Key restrictions |
| ---- | ------- | ------------ | ---------------- |
| `RESIDENT` | Occupant of a unit | Dashboard, Maintenance (create/view/close), Offers (accept), Negotiations, Reviews, Invoices (pay), Visitors (invite/approve), Chat | Must be linked to a unit; can only see its own tickets, invoices and visits; cannot self-register as `ADMIN` |
| `TECHNICIAN` | Contracted to fix maintenance jobs | Dashboard, Available Requests, Assigned Jobs, Offers, Negotiations, Reviews | Requires at least one specialization; direct chat with a resident only when a ticket connects them |
| `SECURITY` | Gate/guard desk operator | Visitor dashboard, Visit list, QR scanner, Check in/out, Access history | Can only scan/check in visits; check-in is refused if the QR was scanned by a different officer |
| `ADMIN` | Compound administrator | Dashboard, Users (approve/reject), Buildings & Units, Maintenance, Visit logs, Invoices, Reports | Created via the admin seed, not by self-registration; all `/api/admin/*` routes require this role |

**Role home routes** (`ROLE_HOME` in `status.ts`):

| Role | Landing route |
| ---- | ------------- |
| `RESIDENT` | `/resident/dashboard` |
| `TECHNICIAN` | `/technician/dashboard` |
| `SECURITY` | `/security/visitors` |
| `ADMIN` | `/admin/dashboard` |

---

## System Architecture

A single backend process serves both the REST API and the Socket.IO server on the same HTTP
server (`index.js`). The Angular app is a separate SPA that talks to the API over HTTP and to
the socket over WebSocket.

```mermaid
flowchart LR
    subgraph Client["Angular SPA (port 4200)"]
        UI[Pages / Components]
        SVC[Feature Services]
        AUTH[AuthService]
        INT[authInterceptor]
        GUARD[authGuard]
        SOCK[ChatSocket]
    end

    subgraph Server["Express + Socket.IO (port 3000)"]
        MW[authMiddleware / roleMiddleware]
        RT[Routers]
        CT[Controllers]
        SVR[Services]
        IO[chatSocket]
        NOTIF[notificationService]
    end

    DB[(MongoDB)]
    MAIL[Gmail via nodemailer]

    UI --> SVC
    SVC --> INT
    INT -->|Bearer JWT| MW
    GUARD --> UI
    AUTH --> UI
    MW --> RT --> CT --> SVR
    SVR --> DB
    SVR --> MAIL
    CT --> NOTIF
    NOTIF --> IO
    SOCK <-->|WebSocket| IO
    SVR --> IO
```

**Request path.** HTTP request → `authMiddleware` (verify JWT, load the user, require `ACTIVE`)
→ `roleMiddleware(...roles)` (role check) → controller → service → Mongoose model → MongoDB.
The controller shapes the HTTP response; the service owns the business rules.

**Real-time path.** `notificationService.createNotification()` persists a `Notification` and,
if the socket server is registered, emits `notification:new` to the room `user:<userId>`.
`notifyRole()` fans the same event out to every `ACTIVE` user with a given role.

---

## Technology Stack

Versions are taken from the committed `package.json` files.

### Backend (root)

| Technology | Version | Purpose |
| ---------- | ------- | ------- |
| Node.js | CommonJS (`"type": "commonjs"`) | Runtime |
| Express | `^5.2.1` | HTTP server and routing |
| Mongoose | `^9.9.4` | MongoDB ODM, schemas, indexes |
| MongoDB | — | Primary datastore (`DB_URI`) |
| Socket.IO | `^4.8.3` | Realtime transport (server) |
| jsonwebtoken | `^9.0.3` | JWT issuing and verification |
| bcrypt | `^6.0.0` | Password hashing; also OTP and QR token hashing |
| nodemailer | `^10.0.10` | Transactional email (Gmail service) |
| multer | `^2.4.0` | Multipart uploads for profile images and attachments |
| cors | `^2.8.6` | CORS for the Angular dev origin |
| dotenv | `^17.4.2` | Loads `.env` |

### Frontend (`frontend/`)

| Technology | Version | Purpose |
| ---------- | ------- | ------- |
| Angular | `^21.2.0` | SPA framework (standalone components) |
| TypeScript | `~5.9.2` | Language |
| RxJS | `~7.8.0` | Reactive HTTP/socket streams |
| socket.io-client | `^4.8.3` | Realtime client |
| jsqr | `^1.4.0` | Decodes the QR image from the camera stream in the browser |
| qrcode | `^1.5.4` | Renders the visitor QR pass image |
| Vitest | `^4.0.8` | Unit test runner |
| jsdom | `^28.0.0` | DOM environment for tests |
| @angular/build + @angular/cli | `^21.2.23` | Build and dev server |

### Supporting

| Technology | Purpose |
| ---------- | ------- |
| `node:test` + `node:assert/strict` | Backend test suite |
| Bootstrap 5.3.3 (CDN) | Base styling in `index.html` |
| Font Awesome 6.5.2 (CDN) | Icons |
| Google Fonts (Inter, Manrope, Material Symbols) | Typography and icons |

---

## Project structure

```
CivicSync/
├── index.js                # Backend entry point (Express + Socket.IO)
├── package.json            # Root scripts (start / seed / test)
├── .env                    # Environment variables (DB_URI, JWT_SECRET, EMAIL_*)
├── backend/                # Backend source
│   ├── config/             # DB connection
│   ├── controllers/        # HTTP layer
│   ├── services/           # Business logic
│   ├── models/             # Mongoose schemas
│   ├── routes/             # Express routers
│   ├── middleware/         # auth + role guards
│   ├── socket/             # Socket.IO handlers
│   ├── seed/               # adminSeed.js + demoSeed.js
│   ├── tests/              # npm test suite (*.test.js)
│   │   └── manual/         # hand-run socket / API probes (not part of npm test)
│   └── utils/              # statusConstants.js (single status vocabulary)
└── frontend/               # Angular application (single, unified frontend)
    └── src/
        ├── environments/   # runtime config (apiUrl, uploadUrl)
        ├── types/          # ambient module declarations (qrcode)
        └── app/
            ├── core/       # app-wide singletons — the ONLY home for shared logic
            │   ├── guards/         # auth-guard.ts (role aware)
            │   ├── interceptors/   # auth interceptor (JWT)
            │   ├── layout/         # authenticated shell + navigation map
            │   ├── models/         # status.ts (mirrors backend statusConstants)
            │   ├── services/       # auth, notification, chat-socket, theme, token-storage
            │   └── utils/          # filters, report-export, realtime-refresh
            ├── Models/     # feature DTO interfaces (maintenance, offers, reviews…)
            ├── Services/   # feature API clients that need the DTOs above
            ├── shared/     # presentational components (chart, dialog, avatar…)
            └── Components/ # feature screens, grouped by audience
                ├── admin/          # admin sub-pages + shared admin stylesheet
                ├── Residant/       # resident maintenance screens
                ├── Technician/     # technician screens
                ├── VisitorAccess/
                │   ├── layout/     # topbar
                │   ├── pages/
                │   │   ├── public/   # no account needed (request, OTP, QR, chat)
                │   │   ├── resident/ # resident-facing visitor screens
                │   │   └── security/ # guard-desk screens (scanner, check-in/out)
                │   └── services/   # visitor-flow + visit-status.util
                └── shared/         # cross-role components (notifications, toast)
```

### Where does a new file go?

| You are adding… | Put it in… |
| --------------- | ---------- |
| A singleton service, guard, interceptor or util used app-wide | `frontend/src/app/core/` |
| A DTO / response interface for one feature | `frontend/src/app/Models/` |
| An HTTP client for one feature | `frontend/src/app/Services/` |
| A reusable presentational component | `frontend/src/app/shared/components/` |
| A visitor/security screen | `frontend/src/app/Components/VisitorAccess/pages/<audience>/` |
| A manually run debug script | `backend/tests/manual/` |

`core/` is the single home for anything shared — there is no second copy of a
service, model, guard or theme, so "which one is real?" never comes up.

## Prerequisites

| Requirement | Notes |
| ----------- | ----- |
| Node.js | Required for both backend and frontend. Verify with `node --version`. |
| npm | Ships with Node. The frontend pins `npm@11.6.2` via `packageManager`. |
| MongoDB | A reachable MongoDB instance. The connection string comes from `DB_URI`. |
| A Gmail account with an app password | For OTP, visitor and password-reset emails (`EMAIL_USER`, `EMAIL_APP_PASSWORD`). Without it, email sends fail but the API still responds. |

Angular CLI and Git are **not** required: the CLI is a local dev dependency invoked through
`npm start` / `npm run build`, and you can download the project as an archive instead of cloning.

---

## Installation & Setup

### 1. Clone the repository

```bash
git clone <your-repository-url>
cd CivicSync
```

### 2. Install backend dependencies

```bash
npm install
```

### 3. Configure environment variables

Create a `.env` file in the project root. See
[Environment Variables](#environment-variables) for the full list.

### 4. Configure the database

Point `DB_URI` at your MongoDB instance and make sure it is reachable.

### 5. Seed and start the backend

```bash
npm run seed:admin     # creates the admin account from ADMIN_EMAIL / ADMIN_PASSWORD
npm run seed:demo      # optional: demo buildings, units, residents, security
npm start              # http://localhost:3000
```

### 6. Start the frontend

```bash
cd frontend
npm install
npm start              # http://localhost:4200
```

The frontend expects the backend at `http://localhost:3000/api`
(see `frontend/src/environments/environment.ts`).

### 7. Run the tests

```bash
npm test                 # backend tests, from the project root
cd frontend && npm test  # frontend tests
```

---

## Environment Variables

All variables are read from the process environment. `dotenv` loads `.env` in the project root.
**Never commit real values.**

| Name | Required | Purpose | Example |
| ---- | -------- | ------- | ------- |
| `DB_URI` | Yes | MongoDB connection string used by `connectDB()` and both seeds | `mongodb+srv://user:pass@cluster/civicsync` |
| `JWT_SECRET` | Yes | Signs and verifies login JWTs (and socket tokens) | `YOUR_JWT_SECRET_HERE` |
| `EMAIL_USER` | Yes | Gmail address used as the `from` and SMTP user | `you@example.com` |
| `EMAIL_APP_PASSWORD` | Yes | Gmail app password for SMTP | `YOUR_APP_PASSWORD_HERE` |
| `ADMIN_EMAIL` | For `seed:admin` | Email of the admin account to create | `admin@example.com` |
| `ADMIN_PASSWORD` | For `seed:admin` | Password of the admin account (min 8 characters) | `YOUR_ADMIN_PASSWORD_HERE` |
| `PORT` | No | Backend port; defaults to `3000` | `3000` |
| `FRONTEND_URL` | No | CORS origin **and** the base URL used in emailed links; defaults to `http://localhost:4200` | `http://localhost:4200` |

---

## API Overview

All routes are mounted in `index.js` under `/api`. Every module except the public visitor
endpoints and `GET /api/units/available` requires a `Bearer` JWT.

| Module | Base path | Auth | Purpose |
| ------ | --------- | ---- | ------- |
| Auth | `/api/auth` | Mixed | Register, login, `/me`, profile, password reset/change |
| Units | `/api/units` | Public | List available (vacant) units |
| Visits | `/api/visits` | Mixed | Visitor requests, OTP, QR, scan, check-in/out, resident and security views |
| Chat | `/api/chat` | Mixed | Conversations, messages, read state, deletion, visitor threads |
| Notifications | `/api/notifications` | JWT | List, mark read, mark all read, delete |
| Uploads | `/api/uploads` | JWT | Profile image, ticket attachment |
| Resident | `/api/resident` | `RESIDENT` | Dashboard, invoices, tickets, offers, negotiations, reviews |
| Technician | `/api/technician` | `TECHNICIAN` | Dashboard, available/assigned tickets, offers, reviews |
| Admin | `/api/admin` | `ADMIN` | Users, buildings, units, invoices, maintenance, visits, dashboard, reports |

A full endpoint reference is in [`DOCUMENTATION.md`](./DOCUMENTATION.md#9-complete-api-documentation).

---

## Authentication & Authorization

**Registration.** `POST /api/auth/register` accepts `name`, `email`, `phone`, `password`,
`role` and — depending on the role — `unitId` (residents) or `specializations[]` (technicians).
`ADMIN` cannot self-register. Residents must claim a `VACANT` unit, and a unit can hold only
one resident (enforced by a unique sparse index on `User.unitId` and re-checked in the service).
New accounts are created with status `PENDING`.

**Login.** `POST /api/auth/login` verifies the password with bcrypt and rejects any account
that is not `ACTIVE`. It returns a JWT signed with `JWT_SECRET` containing
`{ userId, role }` and expiring after **1 day**, plus the user object. `lastLoginAt` is updated.

**Token handling (frontend).** `token-storage.ts` keeps the JWT in `localStorage` under
`token` and the cached user under `user`. `authInterceptor` attaches
`Authorization: Bearer <token>` to every outgoing request. `AuthService` exposes the user as an
Angular signal and `initializeSession()` calls `/me` on startup, logging out on failure.

**Guards and protected routes.** `authGuard` runs on every authenticated route: it redirects to
`/login` when there is no token or user, to `/login?reason=inactive` when the account is not
`ACTIVE`, and to `/access-denied` when `route.data.roles` does not include the user's role.

**Backend enforcement.** `authMiddleware` requires a `Bearer` token, verifies it, loads the
user, rejects anything other than `ACTIVE`, and attaches `req.user = { userId, role }`.
`roleMiddleware(...allowedRoles)` then compares `req.user.role`. Both are applied per route.

---

## Real-Time Communication

One Socket.IO server is attached to the same HTTP server in `index.js`. The client is a single
service, `frontend/src/app/core/services/chat-socket.ts`.

**Authentication.** During the handshake, `chatSocket.js` picks one of two modes:
* `auth.token` (JWT) → verified, then `socket.authType = "USER"`; the socket joins the room `user:<userId>`.
* `auth.visitorChatToken` + `auth.visitId` → verified against the visit; `socket.authType = "VISITOR"`.

**Incoming events (client → server):** `conversation:join`, `conversation:leave`, `message:send`,
`visitor:message:send`, `conversation:read`, `message:delete:me`, `message:delete:everyone`,
`conversation:delete:me`.

**Outgoing events (server → client):** `notification:new`, `message:new`, `messages:read`,
`message:deleted`, `message:deletedForMe`, `conversation:joined`, `conversation:left`,
`conversation:deleted`, `chat:error`.

> **Subscribing to a notification `type` as if it were a socket event does nothing.**
> Listen on `notification:new` and filter by `payload.type`.

---

## Database

MongoDB accessed through Mongoose. Twelve models live in `backend/models/`:

| Model | Collection | Purpose |
| ----- | ---------- | ------- |
| `User` | `users` | Accounts for all four roles |
| `Building` | `buildings` | Compound buildings |
| `Unit` | `units` | Units inside buildings |
| `Visit` | `visits` | Visitor requests, invites, OTP and QR state |
| `MaintenanceTicket` | `maintenancetickets` | Maintenance jobs |
| `Offer` | `offers` | Technician quotes on a ticket |
| `Negotiation` | `negotiations` | Price counter-offers on an offer |
| `Review` | `reviews` | Resident rating of a resolved job |
| `Invoice` | `invoices` | Resident billing |
| `Notification` | `notifications` | Per-user notifications |
| `Conversation` | `conversations` | Chat threads (direct/group/visitor) |
| `Message` | `messages` | Chat messages |

**Core relationships.** `Unit → Building`; `User → Unit` (resident, unique); `Visit → User (resident)`,
`Building`, `Unit`, and security officers; `MaintenanceTicket → User (resident, assigned technician)`;
`Offer → MaintenanceTicket + User (technician)`; `Negotiation → Offer`; `Review → MaintenanceTicket + Users`;
`Invoice → User (resident)` and optionally `MaintenanceTicket` and `Unit`;
`Conversation → User[] participants` and optionally `Visit`; `Message → Conversation` (+ `User` sender).

**Key enums.** Roles `RESIDENT | SECURITY | TECHNICIAN | ADMIN`; user status
`PENDING | ACTIVE | REJECTED`; ticket status `OPEN | ASSIGNED | IN_PROGRESS | RESOLVED | CLOSED`;
visit status `PENDING | APPROVED | REJECTED | QR_GENERATED | QR_SCANNED | CHECKED_IN | CHECKED_OUT | EXPIRED`;
invoice status `PENDING | PAYMENT_SUBMITTED | PAID | OVERDUE | CANCELLED`.

Full field-level schema documentation is in
[`DOCUMENTATION.md`](./DOCUMENTATION.md#6-database-documentation).

---

## Main Workflows

### Visitor access (public request)

```mermaid
stateDiagram-v2
    [*] --> PENDING: visitor submits request
    PENDING --> APPROVED: resident approves (issues QR + chat token)
    PENDING --> REJECTED: resident rejects
    PENDING --> EXPIRED: OTP window lapses (sweep)
    APPROVED --> QR_GENERATED: QR issued
    QR_GENERATED --> QR_SCANNED: security scans
    QR_GENERATED --> EXPIRED: QR window lapses (sweep)
    QR_SCANNED --> CHECKED_IN: security checks in
    CHECKED_IN --> CHECKED_OUT: security checks out
    CHECKED_OUT --> [*]
```

1. **Visitor request** — a visitor submits a request (`/visitor-request`) against an occupied unit.
2. **Email OTP** — an OTP is emailed; the visitor verifies it (`/otp-verification`). 6 digits, 5-minute expiry, max 5 attempts.
3. **Resident decision** — the resident reviews it (`/resident/visitors`) and approves or rejects.
   A rejection moves the record to `REJECTED`; approval sets `APPROVED` and immediately issues the
   QR pass and visitor chat token (the response reports `QR_GENERATED`).
4. **Status + QR** — the visitor tracks progress (`/visitor-request-status`) and shows the pass
   (`/qr-code-display`). The QR only unlocks 1 hour before the scheduled visit time.
5. **Security scan** — security uses the in-browser camera scanner (`/security/visitors/scanner`);
   the code is decoded with jsQR and verified via `POST /api/visits/scan`.
6. **Check-in / check-out** — security confirms entry/exit (`/security/visitors/check-in-out`).

The **resident-invite** flow (a resident inviting a visitor directly) creates the visit already
`APPROVED` and runs through the same state machine.

### Maintenance ticket lifecycle

```mermaid
stateDiagram-v2
    [*] --> OPEN: resident creates ticket
    OPEN --> ASSIGNED: resident accepts a technician offer
    ASSIGNED --> IN_PROGRESS: technician starts
    ASSIGNED --> OPEN: technician skips
    IN_PROGRESS --> RESOLVED: technician resolves
    RESOLVED --> CLOSED: resident closes (+ optional review)
    CLOSED --> [*]
```

Transitions are enforced by `TICKET_TRANSITIONS` / `assertTicketTransition()` in
`backend/utils/statusConstants.js`. A ticket is `OPEN` when created; technicians submit offers;
the resident accepts one, which assigns the technician and moves the ticket to `ASSIGNED`. The
technician starts it (`IN_PROGRESS`) and resolves it (`RESOLVED`); the resident then closes it
(`CLOSED`) and may leave a review. Chat locks once the ticket is `RESOLVED` or `CLOSED`.

### Invoice lifecycle

```mermaid
stateDiagram-v2
    [*] --> PENDING: admin creates invoice
    PENDING --> PAYMENT_SUBMITTED: resident submits a payment reference
    PAYMENT_SUBMITTED --> PAID: admin confirms payment
    PENDING --> OVERDUE: due date passes
    PENDING --> CANCELLED: admin cancels
    PAYMENT_SUBMITTED --> CANCELLED: admin cancels
    PAID --> [*]
    CANCELLED --> [*]
```

---

## Testing

| Layer | Framework | Command | Scope |
| ----- | --------- | ------- | ----- |
| Backend | `node:test` + `node:assert/strict` | `npm test` (project root) | `backend/tests/**/*.test.js` |
| Frontend | Vitest (via `ng test`) | `npm test` (in `frontend/`) | `src/**/*.spec.ts` |

Backend tests cover the route surface, the ticket and visit state machines, status predicates,
billing arithmetic and validation rules. They do not require a database.

`backend/tests/manual/` holds hand-run probes (socket clients, API probes) that are **not**
part of `npm test` and talk to a running backend.

---

## Development

| Purpose | Command |
| ------- | ------- |
| Run the backend | `npm start` |
| Run the backend with watch | `npm run dev` |
| Seed the admin account | `npm run seed:admin` |
| Seed demo compound data | `npm run seed:demo` |
| Backend tests | `npm test` |
| Frontend dev server | `cd frontend && npm start` |
| Frontend production build | `cd frontend && npm run build` |
| Frontend tests | `cd frontend && npm test` |

Demo accounts created by `npm run seed:demo` (password `Password123`):

| Role | Email |
| ---- | ----- |
| Resident | `resident@compound.com` |
| Resident | `resident2@compound.com` |
| Security | `security@compound.com` |
| Admin | the value of `ADMIN_EMAIL` (created by `seed:admin`) |

---

## Known Limitations

Verified from the current codebase.

* **No automated end-to-end suite.** Tests cover routes, state machines and pure logic; no browser or full-stack integration tests are committed.
* **Email depends on Gmail + an app password.** `emailService.js` uses `nodemailer` with `service: "gmail"`. Email failures are caught and logged, so a request can succeed even when the email never arrives.
* **No refresh-token rotation or server-side revocation.** A JWT is valid for its full 1-day lifetime; logout only clears client storage.
* **QR verification is O(active visits).** `scanVisitQr` iterates every `QR_GENERATED` unexpired visit and `bcrypt.compare`s each one, because only the token hash is stored.
* **Admin accounts are seed-only.** There is no in-app way to create an additional admin.
* **`InvoiceStatus` on the frontend omits `PAYMENT_SUBMITTED`.** The backend model and `statusConstants.js` include it, but the frontend enum in `core/models/status.ts` lists only `PENDING | PAID | OVERDUE | CANCELLED`.
* **No pagination on most list endpoints.** Notifications are capped at 100 and visitor lookup at 25, but other lists return all matching documents.
* **Uploads are stored on local disk.** `multer` writes to `backend/uploads/`, which is gitignored and recreated on demand.

---

## Future Improvements

Proposals only — none of these exist today.

* Add refresh tokens or short-lived tokens with server-side revocation.
* Introduce an email provider abstraction so SMTP is swappable.
* Paginate and filter large admin lists (users, visits, invoices).
* Add an end-to-end test layer (for example Playwright) for the visitor access flow.
* Add an admin UI to promote users to `ADMIN` instead of seeding.
* Index or otherwise speed up QR lookup so scanning does not hash-compare every active visit.
* Align the frontend `InvoiceStatus` enum with the backend `PAYMENT_SUBMITTED` state.
* Serve uploaded files from object storage with signed URLs rather than the local `uploads/` folder.

---

## Contributors

Contribution split is documented in [`TASKS.md`](./TASKS.md). The contributors named there are:
**جمال**, **مينا**, **احمد ماهر**, **سما** and **نيرة**.

---

## License

This project is licensed under the **MIT License**. See [`LICENSE`](./LICENSE).

Copyright (c) 2026 Mostafa_Tarek