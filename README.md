# MediTrack — Drug Store Management & Delivery System

MediTrack is an enterprise-grade pharmacy management and doorstep delivery platform built according to Indian pharmaceutical regulations (Drugs and Cosmetics Act, Schedule H/H1 compliance) and FEFO (First Expiry, First Out) inventory management.

---

## 1. System Architecture

```
┌────────────────────────────────────────────────────────┐
│                   React 18 SPA (Vite)                  │
│  Customer Portal │ Pharmacist Hub │ Delivery │ Admin   │
│        Tailwind Tokens (Anti-Vibe-Code) │ Leaflet Maps │
└───────────────────────────┬────────────────────────────┘
                            │ REST JSON + JWT
┌───────────────────────────▼────────────────────────────┐
│              Spring Boot 3 Monolith (Java 21)          │
│  • Security Filter Chain (JWT RBAC)                    │
│  • Order State Machine (PLACED → DELIVERED)            │
│  • FEFO Stock Engine with Locking                      │
│  • Digital Prescription Review Queue                   │
│  • 4-Digit Delivery OTP Chain & Pickup Verification    │
└───────────────────────────┬────────────────────────────┘
                            │
┌───────────────────────────▼────────────────────────────┐
│      MySQL 8 (Docker/Prod)  OR  H2 In-Memory (Zero-Setup)│
└────────────────────────────────────────────────────────┘
```

---

## 2. Pre-Seeded User Personas (Ready for Instant Testing)

All personas come pre-seeded with real data, addresses, prescription files, active orders, and inventory:

| Role | Email | Password | Primary Interface |
|---|---|---|---|
| **Customer** | `customer@meditrack.com` | `Password@123` | Storefront, Cart, Prescriptions, Live Order Tracking |
| **Pharmacist** | `pharmacist@meditrack.com` | `Password@123` | Split-view Rx Review Queue, FEFO Picking, Stock Expiry Alerts |
| **Delivery Partner** | `delivery@meditrack.com` | `Password@123` | Mobile-first Ride App, Pickup Code Check, Doorstep OTP Verify |
| **Admin** | `admin@meditrack.com` | `Password@123` | Governance Dashboard, User Control, Partner Approvals, Geofencing |

> **Pro Tip:** In the frontend navbar, use the **"Role: [Name] ▼"** dropdown to instantly switch between personas in one click!

---

## 3. Environment Variables & Configuration

Copy `.env.example` to `.env` or set environment variables:

| Variable | Default Value | Description |
|---|---|---|
| `DB_HOST` | `localhost` | MySQL host (or `mysql` in Docker) |
| `DB_PORT` | `3306` | MySQL port |
| `DB_NAME` | `meditrack` | Database name |
| `DB_USER` | `root` | Database username |
| `DB_PASS` | `root` | Database password |
| `SPRING_PROFILES_ACTIVE` | *(none / default)* | Set to `mysql` for MySQL; omit for zero-config embedded H2 |
| `JWT_SECRET` | `404E6352...` | 256-bit+ HMAC-SHA256 signing key |
| `JWT_ACCESS_EXP_MIN` | `60` | Token expiration in minutes |
| `PHARMACY_LAT` | `12.9716` | Latitude of central dispensing pharmacy (Bengaluru) |
| `PHARMACY_LNG` | `77.5946` | Longitude of central dispensing pharmacy (Bengaluru) |
| `DELIVERY_RADIUS_KM` | `15.0` | Maximum delivery distance geofence |
| `DELIVERY_BASE_FEE` | `40.0` | Flat delivery fee in INR |
| `DELIVERY_FREE_THRESHOLD` | `500.0` | Cart subtotal above which delivery is free |
| `VITE_API_URL` | `http://localhost:8080/api` | Backend base URL for the React app |

---

## 4. How to Run the Project

### Option A: Run via Docker Compose (Recommended — One Command)

This spins up MySQL 8, the Spring Boot Backend, and the React Frontend in isolated containers:

```bash
docker compose up --build
```

- **Frontend App:** [http://localhost:3000](http://localhost:3000)
- **Backend API:** [http://localhost:8080](http://localhost:8080)
- **Swagger Documentation:** [http://localhost:8080/swagger-ui.html](http://localhost:8080/swagger-ui.html)

---

### Option B: Run Locally (Fastest Development Mode)

#### 1. Start the Backend
The backend runs automatically with **Zero-Configuration** out-of-the-box (using an embedded H2 engine with MySQL dialect, automatically seeded with demo data):

```bash
cd backend
npm run dev
# or: mvn spring-boot:run
```

*(Alternatively, to run against a local MySQL server, activate the mysql profile:*
`mvn spring-boot:run -Dspring-boot.run.profiles=mysql`*)*

Backend will start on `http://localhost:8080`.

#### 2. Start the Frontend

In a separate terminal:

```bash
cd frontend
npm install
npm run dev
```

Frontend will start on `http://localhost:5173`.

---

## 5. End-to-End Test Walkthrough

1. **Customer Order Placement:**
   - Log in as `customer@meditrack.com`
   - Browse catalog, add *Novamox 500* (Schedule H Rx item) or *Dolo 650* (OTC)
   - Go to Checkout. Select the attached pre-approved prescription.
   - Choose Payment Method (Online or COD) and click **Place Order**.
   - Note the **4-digit Delivery OTP** displayed on the tracking screen.

2. **Pharmacist Fulfillment:**
   - Switch role to `pharmacist@meditrack.com` via the navbar dropdown.
   - Go to **Rx Review Queue**: inspect the prescription image and click **Approve Dispensing**.
   - Go to **Fulfillment Orders**: click **Start Picking** (FEFO batch allocation) → click **Pack & Ready for Pickup**.
   - A **Pickup Code** (e.g., `PK-8812`) is generated.

3. **Courier Pickup & Doorstep Delivery:**
   - Switch role to `delivery@meditrack.com`.
   - Go to the **Delivery Partner App**: accept the available order.
   - Enter the **Pickup Code** to confirm receipt from pharmacy counter.
   - Click **Start Delivery Route** (live map tracks the courier).
   - Enter the Customer's **4-digit OTP** (e.g. from step 1) to securely complete delivery!

4. **Admin Oversight:**
   - Switch role to `admin@meditrack.com`.
   - View top-level KPIs (Revenue, Orders, Delivery SLA rate).
   - Manage users, inspect license approvals, and view master order transitions.
