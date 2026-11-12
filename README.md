# CampusBite — Campus Pre-Order & Kitchen Management System

<p align="center">
  <img src="https://img.shields.io/badge/Node.js-v18+-339933?style=for-the-badge&logo=node.js&logoColor=white" />
  <img src="https://img.shields.io/badge/Express.js-5.x-000000?style=for-the-badge&logo=express&logoColor=white" />
  <img src="https://img.shields.io/badge/MongoDB-Atlas-47A248?style=for-the-badge&logo=mongodb&logoColor=white" />
  <img src="https://img.shields.io/badge/JWT-Auth-000000?style=for-the-badge&logo=jsonwebtokens&logoColor=white" />
  <img src="https://img.shields.io/badge/Real--Time-SSE-FF6C37?style=for-the-badge" />
  <img src="https://img.shields.io/badge/Deployed-Render-46E3B7?style=for-the-badge&logo=render&logoColor=white" />
</p>

<p align="center">
  <b>A production-grade, real-time campus dining platform built to eliminate lunch-break queue chaos.</b><br/>
  Students pre-order from their phones. Kitchen staff get instant order tickets. No more waiting in line.
</p>

<p align="center">
  <a href="https://campusbite-g03i.onrender.com"><strong>🌐 Live Demo</strong></a> ·
</p>

---

## 🧩 What Problem Does This Solve?

College lunch breaks are **15–30 minutes long**. Manual counter ordering wastes 10 of those minutes standing in line. This platform lets students:

- **Pre-order food** from anywhere on campus before they even leave class
- **Track order status** live (Pending → Preparing → Ready → Completed)
- **Cancel before preparation** if plans change

Kitchen staff get a **live KOT (Kitchen Order Ticket) dashboard** — orders appear the instant students place them, with an audio alert chime. No page refreshes. No polling. Pure Server-Sent Events.

---

## 🏗 System Architecture

```
          ┌─────────────────────────────────────────────────────────────┐
          │                     CLIENT LAYER                            │
          │         Student Browser          Staff KOT Terminal         │
          └────────────────┬────────────────────────┬───────────────────┘
                           │  HTTP + SSE            │  HTTP + SSE
          ┌────────────────▼────────────────────────▼───────────────────┐
          │                  EDGE SECURITY (server.js)                  │
          │   Helmet CSP   │   Rate Limiter (100/15m)   │   CORS        │
          └────────────────────────────┬────────────────────────────────┘
                                       │
          ┌────────────────────────────▼────────────────────────────────┐
          │                   APPLICATION LAYER                         │
          │                                                             │
          │  Auth Controller    Menu Controller    Order Controller     │
          │  (Bcrypt + JWT)  (Cache + Invalidate) (Atomic + SSE Push)   │
          │                                                             │
          │              Stats Controller   User Controller             │
          └────────────────────────────┬────────────────────────────────┘
                                       │
          ┌────────────────────────────▼────────────────────────────────┐
          │                   PERSISTENCE LAYER                         │
          │    node-cache (TTL: 5m)       MongoDB Atlas (Mongoose 8)    │
          └─────────────────────────────────────────────────────────────┘
```

**Deployment model:** A single Node.js process serves the Express REST API and static frontend files together. The frontend consumes pure JSON — zero server-side rendering. Separating them onto a CDN + dedicated API server is a one-line `server.js` change.

---

## 📋 Feature Overview

| Area | Features |
|------|----------|
| **Student Portal** | Browse menu by category, add to cart with quantity, place order with note, live status tracking, cancel pending orders, order history, profile management |
| **Staff Portal** | Live KOT dashboard, audio alert on new order, update order status, full order history with filters, analytics dashboard (Chart.js), manage menu items with images |
| **Menu Management** | Add/edit/delete items, Cloudinary image upload, set stock quantity, toggle availability, category management |
| **Real-Time** | SSE push for order status changes, SSE broadcast for new orders to kitchen, 25s heartbeat keep-alive |
| **Security** | JWT auth (Bearer + Query param), RBAC (student/staff), Helmet CSP, rate limiting, bcrypt hashing, execution-blocking auth guard |
| **Reliability** | Atomic stock decrement, multi-item rollback, duplicate login prevention, write-through cache invalidation |

---

## 📂 Project Structure

