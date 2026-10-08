# CivicSync — Technical Documentation

Complete technical reference for developers, maintainers and reviewers.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Complete Project Structure](#2-complete-project-structure)
3. [Technology Stack](#3-technology-stack)
4. [System Architecture](#4-system-architecture)
5. [Request / Response Flow](#5-request--response-flow)
6. [Database Documentation](#6-database-documentation)
7. [Authentication](#7-authentication)
8. [Authorization & RBAC](#8-authorization--rbac)
9. [Complete API Documentation](#9-complete-api-documentation)
10. [Backend Modules](#10-backend-modules)
11. [Frontend Architecture](#11-frontend-architecture)
12. [Real-Time / Socket.IO](#12-real-time--socketio)
13. [Chat System](#13-chat-system)
14. [Visitor Management](#14-visitor-management)
15. [Maintenance / Ticket System](#15-maintenance--ticket-system)
16. [Invoice System](#16-invoice-system)
17. [Notifications](#17-notifications)
18. [Email Services](#18-email-services)
19. [User / Unit / Building Management](#19-user--unit--building-management)
20. [Admin System](#20-admin-system)
21. [Security](#21-security)
22. [Error Handling](#22-error-handling)
23. [Testing](#23-testing)
24. [Development Commands](#24-development-commands)
25. [Environment Configuration](#25-environment-configuration)
26. [Configuration](#26-configuration)
27. [Troubleshooting](#27-troubleshooting)
28. [Architectural Strengths](#28-architectural-strengths)
29. [Known Limitations](#29-known-limitations)
30. [Future Extension Guide](#30-future-extension-guide)
31. [Maintenance Guidelines](#31-maintenance-guidelines)

---

## 1. PROJECT OVERVIEW

### Purpose

CivicSync is a Smart Compound Management System: a full-stack web application for
managing the day-to-day operations of a residential compound. It covers four
audiences — residents, maintenance technicians, security staff and administrators
— in a single Angular application backed by one Express/MongoDB API.

### Scope

The implemented scope covers:

- Account registration and admin approval workflow
- Compound structure management (buildings, units, occupancy)
- Visitor access control end to end (request → OTP → resident approval → QR pass
  → security scan → check-in → check-out)
- Maintenance ticketing with technician offers and price negotiation
- Invoicing and resident payment submission
- Real-time chat (direct, compound/building groups, visitor threads)
- Notifications (persisted + pushed over Socket.IO)
- Reporting and dashboard aggregation

### Domain / Problem

A compound needs one system of record for who lives where, who may enter, what
work is outstanding, and what is owed. CivicSync models each of these as a
MongoDB collection with a defined lifecycle, and enforces the lifecycle rules in
a service layer rather than in the controllers.

### Target Users

| Audience | Description |
| -------- | ----------- |
| Resident | Lives in a unit; raises maintenance tickets, invites/approves visitors, views and pays invoices |
| Technician | Receives maintenance work; submits offers, negotiates, progresses and resolves jobs, receives reviews |
| Security | Guard desk; scans visitor QR passes and confirms check-in/check-out |
| Administrator | Approves accounts, manages buildings/units, creates invoices, oversees maintenance and visits, reads reports |
| Visitor | No account; submits a request, verifies an emailed OTP, presents a QR pass, may chat with the host |

### Core Concepts

- **Role** — one of `RESIDENT`, `TECHNICIAN`, `SECURITY`, `ADMIN`.
- **Account status** — `PENDING`, `ACTIVE`, `REJECTED`. Only `ACTIVE` accounts can
  log in or hold a valid session.
- **Unit occupancy** — a unit is `VACANT` or `OCCUPIED`; a resident account
  claims exactly one unit (enforced by a unique sparse index on `User.unitId`).
- **Visit state machine** — `PENDING → APPROVED → QR_GENERATED → QR_SCANNED →
  CHECKED_IN → CHECKED_OUT`, with `REJECTED` and `EXPIRED` as terminal exits.
- **Ticket state machine** — `OPEN → ASSIGNED → IN_PROGRESS → RESOLVED →
  CLOSED`, with `ASSIGNED → OPEN` allowed (technician skips the job).
- **Offer / Negotiation** — a technician bids on an open ticket; the resident and
  technician exchange price proposals before the resident accepts.
- **Status vocabulary** — a single frozen set of enums in
  `backend/utils/statusConstants.js`, mirrored on the frontend in
  `frontend/src/app/core/models/status.ts`.

### Major Modules

| Module | Backend | Frontend |
| ------ | ------- | -------- |
| Auth | `routes/authRoutes.js` | `Components/login-page`, `register-*`, `forgot-password-page`, `reset-password-page` |
| Users / Compound | `routes/adminRoutes.js` | `Components/admin/users`, `Components/admin/compound` |
| Units | `routes/unitRoutes.js` | `Components/register-details-page` |
| Maintenance | `routes/residentRoutes.js`, `routes/technicianRoutes.js` | `Components/Residant`, `Components/Technician` |
| Visitors / Security | `routes/visitRoutes.js` | `Components/VisitorAccess` |
| Invoices | `routes/adminRoutes.js`, `routes/residentRoutes.js` | `Components/admin/invoices`, `Components/Residant/resident-invoices`, `shared/invoice` |
| Chat | `routes/chatRoutes.js` + `socket/chatSocket.js` | `Components/chat` |
| Notifications | `routes/notificationRoutes.js` | `Components/shared/notifications` |
| Uploads | `routes/uploadRoutes.js` | `core/services/auth.service.ts` (avatar), ticket attachment |

### Architecture Overview

A single-page Angular application talks to a stateless Express REST API and to a
Socket.IO endpoint on the same HTTP server. MongoDB is the only datastore; there
is no cache or message broker. Email is sent through Gmail SMTP via nodemailer.

---

## 2. COMPLETE PROJECT STRUCTURE

```
CivicSync/
├── index.js                    Express + Socket.IO bootstrap
├── package.json                Root scripts and backend dependencies
├── README.md                   Public-facing overview
├── DOCUMENTATION.md            This file
├── TASKS.md                    Team task division
├── LICENSE                     MIT
├── .gitignore                  node_modules, .env, backend/uploads, dist, .angular
├── backend/
│   ├── config/db.js            Mongoose connection
│   ├── controllers/            HTTP layer: parse request, call service, shape response
│   ├── services/               Business logic and lifecycle rules
│   ├── models/                 Mongoose schemas (12)
│   ├── routes/                 Express routers (9)
│   ├── middleware/             authMiddleware, roleMiddleware, uploadMiddleware
│   ├── socket/chatSocket.js    Socket.IO authentication and event handlers
│   ├── seed/                   adminSeed.js, demoSeed.js
│   ├── tests/                  node:test suites (*.test.js)
│   │   └── manual/             Hand-run probes (not part of `npm test`)
│   └── utils/statusConstants.js  Single status vocabulary
└── frontend/
    ├── angular.json            Build/serve/test targets
    ├── package.json            Angular + Vitest dependencies
    └── src/
        ├── index.html          Bootstrap 5, Font Awesome, Material Symbols, Inter/Manrope
        ├── styles.css          Global styles incl. the @media print receipt isolation
        ├── environments/       environment.ts (apiBaseUrl, apiUrl, resolveUploadUrl)
        ├── types/qrcode.d.ts   Ambient declaration for the `qrcode` package
        └── app/
            ├── app.config.ts   Providers: router, httpClient + authInterceptor, zoneless CD
            ├── app.routes.ts   All routes (lazy `loadComponent`)
            ├── core/           App-wide singletons
            │   ├── guards/auth-guard.ts
            │   ├── interceptors/auth-interceptor.ts
            │   ├── layout/authenticated-layout/  (shell + nav-items.ts)
            │   ├── models/status.ts              (mirrors backend statusConstants)
            │   ├── services/                     auth, notification, chat-socket, token-storage, theme
            │   └── utils/                        filters, report-export, realtime-refresh, print
            ├── Models/         Feature DTO interfaces
            ├── Services/       Feature HTTP clients
            ├── shared/         Presentational components (chart, dialog, avatar, invoice, access-denied, not-found)
            └── Components/     Feature screens by audience
                ├── admin/
                ├── Residant/
                ├── Technician/
                ├── VisitorAccess/  (layout, pages/{public,resident,security}, services)
                └── shared/
```

### Directory Responsibilities

| Directory | Responsibility | Depends on |
| --------- | -------------- | ---------- |
| `backend/routes` | Map HTTP verbs + paths to middleware chains and controllers | controllers, middleware |
| `backend/controllers` | Translate HTTP ↔ service calls; set status codes | services |
| `backend/services` | All business rules, lifecycle transitions, DB queries | models, utils, other services |
| `backend/models` | Schema definition, validation, indexes, hooks | mongoose |
| `backend/middleware` | Cross-cutting request concerns (auth, role, upload) | models |
| `backend/socket` | Socket.IO auth + realtime event handlers | services, models |
| `frontend/src/app/core` | The single home for shared logic (guards, interceptors, singleton services, utils) | Angular, environments |
| `frontend/src/app/Services` | One HTTP client per feature | core, Models |
| `frontend/src/app/Models` | DTO/response interfaces for one feature | — |
| `frontend/src/app/shared` | Reusable presentational components | core |
| `frontend/src/app/Components` | Feature screens grouped by audience | Services, Models, shared, core |

---

## 3. TECHNOLOGY STACK

### Backend

| Technology | Version (package.json) | Purpose |
| ---------- | ---------------------- | ------- |
| Node.js | Runtime (CommonJS, `"type": "commonjs"`) | Server runtime |
| Express | `^5.2.1` | HTTP API framework |
| Mongoose | `^9.9.4` | MongoDB ODM |
| Socket.IO | `^4.8.3` | Realtime transport |
| socket.io-client | `^4.8.3` | Present as a root dependency (used by manual probe scripts) |
| jsonwebtoken | `^9.0.3` | JWT signing/verification |
| bcrypt | `^6.0.0` | Password and OTP/QR hash comparison |
| nodemailer | `^10.0.10` | Transactional email (Gmail) |
| multer | `^2.4.0` | Multipart upload handling |
| cors | `^2.8.6` | CORS for the API and Socket.IO |
| dotenv | `^17.4.2` | Environment loading |

### Frontend

| Technology | Version (package.json) | Purpose |
| ---------- | ---------------------- | ------- |
| Angular | `^21.2.0` (core/common/compiler/forms/platform-browser/router) | SPA framework |
| Angular CLI / build | `^21.2.23` | Build, dev server, test runner |
| TypeScript | `~5.9.2` | Language |
| RxJS | `~7.8.0` | Reactive HTTP and state flows |
| socket.io-client | `^4.8.3` | Realtime client |
| qrcode | `^1.5.4` | Renders the visitor QR pass |
| jsqr | `^1.4.0` | Decodes QR codes from the camera in the security scanner |
| Bootstrap | 5.3.3 (CDN in `index.html`) | Layout/utilities |
| Font Awesome | 6.5.2 (CDN) | Icons |
| Material Symbols | Google Fonts (CDN) | Icons |
| Inter / Manrope | Google Fonts (CDN) | Typography |

### Testing

| Technology | Version | Purpose |
| ---------- | ------- | ------- |
| `node:test` | Node built-in | Backend test suite (`node --test`) |
| Vitest | `^4.0.8` | Frontend unit tests |
| jsdom | `^28.0.0` | DOM environment for frontend tests |

### Supporting

| Technology | Purpose |
| ---------- | ------- |
| MongoDB | Only datastore |
| Gmail SMTP | Email delivery (OTP, password reset, visitor notifications) |
| `@angular/build:unit-test` | Angular test builder (configured in `angular.json`) |

---

## 4. SYSTEM ARCHITECTURE

```mermaid
flowchart TB
    subgraph Browser["Browser (Angular SPA)"]
        UI["Components / Pages"]
        SVC["Feature Services"]
        CORE["core: AuthService, ChatSocket,<br/>NotificationService, token-storage"]
        GUARD["authGuard"]
        INT["authInterceptor"]
    end

    subgraph Server["Node process (index.js)"]
        EXP["Express app"]
        ROUTES["Routers"]
        AUTHMW["authMiddleware"]
        ROLEMW["roleMiddleware"]
        CTRL["Controllers"]
        SERVICES["Services"]
        MODELS["Mongoose models"]
        IO["Socket.IO server"]
    end

    DB[("MongoDB")]
    SMTP["Gmail SMTP"]

    UI --> GUARD --> SVC
    SVC --> INT --> EXP
    CORE --> INT
    EXP --> ROUTES --> AUTHMW --> ROLEMW --> CTRL --> SERVICES --> MODELS --> DB
    SERVICES --> SMTP
    CORE <-->|"websocket"| IO
    IO --> SERVICES
    SERVICES -->|"notification:new"| IO
```

### Layers

| Layer | Responsibility |
| ----- | -------------- |
| Angular components | Render state, capture input, call services |
| Angular services | Own HTTP calls and client-side state (signals) |
| `authInterceptor` | Adds `Authorization: Bearer <token>` to every outgoing request |
| `authGuard` | Blocks routes when unauthenticated/inactive/wrong role |
| Express routers | Path + method → middleware chain → controller |
| `authMiddleware` | Verifies JWT, loads the user, rejects non-`ACTIVE` accounts |
| `roleMiddleware` | Allows only the listed roles |
| Controllers | Shape the HTTP response; delegate all logic |
| Services | Business rules, transitions, aggregation |
| Models | Persistence, validation, indexes |
| Socket.IO | Authenticated realtime channel for chat and notifications |

### Frontend

Angular 21 with **zoneless change detection**
(`provideZonelessChangeDetection()` in `app.config.ts`). State is held in Angular
**signals** inside services (e.g. `AuthService.user`, `NotificationService.unreadCount`).
Routing is fully lazy via `loadComponent`.

### Backend

Express 5 with a strict route → controller → service → model chain. `index.js`
mounts nine routers under `/api/*`, serves `backend/uploads` statically, creates
the Socket.IO server on the same HTTP server, and starts a 60-second interval that
calls `visitService.expireStaleVisits()`.

### Database

A single MongoDB database accessed through Mongoose. Twelve collections, all with
`timestamps: true` unless noted.

### REST API

JSON over HTTP. Success responses follow `{ success: true, message, data }`;
error responses follow `{ success: false, message }`.

### Authentication

JWT (HS256, `1d` expiry) carrying `{ userId, role }`, signed with `JWT_SECRET`.
Sent as `Authorization: Bearer <token>`. Visitors never hold a JWT; they use a
separate opaque `visitorChatToken`.

### Authorization

`authMiddleware` (authentication + `ACTIVE` check) composed with
`roleMiddleware(...roles)` per route, plus route-level `data: { roles: [...] }`
in Angular for the UI side.

### Real-Time Communication

One Socket.IO connection per client. The handshake carries either a JWT
(`auth.token`) for users or `auth.visitId` + `auth.visitorChatToken` for visitors.
Users are auto-joined to `user:<userId>`; conversation rooms are joined explicitly.

### Email

nodemailer with the `gmail` service, authenticated by `EMAIL_USER` /
`EMAIL_APP_PASSWORD`. Three senders: OTP, password reset, visitor request/invite.

### External Integrations

Gmail SMTP is the only third-party integration. There is no payment gateway — the
resident "pay" action records a payment submission, it does not move money.

---

## 5. REQUEST / RESPONSE FLOW

### Authenticated API request

```
Angular component
  → feature Service (HttpClient)
    → authInterceptor (adds Bearer token)
      → Express router (path + method match)
        → authMiddleware (verify JWT → load user → require status ACTIVE)
          → roleMiddleware(...allowed) (role check)
            → controller (parse input, call service)
              → service (business rules, lifecycle guards)
                → Mongoose model (validation, index, hooks)
                  → MongoDB
                ← document(s)
              ← domain result / thrown Error with statusCode
            ← res.json({ success, message, data })
        ← JSON response
    ← Observable emits
  ← component updates its signal-backed view
```

### Public visitor request (no token)

```
Angular (public page)
  → POST /api/visits/visitor-requests
    → visitController.createVisitorRequest
      → visitService.createVisitorRequest
        → validate building + unit (unit must be OCCUPIED)
        → resolve the ACTIVE resident of that unit
        → Visit.create({ source: "VISITOR_REQUEST", status: "PENDING" })
        → notificationService.createNotification(resident)
        → emailService.sendVisitorRequestEmail(...)
      ← { visitId, status, message }
```

### Realtime notification push

```
service calls notificationService.createNotification({ userId, type, ... })
  → Notification.create(...)
  → socketServer.to(`user:${userId}`).emit("notification:new", notification)
    → ChatSocket.on('notification:new') in the browser
      → screen filters by payload.type and reloads its data
```

---

## 6. DATABASE DOCUMENTATION

Twelve Mongoose models. All schemas use `{ timestamps: true }`, so every document
has `createdAt` and `updatedAt` unless stated otherwise.

### 6.1 User (`users`)

| Field | Type | Required | Default | Enum | Notes |
| ----- | ---- | -------- | ------- | ---- | ----- |
| `name` | String | yes | — | — | trim, 2–100 chars |
| `email` | String | yes | — | — | unique, lowercase, trim |
| `phone` | String | no | `null` | — | trim |
| `password` | String | yes | — | — | min 8, `select: false` |
| `role` | String | yes | — | `RESIDENT`, `SECURITY`, `TECHNICIAN`, `ADMIN` | — |
| `status` | String | no | `PENDING` | `PENDING`, `ACTIVE`, `REJECTED` | — |
| `profileImage` | String | no | `null` | — | URL path |
| `unitId` | ObjectId → `Unit` | no | `null` | — | unique **sparse** index |
| `specializations` | [String] | no | `[]` | `PLUMBING`, `ELECTRICITY`, `ELEVATOR`, `AC`, `GENERAL` | technicians |
| `rating` | Number | no | `0` | — | min 0, max 5 |
| `totalReviews` | Number | no | `0` | — | min 0 |
| `lastLoginAt` | Date | no | `null` | — | set on successful login |
| `passwordResetTokenHash` | String | no | `null` | — | `select: false` |
| `passwordResetExpiresAt` | Date | no | `null` | — | `select: false` |

**Indexes:** unique on `email`; unique + sparse on `unitId`.
**Hook:** `pre("save")` hashes `password` with bcrypt (10 rounds) when modified.
**Method:** `comparePassword(candidate)` → `bcrypt.compare`.
**Business rules:** a unit can be claimed by at most one resident (sparse unique
index); `password` and reset fields are excluded from queries by default.

### 6.2 Building (`buildings`)

| Field | Type | Required | Default | Notes |
| ----- | ---- | -------- | ------- | ----- |
| `name` | String | yes | — | trim, 2–100 |
| `buildingNumber` | Number | yes | — | min 1, unique |
| `description` | String | no | `null` | max 500 |
| `imageUrl` | String | no | `null` | — |
| `floorsCount` | Number | yes | — | min 1 |
| `unitsCount` | Number | no | `0` | min 0 |

**Indexes:** unique on `buildingNumber`.

### 6.3 Unit (`units`)

| Field | Type | Required | Default | Enum | Notes |
| ----- | ---- | -------- | ------- | ---- | ----- |
| `buildingId` | ObjectId → `Building` | yes | — | — | — |
| `unitNumber` | Number | yes | — | — | min 1 |
| `floor` | Number | yes | — | — | min 0 |
| `type` | String | yes | — | `APARTMENT`, `VILLA` | — |
| `status` | String | no | `VACANT` | `OCCUPIED`, `VACANT` | — |

**Indexes:** unique compound on `{ buildingId, unitNumber }`.

### 6.4 Visit (`visits`)

| Field | Type | Required | Default | Enum / Notes |
| ----- | ---- | -------- | ------- | ------------ |
| `residentId` | ObjectId → `User` | no | `null` | set on approval for visitor requests |
| `buildingId` | ObjectId → `Building` | yes | — | — |
| `unitId` | ObjectId → `Unit` | yes | — | — |
| `visitorName` | String | yes | — | trim, 2–100 |
| `visitorEmail` | String | yes | — | lowercase, trim |
| `visitorPhone` | String | no | `null` | — |
| `source` | String | yes | — | `RESIDENT_INVITE`, `VISITOR_REQUEST` |
| `status` | String | no | `PENDING` | `PENDING`, `APPROVED`, `REJECTED`, `QR_GENERATED`, `QR_SCANNED`, `CHECKED_IN`, `CHECKED_OUT`, `EXPIRED` |
| `visitDate` | Date | yes | — | must not be in the past |
| `visitStartTime` | String | yes | — | `HH:mm` |
| `purpose` | String | no | `null` | max 300 |
| `otpHash` | String | no | `null` | `select: false` |
| `otpExpiresAt` | Date | no | `null` | `select: false` |
| `otpAttempts` | Number | no | `0` | `select: false` |
| `qrTokenHash` | String | no | `null` | `select: false` |
| `qrToken` | String | no | `null` | `select: false` |
| `qrExpiresAt` | Date | no | `null` | — |
| `visitorChatTokenHash` | String | no | `null` | `select: false` |
| `visitorChatTokenRaw` | String | no | `null` | `select: false` |
| `visitorChatTokenExpiresAt` | Date | no | `null` | — |
| `approvedAt` | Date | no | `null` | — |
| `checkedInAt` | Date | no | `null` | — |
| `checkedOutAt` | Date | no | `null` | — |
| `securityId` | ObjectId → `User` | no | `null` | officer who checked in |
| `checkOutSecurityId` | ObjectId → `User` | no | `null` | officer who checked out |
| `qrScannedAt` | Date | no | `null` | — |
| `qrScannedBy` | ObjectId → `User` | no | `null` | officer who scanned |

**Indexes:** `{ residentId: 1, visitDate: -1 }`; `{ status: 1, visitDate: 1 }`.

### 6.5 MaintenanceTicket (`maintenancetickets`)

| Field | Type | Required | Default | Enum / Notes |
| ----- | ---- | -------- | ------- | ------------ |
| `residentId` | ObjectId → `User` | yes | — | — |
| `title` | String | yes | — | trim, 3–150 |
| `category` | String | yes | — | `PLUMBING`, `ELECTRICITY`, `ELEVATOR`, `AC`, `GENERAL` |
| `description` | String | yes | — | trim, 10–1000 |
| `attachmentUrl` | String | no | `null` | — |
| `priority` | String | no | `MEDIUM` | `LOW`, `MEDIUM`, `HIGH`, `URGENT` |
| `status` | String | no | `OPEN` | `OPEN`, `ASSIGNED`, `IN_PROGRESS`, `RESOLVED`, `CLOSED` |
| `chatLocked` | Boolean | no | `false` | — |
| `assignedTo` | ObjectId → `User` | no | `null` | technician |
| `skippedBy` | [ObjectId → `User`] | no | `[]` | technicians who skipped |

**Indexes:** `{ residentId: 1, createdAt: -1 }`; `{ status: 1, category: 1, createdAt: -1 }`.

### 6.6 Offer (`offers`)

| Field | Type | Required | Default | Enum / Notes |
| ----- | ---- | -------- | ------- | ------------ |
| `ticketId` | ObjectId → `MaintenanceTicket` | yes | — | — |
| `technicianId` | ObjectId → `User` | yes | — | — |
| `price` | Number | yes | — | min 0 |
| `estimatedDuration` | Number | yes | — | min 1 |
| `note` | String | no | `null` | max 500 |
| `status` | String | no | `PENDING` | `PENDING`, `ACCEPTED`, `REJECTED`, `WITHDRAWN` |

**Indexes:** unique compound on `{ ticketId, technicianId }` — one offer per
technician per ticket.

### 6.7 Negotiation (`negotiations`)

| Field | Type | Required | Default | Enum / Notes |
| ----- | ---- | -------- | ------- | ------------ |
| `offerId` | ObjectId → `Offer` | yes | — | — |
| `senderId` | ObjectId → `User` | yes | — | — |
| `senderRole` | String | yes | — | `RESIDENT`, `TECHNICIAN` |
| `price` | Number | yes | — | min 0 |
| `message` | String | no | `null` | max 500 |

**Indexes:** `{ offerId: 1, createdAt: 1 }`.

### 6.8 Review (`reviews`)

| Field | Type | Required | Default | Notes |
| ----- | ---- | -------- | ------- | ----- |
| `ticketId` | ObjectId → `MaintenanceTicket` | yes | — | unique — one review per ticket |
| `residentId` | ObjectId → `User` | yes | — | — |
| `technicianId` | ObjectId → `User` | yes | — | — |
| `rating` | Number | yes | — | min 1, max 5 |
| `comment` | String | no | `null` | max 500 |

**Indexes:** `{ technicianId: 1, createdAt: -1 }`.

### 6.9 Invoice (`invoices`)

| Field | Type | Required | Default | Enum / Notes |
| ----- | ---- | -------- | ------- | ------------ |
| `residentId` | ObjectId → `User` | yes | — | — |
| `ticketId` | ObjectId → `MaintenanceTicket` | no | `null` | unique **sparse** index |
| `unitId` | ObjectId → `Unit` | no | `null` | — |
| `description` | String | no | `null` | max 300 |
| `amount` | Number | yes | — | min 0 |
| `status` | String | no | `PENDING` | `PENDING`, `PAYMENT_SUBMITTED`, `PAID`, `OVERDUE`, `CANCELLED` |
| `paymentSubmittedAt` | Date | no | `null` | — |
| `paymentReference` | String | no | `null` | max 200 |
| `dueDate` | Date | yes | — | — |
| `paidAt` | Date | no | `null` | — |

**Indexes:** `{ residentId: 1, status: 1, dueDate: 1 }`; unique + sparse on `ticketId`.

### 6.10 Notification (`notifications`)

| Field | Type | Required | Default | Enum / Notes |
| ----- | ---- | -------- | ------- | ------------ |
| `userId` | ObjectId → `User` | yes | — | recipient |
| `type` | String | yes | — | see the list below |
| `title` | String | yes | — | trim, max 150 |
| `message` | String | yes | — | trim, max 500 |
| `relatedId` | ObjectId | no | `null` | polymorphic link to the subject |
| `isRead` | Boolean | no | `false` | — |

**`type` enum:** `VISITOR_REQUEST`, `VISITOR_APPROVED`, `VISITOR_REJECTED`,
`VISITOR_CHECKED_IN`, `VISITOR_CHECKED_OUT`, `MAINTENANCE_CREATED`, `NEW_OFFER`,
`NEW_NEGOTIATION`, `OFFER_ACCEPTED`, `OFFER_REJECTED`, `TICKET_ASSIGNED`,
`TICKET_STATUS_CHANGED`, `NEW_MESSAGE`, `ACCOUNT_APPROVED`, `ACCOUNT_REJECTED`,
`INVOICE_CREATED`, `INVOICE_DUE`, `INVOICE_PAID`, `INVOICE_PAYMENT_SUBMITTED`,
`INVOICE_UPDATED`.

**Indexes:** `{ userId: 1, isRead: 1, createdAt: -1 }`.

### 6.11 Conversation (`conversations`)

| Field | Type | Required | Default | Enum / Notes |
| ----- | ---- | -------- | ------- | ------------ |
| `type` | String | yes | — | `DIRECT`, `GROUP`, `VISITOR` |
| `groupType` | String | no | `null` | `COMPOUND`, `BUILDING` |
| `buildingId` | ObjectId → `Building` | no | `null` | for building groups |
| `participants` | [ObjectId → `User`] | yes | — | — |
| `relatedVisitId` | ObjectId → `Visit` | no | `null` | for visitor threads |
| `lastMessage` | ObjectId → `Message` | no | `null` | — |
| `lastMessageAt` | Date | no | `null` | — |
| `deletedFor` | [ObjectId → `User`] | no | — | hide-for-me |

**Indexes:** `{ participants: 1, lastMessageAt: -1 }`;
`{ type: 1, groupType: 1, buildingId: 1 }`; a **partial unique** index named
`visitor_conversation_visit_unique` on `relatedVisitId` filtered to
`type: "VISITOR"` with a non-null `relatedVisitId` — one visitor thread per visit;
`{ deletedFor: 1 }`.

### 6.12 Message (`messages`)

| Field | Type | Required | Default | Enum / Notes |
| ----- | ---- | -------- | ------- | ------------ |
| `conversationId` | ObjectId → `Conversation` | yes | — | — |
| `senderType` | String | yes | — | `USER`, `VISITOR` |
| `senderId` | ObjectId → `User` | no | `null` | null for visitors |
| `message` | String | yes | — | trim, max 2000 |
| `isRead` | Boolean | no | `false` | — |
| `readBy` | [ObjectId → `User`] | no | — | — |
| `deletedFor` | [ObjectId → `User`] | no | — | — |
| `isDeleted` | Boolean | no | `false` | deleted for everyone |
| `deletedAt` | Date | no | `null` | — |

**Indexes:** `{ conversationId: 1, createdAt: 1 }`;
`{ senderId: 1, createdAt: -1 }`; `{ readBy: 1 }`; `{ deletedFor: 1 }`.

### Model Relationships

```mermaid
erDiagram
    Building ||--o{ Unit : contains
    Unit ||--o| User : "claimed by one resident"
    User ||--o{ MaintenanceTicket : raises
    MaintenanceTicket ||--o{ Offer : receives
    Offer ||--o{ Negotiation : "back-and-forth"
    MaintenanceTicket ||--o| Review : "reviewed once"
    MaintenanceTicket ||--o| Invoice : "may be billed by"
    User ||--o{ Invoice : owes
    Unit ||--o{ Visit : "visited at"
    User ||--o{ Visit : "hosts / guards"
    Visit ||--o| Conversation : "visitor thread"
    Conversation ||--o{ Message : contains
    User ||--o{ Notification : receives
    User }o--o{ Conversation : participates
```

### Enums Used Across Models

| Enum group | Values |
| ---------- | ------ |
| User role | `RESIDENT`, `TECHNICIAN`, `SECURITY`, `ADMIN` |
| User status | `PENDING`, `ACTIVE`, `REJECTED` |
| Ticket status | `OPEN`, `ASSIGNED`, `IN_PROGRESS`, `RESOLVED`, `CLOSED` |
| Ticket priority | `LOW`, `MEDIUM`, `HIGH`, `URGENT` |
| Ticket category | `PLUMBING`, `ELECTRICITY`, `ELEVATOR`, `AC`, `GENERAL` |
| Offer status | `PENDING`, `ACCEPTED`, `REJECTED`, `WITHDRAWN` |
| Visit status | `PENDING`, `APPROVED`, `REJECTED`, `QR_GENERATED`, `QR_SCANNED`, `CHECKED_IN`, `CHECKED_OUT`, `EXPIRED` |
| Invoice status | `PENDING`, `PAYMENT_SUBMITTED`, `PAID`, `OVERDUE`, `CANCELLED` |

---

## 7. AUTHENTICATION

### Registration

`POST /api/auth/register` → `authService.registerUser`.

Validation performed in the service:

- `name`, `email`, `password`, `role` are all required.
- `password.length >= 8`.
- `role` must be one of `RESIDENT`, `SECURITY`, `TECHNICIAN` — **`ADMIN` cannot
  self-register**.
- Email is normalised (trim + lowercase) and must not already exist.
- For `RESIDENT`: `unitId` is required, the unit must exist, and it must not
  already be `OCCUPIED`.
- For `TECHNICIAN`: at least one specialization is required.

The account is always created with `status: "PENDING"`. Duplicate-key errors
(`11000`) are translated into a specific message for the `unitId` and `email`
unique indexes.

### Login

`POST /api/auth/login` → `authService.loginUser`.

- Email and password are required.
- The user is loaded with `select("+password")` (the field is `select: false` by
  default).
- If the user does not exist, or the password is wrong, the same generic message
  is returned: `"Invalid email or password"`.
- If `user.status !== "ACTIVE"`, login fails with `"Account is not active"`.
- On success, `lastLoginAt` is updated and a JWT is issued.

### Password hashing

bcrypt with a generated salt of **10 rounds**, applied in a `pre("save")` hook on
the `User` model, only when the password field is modified. Comparison uses
`bcrypt.compare`.

### JWT generation

```js
jwt.sign({ userId: user._id, role: user.role }, process.env.JWT_SECRET, {
  expiresIn: "1d"
});
```

- **Payload:** `userId`, `role`.
- **Expiry:** `1d`.
- **Secret:** `process.env.JWT_SECRET`.

### Token validation (`authMiddleware`)

1. `Authorization` header must be present → else `401` `"Authorization header is required"`.
2. It must split into exactly two parts with the first being `Bearer` → else `401`
   `"Invalid authorization format"`.
3. `jwt.verify(token, JWT_SECRET)`.
4. The user is loaded by `decoded.userId` → missing → `401` `"User not found"`.
5. `user.status` must be `ACTIVE` → else `403` `"Account is not active"`.
6. `req.user = { userId, role }` and the request proceeds.

Any thrown error → `401` `"Invalid or expired token"`.

### `/me` endpoint

`GET /api/auth/me` returns the current user shaped as
`{ id, name, email, phone, role, status, profileImage, unitId, specializations,
rating, totalReviews, lastLoginAt }`.

### Frontend token storage

`core/services/token-storage.ts` stores the JWT under the `token` key and the
cached user under `user`, both in `localStorage`. Every accessor guards against a
missing/unavailable `localStorage` and parsing failures are handled by clearing
the cached user.

### Auth service

`core/services/auth.service.ts` is the only reader/writer of credentials. It:

- exposes `user` and `loading` as readonly signals;
- derives `isAuthenticated` from user + token;
- `initializeSession()` calls `getMe()` when a token exists and logs out on error;
- writes the token and user on login; clears both on logout;
- exposes `userRole`, `userName`, `hasRole(...)`, `homeRoute`, `getToken()`,
  `getUser()`, `isLoggedIn()`.

### HTTP interceptor

`authInterceptor` clones each request and sets
`Authorization: Bearer <token>` when a token exists; otherwise it passes the
request through untouched.

### Auth guard

`authGuard` (used on every protected route):

1. No token or no user → `logout()` and redirect to `/login` with `returnUrl`.
2. `user.status !== 'ACTIVE'` → `logout()` and redirect to `/login` with
   `reason: 'inactive'`.
3. Route declares `data.roles` and the user's role is not in it → redirect to
   `/access-denied` with `from`.
4. Otherwise allow.

### Logout

`AuthService.logout()` clears the token, clears the cached user and sets the user
signal to `null`. There is no server-side token revocation/blacklist — a JWT
remains valid until it expires.

### Authentication errors

| Situation | Status | Message |
| --------- | ------ | ------- |
| Missing header | 401 | Authorization header is required |
| Malformed header | 401 | Invalid authorization format |
| Bad/expired token | 401 | Invalid or expired token |
| User no longer exists | 401 | User not found |
| Account not ACTIVE | 403 | Account is not active |
| Bad login credentials | 401 | Invalid email or password |
| Account not ACTIVE at login | 401 | Account is not active |

---

## 8. AUTHORIZATION & RBAC

### Roles

| Role | Purpose | Backend access | Frontend access |
| ---- | ------- | -------------- | --------------- |
| `RESIDENT` | Lives in a unit | `/api/visits` (own + visitor decisions), `/api/resident/*` | `/resident/*` |
| `TECHNICIAN` | Does maintenance work | `/api/technician/*` | `/technician/*` |
| `SECURITY` | Guard desk | `/api/visits/scan`, `/api/visits/security/*`, check-in/out | `/security/*` |
| `ADMIN` | Manages the compound | `/api/admin/*` | `/admin/*` |
| Visitor | No account | Public `/api/visits/visitor-*` + visitor chat with a token | `/visitor-*`, `/otp-verification`, `/qr-code-display` |

### Enforcement points

| Point | File | Effect |
| ----- | ---- | ------ |
| JWT + ACTIVE check | `middleware/authMiddleware.js` | Every protected route |
| Role gate | `middleware/roleMiddleware.js` | Per-route allowed roles |
| Router-level guard | `adminRoutes.js`, `residentRoutes.js`, `technicianRoutes.js` | `router.use(authMiddleware, roleMiddleware(...))` |
| Socket auth | `socket/chatSocket.js` | `USER` vs `VISITOR` identity |
| Frontend route guard | `core/guards/auth-guard.ts` | Redirects unauthenticated/inactive/wrong-role users |
| Frontend nav filter | `core/layout/authenticated-layout/nav-items.ts` | `visibleNavItems(role)` hides other roles' links |

### Permission Matrix

| Resource | RESIDENT | TECHNICIAN | SECURITY | ADMIN | Visitor |
| -------- | :------: | :--------: | :------: | :---: | :-----: |
| Register / login | ✔ | ✔ | ✔ | ✔ (seeded) | — |
| Own profile (`/auth/me`) | ✔ | ✔ | ✔ | ✔ | — |
| Create maintenance ticket | ✔ | — | — | — | — |
| View own tickets | ✔ | — | — | ✔ (all) | — |
| Available tickets / offers | — | ✔ | — | — | — |
| Start / resolve / skip ticket | — | ✔ | — | — | — |
| Accept offer / negotiate | ✔ | ✔ | — | — | — |
| Write review | ✔ | — | — | — | — |
| View reviews | — | ✔ (own) | — | — | — |
| Create visit (invite) | ✔ | — | — | — | — |
| Approve / reject visitor request | ✔ | — | — | — | — |
| Scan QR | — | — | ✔ | — | — |
| Check-in / check-out | — | — | ✔ | — | — |
| Security visit list | — | — | ✔ | ✔ (read) | — |
| Invoices (view own / pay) | ✔ | — | — | — | — |
| Invoices (create / update status) | — | — | — | ✔ | — |
| Users approve / reject / update | — | — | — | ✔ | — |
| Buildings / units CRUD | — | — | — | ✔ | — |
| Dashboard | ✔ | ✔ | — | ✔ | — |
| Reports | — | — | — | ✔ | — |
| Chat | ✔ | ✔ | ✔ | ✔ | ✔ (visitor thread) |
| Notifications | ✔ | ✔ | ✔ | ✔ | — |

> Visitor access to the public endpoints is unauthenticated by design; the
> visitor-facing chat endpoints require a valid `visitorChatToken` for the visit.

---

## 9. COMPLETE API DOCUMENTATION

All endpoints are prefixed with `/api`. All success responses include
`success: true`; error responses include `success: false` and `message`.

### 9.1 Auth — `/api/auth`

#### POST `/api/auth/register`

- **Purpose:** Register a resident, security or technician account (created as `PENDING`).
- **Auth:** none.
- **Body:** `name`, `email`, `password`, `role` (`RESIDENT`|`SECURITY`|`TECHNICIAN`), `unitId` (required for residents), `specializations` (required for technicians), optional `phone`.
- **Success:** `201` with `data: { id, name, email, role, status }`.
- **Errors:** `400` for missing fields, short password, invalid role, duplicate email, missing/occupied unit, or missing specializations.

#### POST `/api/auth/login`

- **Purpose:** Authenticate and receive a JWT.
- **Auth:** none.
- **Body:** `email`, `password`.
- **Success:** `200` with `data: { token, user: { id, name, email, phone, role, status, profileImage, unitId, specializations, rating, totalReviews, lastLoginAt } }`.
- **Errors:** `401` `"Invalid email or password"`, `401` `"Account is not active"`.

#### POST `/api/auth/forgot-password`

- **Purpose:** Request a password-reset link by email.
- **Auth:** none.
- **Body:** `email`.
- **Success:** `200` with a generic message (always the same, whether or not the email exists).
- **Errors:** `400` when email is missing.

#### POST `/api/auth/reset-password`

- **Purpose:** Complete a reset with the emailed token.
- **Auth:** none.
- **Body:** `token`, `password` (min 8).
- **Success:** `200` `"Password updated successfully. You can now sign in."`
- **Errors:** `400` for a missing token, a short password, or an invalid/expired token.

#### GET `/api/auth/me`

- **Purpose:** Return the current user.
- **Auth:** JWT.
- **Allowed roles:** any `ACTIVE`.
- **Success:** `200` with the user object described in section 7.
- **Errors:** `404` if the user no longer exists.

#### PATCH `/api/auth/me`

- **Purpose:** Update own profile.
- **Auth:** JWT.
- **Body:** any of `name`, `phone`, `profileImage` (all other fields are ignored).
- **Success:** `200` with the updated user.
- **Errors:** `400` for an invalid name (< 2 chars) or when no valid field is supplied.

#### PATCH `/api/auth/change-password`

- **Purpose:** Change own password.
- **Auth:** JWT.
- **Body:** `currentPassword`, `newPassword` (min 8).
- **Success:** `200` `"Password updated successfully."`
- **Errors:** `400` for a missing/short password or an incorrect current password; `404` if the user is missing.

### 9.2 Units — `/api/units`

#### GET `/api/units/available`

- **Purpose:** List vacant units available for a resident registration.
- **Auth:** none.
- **Success:** `200` with the available units.

### 9.3 Visits — `/api/visits`

#### Public visitor flow (no account)

| Method | Endpoint | Purpose | Auth |
| ------ | -------- | ------- | ---- |
| POST | `/visitor-requests` | Submit a visitor request for an occupied unit | none |
| GET | `/visitor-units` | List occupied units a visitor may choose | none |
| POST | `/visitor-requests/:id/otp` | Issue the email OTP | none |
| POST | `/visitor-requests/:id/otp/verify` | Verify the OTP | none |
| GET | `/visitor-requests/lookup` | Find visitor requests by email | none |
| GET | `/visitor-requests/:id/status` | Track one request's status | none |
| POST | `/visitor-requests/:id/qr` | Mint/return the QR pass | none |

- `POST /visitor-requests` body: `visitorName`, `visitorEmail`, `buildingId`, `unitId`, `visitDate`, `visitStartTime`, optional `visitorPhone`, `purpose`. The unit must belong to the building and be `OCCUPIED`. Success: `201`-style result `{ visitId, status, message }`.
- `GET /visitor-requests/lookup` and `GET /visitor-requests/:id/status` require the visitor's `email` (as a query parameter for lookup, and to scope the single-status lookup).
- `POST /visitor-requests/:id/qr` requires the visitor's `email` and only succeeds once the resident has approved; the QR is released no earlier than **1 hour before** the scheduled visit time.

#### Resident-facing

| Method | Endpoint | Purpose | Roles |
| ------ | -------- | ------- | ----- |
| GET | `/visitor-requests` | Requests awaiting this resident | RESIDENT |
| PATCH | `/visitor-requests/:id/approve` | Approve → issues QR + visitor chat token | RESIDENT |
| PATCH | `/visitor-requests/:id/reject` | Reject | RESIDENT |
| POST | `/` | Resident invites a visitor directly (created `APPROVED`) | RESIDENT |
| GET | `/` | The resident's own visits | RESIDENT |
| GET | `/:id` | One visit | RESIDENT |
| POST | `/:id/otp` | Issue an OTP for a resident-invited visit | RESIDENT |
| POST | `/:id/otp/verify` | Verify that OTP | RESIDENT |
| POST | `/:id/qr` | Generate/reuse the QR pass | RESIDENT |

#### Security-facing

| Method | Endpoint | Purpose | Roles |
| ------ | -------- | ------- | ----- |
| POST | `/scan` | Scan and verify a QR token | SECURITY |
| GET | `/security/visits` | All visits for the guard desk | SECURITY |
| GET | `/security/visits/:id` | One visit's details | SECURITY |
| PATCH | `/:id/check-in` | Confirm entry | SECURITY |
| PATCH | `/:id/check-out` | Confirm exit | SECURITY |

### 9.4 Resident — `/api/resident`

All routes require `authMiddleware` + `roleMiddleware("RESIDENT")`.

| Method | Endpoint | Purpose |
| ------ | -------- | ------- |
| GET | `/dashboard` | Aggregated resident dashboard |
| PATCH | `/invoices/:invoiceId/pay` | Submit an invoice payment |
| GET | `/tickets` | The resident's tickets |
| POST | `/tickets` | Create a ticket |
| GET | `/tickets/:id` | One ticket's details |
| PATCH | `/tickets/:id/close` | Close a resolved ticket |
| GET | `/tickets/:ticketId/offers` | Offers received on a ticket |
| PATCH | `/offers/:offerId/accept` | Accept an offer |
| GET | `/offers/:offerId/negotiations` | Negotiation history |
| POST | `/offers/:offerId/negotiations` | Send a counter-proposal |
| POST | `/tickets/:ticketId/review` | Create a review |
| PATCH | `/reviews/:id` | Update own review |
| DELETE | `/reviews/:id` | Delete own review |

### 9.5 Technician — `/api/technician`

All routes require `authMiddleware` + `roleMiddleware("TECHNICIAN")`.

| Method | Endpoint | Purpose |
| ------ | -------- | ------- |
| GET | `/dashboard` | Technician dashboard |
| GET | `/available-tickets` | Open tickets to bid on |
| GET | `/available-tickets/:id` | Details of an available ticket |
| GET | `/assigned-tickets` | Jobs assigned to this technician |
| GET | `/tickets/:id` | Assigned job details |
| PATCH | `/tickets/:id/start` | Move to `IN_PROGRESS` |
| PATCH | `/tickets/:id/resolve` | Move to `RESOLVED` |
| POST | `/tickets/:id/skip` | Skip a ticket (returns it to the pool) |
| GET | `/reviews` | Reviews received |
| GET | `/offers/my` | Own offers |
| POST | `/tickets/:ticketId/offers` | Create an offer |
| PATCH | `/offers/:id` | Update an offer |
| PATCH | `/offers/:id/withdraw` | Withdraw an offer |
| GET | `/offers/:offerId/negotiations` | Negotiation history |
| POST | `/offers/:offerId/negotiations` | Send a counter-proposal |

### 9.6 Admin — `/api/admin`

Every route runs `router.use(authMiddleware, roleMiddleware("ADMIN"))`.

| Method | Endpoint | Purpose |
| ------ | -------- | ------- |
| GET | `/dashboard` | Admin dashboard |
| GET | `/users` | List users |
| GET | `/users/:userId` | One user |
| PATCH | `/users/:userId/approve` | Approve a pending account |
| PATCH | `/users/:userId/reject` | Reject a pending account |
| PATCH | `/users/:userId` | Update a user |
| GET | `/buildings` | List buildings |
| POST | `/buildings` | Create a building |
| PATCH | `/buildings/:buildingId` | Update a building |
| GET | `/units` | List units |
| POST | `/units` | Create a unit |
| PATCH | `/units/:unitId` | Update a unit |
| GET | `/invoices` | List invoices |
| GET | `/invoices/:invoiceId` | One invoice |
| POST | `/invoices` | Create an invoice |
| PATCH | `/invoices/:invoiceId/status` | Update an invoice's status |
| GET | `/maintenance` | List maintenance tickets |
| GET | `/maintenance/:ticketId` | One ticket |
| PATCH | `/maintenance/:ticketId/status` | Update a ticket's status |
| GET | `/visits` | List visits |
| GET | `/visits/:visitId` | One visit |
| POST | `/visits/expire-stale` | Force the stale-visit sweep |
| GET | `/reports` | Summary reports |
| GET | `/reports/full` | Full compound report |

### 9.7 Notifications — `/api/notifications`

All routes require `authMiddleware`.

| Method | Endpoint | Purpose |
| ------ | -------- | ------- |
| GET | `/` | List notifications (optionally `?unread=true`), newest first, limit 100 |
| PATCH | `/read-all` | Mark all as read |
| PATCH | `/:id/read` | Mark one as read |
| DELETE | `/:id` | Delete one notification |

### 9.8 Chat — `/api/chat`

User routes require `authMiddleware`. Visitor routes authenticate with a
`visitorChatToken` for the given visit.

| Method | Endpoint | Auth | Purpose |
| ------ | -------- | ---- | ------- |
| GET | `/users/search` | JWT | Find a user to message |
| POST | `/direct` | JWT | Open a direct conversation |
| GET | `/groups/compound` | JWT | The compound-wide group |
| GET | `/groups/building/:buildingId` | JWT | A building group |
| GET | `/conversations` | JWT | My conversations |
| GET | `/conversations/:conversationId` | JWT | One conversation |
| GET | `/conversations/:conversationId/messages` | JWT | Message history |
| POST | `/conversations/:conversationId/messages` | JWT | Send a message |
| PATCH | `/conversations/:conversationId/read` | JWT | Mark messages read |
| DELETE | `/messages/:messageId/me` | JWT | Delete for me |
| DELETE | `/messages/:messageId/everyone` | JWT | Delete for everyone |
| DELETE | `/conversations/:conversationId/me` | JWT | Hide a conversation |
| POST | `/visitor/:visitId/conversation` | Visitor token | Open the visitor thread |
| GET | `/visitor/:visitId/conversations/:conversationId/messages` | Visitor token | Visitor history |
| POST | `/visitor/:visitId/conversations/:conversationId/messages` | Visitor token | Visitor sends |
| PATCH | `/visitor/:visitId/conversations/:conversationId/read` | Visitor token | Visitor read state |

### 9.9 Uploads — `/api/uploads`

| Method | Endpoint | Auth | Field | Purpose |
| ------ | -------- | ---- | ----- | ------- |
| POST | `/profile-image` | JWT | `image` | Upload an avatar (max 5 MB; jpeg/png/webp/gif) |
| POST | `/ticket-attachment` | JWT | `image` | Upload a ticket attachment (same limits) |

Uploaded files are served statically from `/uploads`.

---

## 10. BACKEND MODULES

### Layer separation

| Layer | Never does |
| ----- | ---------- |
| Controller | Business rules, direct DB queries |
| Service | `req`/`res` handling, HTTP status codes (it sets `error.statusCode` on thrown errors) |
| Model | Cross-collection orchestration |

### Auth module

- **Routes:** `authRoutes.js`
- **Controller:** `authController.js`
- **Service:** `authService.js` (+ `emailService.js`)
- **Model:** `User`
- **Rules:** role-aware registration, one unit per resident, `ACTIVE` required to log in, SHA-256-hashed reset tokens with a 15-minute TTL.

### Visit / visitor module

- **Routes:** `visitRoutes.js`
- **Controller:** `visitController.js`
- **Service:** `visitService.js` (owns the visit state machine, OTP, QR, chat token)
- **Models:** `Visit`, `User`, `Unit`, `Building`
- **Dependencies:** `emailService`, `notificationService`, `statusConstants`
- **Constants:** OTP 5 min, QR 30 min, QR release lead time 60 min, max 5 OTP attempts, visitor chat token 24 h.

### Maintenance module

- **Routes:** `residentRoutes.js`, `technicianRoutes.js`
- **Controllers:** `maintenanceTicketController.js`, `offerController.js`, `negotiationController.js`, `reviewController.js`, `technicianController.js`
- **Models:** `MaintenanceTicket`, `Offer`, `Negotiation`, `Review`
- **Rules:** transitions validated by `assertTicketTransition`; one offer per technician per ticket; one review per ticket; chat locks once a ticket is `RESOLVED`/`CLOSED`.

### Invoice module

- **Routes:** `adminRoutes.js` (create/update), `residentRoutes.js` (pay)
- **Controllers:** `adminController.js`, `residentDashboardController.js`
- **Service:** `residentDashboardService.js` (aggregation)
- **Model:** `Invoice`
- **Rules:** `ticketId` is unique + sparse (one invoice per ticket); `amount >= 0`; `dueDate` required.

### Notification module

- **Routes:** `notificationRoutes.js`
- **Controller:** `notificationController.js`
- **Service:** `notificationService.js`
- **Model:** `Notification`
- **Rules:** `notifyRole` fans out to every `ACTIVE` user with the role; push happens through the injected Socket.IO server.

### Chat module

- **Routes:** `chatRoutes.js`
- **Controller:** `chatController.js`
- **Service:** `chatService.js`
- **Socket:** `socket/chatSocket.js`
- **Models:** `Conversation`, `Message`, `Visit`, `User`

### Admin module

- **Routes:** `adminRoutes.js`
- **Controller:** `adminController.js`
- **Models:** `User`, `Building`, `Unit`, `Invoice`, `MaintenanceTicket`, `Visit`

### Upload module

- **Routes:** `uploadRoutes.js`
- **Controller:** `uploadController.js`
- **Middleware:** `uploadMiddleware.js` (multer disk storage, MIME allow-list, 5 MB cap, folder auto-creation)

---

## 11. FRONTEND ARCHITECTURE

### Framework

Angular 21, standalone components, **zoneless change detection**, signals for
state, RxJS for HTTP, lazy `loadComponent` for every route.

### Application structure

- `app.config.ts` — providers: `provideBrowserGlobalErrorListeners()`,
  `provideZonelessChangeDetection()`, `provideRouter(routes)`,
  `provideHttpClient(withInterceptors([authInterceptor]))`.
- `app.routes.ts` — all routes, grouped by audience.

### Routing

Public routes: `/`, `/login`, `/register`, `/register/role`,
`/register/details`, `/forgot-password`, `/reset-password`, and the public
visitor pages (`/visitor-entry`, `/visitor-lookup`, `/visitor-request`,
`/otp-verification`, `/visitor-request-status`, `/visitor-chat`,
`/qr-code-display`, `/visit-status`, `/visit-in-progress`).

Protected shells (each wraps `AuthenticatedLayoutComponent` + `authGuard`):

| Shell | Roles | Children |
| ----- | -------- |
| `/chat`, `/profile`, `/notifications` | any active user | shared pages |
| `/admin` | `ADMIN` | dashboard, users, compound, maintenance, visitors, invoices, invoices/:invoiceId, reports |
| `/security` | `SECURITY` | visitors (dashboard), list, scanner, history, check-in-out, details |
| `/resident` | `RESIDENT` | dashboard, visitors, create-visit, invoices, create-ticket, maintenance-view, maintenance/:id/offers |
| `/technician` | `TECHNICIAN` | dashboard, available-requests, assigned-jobs, available-request/:id, job/:id, job/:id/create-offer, my-offers, offer/:offerId/negotiation, reviews |

Legacy flat URLs are kept as redirects (`/security-dashboard`, `/qr-scanner`,
`/check-in-out`, `/access-history`, `/visitor-details`,
`/resident-visitor-requests`, `/technician/availableTickets`,
`/technician/assignJobs`). An unknown URL falls through to a real 404 component.

### Pages

Feature screens live under `Components/`, grouped by audience
(`admin/`, `Residant/`, `Technician/`, `VisitorAccess/pages/{public,resident,security}/`),
plus shared pages (`chat`, `profile`, `notifications`, landing, login, register,
forgot/reset password).

### Components

Reusable presentational components live in `shared/components/` (chart, dialog,
avatar, access-denied, not-found) and `shared/invoice/` (the printable receipt).

### Services

- `core/services/` — `AuthService`, `NotificationService`, `ChatSocket`,
  `token-storage`, theme.
- `Services/` — feature HTTP clients (maintenance, offers, reviews, invoices,
  visits, admin/compound, reports, chat, …).

### Guards

`core/guards/auth-guard.ts` — the only guard. It is role-aware through
`route.data.roles` and exposes the helper `requiredRoles(route)`.

### Interceptors

`core/interceptors/auth-interceptor.ts` — attaches the bearer token.

### Interfaces / models

- `core/models/status.ts` — role/status enums, `statusSlug`, `statusLabel`,
  `TICKET_TRANSITIONS`, `canTransitionTicket`, `isVisitChatOpen`, `ROLE_HOME`,
  `ROLE_LABEL`, `roleHome`.
- `Models/` — per-feature DTOs (maintenance, offers, reviews, etc.).
- `shared/invoice/invoice.model.ts` — `describeInvoice()` view-model normaliser.

### Authentication (client side)

On app start `initializeSession()` is used to restore the session from the stored
token; the token and user are cached in `localStorage`; the interceptor attaches
the token; the guard protects routes.

### API communication

Every service builds its URL from `environment.apiUrl`
(`http://localhost:3000/api`). Uploads resolve through
`resolveUploadUrl()` / `environment.apiBaseUrl`.

### Error handling

Services return RxJS observables; components subscribe and surface
`error.error?.message`. `provideBrowserGlobalErrorListeners()` is registered in
`app.config.ts`.

### State management

No store library. State lives in service-level **signals**
(`AuthService.user`, `NotificationService.unreadCount`).

### Real-time communication

`ChatSocket` is a singleton wrapping one `socket.io-client` connection, with
`connect()` (user), `connectAsVisitor(visitId, token)`, `joinConversation`,
`leaveConversation`, `sendMessage`, `markAsRead`, delete helpers, and generic
`on`/`off`.

### Role-based UI

`visibleNavItems(role)` in `nav-items.ts` filters the sidebar; each protected
route also carries `data.roles`.

### Navigation

The sidebar map is `NAV_ITEMS` in
`core/layout/authenticated-layout/nav-items.ts`: resident (Dashboard,
Maintenance, New Ticket, Visitors, Invite Visitor, Invoices), technician
(Dashboard, Available Requests, Assigned Jobs, My Offers, Reviews), security
(Visitors, Visit List, QR Scanner, Check In / Out, Access History), admin
(Dashboard, Users, Buildings & Units, Maintenance, Visit Logs, Invoices,
Reports), plus Messages, Notifications and Profile for every role.

### Shared components

`shared/components/` (chart, dialog, avatar, access-denied, not-found) and
`shared/invoice/` (invoice-receipt).

---

## 12. REAL-TIME / SOCKET.IO

### Connection process

The Socket.IO server is created on the same HTTP server as Express
(`index.js`), with CORS restricted to the frontend origin and methods
`GET`, `POST`, `PATCH`. `initializeChatSocket(io)` registers the auth middleware
and connection handlers, and injects `io` into `notificationService`.

### Authentication

`io.use(authenticateSocket)` chooses one of two identities:

| Identity | Handshake payload | Verification |
| -------- | ----------------- | ------------ |
| `USER` | `auth.token` (JWT) | `jwt.verify` → load user → require `ACTIVE` |
| `VISITOR` | `auth.visitId` + `auth.visitorChatToken` | `chatService.verifyVisitorChatToken(visitId, token)` |

If `auth.visitorChatToken` is present the visitor path is taken; otherwise the
user path. A failed handshake calls `next(new Error(...))` and the connection is
rejected.

### Token types

- **User:** the same JWT as the REST API (HS256, `1d`).
- **Visitor:** an opaque 32-byte hex token, stored SHA-256-hashed on the visit,
  valid for 24 hours, issued on approval.

### Rooms

| Room | Who joins | When |
| ---- | --------- | ---- |
| `user:<userId>` | Every authenticated user | Automatically on connect |
| `conversation:<conversationId>` | Participants | On `conversation:join`, after an access check |

### Events

**Inbound (client → server):**

| Event | Payload | Notes |
| ----- | ------- | ----- |
| `conversation:join` | `conversationId` | Access-checked before joining |
| `conversation:leave` | `conversationId` | Leaves the room |
| `message:send` | `{ conversationId, message }` | Users only |
| `visitor:message:send` | `{ conversationId, message }` | Visitors only |
| `conversation:read` | `conversationId` | Users only |
| `message:delete:me` | `{ messageId }` | Users only |
| `message:delete:everyone` | `{ messageId }` | Users only |
| `conversation:delete:me` | `conversationId` | Users only |

**Outbound (server → client):**

| Event | Meaning |
| ----- | ------- |
| `conversation:joined` / `conversation:left` | Room membership confirmation |
| `message:new` | A new message in a conversation room |
| `messages:read` | Read receipts |
| `message:deleted` | Deleted for everyone |
| `message:deletedForMe` | Deleted for the requesting user |
| `conversation:deleted` | Conversation hidden for the user |
| `chat:error` | `{ message }` for any handler failure |
| `notification:new` | A new persisted notification (to `user:<userId>`) |

### Message flow

```mermaid
sequenceDiagram
    participant A as User A (browser)
    participant S as Socket.IO server
    participant CS as chatService
    participant DB as MongoDB
    participant B as User B (browser)

    A->>S: conversation:join(conversationId)
    S->>CS: getConversationById(A, conversationId)
    CS->>DB: verify A is a participant
    DB-->>CS: conversation
    S-->>A: conversation:joined
    A->>S: message:send({ conversationId, message })
    S->>CS: sendUserMessage(A, conversationId, message)
    CS->>DB: Message.create(...)
    CS->>DB: Conversation.update(lastMessage, lastMessageAt)
    DB-->>CS: message
    CS-->>S: newMessage
    S-->>A: message:new
    S-->>B: message:new
    B->>S: conversation:read(conversationId)
    S->>CS: markMessagesAsRead(B, conversationId)
    CS->>DB: update readBy
    S-->>A: messages:read
    S-->>B: messages:read
```

### Authorization and restrictions

- `conversation:join` is access-checked: a user must be a participant
  (`getConversationById`), a visitor must own a `VISITOR` conversation whose
  `relatedVisitId` matches their handshake `visitId`.
- `message:send` and all delete/read handlers reject visitors with
  `chat:error`; visitors must use `visitor:message:send`.
- `visitor:message:send` rejects users with `chat:error`.
- Every handler wraps its body in `try/catch` and reports failures through
  `chat:error` with the error message.

### Frontend socket handling

`ChatSocket` exposes `connect()`, `connectAsVisitor(visitId, visitorChatToken)`,
`disconnect()`, `joinConversation()`, `leaveConversation()`, `sendMessage()`,
`markAsRead()`, `deleteMessageForMe()`, `deleteMessageForEveryone()`,
`deleteConversationForMe()`, and generic `on(event, cb)` / `off(event, cb?)`.
It attaches `connect`, `disconnect` and `connect_error` lifecycle handlers.

### Disconnect behaviour

On `disconnect` the server logs the socket id plus the user id or visit id and the
reason. There is no automatic reconnection logic in the application code beyond
`socket.io-client`'s own default behaviour.

---

## 13. CHAT SYSTEM

### Conversation model

`Conversation` supports three `type` values:

| `type` | Meaning | Extra fields |
| ------ | ------- | ------------ |
| `DIRECT` | 1:1 between two users | `participants` (2) |
| `GROUP` | Compound-wide or building-wide | `groupType` (`COMPOUND` / `BUILDING`), `buildingId` for building groups |
| `VISITOR` | Visitor ↔ resident thread | `relatedVisitId` (unique per visit) |

### Message model

`Message` records `conversationId`, `senderType` (`USER` or `VISITOR`), `senderId`
(null for visitors), `message` (max 2000), `isRead`, `readBy`, `deletedFor`,
`isDeleted` and `deletedAt`.

### Participants

`participants` is an array of `User` references. For a direct conversation the two
users are both listed; for groups the residents (and other roles, as applicable)
are added when the group is created or fetched.

### Conversation creation

| Path | Endpoint | Result |
| ---- | -------- | ------ |
| Direct | `POST /api/chat/direct` | Creates/reuses a `DIRECT` conversation between the caller and the receiver |
| Compound group | `GET /api/chat/groups/compound` | Returns the compound-wide `GROUP` (`groupType: COMPOUND`) |
| Building group | `GET /api/chat/groups/building/:buildingId` | Returns the building `GROUP` (`groupType: BUILDING`) |
| Visitor thread | `POST /api/chat/visitor/:visitId/conversation` | Creates/reuses the `VISITOR` conversation for that visit |

### Permissions

Direct chat permission is decided by `canDirectChat(sender, receiver)` in
`chatService.js`:

| Sender → Receiver | Allowed? |
| ----------------- | -------- |
| Same user | No |
| Either party not `ACTIVE` | No |
| Either party is `ADMIN` | Yes |
| `RESIDENT` → `RESIDENT` | Yes |
| `RESIDENT` → `SECURITY` | Yes |
| `RESIDENT` → `TECHNICIAN` | Only if a maintenance ticket connects them (`canResidentAndTechnicianChat`) |
| `SECURITY` → `RESIDENT` | Yes |
| `TECHNICIAN` → `RESIDENT` | Only if a ticket connects them |
| Anything else | No |

### Groups / rooms

Compound and building groups are `GROUP` conversations. Realtime delivery uses the
`conversation:<id>` room; every participant joins it via `conversation:join`.

### Resident chat

Residents can open direct conversations with other residents, security and — when
a ticket connects them — technicians. The UI is `/chat` under the authenticated
shell.

### Technician chat

Technicians can only direct-message residents where a maintenance ticket connects
them (`canResidentAndTechnicianChat`).

### Visitor chat

A visitor has no account. On approval the backend issues a `visitorChatToken`
(32-byte hex, SHA-256-hashed at rest, 24-hour TTL). The visitor connects with
`connectAsVisitor(visitId, token)` and can only reach their own `VISITOR`
conversation.

### Real-time messaging

Messages are sent over Socket.IO (`message:send` / `visitor:message:send`) and
persisted by `chatService`; the new message is broadcast to the conversation room
as `message:new`.

### Authentication

Users authenticate the socket with their JWT; visitors with
`visitorChatToken` + `visitId`.

### Visitor tokens

Issued by `generateVisitorChatTokenForVisit()` when a visit is `APPROVED`,
`QR_GENERATED` or `CHECKED_IN`; `getOrCreateVisitorChatTokenForVisit()` reuses a
still-valid token instead of minting a new one.

### Message persistence

Every message is a `Message` document; conversation `lastMessage` and
`lastMessageAt` are updated so lists can be sorted by recency.

### Unread messages

Read state is tracked with `Message.readBy` and `Message.isRead`. The
`conversation:read` socket event and `PATCH /api/chat/conversations/:id/read`
mark messages read and broadcast `messages:read`.

---

## 14. VISITOR MANAGEMENT

### Visit creation

Two paths create a `Visit`:

| Source | Endpoint | Initial status | Notes |
| ------ | -------- | -------------- | ----- |
| `VISITOR_REQUEST` | `POST /api/visits/visitor-requests` (public) | `PENDING` | Visitor picks an occupied unit; resident is resolved and notified |
| `RESIDENT_INVITE` | `POST /api/visits` (resident) | `APPROVED` | Created already approved for the resident's own unit |

### Visitor data

`visitorName`, `visitorEmail`, optional `visitorPhone`, `visitDate`,
`visitStartTime` (`HH:mm`), optional `purpose` (max 300).

### Resident interaction

Residents list requests at `GET /api/visits/visitor-requests` and act with
`PATCH /api/visits/visitor-requests/:id/approve` or `.../reject`. Only `PENDING`
requests can be approved or rejected.

### Security interaction

Security lists visits with `GET /api/visits/security/visits`, scans with
`POST /api/visits/scan`, and confirms entry/exit with
`PATCH /api/visits/:id/check-in` and `PATCH /api/visits/:id/check-out`.

### Approval / rejection

Approval atomically moves `PENDING → APPROVED`, then immediately issues the
visitor chat token and the QR pass (so the reported status is `QR_GENERATED`) and
notifies all `SECURITY` users. Rejection moves `PENDING → REJECTED`.

### OTP

- **Generation:** a 6-digit code from `crypto.randomInt(100000, 1000000)`.
- **Hashing:** bcrypt, 10 rounds, stored in `otpHash`.
- **Expiration:** `OTP_DURATION = 5 * 60 * 1000` (5 minutes).
- **Attempt limit:** `MAX_OTP_ATTEMPTS = 5`; each wrong attempt increments
  `otpAttempts` atomically and further attempts are refused once the limit is hit.
- **Reset:** a new OTP resets `otpAttempts` to 0 and issues a fresh `otpExpiresAt`.

### QR generation

`generateVisitQr()` produces a 32-byte random hex token, stores it in `qrToken`
and a bcrypt hash in `qrTokenHash`, sets `qrExpiresAt` and moves the visit to
`QR_GENERATED`. An existing unexpired token is reused instead of reissued.

### QR expiration

`QR_DURATION = 30 * 60 * 1000` (30 minutes).

### QR window

The QR cannot be released before `QR_LEAD_TIME_MS = 60 * 60 * 1000` (1 hour)
before the scheduled visit time; `assertQrWindowOpen()` enforces this and returns
`QR_NOT_YET_AVAILABLE` with the `availableFrom` timestamp otherwise.

### QR scanning

`scanVisitQr(securityId, qrToken)` loads every `QR_GENERATED`, unexpired visit and
`bcrypt.compare`s the supplied token against each `qrTokenHash`. On a match it
atomically sets `QR_SCANNED`, records `qrScannedAt` and `qrScannedBy`. If another
officer already scanned it, the update matches nothing and the scan fails.

### Check-in

`checkInVisit(securityId, visitId)` requires the visit to be `QR_SCANNED` or
`QR_GENERATED`, an unexpired `qrExpiresAt`, a recorded `qrScannedAt`/`qrScannedBy`,
and that the scanning officer is the same one checking in (otherwise `403`).
Success sets `CHECKED_IN`, `checkedInAt`, `securityId` and clears `qrToken`, then
notifies the resident and the security role.

### Check-out

`checkOutVisit(securityId, visitId)` requires `CHECKED_IN`, then sets
`CHECKED_OUT`, `checkedOutAt` and `checkOutSecurityId`, and notifies the resident.

### Expiration

`expireStaleVisits()` moves `PENDING` visits whose `otpExpiresAt` has passed and
`QR_GENERATED` visits whose `qrExpiresAt` has passed to `EXPIRED` (clearing
`qrToken` for the latter). It runs every 60 seconds from `index.js`, before
resident/security listings, and on demand via
`POST /api/admin/visits/expire-stale`.

### Chat

Visitor chat unlocks once the visit is `APPROVED`, `QR_GENERATED`, `QR_SCANNED` or
`CHECKED_IN` (`VISIT_CHAT_ALLOWED_STATUSES`).

### Visit statuses and state transitions

```mermaid
stateDiagram-v2
    [*] --> PENDING: VISITOR_REQUEST created
    [*] --> APPROVED: RESIDENT_INVITE created
    PENDING --> APPROVED: resident approves
    PENDING --> REJECTED: resident rejects
    PENDING --> EXPIRED: OTP window lapses
    APPROVED --> QR_GENERATED: QR issued
    QR_GENERATED --> QR_SCANNED: security scans
    QR_GENERATED --> EXPIRED: QR window lapses
    QR_SCANNED --> CHECKED_IN: security checks in
    CHECKED_IN --> CHECKED_OUT: security checks out
    REJECTED --> [*]
    EXPIRED --> [*]
    CHECKED_OUT --> [*]
```

---

## 15. MAINTENANCE / TICKET SYSTEM

### Ticket creation

`POST /api/resident/tickets` creates a `MaintenanceTicket` for the calling
resident with `status: OPEN`. Fields: `title` (3–150), `category`, `description`
(10–1000), optional `priority` (default `MEDIUM`) and optional `attachmentUrl`.

### Priority

`LOW`, `MEDIUM`, `HIGH`, `URGENT` (default `MEDIUM`).

### Categories

`PLUMBING`, `ELECTRICITY`, `ELEVATOR`, `AC`, `GENERAL`.

### Assignment

A technician submits an `Offer`; the resident accepts one with
`PATCH /api/resident/offers/:offerId/accept`, which sets `assignedTo` and moves
the ticket to `ASSIGNED`.

### Technician interaction

Technicians list `GET /api/technician/available-tickets`, inspect one, and act
with `PATCH /tickets/:id/start` (`IN_PROGRESS`), `PATCH /tickets/:id/resolve`
(`RESOLVED`) or `POST /tickets/:id/skip` (adds to `skippedBy` and returns the
ticket to the pool).

### Status lifecycle

Transitions are validated by `canTransitionTicket` / `assertTicketTransition`
using `TICKET_TRANSITIONS`:

```mermaid
stateDiagram-v2
    [*] --> OPEN: resident creates
    OPEN --> ASSIGNED: offer accepted
    ASSIGNED --> IN_PROGRESS: technician starts
    ASSIGNED --> OPEN: technician skips
    IN_PROGRESS --> RESOLVED: technician resolves
    RESOLVED --> CLOSED: resident closes
    CLOSED --> [*]
```

### Comments

There is no free-text comment thread on a ticket. Communication happens through
the offer `note`, the negotiation `message` and chat.

### Negotiations

Each `Offer` has a `Negotiation` thread (`GET`/`POST
/api/.../offers/:offerId/negotiations`) where the resident and technician exchange
`price` proposals with an optional `message`; `senderRole` is `RESIDENT` or
`TECHNICIAN`.

### Offers

A technician creates an offer with `price`, `estimatedDuration` and optional
`note`; can update it (`PATCH /offers/:id`) or withdraw it
(`PATCH /offers/:id/withdraw` → `WITHDRAWN`). One offer per technician per ticket
is enforced by a unique compound index.

### Reviews and ratings

After a job, the resident can create one review per ticket
(`POST /api/resident/tickets/:ticketId/review`) with `rating` 1–5 and an optional
comment, and can update or delete it. Reviews feed the technician's `rating` and
`totalReviews` on the `User` document.

### Notifications

Ticket and offer activity raises `MAINTENANCE_CREATED`, `NEW_OFFER`,
`NEW_NEGOTIATION`, `OFFER_ACCEPTED`, `OFFER_REJECTED`, `TICKET_ASSIGNED` and
`TICKET_STATUS_CHANGED` notifications.

### Permissions

Residents act on their own tickets; technicians act on available/assigned
endpoints; admins can list and update any ticket's status.

### Relationships

`MaintenanceTicket` ← `Offer` ← `Negotiation`; `MaintenanceTicket` → `Review`;
`MaintenanceTicket` → `Invoice` (optional); `MaintenanceTicket` → assigned
`User`.

---

## 16. INVOICE SYSTEM

### Invoice creation

`POST /api/admin/invoices` creates an `Invoice` for a resident with `residentId`,
`amount` (min 0), `dueDate` (required), optional `description`, optional `unitId`
and optional `ticketId`. Status starts at `PENDING`.

### Fields

`residentId`, `ticketId`, `unitId`, `description` (max 300), `amount`, `status`,
`paymentSubmittedAt`, `paymentReference` (max 200), `dueDate`, `paidAt`.

### Amount

`amount` is required and must be `>= 0`.

### Status

`PENDING`, `PAYMENT_SUBMITTED`, `PAID`, `OVERDUE`, `CANCELLED`.

### Due date

`dueDate` is required. `OVERDUE` is a defined status; the codebase defines
`INVOICE_DUE` as a notification type. **Automatic transition to `OVERDUE` by a
scheduled job is not clearly defined in the current codebase** — status changes
are made through `PATCH /api/admin/invoices/:invoiceId/status`.

### Payment behaviour

The resident calls `PATCH /api/resident/invoices/:invoiceId/pay`, which records
the payment submission (`paymentSubmittedAt`, `paymentReference`) and moves the
invoice to `PAYMENT_SUBMITTED`. An admin then confirms with
`PATCH /api/admin/invoices/:invoiceId/status` to reach `PAID` (setting `paidAt`).
There is no payment gateway integration.

### Relationships

`Invoice` → `User` (resident); optionally → `MaintenanceTicket` (unique + sparse:
at most one invoice per ticket) and → `Unit`.

### Ticket relationship

When an invoice is linked to a ticket, the resident's invoice list labels it as a
maintenance charge and links back to the ticket, and the admin's ticket view shows
the invoice raised for that job.

### Admin actions

Create invoices, list/filter them, view one, and update status.

### Resident actions

List own invoices, view them, and submit payment.

### Notifications

`INVOICE_CREATED`, `INVOICE_DUE`, `INVOICE_PAID`, `INVOICE_PAYMENT_SUBMITTED` and
`INVOICE_UPDATED`.

---

## 17. NOTIFICATIONS

### Notification model

`Notification` has `userId`, `type`, `title` (max 150), `message` (max 500),
`relatedId` and `isRead`. See section 6.10 for the full `type` enum.

### Notification creation

`notificationService.createNotification({ userId, type, title, message, relatedId })`
persists the document and, when the Socket.IO server has been injected, emits
`notification:new` to `user:<userId>`. Failures are caught and logged so they
never break the calling flow.

### Types

The 21 values listed in section 6.10, grouped as visitor (5), maintenance/offers
(7), chat (1), account (2) and invoice (5).

### Recipients

A single user (`createNotification`) or every `ACTIVE` user holding a role
(`notifyRole`).

### Read / unread behaviour

`isRead` defaults to `false`. `PATCH /:id/read` marks one; `PATCH /read-all` marks
all of the user's unread notifications.

### APIs

`GET /api/notifications` (optional `?unread=true`, newest first, limit 100),
`PATCH /api/notifications/read-all`, `PATCH /api/notifications/:id/read`,
`DELETE /api/notifications/:id`.

### Frontend handling

`NotificationService` exposes `unreadCount` as a signal, refreshes it via
`getNotifications(true)`, decrements on `markAsRead`, and resets to 0 on
`markAllAsRead`.

### Real-time behaviour

The single `notification:new` socket event carries the persisted notification;
screens filter by `payload.type` and reload the affected data.

---

## 18. EMAIL SERVICES

### Email service

`backend/services/emailService.js`.

### Provider / library

`nodemailer` with `service: "gmail"`, authenticated by `EMAIL_USER` and
`EMAIL_APP_PASSWORD`.

### Senders

| Function | Trigger | Recipient |
| -------- | ------- | --------- |
| `sendOtpEmail(to, otp, visitorName)` | OTP generation for a visit | The visitor's email |
| `sendPasswordResetEmail(to, token)` | `POST /api/auth/forgot-password` when the email exists | The account's email |
| `sendVisitorRequestEmail({...})` | Visitor request creation and resident invite | The visitor's email |

### Templates

All three send both a plain-text and an HTML body. The OTP email states a
5-minute expiry; the reset email states a 15-minute expiry and contains the reset
link; the visitor email includes a details table, a "what happens next" list and
an optional tracking link.

### Triggering events

- Visitor request created → `sendVisitorRequestEmail`.
- Resident invites a visitor → `sendVisitorRequestEmail` (invite wording).
- OTP issued → `sendOtpEmail`.
- Password reset requested and the email exists → `sendPasswordResetEmail`.

### Configuration

`EMAIL_USER` (from address and SMTP user) and `EMAIL_APP_PASSWORD`. Links use
`FRONTEND_URL` (defaults to `http://localhost:4200`).

### Error handling

Email sends are wrapped in `try/catch` and failures are logged with
`console.error`; the calling request still succeeds. `forgot-password` returns a
generic message either way, so it does not reveal whether an email exists.

---

## 19. USER / UNIT / BUILDING MANAGEMENT

### User lifecycle

```mermaid
stateDiagram-v2
    [*] --> PENDING: self-registration
    PENDING --> ACTIVE: admin approves
    PENDING --> REJECTED: admin rejects
    ACTIVE --> [*]
    REJECTED --> [*]
```

Only `ACTIVE` users can log in or use the API/socket. The admin seed creates an
already-`ACTIVE` admin. There is no in-app path to create a second admin.

### Pending / active / rejected states

`status` is one of `PENDING`, `ACTIVE`, `REJECTED`, defaulting to `PENDING` on
registration. Admins change it with `PATCH /api/admin/users/:userId/approve` or
`.../reject`.

### Unit assignment

A resident supplies `unitId` at registration. The service verifies the unit
exists and is not `OCCUPIED`, and the `User.unitId` unique sparse index guarantees
one resident per unit.

### Occupancy

`Unit.status` is `VACANT` or `OCCUPIED`. Admins manage it through
`PATCH /api/admin/units/:unitId`.

### Building relationships

`Unit.buildingId` references `Building`; a building has a unique
`buildingNumber` and a `unitsCount`.

### Admin management

Admins list/view/approve/reject/update users, and create/update buildings and
units.

---

## 20. ADMIN SYSTEM

All admin endpoints are guarded by `router.use(authMiddleware,
roleMiddleware("ADMIN"))` in `adminRoutes.js`.

| Area | Endpoints |
| ---- | --------- |
| Dashboard | `GET /api/admin/dashboard` |
| User management | `GET /users`, `GET /users/:userId`, `PATCH /users/:userId`, `PATCH /users/:userId/approve`, `PATCH /users/:userId/reject` |
| Buildings | `GET /buildings`, `POST /buildings`, `PATCH /buildings/:buildingId` |
| Units | `GET /units`, `POST /units`, `PATCH /units/:unitId` |
| Invoices | `GET /invoices`, `GET /invoices/:invoiceId`, `POST /invoices`, `PATCH /invoices/:invoiceId/status` |
| Maintenance | `GET /maintenance`, `GET /maintenance/:ticketId`, `PATCH /maintenance/:ticketId/status` |
| Visits | `GET /visits`, `GET /visits/:visitId`, `POST /visits/expire-stale` |
| Reports | `GET /reports`, `GET /reports/full` |

**Frontend screens:** `/admin/dashboard`, `/admin/users`, `/admin/compound`,
`/admin/maintenance`, `/admin/visitors`, `/admin/invoices`,
`/admin/invoices/:invoiceId`, `/admin/reports`.

Admins also receive role-targeted notifications through `notifyRole("ADMIN", …)`,
which is how they learn about changes made by technicians and residents.

---

## 21. SECURITY

Mechanisms that are actually implemented:

| Mechanism | Implementation |
| --------- | -------------- |
| Password hashing | bcrypt, 10 rounds, in a `pre("save")` hook; `password` is `select: false` |
| JWT authentication | `jsonwebtoken`, HS256, `1d` expiry, payload `{ userId, role }`, secret from `JWT_SECRET` |
| Account activation gate | `authMiddleware` and the login service both require `status === "ACTIVE"` |
| RBAC | `roleMiddleware(...roles)` per route; role-aware `authGuard` and nav filter on the client |
| OTP protection | 6-digit code, bcrypt-hashed, 5-minute expiry, maximum 5 attempts, atomic attempt increment |
| QR protection | 32-byte random token, bcrypt-hashed at rest, 30-minute expiry, single-officer scan binding |
| Visitor chat tokens | 32-byte random token, SHA-256-hashed at rest, 24-hour TTL, scoped to one visit |
| Password reset tokens | 32-byte random token, SHA-256-hashed, 15-minute expiry, single use (cleared on reset) |
| Reset request privacy | `forgot-password` returns the same message whether or not the email exists |
| Login privacy | A wrong password and a missing user return the same message |
| Upload restrictions | MIME allow-list (jpeg/png/webp/gif) and a 5 MB size cap via multer |
| Field selection | Sensitive fields (`password`, OTP/QR/token hashes, reset fields) use `select: false` |
| Atomic state transitions | `findOneAndUpdate` with status guards prevents double scan/check-in/approval |
| CORS | Restricted to `FRONTEND_URL` (default `http://localhost:4200`) for both HTTP and Socket.IO |
| Socket authentication | `io.use(...)` rejects unauthenticated connections before any handler runs |
| Ownership checks | Residents can only read/act on their own tickets, invoices and visits; chat join verifies participation |

Not implemented (do not assume otherwise): rate limiting, helmet/security headers,
refresh-token rotation, server-side JWT revocation/blacklist, CSRF tokens, account
lockout, and audit logging beyond `console` output.

---

## 22. ERROR HANDLING

### HTTP errors

Controllers wrap their logic in `try/catch` and respond with
`res.status(code).json({ success: false, message })`. Services throw `Error`
objects, often attaching `statusCode` (400/403/404) which the controller honours
via `error.statusCode || <default>`.

### Validation errors

Field validation is split between Mongoose schema rules (lengths, enums, min/max)
and explicit service checks (required fields, password length, role rules,
occupancy). Service errors surface as `400`; schema errors thrown during `save()`
are caught by the controller's `catch` and returned as `400`.

### Authentication errors

See the table in section 7. Missing/malformed/expired tokens → `401`; a valid token
for a non-`ACTIVE` account → `403`.

### Authorization errors

`roleMiddleware` returns `403` `"Access denied"` when the role is not permitted,
and `401` `"Authentication required"` when `req.user` is absent. Ownership checks
inside services return `403`/`404` as appropriate (for example the check-in
officer mismatch returns `403`).

### Database errors

Connection failures in `config/db.js` log the error and call `process.exit(1)`.
Duplicate-key errors (`code === 11000`) are translated into user-facing messages
in `authService.registerUser`.

### Service errors

Services throw `Error` with a descriptive `message` and, where relevant, a
`statusCode`. `notificationService` and the email sends deliberately swallow
errors (logging them) so they cannot break the primary operation.

### Frontend errors

Components subscribe to observables and read `error.error?.message` to display a
message. `provideBrowserGlobalErrorListeners()` is registered in `app.config.ts`
to surface uncaught browser errors. Socket handlers emit `chat:error` with a
message on failure.

### Global error handling

There is no Express error-handling middleware registered; each controller handles
its own errors. The backend relies on per-route `try/catch`.

---

## 23. TESTING

### Backend

- **Framework:** `node:test` with `node:assert/strict`.
- **Command:** `npm test` from the project root, which runs
  `node --test "backend/tests/**/*.test.js"`.
- **Structure:** one file per concern in `backend/tests/`, named `*.test.js`.
- **Naming:** each file groups related `test(...)` cases with descriptive titles.
- **What is covered:** the route surface (routes exist with the expected methods
  and paths), the ticket and visit state machines, status predicates and
  transition helpers, billing arithmetic, and validation rules.
- **Database:** the suite does not require a live database.
- **Manual probes:** `backend/tests/manual/` contains hand-run socket and API
  scripts that are **not** part of `npm test` and expect a running backend.

### Frontend

- **Framework:** Vitest, run through `ng test` (`@angular/build:unit-test`).
- **Command:** `npm test` inside `frontend/`.
- **Structure:** `*.spec.ts` files colocated with the code they test, plus
  behaviour specs for pages (for example the OTP verification page).
- **Environment:** jsdom.

### Coverage

No coverage tooling or coverage thresholds are configured in either
`package.json`.

---

## 24. DEVELOPMENT COMMANDS

| Purpose | Command | Where |
| ------- | ------- | ----- |
| Install backend dependencies | `npm install` | project root |
| Run the backend | `npm start` | project root |
| Run the backend with watch | `npm run dev` | project root |
| Seed the admin account | `npm run seed:admin` | project root |
| Seed demo compound data | `npm run seed:demo` | project root |
| Backend tests | `npm test` | project root |
| Install frontend dependencies | `npm install` | `frontend/` |
| Frontend dev server | `npm start` (`ng serve`) | `frontend/` |
| Frontend production build | `npm run build` (`ng build`) | `frontend/` |
| Frontend watch build | `npm run watch` | `frontend/` |
| Frontend tests | `npm test` (`ng test`) | `frontend/` |
| Angular CLI passthrough | `npm run ng -- <args>` | `frontend/` |

---

## 25. ENVIRONMENT CONFIGURATION

| Name | Required | Purpose | Example | Consumed by |
| ---- | -------- | ------- | ------- | ----------- |
| `DB_URI` | Yes | MongoDB connection string | `mongodb+srv://user:pass@cluster/db` | `config/db.js`, `seed/adminSeed.js`, `seed/demoSeed.js` |
| `JWT_SECRET` | Yes | Signs/verifies JWTs | `YOUR_JWT_SECRET_HERE` | `authService.js`, `authMiddleware.js`, `chatSocket.js` |
| `EMAIL_USER` | Yes | Gmail sender/SMTP user | `you@example.com` | `emailService.js` |
| `EMAIL_APP_PASSWORD` | Yes | Gmail app password | `YOUR_APP_PASSWORD_HERE` | `emailService.js` |
| `ADMIN_EMAIL` | For `seed:admin` | Admin account email | `admin@example.com` | `seed/adminSeed.js` |
| `ADMIN_PASSWORD` | For `seed:admin` | Admin account password (min 8) | `YOUR_ADMIN_PASSWORD_HERE` | `seed/adminSeed.js` |
| `PORT` | No | HTTP port (default `3000`) | `3000` | `index.js` |
| `FRONTEND_URL` | No | CORS origin and email link base (default `http://localhost:4200`) | `http://localhost:4200` | `index.js`, `emailService.js`, `visitService.js` |

Never commit real values; `.env` is gitignored.

---

## 26. CONFIGURATION

| Area | Where | Value |
| ---- | ----- | ----- |
| CORS (HTTP) | `index.js` | `origin: FRONTEND_URL \|\| "http://localhost:4200"` |
| CORS (Socket.IO) | `index.js` | Same origin; methods `GET`, `POST`, `PATCH` |
| Backend port | `index.js` | `process.env.PORT \|\| 3000` |
| Static uploads | `index.js` | `/uploads` → `backend/uploads` |
| Visit expiry sweep | `index.js` | Every 60 s (`60 * 1000`) |
| Database | `backend/config/db.js` | `mongoose.connect(DB_URI)`; sets DNS resolvers to `8.8.8.8` and `1.1.1.1` |
| JWT | `authService.js` | HS256, `expiresIn: "1d"` |
| OTP | `visitService.js` | 5-minute expiry, 5 attempts |
| QR | `visitService.js` | 30-minute validity, 1-hour release lead time |
| Visitor chat token | `visitService.js` | 24-hour validity |
| Password reset token | `authService.js` | 15-minute validity |
| Upload limits | `uploadMiddleware.js` | 5 MB; jpeg/png/webp/gif |
| Frontend API base | `environments/environment.ts` | `apiBaseUrl: http://localhost:3000`, `apiUrl: http://localhost:3000/api` |
| Angular build budgets | `angular.json` | initial warning 600 kB / error 1 MB; component style warning 40 kB / error 64 kB |
| Frontend allowed CommonJS | `angular.json` | `qrcode`, `jsqr` |

---

## 27. TROUBLESHOOTING

| Problem | Likely cause | Solution |
| ------- | ------------ | -------- |
| Backend exits immediately with a DB error | `DB_URI` missing or unreachable | Set a valid `DB_URI`; the connection error is logged and the process exits with code 1 |
| `querySrv ECONNREFUSED` for a `mongodb+srv://` URI | Local DNS cannot resolve SRV records | Use a network/resolver that can resolve SRV, or a non-SRV connection string |
| Login fails with "Account is not active" | The account is still `PENDING` or was `REJECTED` | An admin must approve it via `PATCH /api/admin/users/:userId/approve` |
| Registration fails with "Unit is already occupied" / "already reserved" | The unit is taken | Pick a `VACANT` unit from `GET /api/units/available` |
| Registration fails with "Invalid registration role" | Attempting to register as `ADMIN` | Admin accounts are created by `npm run seed:admin` |
| No OTP / reset email arrives | `EMAIL_USER`/`EMAIL_APP_PASSWORD` wrong, or Gmail blocked the sign-in | Use a Gmail app password; check the server log for "Failed to send ... email" |
| `npm run seed:admin` says the env vars are missing | `ADMIN_EMAIL`/`ADMIN_PASSWORD` unset | Add both to `.env` |
| Frontend requests fail with CORS errors | Backend `FRONTEND_URL` does not match the browser origin | Set `FRONTEND_URL` to the exact frontend origin |
| QR cannot be generated | More than 1 hour before the scheduled visit | Wait until the QR window opens; the error includes `QR_NOT_YET_AVAILABLE` and `availableFrom` |
| QR scan fails | The pass expired, was already scanned, or the token is wrong | Ask the resident to re-issue; only one officer can scan a pass |
| Check-in returns 403 | The QR was scanned by a different security officer | The scanning officer must perform the check-in |
| "Port 4200 is already in use" | Another dev server is running | Stop it, or serve on another port |
| Socket connects but no events arrive | Listening on a notification `type` instead of the `notification:new` event | Subscribe to `notification:new` and filter by `payload.type` |
| Uploaded images 404 | The `/uploads` path is not served | Ensure the backend is running (it mounts `/uploads` statically) |

---

## 28. ARCHITECTURAL STRENGTHS

Each of these is directly supported by the implementation.

- **Clear layering.** Routes → controllers → services → models, with controllers
  containing no business rules and services containing no `req`/`res` handling.
- **A single status vocabulary.** `backend/utils/statusConstants.js` freezes every
  enum and the ticket transition table, and the frontend mirrors it in
  `core/models/status.ts`, so status strings are not reinvented per module.
- **Explicit state machines.** Ticket transitions are validated by
  `assertTicketTransition`, and visit transitions are guarded by atomic
  `findOneAndUpdate` conditions, which prevents double approvals, double scans and
  double check-ins.
- **Reusable middleware.** Authentication and role checks are composable one-liners
  (`router.use(authMiddleware, roleMiddleware("ADMIN"))`).
- **Sensitive fields are not accidentally serialised.** `select: false` on the
  password and on every OTP/QR/token hash means those values are opt-in at the
  query level.
- **A single realtime channel.** One Socket.IO connection serves both chat and
  notifications, and `notifyRole` gives role-wide fan-out without a message broker.
- **Single source of truth for shared frontend logic.** `core/` is the only home
  for guards, interceptors, singleton services and shared utils.
- **Lazy routing.** Every feature route uses `loadComponent`, so features are
  code-split.
- **Derived aggregates.** `residentDashboardService` computes the "Paid" figure and
  the invoice list together, so the dashboard and the invoices page cannot drift.
- **Graceful side effects.** Notification and email failures are caught and logged,
  so a failed email never fails the underlying operation.

---

## 29. KNOWN LIMITATIONS

Verified from the current codebase.

- **No Express global error handler.** Each controller catches its own errors; an
  unexpected throw outside a `try/catch` would fall through to Express's default
  handler.
- **No automated end-to-end tests.** Coverage is limited to route-surface checks,
  state machines and pure logic; no browser or full-stack integration tests are
  committed.
- **No rate limiting, security headers or CSRF protection.** None of these are
  configured.
- **No token revocation.** JWTs remain valid until their `1d` expiry; logout only
  clears client storage.
- **QR scanning scales with active passes.** `scanVisitQr` loads every unexpired
  `QR_GENERATED` visit and bcrypt-compares each one, because only the hash is
  stored.
- **`OVERDUE` is not applied automatically.** No scheduled job moves past-due
  invoices to `OVERDUE`; it is a defined status with an `INVOICE_DUE` notification
  type, but the transition is not automated.
- **No payment gateway.** "Paying" records a reference and awaits admin
  confirmation; no money moves.
- **No ticket comment thread.** Communication is limited to offer notes,
  negotiations and chat.
- **Frontend `InvoiceStatus` omits `PAYMENT_SUBMITTED`.** `core/models/status.ts`
  lists `PENDING | PAID | OVERDUE | CANCELLED`, while the backend model and
  `statusConstants.js` include `PAYMENT_SUBMITTED`.
- **Admin accounts are seed-only.** There is no in-app promotion to `ADMIN`.
- **Pagination is partial.** Notifications are capped at 100 and visitor lookup at
  25; other list endpoints return all matches.
- **Uploads are local-disk only.** `multer` writes to `backend/uploads/`, which is
  gitignored and recreated on demand; there is no object storage or signed URLs.
- **No soft-delete/archival strategy** beyond the chat `deletedFor`/`isDeleted`
  flags; deleting other records is not supported.
- **Email is Gmail-specific.** `emailService.js` hardcodes `service: "gmail"`.
- **`socket.io-client` is a root backend dependency** but is used only by the
  manual probe scripts, not by the running server.

---

## 30. FUTURE EXTENSION GUIDE

Follow the existing structure so new work stays consistent.

### Adding a new role

1. Add the value to the `role` enum in `backend/models/user.js`.
2. Add it to `USER_ROLE` in `backend/utils/statusConstants.js`.
3. Add it to `UserRole` and `ROLE_HOME` / `ROLE_LABEL` in
   `frontend/src/app/core/models/status.ts`.
4. Allow it in `authService.registerUser` if it may self-register.
5. Add a route shell in `app.routes.ts` with `data: { roles: [...] }`.
6. Add its navigation entries to `NAV_ITEMS` in `nav-items.ts`.

### Adding a new model

1. Create `backend/models/<name>.js` following the existing pattern
   (`timestamps: true`, indexes, `enum` where relevant).
2. Add indexes for the queries you will actually run.
3. Reference it from the service that owns it — models are never imported directly
   by routes.

### Adding a new API module

1. Create `backend/routes/<name>Routes.js`.
2. Create `backend/controllers/<name>Controller.js`.
3. Create `backend/services/<name>Service.js` for the rules.
4. Mount it in `index.js` with `app.use("/api/<name>", <name>Routes)`.
5. Apply `authMiddleware` and `roleMiddleware(...)` as needed.

### Adding a new endpoint

Add the handler to the controller (parse input → call service → shape response),
add the business logic to the service, then register the route in the matching
router. Add a case to the relevant `*.test.js` route-surface test.

### Adding a new controller

Keep it thin: read from `req` (body, params, `req.user`), call one service
function, and respond. Never query models directly.

### Adding a new service

Put every business rule there, throw `Error` with `statusCode` for expected
failures, and export a named object at the bottom of the file.

### Adding a new frontend page

1. Create the component under `Components/<audience>/<page>/`.
2. Register it in `app.routes.ts` with `loadComponent` and, if protected,
   `data: { roles: [...] }` inside the correct shell.
3. Add a nav entry to `NAV_ITEMS` if it should appear in the sidebar.

### Adding a new frontend service

Put a shared singleton in `core/services/`; put a feature client in `Services/`
and its interfaces in `Models/`. Build the URL from `environment.apiUrl`.

### Adding a new Socket.IO event

Register the handler in `socket/chatSocket.js` inside the `connection` block,
check `socket.authType` for the allowed identity, call a service function, and
broadcast with `io.to(...)` or `socket.emit(...)`. Expose a helper on `ChatSocket`
for the client.

### Adding a new notification type

1. Add the value to the `Notification` `type` enum in
   `backend/models/notification.js`.
2. Add it to `NotificationType` in `frontend/src/app/core/models/status.ts`.
3. Emit it via `createNotification` or `notifyRole`.

### Adding a new workflow

Model it as a status enum plus a transition table (like `TICKET_TRANSITIONS`),
enforce transitions atomically with `findOneAndUpdate`, add the transition helper
next to the enum, and mirror the enum on the frontend.

---

## 31. MAINTENANCE GUIDELINES

### Where backend logic belongs

| Kind of change | Location |
| -------------- | -------- |
| Business rule or lifecycle transition | `backend/services/` |
| Input parsing and HTTP status selection | `backend/controllers/` |
| New path/method | `backend/routes/` |
| Schema, validation, index, hook | `backend/models/` |
| Cross-cutting request concern | `backend/middleware/` |
| Realtime handler | `backend/socket/chatSocket.js` |
| Shared enum/predicate | `backend/utils/statusConstants.js` |

### Where database logic belongs

All queries live in services. Controllers never import a model; models never
orchestrate across collections.

### Where API routes belong

In `backend/routes/`, mounted once in `index.js`. Keep the router file declarative
(path, middleware, controller) and put nothing else in it.

### Where frontend API calls belong

In `frontend/src/app/Services/` (feature clients) or
`frontend/src/app/core/services/` (app-wide singletons). Components should not
call `HttpClient` directly.

### Where guards / interceptors should be changed

`core/guards/auth-guard.ts` and `core/interceptors/auth-interceptor.ts`. There is
exactly one of each; do not add per-feature copies.

### Where Socket.IO logic belongs

Server handlers: `backend/socket/chatSocket.js`. Client wrapper:
`core/services/chat-socket.ts`. Realtime screen refresh helpers:
`core/utils/realtime-refresh.ts`.

### How to avoid breaking existing workflows

- Keep the status vocabulary in `statusConstants.js` as the single source; mirror
  changes to `core/models/status.ts` in the same commit.
- Do not change a status string without checking the transition tables, the
  `Notification` enum and the frontend enums together.
- Preserve the atomic `findOneAndUpdate` guards on approval, scan and check-in;
  replacing them with read-then-write would reintroduce double-processing races.
- Keep `select: false` on secrets and always `select("+")` explicitly when a
  service genuinely needs them.
- When adding a socket event, gate it on `socket.authType` so visitors and users
  cannot cross over.
- Run `npm test` (root) and `npm test` (frontend) plus `npm run build` (frontend)
  before committing.
- Update `README.md` and this file when behaviour changes.
