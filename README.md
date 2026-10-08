# CivicSync — Smart Compound Management System

> **Smarter Communities. Safer Management.**

CivicSync is a full-stack **Smart Compound Management System** designed to bring the daily operations of a residential compound into one connected platform.

Instead of relying on phone calls, paper records, separate messages and manual tracking, CivicSync provides a single system for **residents, technicians, security staff and administrators** to manage maintenance, visitors, invoices, notifications and communication.

---

##  Overview

Managing a residential compound involves several connected processes:

- Maintenance requests and technician coordination
- Visitor requests and access control
- Invoices and payment tracking
- Security check-in and check-out
- Communication between residents and staff
- Account approval and compound management

CivicSync connects these processes into one platform with **role-based access, real-time communication and controlled workflows**.

### The Core Idea

**One Compound → One Connected System**

```text
                    ┌─────────────────────┐
                    │      CivicSync      │
                    │  Smart Compound     │
                    │ Management System   │
                    └──────────┬──────────┘
                               │
          ┌────────────┬───────┼────────┬────────────┐
          │            │       │        │            │
       Resident    Technician Security Admin      Visitor
          │            │       │        │            │
          └────────────┴───────┼────────┴────────────┘
                               │
                    ┌──────────▼──────────┐
                    │  REST API +         │
                    │  Socket.IO          │
                    └──────────┬──────────┘
                               │
                    ┌──────────▼──────────┐
                    │      MongoDB        │
                    └─────────────────────┘
```

---

#  Key Features

##  Resident Management

Residents can:

- Register and select an available unit
- Manage their profile
- Create and track maintenance tickets
- Receive technician offers
- Negotiate prices
- Accept offers
- Review completed maintenance work
- Invite visitors
- Approve or reject visitor requests
- Access invoices
- Submit payment references
- Communicate through real-time chat
- Receive real-time notifications

---

##  Maintenance Management

CivicSync provides a complete maintenance workflow:

```text
OPEN
  ↓
ASSIGNED
  ↓
IN_PROGRESS
  ↓
RESOLVED
  ↓
CLOSED
```

Residents create maintenance tickets with:

- Title
- Category
- Description
- Priority
- Optional attachment

Technicians can:

- Browse available requests
- Submit offers
- Negotiate prices
- Accept assigned jobs
- Start work
- Resolve jobs
- Skip requests
- Receive reviews and ratings

### Offer & Negotiation Flow

```text
Resident creates ticket
        ↓
Technicians submit offers
        ↓
Resident reviews offers
        ↓
Price negotiation
        ↓
Resident accepts offer
        ↓
Technician assigned
        ↓
Work starts
        ↓
Job resolved
        ↓
Resident closes ticket
        ↓
Review & rating
```

---

##  Visitor Access Control

CivicSync provides an end-to-end visitor management workflow without requiring visitors to create accounts.

```text
Visitor Request
      ↓
Email OTP Verification
      ↓
Resident Approval
      ↓
QR Pass Generated
      ↓
Security Scans QR
      ↓
Check-In
      ↓
Visit
      ↓
Check-Out
```

### Visitor Security

The visitor system includes:

- Email OTP verification
- OTP expiration
- Maximum OTP attempts
- Resident approval/rejection
- Secure QR tokens
- QR expiration
- QR release time window
- Security QR scanning
- Security officer binding
- Check-in/check-out tracking
- Automatic stale visit expiration
- Visitor-specific chat access

Visitors use a dedicated temporary chat token instead of a normal user account.

---

##  Invoice Management

Administrators can create and manage invoices for residents.

Supported invoice lifecycle:

```text
PENDING
   ↓
PAYMENT_SUBMITTED
   ↓
PAID
```

Additional states:

- `OVERDUE`
- `CANCELLED`

Residents can:

- View their invoices
- View invoice details
- Submit a payment reference
- Track payment status

> CivicSync does **not** process real money. The payment feature records a payment submission and allows the administrator to confirm it.

Invoices can optionally be linked to maintenance tickets.

---

##  Real-Time Communication

CivicSync uses **Socket.IO** for real-time communication.

### Chat Types

- Direct conversations
- Compound-wide groups
- Building groups
- Visitor conversations

### Chat Features

- Real-time messaging
- Read state
- Message deletion
- Conversation hiding
- Visitor chat
- Role-based chat permissions
- Ticket-based resident ↔ technician communication

The same Socket.IO connection is also used for real-time notifications.

---

##  Notifications

Notifications are persisted in MongoDB and delivered in real time.

Examples include:

- Visitor requests
- Visitor approval/rejection
- Visitor check-in/check-out
- New maintenance tickets
- New technician offers
- Negotiations
- Offer acceptance
- Ticket assignment/status changes
- Account approval/rejection
- Invoice events
- New messages

Unread notifications are tracked and exposed through the frontend UI.

