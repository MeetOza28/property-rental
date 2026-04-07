<div align="center">

# 🏠 Property Rental System

### A production-grade scalable backend for property listing, search, and management

[![TypeScript](https://img.shields.io/badge/TypeScript-99.8%25-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![AdonisJS](https://img.shields.io/badge/AdonisJS-v6-5A45FF?style=for-the-badge&logo=adonisjs&logoColor=white)](https://adonisjs.com/)
[![MySQL](https://img.shields.io/badge/MySQL-8.0-4479A1?style=for-the-badge&logo=mysql&logoColor=white)](https://www.mysql.com/)
[![Redis](https://img.shields.io/badge/Redis-Queue-DC382D?style=for-the-badge&logo=redis&logoColor=white)](https://redis.io/)
[![Stripe](https://img.shields.io/badge/Stripe-Payments-635BFF?style=for-the-badge&logo=stripe&logoColor=white)](https://stripe.com/)
[![License](https://img.shields.io/badge/License-UNLICENSED-red?style=for-the-badge)](./LICENSE)

</div>

---

## 📌 Overview

**Property Rental System** is a fully-featured, scalable backend API built with **AdonisJS v6** and **TypeScript**. It powers property listing, search, agent management, and subscription billing — designed with performance, security, and real-world use cases in mind.

Key highlights:
- 🔐 Role-Based Access Control (RBAC) with JWT authentication
- 🗺️ Geospatial / radius-based property search via a custom `adonis-geo-search` package
- 💳 Stripe subscription billing with plan upgrades and invoice history
- ⚡ Optimized MySQL queries with indexing, backfills, and Lucid ORM
- 🧪 Fully tested with Japa (unit + API tests)
- 🌍 Internationalization (i18n) with multi-language support

---

## 🧱 Tech Stack

| Layer | Technology |
|---|---|
| Framework | AdonisJS v6 (TypeScript) |
| ORM | Lucid ORM |
| Database | MySQL 8 |
| Cache / Queue | Redis + BullMQ (`@rlanz/bull-queue`) |
| Validation | VineJS |
| Authentication | JWT + RBAC |
| Payments | Stripe |
| Testing | Japa (`@japa/runner`, `@japa/api-client`) |
| i18n | `@adonisjs/i18n` |
| Rate Limiting | `@adonisjs/limiter` |
| Custom Package | `adonis-geo-search` |

---

## ✨ Features

### 🔐 Authentication & Authorization
- Register, Login, Logout
- Forgot Password / Reset Password with email
- Email Verification
- JWT-based auth with Refresh Token & Token Expiry
- Role-Based Access Control (Admin / Agent / User)

### 🏘️ Property Management
- Full CRUD for property listings (Agents)
- Image upload, delete, and reorder
- Slug generation for SEO-friendly URLs
- Soft delete & status management (active / inactive)

### 🔍 Advanced Search & Filtering
- Filter by: price, size, layout, amenities, ward ID
- Train station radius search (stationRadiusKm, stationIds)
- Geospatial / radius-based location search
- Sort by price, date, relevance (`sortBy`)
- Public listing with pagination (no login required)

### 💳 Stripe Payment Integration
- Subscription plans (Basic / Pro / Premium)
- Plan upgrade via Stripe Checkout
- Webhook handling for payment events
- Subscription invoice history
- Agent analytics dashboard

### 📬 Background Jobs & Notifications
- Bull Queue for async job processing
- Email notifications (alerts, inquiry responses)
- Property recommendation emails

### 🧪 Testing
- API test coverage using Japa
- Lifecycle hooks, grouped tests, async testing
- Test environment with `.env.test`

### 🌍 Internationalization
- Multi-language support via `@adonisjs/i18n`
- Language files in `resources/lang/`

### ⚡ Performance & Reliability
- MySQL indexing on high-query columns
- Backfill operations for schema evolution
- Rate limiting (database-backed)
- Query optimization with Lucid ORM
- Property comparison & recommendation features
- Favorite property system
- Inquiry & Contact system

---

## 📁 Project Structure

```
property-rental/
├── app/
│   ├── controllers/       # Route handlers
│   ├── middleware/        # Auth, RBAC, rate limit middleware
│   ├── models/            # Lucid ORM models
│   ├── validators/        # VineJS validation schemas
│   ├── services/          # Business logic
│   ├── jobs/              # Bull Queue jobs
│   ├── queues/            # Queue definitions
│   ├── mails/             # Mailer classes
│   ├── events/            # Event listeners
│   ├── policies/          # Authorization policies
│   └── abilities/         # RBAC abilities
├── config/                # App configuration
├── database/
│   ├── migrations/        # Schema migrations
│   └── seeders/           # Database seeders
├── resources/lang/        # i18n language files
├── start/                 # Route & kernel definitions
├── tests/                 # Japa test suites
├── .env.example           # Environment variables template
└── adonisrc.ts            # AdonisJS configuration
```

---

## 🚀 Getting Started

### Prerequisites

- Node.js >= 20
- MySQL 8
- Redis

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/MeetOza28/property-rental.git
cd property-rental

# 2. Install dependencies
npm install

# 3. Copy environment file
cp .env.example .env

# 4. Configure your .env (see Environment Variables section)

# 5. Run migrations
node ace migration:run

# 6. Start the development server
npm run dev

# 7. Start the background worker (separate terminal)
npm run worker
```

---

## 🔧 Environment Variables

```env
TZ=UTC
PORT=3333
HOST=localhost
LOG_LEVEL=info
APP_KEY=your_app_key_here
NODE_ENV=development

# Database
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_db_password
DB_DATABASE=property_rental

# Mail
SMTP_HOST=smtp.mailtrap.io
SMTP_PORT=587

# Redis
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
REDIS_PASSWORD=

# Rate Limiter
LIMITER_STORE=database

# Bull Queue
QUEUE_REDIS_HOST=127.0.0.1
QUEUE_REDIS_PORT=6379
QUEUE_REDIS_PASSWORD=

# Stripe (add these)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

---

## 🧪 Running Tests

```bash
# Run all tests
npm run test

# Run with specific group
node ace test --groups=auth
```

---

## 📜 Available Scripts

| Script | Description |
|---|---|
| `npm run dev` | Start dev server with HMR |
| `npm run build` | Build for production |
| `npm start` | Run production build |
| `npm run worker` | Start Bull Queue worker |
| `npm run test` | Run Japa test suite |
| `npm run lint` | ESLint check |
| `npm run format` | Prettier formatting |
| `npm run typecheck` | TypeScript type check |

---

## 📦 Custom Package

This project uses a custom-built AdonisJS package:

**[adonis-geo-search](https://github.com/MeetOza28)** — Efficient geospatial/location-based property search for AdonisJS, built and published as a standalone npm package.

---

## 👤 Author

**Meet Oza**
- GitHub: [@MeetOza28](https://github.com/MeetOza28)
- LinkedIn: [meetoza28](https://linkedin.com/in/meetoza28)
- Email: meetoza28@gmail.com

---

<div align="center">

⭐ If you found this project useful, consider giving it a star!

</div>