```
lhc-canteen/
├── backend/
│   ├── config/
│   │   ├── cloudinary.config.js    # Cloudinary storage engine
│   │   ├── db.js                   # Mongoose connection
│   │   └── env.js                  # Environment variable validation
│   ├── controllers/
│   │   ├── auth.controller.js      # Register, login, role guard
│   │   ├── menu.controller.js      # CRUD + cache invalidation
│   │   ├── order.controller.js     # Atomic ops, state machine, SSE
│   │   ├── stats.controller.js     # Aggregation pipeline analytics
│   │   └── user.controller.js      # Profile & password management
│   ├── middleware/
│   │   ├── auth.middleware.js      # Dual JWT (Bearer & ?token=)
│   │   └── role.middleware.js      # RBAC enforcement
│   ├── models/
│   │   ├── menuItem.model.js       # Category enums, stockQuantity
│   │   ├── order.model.js          # Embedded item snapshots, status enum
│   │   └── user.model.js           # Bcrypt pre-save hook
│   ├── routes/                     # Modular route files
│   ├── utils/                      # JWT & password helpers
│   └── server.js                   # Bootstrap, Helmet, rate-limiter
├── frontend/
│   ├── css/main.css                # CSS custom properties, dark theme
│   ├── js/
│   │   ├── auth-guard.js           # Execution-blocking head script
│   │   └── main.js                 # SPA layout engine, SSE client
│   ├── student/                    # 7 HTML pages
│   ├── staff/                      # 5 HTML pages
│   └── index.html                  # Gateway redirect
└── extras/
    ├── selenium/                   # 7 automated UI test scripts
    └── interview_questions_answers.md
```

---

## 🚀 Quickstart

### Prerequisites
- Node.js v18+
- MongoDB Atlas URI (free tier works fine)

### 1. Clone
```bash
git clone https://github.com/your-username/lhc-canteen.git
cd lhc-canteen
```

### 2. Configure environment
Create `backend/.env`:
```env
PORT=5000
MONGODB_URI=mongodb+srv://<user>:<pass>@cluster0.mongodb.net/canteen
JWT_SECRET=your_very_long_random_secret_here
JWT_EXPIRES_IN=1d

# Optional — only if using image uploads
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
```

### 3. Run
```bash
cd backend
npm install
npm run dev
```

Open `http://localhost:5000` → redirects to the student portal.

**Default test accounts:** Create via `/student/register.html` (auto-assigned `student` role). Staff accounts are created directly in MongoDB with `role: "staff"`.

---

## 📡 API Reference

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/api/auth/register` | ❌ | Register new student |
| `POST` | `/api/auth/login` | ❌ | Login, returns JWT |
| `GET` | `/api/menu` | ❌ | Get all menu items (cached) |
| `GET` | `/api/menu/category/:cat` | ❌ | Get items by category |
| `POST` | `/api/menu` | Staff | Add menu item |
| `PATCH` | `/api/menu/:id` | Staff | Update menu item |
| `DELETE` | `/api/menu/:id` | Staff | Delete menu item |
| `POST` | `/api/orders` | Student | Place order (atomic) |
| `GET` | `/api/orders/my` | Student | My order history |
| `GET` | `/api/orders/user/stream` | Student | SSE stream (multiplexed) |
| `PATCH` | `/api/orders/:id/cancel` | Student | Cancel pending order |
| `GET` | `/api/orders/staff/all` | Staff | All orders |
| `GET` | `/api/orders/staff/stream` | Staff | Live KOT SSE stream |
| `PATCH` | `/api/orders/staff/:id/status` | Staff | Update order status |
| `GET` | `/api/stats/summary` | Staff | Revenue & order analytics |

---

## 🔒 Security Design

| Layer | Implementation |
|-------|---------------|
| **Transport** | Helmet.js with strict CSP — whitelisted CDN origins only |
| **Rate Limiting** | 100 requests / 15 minutes per IP on all `/api/*` routes |
| **Authentication** | JWT (HS256), dual-mode: `Authorization: Bearer` for REST, `?token=` for SSE |
| **Authorization** | RBAC middleware — `role: 'student'` and `role: 'staff'` isolated routes |
| **Passwords** | bcrypt with salt rounds = 10, pre-save hook on User model |
| **Role Hardening** | Registration endpoint ignores client-supplied `role` field — always assigns `student` |
| **Frontend Guard** | `auth-guard.js` runs in `<head>` before CSS parse — eliminates FOUC on protected pages |

---

## 🌐 Deploy to Render

1. Push repository to GitHub
2. Create **New Web Service** on [Render](https://render.com)
3. Settings:
   - **Root Directory:** `backend`
   - **Build Command:** `npm install`
   - **Start Command:** `node server.js`
4. Add environment variables: `MONGODB_URI`, `JWT_SECRET`, `JWT_EXPIRES_IN`
5. Deploy 

---

## 🛠 Tech Stack

| Layer | Technology |
|-------|-----------|
| Runtime | Node.js 18+ |
| Framework | Express.js 5 |
| Database | MongoDB Atlas + Mongoose 8 |
| Auth | JSON Web Tokens (jsonwebtoken) + bcrypt |
| Real-Time | Server-Sent Events (native Node.js HTTP) |
| Caching | node-cache (in-memory, TTL-based) |
| Image Storage | Cloudinary |
| Security | Helmet.js, express-rate-limit |
| Frontend | Vanilla JS, HTML5, CSS3 (no framework) |
| Deployment | Render |

---