---

#  User Roles

| Role | Main Responsibility |
|---|---|
| **Resident** | Maintenance, visitors, invoices, communication |
| **Technician** | Maintenance offers, jobs, negotiations and reviews |
| **Security** | Visitor scanning and access control |
| **Admin** | Users, buildings, units, invoices, visits, maintenance and reports |
| **Visitor** | Temporary visitor access and visitor chat without an account |

Each authenticated account has one role and receives access only to the functionality associated with that role.

---

#  System Architecture

CivicSync follows a layered full-stack architecture.

```text
┌───────────────────────────────────────────────┐
│                Angular Frontend               │
│                                               │
│ Components → Services → Core → Signals       │
└──────────────────────┬────────────────────────┘
                       │
                 HTTP / Socket.IO
                       │
┌──────────────────────▼────────────────────────┐
│              Express Backend                  │
│                                               │
│ Routes → Controllers → Services → Models      │
└──────────────────────┬────────────────────────┘
                       │
                  Mongoose ODM
                       │
┌──────────────────────▼────────────────────────┐
│                   MongoDB                     │
└───────────────────────────────────────────────┘

                 ┌───────────────┐
                 │  Gmail SMTP   │
                 │   Nodemailer  │
                 └───────────────┘
```

### Backend Architecture

The backend follows:

```text
Route
  ↓
Middleware
  ↓
Controller
  ↓
Service
  ↓
Model
  ↓
MongoDB
```

Controllers remain thin while business rules and lifecycle logic are handled inside services.

### Frontend Architecture

The Angular application uses:

- Standalone components
- Lazy-loaded routes
- Angular signals
- RxJS
- Route guards
- HTTP interceptors
- Shared services and components
- Role-based navigation

---

#  Technology Stack

## Backend

| Technology | Purpose |
|---|---|
| **Node.js** | Server runtime |
| **Express 5** | REST API |
| **MongoDB** | Database |
| **Mongoose** | ODM |
| **Socket.IO** | Real-time communication |
| **JWT** | Authentication |
| **bcrypt** | Password / OTP / QR hashing |
| **Nodemailer** | Email delivery |
| **Multer** | File uploads |

## Frontend

| Technology | Purpose |
|---|---|
| **Angular 21** | Single-page application |
| **TypeScript** | Application language |
| **RxJS** | Reactive HTTP flows |
| **Socket.IO Client** | Real-time communication |
| **QRCode** | QR generation |
| **jsQR** | QR scanning |
| **Bootstrap 5** | UI utilities |
| **Font Awesome** | Icons |
| **Inter / Manrope** | Typography |

## Testing

| Technology | Purpose |
|---|---|
| **Node.js Test Runner** | Backend tests |
| **Vitest** | Frontend tests |
| **jsdom** | Browser-like test environment |

---

#  Authentication & Security

CivicSync implements several security mechanisms:

- JWT authentication
- Role-based access control
- ACTIVE account verification
- bcrypt password hashing
- Secure OTP hashing
- Secure QR token hashing
- Temporary visitor chat tokens
- Password reset tokens
- Upload MIME/type restrictions
- 5 MB upload limit
- Ownership checks
- Atomic lifecycle transitions
- Protected Socket.IO connections
- Restricted CORS
- Sensitive fields excluded using `select: false`

### Authentication Flow

```text
Register
   ↓
PENDING Account
   ↓
Admin Approval
   ↓
ACTIVE Account
   ↓
Login
   ↓
JWT
   ↓
Protected API / Socket.IO
```

---

#  Database

CivicSync uses MongoDB with **12 Mongoose models**:

1. User
2. Building
3. Unit
4. Visit
5. MaintenanceTicket
6. Offer
7. Negotiation
8. Review
9. Invoice
10. Notification
11. Conversation
12. Message

Important relationships include:

```text
Building
   └── Units
        └── Resident

MaintenanceTicket
   ├── Offers
   │    └── Negotiations
   ├── Review
   └── Invoice

Visit
   └── Visitor Conversation

User
   ├── Notifications
   ├── Conversations
   └── Maintenance / Invoice / Visit relationships
```

The database layer also uses indexes and constraints for important rules such as:

- Unique user emails
- One resident per unit
- Unique units within a building
- One offer per technician per ticket
- One review per ticket
- One invoice per ticket
- One visitor conversation per visit

---

#  Project Structure

```text
CivicSync/
├── index.js
├── package.json
├── README.md
├── DOCUMENTATION.md
├── TASKS.md
├── LICENSE
│
├── backend/
│   ├── config/
│   ├── controllers/
│   ├── middleware/
│   ├── models/
│   ├── routes/
│   ├── seed/
│   ├── services/
│   ├── socket/
│   ├── tests/
│   └── utils/
│
└── frontend/
    ├── angular.json
    ├── package.json
    └── src/
        └── app/
            ├── Components/
            ├── Models/
            ├── Services/
            ├── core/
            └── shared/
```

For the complete project structure and responsibilities of each directory, see the technical documentation.

---

#  Getting Started

## Prerequisites

Make sure you have:

- Node.js
- MongoDB
- npm
- A Gmail account with an App Password for email features

---

## 1. Clone the Repository

```bash
git clone https://github.com/mostafa-tarek-khalil/CivicSync-Smart-Compound-Management-System-Project.git
cd CivicSync-Smart-Compound-Management-System-Project
```

---

## 2. Install Backend Dependencies

```bash
npm install
```

---

## 3. Configure Environment Variables

Create a `.env` file in the project root:

```env
DB_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret

EMAIL_USER=your_gmail@gmail.com
EMAIL_APP_PASSWORD=your_gmail_app_password

ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=your_admin_password

PORT=3000
FRONTEND_URL=http://localhost:4200
```


---

## 4. Seed the Admin

```bash
npm run seed:admin
```

Optional demo data:

```bash
npm run seed:demo
```

---

## 5. Start the Backend

Development mode:

```bash
npm run dev
```

Or:

```bash
npm start
```

Backend:

```text
http://localhost:3000
```

---

## 6. Start the Frontend

Open another terminal:

```bash
cd frontend
npm install
npm start
```

Frontend:

```text
http://localhost:4200
```

---

#  Testing

### Backend

From the project root:

```bash
npm test
```

The backend test suite uses Node's built-in test runner and covers areas including:

- Route surface
- Validation
- Ticket state transitions
- Visit state transitions
- Status predicates
- Billing logic

The backend tests do not require a live database.

### Frontend

```bash
cd frontend
npm test
```

Frontend tests use **Vitest** with **jsdom**.

### Production Build

```bash
cd frontend
npm run build
```

---

#  Main Workflows

## Account Registration

```text
Register
 → Validation
 → Unit / Role checks
 → PENDING
 → Admin approval
 → ACTIVE
 → Login
```

## Maintenance

```text
Ticket
 → Offers
 → Negotiation
 → Accept Offer
 → Assignment
 → Start
 → Resolve
 → Close
 → Review
```

## Visitor

```text
Request
 → OTP
 → Resident Approval
 → QR
 → Security Scan
 → Check-In
 → Check-Out
```

## Invoice

```text
Invoice Created
 → PENDING
 → Payment Submitted
 → PAYMENT_SUBMITTED
 → Admin Confirmation
 → PAID
```

---

#  Documentation

The complete technical reference is available in:

**[`DOCUMENTATION.md`](./DOCUMENTATION.md)**

It contains:

- Complete project structure
- Database schemas
- Authentication details
- Authorization and RBAC
- Complete REST API documentation
- Backend architecture
- Frontend architecture
- Socket.IO events
- Chat implementation
- Visitor lifecycle
- Maintenance lifecycle
- Invoice system
- Notification system
- Email services
- Security implementation
- Error handling
- Testing
- Environment configuration
- Troubleshooting
- Architectural strengths
- Known limitations
- Future extension guide
- Maintenance guidelines

---

#  Known Limitations

CivicSync is a working academic/project system and intentionally has some areas for future improvement:

- No Express global error handler
- No automated end-to-end testing
- No rate limiting
- No security headers / Helmet
- No CSRF protection
- No server-side JWT revocation
- No payment gateway
- No automatic invoice `OVERDUE` transition
- Local-disk file uploads only
- No object storage
- No pagination across all list endpoints
- No soft-delete strategy for most entities
- Admin accounts are seed-based
- Gmail is currently the email provider
- QR scanning currently checks active QR hashes sequentially

These limitations are documented in detail in `DOCUMENTATION.md`.

---

#  Future Improvements

Possible future extensions include:

- Payment gateway integration
- Cloud object storage for uploads
- Automated invoice overdue processing
- Pagination and advanced filtering
- Audit logging
- Rate limiting and security headers
- Refresh-token authentication
- Automated end-to-end testing
- Centralized backend error handling
- More advanced reporting and analytics
- Additional compound management roles
- Mobile application support

---

#  Team

CivicSync was developed as a collaborative team project.

| Member | Role |
|---|---|
| **Mostafa Tarek** | Tech Lead & Full-Stack Developer |
| **Gamal Mahmoud** | Full-Stack Developer |
| **Ahmed Maher** | Backend Developer |
| **Sama Salama** | Full-Stack Developer |
| **Nayera** | Frontend Developer |

Detailed task distribution is available in [`TASKS.md`](./TASKS.md).

---

#  License

This project is licensed under the **MIT License**.

See [`LICENSE`](./LICENSE) for more information.

---

##  CivicSync

**One platform. One connected system. Smarter compound management.**
