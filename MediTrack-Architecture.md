# MediTrack: Drug Store Management System

End-to-end requirements, architecture, database design, flows and role responsibilities.

**Stack:** Spring Boot · Spring Security + JWT · Hibernate/JPA · MySQL · React · Axios
**Roles:** CUSTOMER · PHARMACIST · DELIVERY_PARTNER · ADMIN

---

## 1. Project Overview

MediTrack lets customers order medicines online (with prescription upload for Rx drugs). Pharmacists verify prescriptions, manage stock and prepare orders. Delivery partners pick up and deliver with proof-of-delivery. Admins govern users, catalog, pricing, reports and settings.

### Goals
- Safe dispensing: prescription-required (Rx) drugs cannot be sold without pharmacist approval.
- Batch and expiry tracking: never sell expired stock; FEFO (First Expiry, First Out).
- Transparent order lifecycle with verification at each hand-off.
- Role-based access, secure by default.

---

## 2. Tech Stack

| Layer | Technology | Notes |
|---|---|---|
| Frontend | React 18 + Vite, React Router, Axios, Context/Redux Toolkit | Axios interceptors attach JWT, handle refresh |
| UI | Tailwind CSS or Material UI | Free |
| Backend | Spring Boot 3.x (Java 17+) | Web, Security, Data JPA, Validation, Mail, Scheduling |
| ORM | Hibernate (via Spring Data JPA) | |
| Database | MySQL 8 | Flyway for migrations |
| Auth | Spring Security + JWT (access + refresh) | jjwt library |
| API docs | springdoc-openapi (Swagger UI) | |
| File storage | Local disk (dev) / Cloudinary free tier or AWS S3 / MinIO (prod) | Prescriptions, product images |
| Maps/Location | OpenStreetMap + Leaflet (react-leaflet), Nominatim geocoding, OSRM routing | All free, no credit card |
| Payments | Razorpay (test mode free, India) or Stripe test mode; plus Cash on Delivery | |
| Email | Spring Mail + Gmail SMTP / Brevo free tier | |
| SMS/OTP | Console/email OTP in dev; Fast2SMS / Twilio trial in prod | |
| Real-time | WebSocket (STOMP) or polling | Order status, live delivery tracking |
| Caching (optional) | Caffeine / Redis | |
| Testing | JUnit 5, Mockito, Testcontainers (MySQL), React Testing Library | |
| DevOps | Docker, Docker Compose, GitHub Actions | |
| Hosting (free-ish) | Render / Railway / Fly.io (backend), Vercel / Netlify (frontend), Aiven/PlanetScale-alt for MySQL | |

---

## 3. High-Level Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                         React SPA                            │
│  Customer UI │ Pharmacist UI │ Delivery UI │ Admin UI        │
│        Axios (JWT interceptor)  │  Leaflet maps              │
└───────────────────────┬──────────────────────────────────────┘
                        │ HTTPS / REST (JSON) + WebSocket
┌───────────────────────▼──────────────────────────────────────┐
│                  Spring Boot Backend (Monolith)              │
│  Security Filter Chain (JwtAuthFilter, CORS, RBAC)           │
│  ┌────────┬─────────┬─────────┬──────────┬────────┬────────┐ │
│  │ Auth   │ Catalog │ Cart &  │ Prescrip │ Payment│Delivery│ │
│  │ & User │Inventory│ Orders  │ tion     │        │& Track │ │
│  └────────┴─────────┴─────────┴──────────┴────────┴────────┘ │
│  Notification │ Reports │ Audit │ Scheduler (expiry/low-stock) │
│  Controller → Service → Repository (Hibernate/JPA)           │
└───────┬───────────────┬────────────────┬─────────────────────┘
        │               │                │
   ┌────▼────┐   ┌──────▼──────┐   ┌─────▼──────────────────┐
   │ MySQL   │   │ File Store  │   │ External: Razorpay,    │
   │         │   │ (Rx, images)│   │ OSM/Nominatim/OSRM,    │
   └─────────┘   └─────────────┘   │ SMTP, SMS              │
                                   └────────────────────────┘
```

**Recommendation:** start as a **modular monolith** (one Spring Boot app, packages per module). Microservices add cost and complexity with no benefit at this scale; modules can be split later.

---

## 4. Roles and Responsibilities

### 4.1 Customer
| Feature | Details |
|---|---|
| Register / Login | Email + password, email/phone OTP verification |
| Profile | Name, phone, DOB (age checks), multiple addresses with map pin (lat/lng) |
| Browse and search | By name, generic/salt, category, manufacturer; filters (Rx/OTC, price, in-stock) |
| Product details | Composition, dosage, side effects, price, availability, substitutes |
| Cart | Add/update/remove; stock validation; Rx items flagged |
| Prescription upload | Image/PDF (max 5 MB); linked to order; reusable if still valid |
| Checkout | Choose address, delivery slot, payment method, coupon |
| Payment | Online (Razorpay/UPI/card) or COD |
| Order tracking | Status timeline, live delivery partner location on map, ETA |
| Delivery verification | Share a 4-digit delivery OTP with the delivery partner |
| Order history | Invoices (PDF), reorder |
| Cancel / Return | Cancel before dispatch; return only for eligible non-medicine items or wrong/damaged items (pharma returns are restricted by law) |
| Refill reminders | Notifications for recurring medicines (optional) |
| Reviews | Rate delivery and products (optional) |
| Notifications | Email/SMS/in-app on each status change |

### 4.2 Pharmacist
| Feature | Details |
|---|---|
| Login | Account created by Admin; requires pharmacy license number |
| Prescription review queue | View uploaded Rx, approve / reject (with reason) / request clarification |
| Order processing | Accept → pick items (FEFO batch suggestion) → pack → mark READY_FOR_PICKUP |
| Substitution | Propose a generic substitute (customer must approve) |
| Inventory management | CRUD products, add stock batches (batch no, expiry, MRP, purchase price, qty) |
| Stock alerts | Low stock, near-expiry (e.g., 60/30 days), expired quarantine |
| Purchase / supplier | Record purchase orders and received stock; supplier master |
| Controlled drugs register | Log of Schedule H/H1/X sales (patient, doctor, Rx ref); required by law in India |
| Billing | Generate GST invoice for walk-in/counter sales (optional POS) |
| Reports | Daily sales, top-selling, expiry report |

### 4.3 Delivery Partner
| Feature | Details |
|---|---|
| Registration | Self-register with documents (ID, driving licence, vehicle), Admin approves |
| Availability | Toggle online/offline, shares live GPS while online |
| Job offers | Receive nearby READY orders; accept/reject (with timeout) |
| Navigation | Pickup and drop location on map, link to OSM/Google Maps app |
| Pickup verification | Scan order QR / enter pickup code at pharmacy |
| Delivery verification | Customer's delivery OTP; for Rx orders verify customer ID/name; capture optional photo |
| COD collection | Record cash collected, settle with pharmacy/admin |
| Failed delivery | Reasons (not reachable, wrong address), triggers re-attempt/return to store |
| Earnings | Per-delivery payout, daily/weekly summary, payout history |

### 4.4 Admin
| Feature | Details |
|---|---|
| User management | List, search, block/unblock all roles; create pharmacists |
| Approvals | Approve delivery partners, pharmacist licence verification |
| Master data | Categories, manufacturers, drug schedules, tax (GST) slabs |
| Pricing and coupons | Delivery fee rules, discounts, coupons |
| Order oversight | View all orders, force-cancel, reassign delivery partner, resolve disputes |
| Payments | View transactions, process refunds, reconcile COD |
| Payouts | Delivery partner earnings and payout approval |
| Reports and dashboard | Revenue, orders, active users, delivery SLA, expiry loss |
| Audit logs | Who changed what and when (price, stock, roles) |
| System settings | Service radius, delivery charges, tax, working hours |

---

## 5. Core Flows

### 5.1 Order Status State Machine

```
 CART
  │ checkout
  ▼
 PLACED ──(payment failed/timeout)──► PAYMENT_FAILED ─► CANCELLED
  │
  ├─ contains Rx item? ──yes──► PRESCRIPTION_PENDING
  │                                │ pharmacist approve        │ reject
  │                                ▼                           ▼
  │                           CONFIRMED                    REJECTED ─► refund
  └─ no Rx ───────────────────► CONFIRMED
                                   │ pharmacist accepts
                                   ▼
                               PROCESSING (picking & packing, stock deducted per batch)
                                   │
                                   ▼
                            READY_FOR_PICKUP (pickup code + QR generated)
                                   │ delivery partner assigned
                                   ▼
                              ASSIGNED
                                   │ partner scans/enters pickup code
                                   ▼
                              PICKED_UP
                                   │
                                   ▼
                             OUT_FOR_DELIVERY (live tracking)
                                   │ customer delivery OTP verified
                                   ▼
                              DELIVERED ──► (COD settled / invoice final)

 Exceptions: CANCELLED (before PICKED_UP), DELIVERY_FAILED → RETURNED_TO_STORE → refund/redeliver
```

### 5.2 Order Flow (step by step)
1. Customer adds items to cart; the backend validates stock and flags Rx items.
2. At checkout: select address (lat/lng), the system checks the delivery radius and computes delivery fee and GST.
3. If Rx items are present, customer uploads a prescription (or picks a previously approved, unexpired one).
4. Order is created in `PLACED`; stock is **soft-reserved** (reservation expires in 15 min if unpaid).
5. Payment (see 5.3).
6. Rx orders go to the pharmacist queue; non-Rx orders are auto-confirmed.
7. Pharmacist approves the Rx or rejects it (refund triggered automatically).
8. Pharmacist picks items by FEFO batch; the system deducts stock from those batches, then marks `READY_FOR_PICKUP`.
9. Delivery assignment (see 5.4), then delivery, then verification.
10. Invoice is generated; notifications are sent at every transition.

### 5.3 Payment Flow (Razorpay example)
1. `POST /api/payments/create` → backend creates a Razorpay order (amount in paise, receipt = orderId) → returns `razorpayOrderId`.
2. Frontend opens Razorpay Checkout with that ID.
3. On success, Razorpay returns `payment_id`, `order_id`, `signature`.
4. Frontend calls `POST /api/payments/verify`; **backend verifies the HMAC-SHA256 signature** using the secret (never trust the frontend).
5. Also implement the **webhook** (`payment.captured`, `payment.failed`) as the source of truth, which handles the case where the user closes the browser after paying.
6. Mark the payment `SUCCESS` and the order `CONFIRMED`/`PRESCRIPTION_PENDING`.
7. **COD:** the payment record is `PENDING_COD`; the delivery partner records collection; Admin reconciles.
8. **Refunds:** on rejection/cancel, call the gateway refund API and store a refund record. Make it idempotent.

Security: store only gateway IDs, never card data; use idempotency keys; log every gateway callback.

### 5.4 Delivery Assignment Flow
Two models; start with option A.

- **A. Broadcast/accept:** when the order is `READY_FOR_PICKUP`, find online partners within N km of the pharmacy (Haversine query or MySQL spatial `ST_Distance_Sphere`) → notify them → first to accept wins (use an optimistic lock / `UPDATE ... WHERE status='READY' ` to avoid double assignment). If nobody accepts within 2 minutes, widen the radius and then alert Admin.
- **B. Auto-assign:** pick the nearest free partner with the lowest active load; the partner may reject, then the next one is chosen.

### 5.5 Verification Points (the "trust chain")
| Stage | Verified by | Mechanism |
|---|---|---|
| Account | Email/phone | OTP |
| Pharmacist | Admin | Licence number + document check |
| Delivery partner | Admin | ID/DL document approval |
| Prescription | Pharmacist | Visual review; check doctor reg no., date (valid ≤ 6 months typically), patient name, drug and dosage |
| Payment | Backend | Gateway signature + webhook |
| Pickup | Pharmacist ↔ Partner | 6-char pickup code or QR scan |
| Delivery | Customer ↔ Partner | 4-digit **delivery OTP** (sent to the customer at `OUT_FOR_DELIVERY`), optional photo; for Rx/controlled items also match the recipient's name or ID |
| COD | Partner ↔ Admin | Cash settlement record |

### 5.6 Live Tracking
- Partner app (React PWA) sends `lat,lng` every 5–10 s while on a delivery via `POST /api/delivery/location` (or a WebSocket).
- Backend stores the latest position (table `delivery_location`) and pushes it to the customer over WebSocket (STOMP topic `/topic/orders/{id}/location`) or the customer polls every 10 s.
- Customer map uses react-leaflet with OSM tiles; ETA is computed by OSRM.

---

## 6. Location Services (all free)

| Need | Free option | Notes |
|---|---|---|
| Map display | **OpenStreetMap tiles + Leaflet / react-leaflet** | Respect the tile usage policy; use a provider such as MapTiler/Stadia free tier for production |
| Geocoding (address → lat/lng) | **Nominatim** (OSM) | Max 1 req/s on the public server; cache results; or self-host |
| Reverse geocoding (pin → address) | Nominatim | Same |
| Autocomplete | Photon (komoot) or LocationIQ free tier (5k/day) | |
| Routing and ETA | **OSRM** public demo or OpenRouteService free tier (2k/day) | Self-host OSRM for scale |
| Distance filter in DB | MySQL `ST_Distance_Sphere(POINT(lng,lat), POINT(lng,lat))` | Store as `POINT` with a SPATIAL index |
| Device GPS | Browser Geolocation API (`navigator.geolocation.watchPosition`) | Requires HTTPS |
| Alternative | Google Maps (paid after free credit) | Optional |

Service radius: configurable in system settings (e.g., 8 km from the pharmacy).

---

## 7. Database Design (MySQL)

### 7.1 ER Overview

```
users 1─1 customer_profile        users 1─1 pharmacist_profile
users 1─1 delivery_partner_profile users *─* roles (via user_roles)
users 1─* addresses
categories 1─* products 1─* product_batches
users(customer) 1─1 carts 1─* cart_items ─ products
users(customer) 1─* prescriptions 1─* prescription_items(optional)
users(customer) 1─* orders 1─* order_items ─ product_batches(allocation)
orders 1─* order_status_history
orders 1─1 payments 1─* refunds
orders 1─1 deliveries ─ delivery_partner ; deliveries 1─* delivery_location_log
suppliers 1─* purchase_orders 1─* purchase_order_items
orders 1─* controlled_drug_register (for scheduled drugs)
notifications, audit_logs, coupons, settings, refresh_tokens
```

### 7.2 Schema (DDL)

```sql
CREATE DATABASE meditrack CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE meditrack;

-- ============ AUTH & USERS ============
CREATE TABLE roles (
  id TINYINT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(30) UNIQUE NOT NULL            -- ROLE_CUSTOMER, ROLE_PHARMACIST, ROLE_DELIVERY, ROLE_ADMIN
);

CREATE TABLE users (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  full_name VARCHAR(120) NOT NULL,
  email VARCHAR(150) UNIQUE NOT NULL,
  phone VARCHAR(15) UNIQUE NOT NULL,
  password_hash VARCHAR(100) NOT NULL,        -- BCrypt
  status ENUM('PENDING','ACTIVE','BLOCKED','REJECTED') DEFAULT 'PENDING',
  email_verified BOOLEAN DEFAULT FALSE,
  phone_verified BOOLEAN DEFAULT FALSE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE user_roles (
  user_id BIGINT, role_id TINYINT,
  PRIMARY KEY (user_id, role_id),
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (role_id) REFERENCES roles(id)
);

CREATE TABLE refresh_tokens (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT NOT NULL,
  token_hash VARCHAR(100) NOT NULL,
  expires_at DATETIME NOT NULL,
  revoked BOOLEAN DEFAULT FALSE,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE otp_codes (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT NULL, target VARCHAR(150) NOT NULL,   -- email/phone
  purpose ENUM('SIGNUP','LOGIN','RESET','DELIVERY') NOT NULL,
  code_hash VARCHAR(100) NOT NULL,
  attempts TINYINT DEFAULT 0,
  expires_at DATETIME NOT NULL, used BOOLEAN DEFAULT FALSE
);

CREATE TABLE pharmacist_profile (
  user_id BIGINT PRIMARY KEY,
  license_number VARCHAR(50) UNIQUE NOT NULL,
  license_valid_till DATE,
  pharmacy_id BIGINT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE delivery_partner_profile (
  user_id BIGINT PRIMARY KEY,
  vehicle_type ENUM('BIKE','SCOOTER','CYCLE','CAR'),
  vehicle_number VARCHAR(20),
  driving_license_no VARCHAR(30),
  id_proof_url VARCHAR(255),
  approval_status ENUM('PENDING','APPROVED','REJECTED') DEFAULT 'PENDING',
  is_online BOOLEAN DEFAULT FALSE,
  current_lat DECIMAL(10,7), current_lng DECIMAL(10,7),
  last_location_at DATETIME,
  rating DECIMAL(3,2) DEFAULT 5.00,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE addresses (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT NOT NULL,
  label VARCHAR(30), line1 VARCHAR(200) NOT NULL, line2 VARCHAR(200),
  city VARCHAR(80), state VARCHAR(80), pincode VARCHAR(10),
  latitude DECIMAL(10,7), longitude DECIMAL(10,7),
  is_default BOOLEAN DEFAULT FALSE,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- ============ CATALOG & INVENTORY ============
CREATE TABLE categories (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(100) UNIQUE NOT NULL, parent_id INT NULL,
  FOREIGN KEY (parent_id) REFERENCES categories(id)
);

CREATE TABLE manufacturers (
  id INT PRIMARY KEY AUTO_INCREMENT, name VARCHAR(150) UNIQUE NOT NULL
);

CREATE TABLE products (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  sku VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(200) NOT NULL,
  generic_name VARCHAR(200),             -- salt/composition
  category_id INT, manufacturer_id INT,
  form ENUM('TABLET','CAPSULE','SYRUP','INJECTION','OINTMENT','DROPS','OTHER'),
  strength VARCHAR(50), pack_size VARCHAR(50),
  schedule ENUM('OTC','H','H1','X','NONE') DEFAULT 'OTC',
  requires_prescription BOOLEAN DEFAULT FALSE,
  mrp DECIMAL(10,2) NOT NULL,
  gst_percent DECIMAL(4,2) DEFAULT 12.00,
  description TEXT, side_effects TEXT, image_url VARCHAR(255),
  reorder_level INT DEFAULT 10,
  is_active BOOLEAN DEFAULT TRUE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (category_id) REFERENCES categories(id),
  FOREIGN KEY (manufacturer_id) REFERENCES manufacturers(id),
  FULLTEXT KEY ft_product (name, generic_name),
  INDEX idx_prod_cat (category_id)
);

CREATE TABLE product_batches (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  product_id BIGINT NOT NULL,
  batch_number VARCHAR(50) NOT NULL,
  expiry_date DATE NOT NULL,
  purchase_price DECIMAL(10,2), selling_price DECIMAL(10,2) NOT NULL,
  quantity_received INT NOT NULL,
  quantity_available INT NOT NULL,
  quantity_reserved INT DEFAULT 0,
  supplier_id BIGINT NULL,
  status ENUM('ACTIVE','EXPIRED','QUARANTINE','DEPLETED') DEFAULT 'ACTIVE',
  UNIQUE KEY uq_batch (product_id, batch_number),
  INDEX idx_expiry (expiry_date),
  FOREIGN KEY (product_id) REFERENCES products(id)
);

CREATE TABLE suppliers (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(150), gstin VARCHAR(20), phone VARCHAR(15), email VARCHAR(150), address VARCHAR(255)
);

CREATE TABLE purchase_orders (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  supplier_id BIGINT, created_by BIGINT,
  status ENUM('DRAFT','ORDERED','RECEIVED','CANCELLED') DEFAULT 'DRAFT',
  total_amount DECIMAL(12,2), created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (supplier_id) REFERENCES suppliers(id)
);

CREATE TABLE purchase_order_items (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  purchase_order_id BIGINT, product_id BIGINT,
  quantity INT, unit_price DECIMAL(10,2),
  batch_number VARCHAR(50), expiry_date DATE,
  FOREIGN KEY (purchase_order_id) REFERENCES purchase_orders(id),
  FOREIGN KEY (product_id) REFERENCES products(id)
);

-- ============ CART ============
CREATE TABLE carts (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT UNIQUE NOT NULL,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);
CREATE TABLE cart_items (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  cart_id BIGINT NOT NULL, product_id BIGINT NOT NULL, quantity INT NOT NULL CHECK (quantity > 0),
  UNIQUE KEY uq_cart_prod (cart_id, product_id),
  FOREIGN KEY (cart_id) REFERENCES carts(id),
  FOREIGN KEY (product_id) REFERENCES products(id)
);

-- ============ PRESCRIPTIONS ============
CREATE TABLE prescriptions (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT NOT NULL,
  file_url VARCHAR(255) NOT NULL,
  patient_name VARCHAR(120), doctor_name VARCHAR(120), doctor_reg_no VARCHAR(50),
  issued_on DATE, valid_till DATE,
  status ENUM('PENDING','APPROVED','REJECTED','CLARIFICATION') DEFAULT 'PENDING',
  reviewed_by BIGINT NULL, reviewed_at DATETIME NULL, reject_reason VARCHAR(255),
  uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- ============ ORDERS ============
CREATE TABLE coupons (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  code VARCHAR(30) UNIQUE, discount_type ENUM('PERCENT','FLAT'), value DECIMAL(10,2),
  min_order DECIMAL(10,2), max_discount DECIMAL(10,2),
  valid_from DATETIME, valid_to DATETIME, usage_limit INT, active BOOLEAN DEFAULT TRUE
);

CREATE TABLE orders (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  order_number VARCHAR(20) UNIQUE NOT NULL,
  customer_id BIGINT NOT NULL,
  address_id BIGINT NOT NULL,
  delivery_lat DECIMAL(10,7), delivery_lng DECIMAL(10,7),   -- snapshot
  delivery_address_snapshot VARCHAR(500),
  prescription_id BIGINT NULL,
  has_rx_items BOOLEAN DEFAULT FALSE,
  status ENUM('PLACED','PAYMENT_FAILED','PRESCRIPTION_PENDING','REJECTED','CONFIRMED','PROCESSING',
              'READY_FOR_PICKUP','ASSIGNED','PICKED_UP','OUT_FOR_DELIVERY','DELIVERED',
              'DELIVERY_FAILED','RETURNED_TO_STORE','CANCELLED') NOT NULL DEFAULT 'PLACED',
  subtotal DECIMAL(10,2), tax_amount DECIMAL(10,2), delivery_fee DECIMAL(10,2),
  discount_amount DECIMAL(10,2) DEFAULT 0, total_amount DECIMAL(10,2),
  coupon_id BIGINT NULL,
  payment_method ENUM('ONLINE','COD'),
  pickup_code VARCHAR(8), delivery_otp_hash VARCHAR(100), delivery_otp_expires DATETIME,
  assigned_pharmacist_id BIGINT NULL,
  placed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  version INT DEFAULT 0,                                    -- @Version optimistic lock
  INDEX idx_order_customer (customer_id, placed_at),
  INDEX idx_order_status (status),
  FOREIGN KEY (customer_id) REFERENCES users(id),
  FOREIGN KEY (address_id) REFERENCES addresses(id),
  FOREIGN KEY (prescription_id) REFERENCES prescriptions(id),
  FOREIGN KEY (coupon_id) REFERENCES coupons(id)
);

CREATE TABLE order_items (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  order_id BIGINT NOT NULL, product_id BIGINT NOT NULL,
  batch_id BIGINT NULL,                  -- set when pharmacist picks
  quantity INT NOT NULL, unit_price DECIMAL(10,2) NOT NULL,
  gst_percent DECIMAL(4,2), line_total DECIMAL(10,2),
  substituted_from_product_id BIGINT NULL,
  FOREIGN KEY (order_id) REFERENCES orders(id),
  FOREIGN KEY (product_id) REFERENCES products(id),
  FOREIGN KEY (batch_id) REFERENCES product_batches(id)
);

CREATE TABLE order_status_history (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  order_id BIGINT NOT NULL, from_status VARCHAR(30), to_status VARCHAR(30) NOT NULL,
  changed_by BIGINT NULL, note VARCHAR(255),
  changed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (order_id) REFERENCES orders(id)
);

-- ============ PAYMENTS ============
CREATE TABLE payments (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  order_id BIGINT UNIQUE NOT NULL,
  method ENUM('ONLINE','COD'),
  gateway VARCHAR(20), gateway_order_id VARCHAR(60), gateway_payment_id VARCHAR(60),
  amount DECIMAL(10,2) NOT NULL, currency CHAR(3) DEFAULT 'INR',
  status ENUM('CREATED','SUCCESS','FAILED','PENDING_COD','COD_COLLECTED','REFUNDED','PARTIAL_REFUND'),
  paid_at DATETIME, raw_response JSON,
  FOREIGN KEY (order_id) REFERENCES orders(id)
);
CREATE TABLE refunds (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  payment_id BIGINT, amount DECIMAL(10,2), reason VARCHAR(255),
  gateway_refund_id VARCHAR(60), status ENUM('INITIATED','PROCESSED','FAILED'),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (payment_id) REFERENCES payments(id)
);

-- ============ DELIVERY ============
CREATE TABLE deliveries (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  order_id BIGINT UNIQUE NOT NULL,
  partner_id BIGINT NULL,
  status ENUM('SEARCHING','ASSIGNED','PICKED_UP','IN_TRANSIT','DELIVERED','FAILED') DEFAULT 'SEARCHING',
  pickup_lat DECIMAL(10,7), pickup_lng DECIMAL(10,7),
  distance_km DECIMAL(6,2), eta_minutes INT,
  assigned_at DATETIME, picked_up_at DATETIME, delivered_at DATETIME,
  failure_reason VARCHAR(255), proof_photo_url VARCHAR(255),
  cod_amount_collected DECIMAL(10,2), cod_settled BOOLEAN DEFAULT FALSE,
  partner_earning DECIMAL(8,2),
  FOREIGN KEY (order_id) REFERENCES orders(id),
  FOREIGN KEY (partner_id) REFERENCES users(id)
);
CREATE TABLE delivery_location_log (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  delivery_id BIGINT, lat DECIMAL(10,7), lng DECIMAL(10,7),
  recorded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_dl (delivery_id, recorded_at)
);
CREATE TABLE partner_payouts (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  partner_id BIGINT, period_start DATE, period_end DATE,
  amount DECIMAL(10,2), status ENUM('PENDING','PAID'), paid_at DATETIME
);

-- ============ COMPLIANCE / SYSTEM ============
CREATE TABLE controlled_drug_register (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  order_id BIGINT, product_id BIGINT, batch_id BIGINT, quantity INT,
  patient_name VARCHAR(120), doctor_name VARCHAR(120), doctor_reg_no VARCHAR(50),
  prescription_id BIGINT, dispensed_by BIGINT, dispensed_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE notifications (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT, channel ENUM('IN_APP','EMAIL','SMS'), title VARCHAR(150), body VARCHAR(500),
  is_read BOOLEAN DEFAULT FALSE, created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE audit_logs (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  actor_id BIGINT, action VARCHAR(60), entity VARCHAR(40), entity_id BIGINT,
  old_value JSON, new_value JSON, ip VARCHAR(45), created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE system_settings (
  setting_key VARCHAR(60) PRIMARY KEY, setting_value VARCHAR(255)
  -- service_radius_km, base_delivery_fee, per_km_fee, free_delivery_above, pharmacy_lat, pharmacy_lng ...
);
CREATE TABLE reviews (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  order_id BIGINT, customer_id BIGINT, delivery_rating TINYINT, product_rating TINYINT, comment VARCHAR(500)
);
```

### 7.3 Key Inventory Rules
- **Available stock** = `SUM(quantity_available - quantity_reserved)` over `ACTIVE`, non-expired batches.
- **FEFO:** order allocation by `expiry_date ASC`; skip batches expiring within a minimum shelf-life window (e.g., 30 days).
- **Reserve** on order placement, **deduct** on pharmacist pick confirmation, **release** on cancel or timeout.
- Use `@Lock(PESSIMISTIC_WRITE)` on batch rows during allocation to prevent overselling.
- Nightly `@Scheduled` job: mark expired batches, send near-expiry and low-stock alerts.

---

## 8. Backend Design (Spring Boot)

### 8.1 Package Structure
```
com.meditrack
├── config        (SecurityConfig, CorsConfig, OpenApiConfig, WebSocketConfig, AsyncConfig)
├── security      (JwtUtil, JwtAuthFilter, UserDetailsServiceImpl, CustomAccessDenied/EntryPoint)
├── common        (ApiResponse, GlobalExceptionHandler, BusinessException, enums, utils)
├── auth          (AuthController, AuthService, OtpService)
├── user          (User, Role, profiles, UserController, AdminUserController)
├── catalog       (Product, Category, Manufacturer, ProductController)
├── inventory     (ProductBatch, Supplier, PurchaseOrder, InventoryService, ExpiryScheduler)
├── cart          (Cart, CartItem, CartController, CartService)
├── prescription  (Prescription, PrescriptionController, PrescriptionService, FileStorageService)
├── order         (Order, OrderItem, OrderService, OrderStateMachine, OrderController)
├── payment       (Payment, Refund, RazorpayService, PaymentController, WebhookController)
├── delivery      (Delivery, DeliveryService, AssignmentService, LocationService, TrackingController)
├── notification  (NotificationService, EmailSender, SmsSender, in-app)
├── report        (ReportService, DashboardController)
└── audit         (AuditAspect, AuditLog)
```
Each module follows `controller → service → repository → entity/dto` with MapStruct for mapping.

### 8.2 Key Dependencies (pom.xml)
`spring-boot-starter-web, -security, -data-jpa, -validation, -mail, -websocket, -actuator`, `mysql-connector-j`, `jjwt-api/impl/jackson`, `springdoc-openapi-starter-webmvc-ui`, `flyway-core + flyway-mysql`, `lombok`, `mapstruct`, `razorpay-java`, `openpdf` (invoices), `zxing` (QR), `bucket4j` (rate limiting), `spring-boot-starter-test`, `testcontainers`.

### 8.3 JWT and Security Design
- Passwords: **BCrypt**.
- **Access token**: 15 min, claims = `sub` (userId), `roles`. **Refresh token**: 7 days, stored hashed in DB, rotated on use, revocable on logout.
- Send the access token via `Authorization: Bearer <token>`. Refresh token in an **HttpOnly, Secure, SameSite cookie** (preferred) or in the body.
- `JwtAuthFilter extends OncePerRequestFilter` → validate token → set `SecurityContext`.
- Method security: `@EnableMethodSecurity` with `@PreAuthorize("hasRole('PHARMACIST')")`.
- Ownership checks: a customer can access only their own orders/prescriptions/addresses (check `order.customerId == currentUser.id`), and a delivery partner only their assigned deliveries.
- CORS: allow only the frontend origin. CSRF can be disabled for a stateless bearer-token API (keep it enabled if refresh uses cookies on a dedicated endpoint, or protect with SameSite).
- Rate-limit login, OTP and payment endpoints (Bucket4j); account lockout after N failed attempts.
- Validate file uploads (type, size, magic bytes); store outside the web root; serve prescriptions only via an authorized endpoint (never a public URL), or use signed URLs.
- Secrets in environment variables; never commit them.

```java
// Endpoint authorization sketch
http.authorizeHttpRequests(a -> a
  .requestMatchers("/api/auth/**", "/api/catalog/**", "/api/payments/webhook").permitAll()
  .requestMatchers("/api/admin/**").hasRole("ADMIN")
  .requestMatchers("/api/pharmacist/**").hasAnyRole("PHARMACIST","ADMIN")
  .requestMatchers("/api/delivery/**").hasRole("DELIVERY")
  .requestMatchers("/api/customer/**").hasRole("CUSTOMER")
  .anyRequest().authenticated());
```

### 8.4 Hibernate/JPA Notes
- Use `LAZY` fetching everywhere; avoid N+1 with `@EntityGraph` / `JOIN FETCH`.
- `@Version` on `Order` and `ProductBatch` (optimistic locking).
- `@Enumerated(EnumType.STRING)` for all enums.
- Auditing: `@EnableJpaAuditing` with `createdAt/updatedAt` via `@CreatedDate/@LastModifiedDate`.
- `spring.jpa.hibernate.ddl-auto=validate` (let Flyway own the schema).
- Use `BigDecimal` for money, always.
- Never expose entities in APIs; use DTOs.

### 8.5 REST API Catalogue

**Auth**
| Method | Endpoint | Role |
|---|---|---|
| POST | `/api/auth/register` | Public (customer / delivery partner) |
| POST | `/api/auth/verify-otp` | Public |
| POST | `/api/auth/login` | Public |
| POST | `/api/auth/refresh` | Public |
| POST | `/api/auth/logout` | Any |
| POST | `/api/auth/forgot-password` / `reset-password` | Public |

**Catalog (public read)**
| GET | `/api/catalog/products?q=&category=&rx=&page=` | `/api/catalog/products/{id}` | `/api/catalog/categories` |

**Customer**
| Endpoint | Purpose |
|---|---|
| `GET/PUT /api/customer/profile` | Profile |
| `CRUD /api/customer/addresses` | Addresses |
| `GET/POST/PUT/DELETE /api/customer/cart` | Cart |
| `POST /api/customer/prescriptions` (multipart) | Upload Rx |
| `GET /api/customer/prescriptions` | My prescriptions |
| `POST /api/customer/orders` | Place order (checkout) |
| `GET /api/customer/orders`, `/{id}` | History / details |
| `POST /api/customer/orders/{id}/cancel` | Cancel |
| `GET /api/customer/orders/{id}/tracking` | Status + live location |
| `POST /api/customer/orders/{id}/substitution/{itemId}/respond` | Accept/decline substitute |
| `GET /api/customer/orders/{id}/invoice` | PDF |
| `POST /api/payments/create`, `/verify` | Payment |
| `POST /api/payments/webhook` | Gateway webhook (signature-verified) |

**Pharmacist**
| Endpoint | Purpose |
|---|---|
| `GET /api/pharmacist/prescriptions?status=PENDING` | Rx queue |
| `POST /api/pharmacist/prescriptions/{id}/approve` / `reject` | Decision |
| `GET /api/pharmacist/orders?status=` | Order queue |
| `POST /api/pharmacist/orders/{id}/accept` | Start processing |
| `POST /api/pharmacist/orders/{id}/pick` | Confirm batch allocation |
| `POST /api/pharmacist/orders/{id}/ready` | Ready for pickup (generates pickup code/QR) |
| `POST /api/pharmacist/orders/{id}/handover` | Verify pickup code from partner |
| `CRUD /api/pharmacist/products`, `/batches` | Inventory |
| `GET /api/pharmacist/alerts/low-stock`, `/near-expiry` | Alerts |
| `CRUD /api/pharmacist/suppliers`, `/purchase-orders` | Procurement |
| `GET /api/pharmacist/reports/*` | Reports |

**Delivery Partner**
| Endpoint | Purpose |
|---|---|
| `PUT /api/delivery/availability` | Online/offline |
| `POST /api/delivery/location` | GPS ping |
| `GET /api/delivery/offers` | Nearby jobs |
| `POST /api/delivery/offers/{orderId}/accept` / `reject` | Accept |
| `POST /api/delivery/{id}/pickup` | Verify pickup code |
| `POST /api/delivery/{id}/start` | Out for delivery (sends OTP to the customer) |
| `POST /api/delivery/{id}/complete` | Submit customer OTP (+ photo, COD amount) |
| `POST /api/delivery/{id}/fail` | Failed delivery with reason |
| `GET /api/delivery/earnings` | Earnings |

**Admin**
| Endpoint | Purpose |
|---|---|
| `GET /api/admin/users`, `PUT /{id}/status` | User management |
| `POST /api/admin/pharmacists` | Create pharmacist |
| `GET/PUT /api/admin/delivery-partners/{id}/approval` | Approvals |
| `CRUD /api/admin/categories`, `/coupons`, `/settings` | Master data |
| `GET /api/admin/orders`, `POST /{id}/reassign`, `/force-cancel` | Oversight |
| `GET /api/admin/payments`, `POST /{id}/refund` | Payments |
| `GET/POST /api/admin/payouts` | Payouts |
| `GET /api/admin/dashboard`, `/reports/*` | Analytics |
| `GET /api/admin/audit-logs` | Audit |

Use a standard response envelope `{ success, message, data, errors, timestamp }`, pagination (`page,size,sort`), and a global `@RestControllerAdvice`.

---

## 9. Frontend Design (React)

### 9.1 Structure
```
src/
├── api/            axiosClient.js (baseURL, interceptors), authApi, productApi, orderApi ...
├── auth/           AuthContext, ProtectedRoute, RoleRoute, useAuth
├── components/     common (Navbar, Table, Modal, Loader, Toast), map (MapPicker, TrackingMap)
├── pages/
│   ├── public/     Home, Login, Register, ProductList, ProductDetail
│   ├── customer/   Cart, Checkout, Orders, OrderTracking, Prescriptions, Profile, Addresses
│   ├── pharmacist/ Dashboard, RxQueue, OrderQueue, Inventory, Batches, Suppliers, Reports
│   ├── delivery/   Dashboard, Offers, ActiveDelivery, Earnings
│   └── admin/      Dashboard, Users, Approvals, Orders, Payments, Coupons, Settings, Audit
├── routes/         AppRoutes.jsx (role-based route guards)
├── hooks/          useGeolocation, useWebSocket, useDebounce
└── utils/          formatters, validators
```

### 9.2 Axios Pattern
```js
const api = axios.create({ baseURL: import.meta.env.VITE_API_URL });

api.interceptors.request.use(cfg => {
  const t = tokenStore.getAccess();
  if (t) cfg.headers.Authorization = `Bearer ${t}`;
  return cfg;
});

api.interceptors.response.use(r => r, async err => {
  const orig = err.config;
  if (err.response?.status === 401 && !orig._retry) {
    orig._retry = true;
    const newToken = await refreshAccessToken();     // queue concurrent requests
    orig.headers.Authorization = `Bearer ${newToken}`;
    return api(orig);
  }
  return Promise.reject(err);
});
```
- Keep the access token in memory (plus a refresh cookie) rather than `localStorage`, to reduce XSS exposure.
- `ProtectedRoute` checks authentication; `RoleRoute roles={['PHARMACIST']}` checks the role. These are UX only; the backend is the real enforcement.
- Delivery partner UI should be mobile-first (PWA) as it runs on a phone with GPS.

---

## 10. Notifications

| Event | Customer | Pharmacist | Partner | Admin |
|---|---|---|---|---|
| Order placed | ✔ email | ✔ (new order/Rx) | | |
| Rx approved/rejected | ✔ | | | |
| Ready for pickup | | | ✔ offer | |
| Out for delivery + OTP | ✔ SMS | | | |
| Delivered | ✔ | | | |
| Low stock / near expiry | | ✔ | | ✔ |
| Delivery unassigned > N min | | | | ✔ |
| New partner/pharmacist signup | | | | ✔ |

Use Spring `ApplicationEventPublisher` + `@Async` listeners so notification failures never break the order transaction.

---

## 11. Non-Functional Requirements

- **Security:** OWASP Top 10, HTTPS, input validation, parameterized queries (JPA), secrets management, dependency scanning.
- **Privacy:** prescriptions are sensitive health data. Encrypt at rest where possible, restrict access, retention policy, consent, and delete/export on request (India's DPDP Act; GDPR if applicable).
- **Performance:** DB indexes, pagination, caching of catalog, connection pooling (HikariCP).
- **Reliability:** idempotent payment and refund APIs, transactional order placement, retries for external calls.
- **Observability:** Spring Actuator, structured logs with correlation IDs, Prometheus/Grafana (free) optional.
- **Scalability:** stateless backend (JWT) so you can run multiple instances behind a load balancer.
- **Backups:** daily MySQL dump; test restores.
- **Accessibility and responsive UI.**

---

## 12. Things You Might Be Missing (checklist)

**Legal / compliance (India-focused; verify with a professional)**
- Selling medicines online requires proper drug licences (retail/wholesale licence under the Drugs and Cosmetics Act); a registered pharmacist must verify prescriptions.
- Schedule H/H1/X drugs need a valid prescription and a register entry; Schedule X and narcotics are generally restricted for online sale.
- Maintain GST-compliant invoices with batch and expiry on the bill.
- Privacy policy, terms, refund/return policy, and a consent checkbox for health data.
- *This is not legal advice; confirm requirements with a regulatory consultant before going live.*

**Product / functional**
- Substitution workflow (generic alternatives) with customer consent.
- Partial fulfilment (some items out of stock): let the customer accept the partial order or cancel.
- Delivery slots and an urgent/express option; service-area (pincode/radius) validation.
- Cold-chain items (insulin, vaccines): flag products and restrict delivery or use special packaging.
- Order cancellation windows and clear refund rules.
- Reorder/refill reminders; wishlist; search with typo tolerance.
- Counter/POS billing for walk-in customers, as pharmacies usually have both.
- Barcode scanning for stock entry (use a USB scanner or the browser camera with ZXing).
- Drug interaction/allergy warnings (optional; use an open drug database or an openFDA dataset for ideas).
- Multi-store/branch support (add a `pharmacy_id` to inventory/orders from day one if there is any chance of branches).
- Support tickets/complaints; chat with the pharmacist (optional).
- Fraud controls: limit COD for high-value orders, block repeated failed deliveries, rate limits.

**Engineering**
- Flyway migrations, seed data (roles, the admin user, sample catalog).
- Idempotency keys for orders and payments; the webhook as source of truth.
- Concurrency tests for stock allocation.
- Global exception handling, validation messages, i18n readiness.
- API versioning (`/api/v1/...`).
- CI/CD, Dockerfile, `docker-compose.yml` (mysql + backend + frontend), env-specific profiles (`dev`, `prod`).
- Postman collection / Swagger for every endpoint.
- Data seeding source: public drug lists (e.g., open datasets of Indian medicines) for the catalog.

---

## 13. Suggested Development Roadmap

| Phase | Scope | Duration (solo) |
|---|---|---|
| 0 | Setup: repo, Docker Compose, MySQL, Flyway, project skeletons | 2–3 days |
| 1 | Auth: JWT, roles, registration, OTP, admin seed, route guards | 1 week |
| 2 | Catalog and inventory: products, categories, batches, search, expiry job | 1–1.5 weeks |
| 3 | Cart, addresses (map pin), checkout, order creation, state machine | 1.5 weeks |
| 4 | Prescription upload and pharmacist review queue | 1 week |
| 5 | Payments: Razorpay test mode, verify, webhook, COD, refunds | 1 week |
| 6 | Delivery: partner onboarding, assignment, pickup code, delivery OTP, COD settle | 1.5 weeks |
| 7 | Live tracking (WebSocket + Leaflet), ETA | 1 week |
| 8 | Admin dashboard, reports, payouts, audit logs | 1 week |
| 9 | Notifications, invoices PDF, polish, tests, security review | 1–2 weeks |
| 10 | Deployment, monitoring, backups, documentation | 3–5 days |

**MVP cut (do this first):** Auth → Catalog → Cart → Order → Rx review → COD + Razorpay test → Pharmacist fulfilment → Delivery with OTP. Add live tracking and payouts afterwards.

---

## 14. Environment Configuration (example)

```properties
# application-dev.properties
spring.datasource.url=jdbc:mysql://localhost:3306/meditrack
spring.datasource.username=${DB_USER}
spring.datasource.password=${DB_PASS}
spring.jpa.hibernate.ddl-auto=validate
spring.jpa.open-in-view=false
spring.flyway.enabled=true

app.jwt.secret=${JWT_SECRET}          # 256-bit+ random
app.jwt.access-exp-min=15
app.jwt.refresh-exp-days=7

razorpay.key-id=${RZP_KEY}
razorpay.key-secret=${RZP_SECRET}
razorpay.webhook-secret=${RZP_WEBHOOK_SECRET}

app.file.upload-dir=./uploads
spring.servlet.multipart.max-file-size=5MB
app.pharmacy.lat=12.9716
app.pharmacy.lng=77.5946
app.delivery.radius-km=8
```

```yaml
# docker-compose.yml (outline)
services:
  mysql:   { image: mysql:8, environment: [MYSQL_DATABASE=meditrack, MYSQL_ROOT_PASSWORD=...], ports: ["3306:3306"], volumes: [dbdata:/var/lib/mysql] }
  backend: { build: ./backend, depends_on: [mysql], ports: ["8080:8080"], env_file: .env }
  frontend:{ build: ./frontend, ports: ["3000:80"] }
volumes: { dbdata: {} }
```

---

## 15. Testing Strategy

- **Unit:** services (order state transitions, FEFO allocation, price/tax calculation) with Mockito.
- **Integration:** `@SpringBootTest` + Testcontainers MySQL; security tests with `@WithMockUser` for each role (verify 403s).
- **Concurrency:** two threads ordering the last unit of stock; exactly one should succeed.
- **Payment:** signature verification and webhook replay (idempotency).
- **Frontend:** component tests, plus Cypress/Playwright E2E for the golden path (register → order → approve → deliver).
- **Security:** try IDOR (accessing another user's order ID), expired JWT, tampered JWT, file upload abuse.

---

## 16. Quick Role-Permission Matrix

| Resource / Action | Customer | Pharmacist | Delivery | Admin |
|---|:-:|:-:|:-:|:-:|
| Browse catalog | ✔ | ✔ | ✔ | ✔ |
| Manage cart / place order | ✔ | | | |
| Upload prescription | ✔ | | | |
| Approve/reject prescription | | ✔ | | |
| Manage products / batches | | ✔ | | ✔ |
| Process / pack order | | ✔ | | |
| Accept & deliver order | | | ✔ | |
| Verify delivery OTP | | | ✔ | |
| Refund / force-cancel | | | | ✔ |
| Manage users / approvals | | | | ✔ |
| Reports | | ✔ (store) | ✔ (own) | ✔ (all) |
| Audit logs / settings | | | | ✔ |

---

---
---

# PART B: Additions and Completion Sections

The sections below complete the document: the missing database tables, business rules, who may trigger each state change, user stories, sample code, UI screens, operations and risk planning.

---

## 17. Additional Database Tables (missing from Section 7)

Apply as a second Flyway migration (`V2__additions.sql`).

```sql
-- ===== Pharmacy / store (multi-branch ready) =====
CREATE TABLE pharmacies (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(150) NOT NULL,
  drug_license_no VARCHAR(60) NOT NULL,
  gstin VARCHAR(20),
  phone VARCHAR(15), email VARCHAR(150),
  address VARCHAR(300), city VARCHAR(80), state VARCHAR(80), pincode VARCHAR(10),
  latitude DECIMAL(10,7) NOT NULL, longitude DECIMAL(10,7) NOT NULL,
  service_radius_km DECIMAL(5,2) DEFAULT 8.00,
  opens_at TIME, closes_at TIME,
  is_active BOOLEAN DEFAULT TRUE
);
ALTER TABLE pharmacist_profile ADD FOREIGN KEY (pharmacy_id) REFERENCES pharmacies(id);
ALTER TABLE product_batches ADD COLUMN pharmacy_id BIGINT NOT NULL DEFAULT 1,
  ADD FOREIGN KEY (pharmacy_id) REFERENCES pharmacies(id);
ALTER TABLE orders ADD COLUMN pharmacy_id BIGINT NOT NULL DEFAULT 1,
  ADD FOREIGN KEY (pharmacy_id) REFERENCES pharmacies(id);

-- ===== Stock ledger: every stock change is recorded (audit + reconciliation) =====
CREATE TABLE stock_movements (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  batch_id BIGINT NOT NULL,
  movement_type ENUM('PURCHASE_IN','RESERVE','RELEASE','SALE_OUT','RETURN_IN',
                     'EXPIRED_OUT','DAMAGED_OUT','ADJUSTMENT') NOT NULL,
  quantity INT NOT NULL,                       -- positive number; direction from type
  reference_type VARCHAR(30), reference_id BIGINT,   -- ORDER / PURCHASE_ORDER / MANUAL
  performed_by BIGINT, note VARCHAR(255),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_sm_batch (batch_id, created_at),
  FOREIGN KEY (batch_id) REFERENCES product_batches(id)
);

-- ===== Substitution proposals =====
CREATE TABLE order_substitutions (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  order_item_id BIGINT NOT NULL,
  proposed_product_id BIGINT NOT NULL,
  proposed_by BIGINT NOT NULL,                 -- pharmacist
  reason VARCHAR(255),
  price_difference DECIMAL(10,2),
  status ENUM('PROPOSED','ACCEPTED','DECLINED','EXPIRED') DEFAULT 'PROPOSED',
  expires_at DATETIME,
  responded_at DATETIME,
  FOREIGN KEY (order_item_id) REFERENCES order_items(id),
  FOREIGN KEY (proposed_product_id) REFERENCES products(id)
);

-- ===== Prescription line items (what the Rx actually allows) =====
CREATE TABLE prescription_items (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  prescription_id BIGINT NOT NULL,
  product_id BIGINT NULL, drug_name_text VARCHAR(200),
  dosage VARCHAR(100), duration_days INT,
  max_quantity INT,                            -- pharmacist-set cap, prevents over-dispensing
  refills_allowed TINYINT DEFAULT 0, refills_used TINYINT DEFAULT 0,
  FOREIGN KEY (prescription_id) REFERENCES prescriptions(id)
);

-- ===== Delivery job offers (broadcast model) =====
CREATE TABLE delivery_offers (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  delivery_id BIGINT NOT NULL, partner_id BIGINT NOT NULL,
  status ENUM('SENT','ACCEPTED','REJECTED','EXPIRED','CANCELLED') DEFAULT 'SENT',
  distance_to_pickup_km DECIMAL(6,2),
  offered_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  expires_at DATETIME NOT NULL, responded_at DATETIME,
  UNIQUE KEY uq_offer (delivery_id, partner_id),
  FOREIGN KEY (delivery_id) REFERENCES deliveries(id),
  FOREIGN KEY (partner_id) REFERENCES users(id)
);
ALTER TABLE deliveries
  ADD COLUMN attempt_no TINYINT DEFAULT 1,
  ADD COLUMN delivery_otp_attempts TINYINT DEFAULT 0,
  ADD COLUMN recipient_name VARCHAR(120),
  ADD COLUMN recipient_id_checked BOOLEAN DEFAULT FALSE;

-- ===== Returns / refunds requests =====
CREATE TABLE return_requests (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  order_id BIGINT NOT NULL, order_item_id BIGINT NULL, customer_id BIGINT NOT NULL,
  reason ENUM('WRONG_ITEM','DAMAGED','EXPIRED_RECEIVED','MISSING_ITEM','OTHER'),
  description VARCHAR(500), photo_url VARCHAR(255),
  status ENUM('REQUESTED','APPROVED','REJECTED','PICKUP_SCHEDULED','RECEIVED','REFUNDED') DEFAULT 'REQUESTED',
  decided_by BIGINT, decided_at DATETIME, created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (order_id) REFERENCES orders(id)
);

-- ===== Invoices =====
CREATE TABLE invoices (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  invoice_number VARCHAR(30) UNIQUE NOT NULL,   -- e.g. MT/2526/000123
  order_id BIGINT UNIQUE NOT NULL,
  pharmacy_id BIGINT NOT NULL,
  subtotal DECIMAL(10,2), cgst DECIMAL(10,2), sgst DECIMAL(10,2), igst DECIMAL(10,2),
  total DECIMAL(10,2), pdf_url VARCHAR(255), issued_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (order_id) REFERENCES orders(id)
);

-- ===== Delivery slots =====
CREATE TABLE delivery_slots (
  id INT PRIMARY KEY AUTO_INCREMENT,
  label VARCHAR(40), start_time TIME, end_time TIME, max_orders INT DEFAULT 20, active BOOLEAN DEFAULT TRUE
);
ALTER TABLE orders ADD COLUMN slot_id INT NULL, ADD COLUMN slot_date DATE NULL,
  ADD COLUMN is_express BOOLEAN DEFAULT FALSE;

-- ===== Wishlist, support, idempotency, webhooks =====
CREATE TABLE wishlist_items (
  user_id BIGINT, product_id BIGINT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, product_id)
);
CREATE TABLE support_tickets (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT NOT NULL, order_id BIGINT NULL,
  subject VARCHAR(150), status ENUM('OPEN','IN_PROGRESS','RESOLVED','CLOSED') DEFAULT 'OPEN',
  assigned_to BIGINT NULL, created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE support_messages (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  ticket_id BIGINT NOT NULL, sender_id BIGINT NOT NULL, message VARCHAR(1000),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (ticket_id) REFERENCES support_tickets(id)
);
CREATE TABLE idempotency_keys (
  id_key VARCHAR(80) PRIMARY KEY, user_id BIGINT, endpoint VARCHAR(80),
  response_hash VARCHAR(64), created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE webhook_events (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  provider VARCHAR(20), event_id VARCHAR(80) UNIQUE,   -- dedupe replays
  event_type VARCHAR(60), payload JSON, processed BOOLEAN DEFAULT FALSE,
  received_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE user_devices (                             -- push notifications (FCM) optional
  id BIGINT PRIMARY KEY AUTO_INCREMENT, user_id BIGINT, device_token VARCHAR(255), platform VARCHAR(10)
);
```

**Extra indexes to add:** `orders(pharmacy_id, status, placed_at)`, `deliveries(partner_id, status)`, `payments(gateway_order_id)`, `prescriptions(user_id, status)`, `notifications(user_id, is_read)`, and a SPATIAL index on partner location (store `POINT` column `location` alongside lat/lng).

**Seed data (Flyway `V3__seed.sql`):** 4 roles, 1 admin (password from env, forced change on first login), default pharmacy, delivery slots, system settings, GST slabs (0/5/12/18), starter categories, and ~50 sample products with batches for demos.

---

## 18. Business Rules (single source of truth)

### 18.1 Ordering
| # | Rule |
|---|---|
| B1 | Cart quantity per item max = min(available stock, 10 for OTC, Rx-approved qty for Rx items). |
| B2 | Prescription must be: patient name matches the account or a stated dependant, doctor reg. no. present, issued within **6 months** (Schedule H); within **30 days** for Schedule H1/X (where permitted at all). |
| B3 | Order total must be ≥ minimum order value (configurable, default ₹0). Delivery fee waived above the free-delivery threshold. |
| B4 | Delivery address must be within the pharmacy's service radius (Haversine or OSRM distance); otherwise the checkout is blocked with a clear message. |
| B5 | Stock is reserved for **15 minutes** for online payment (released automatically); COD orders reserve on placement. |
| B6 | Unpaid online orders auto-cancel after the 15-minute timeout; reserved stock is released. |
| B7 | A batch with fewer than **30 days** to expiry (configurable) is not sold online. |
| B8 | Maximum **one** active (undelivered) COD order per new customer; COD limit ₹3000 (configurable). |
| B9 | Schedule X and narcotics are not sold online (blocked in the catalog flag `online_sale_allowed = false`). |
| B10 | A prescription's `max_quantity` and `refills_allowed` cap cumulative dispensing across orders. |

### 18.2 Pricing formula
```
line_total   = unit_price_incl_gst × qty            (MRP is GST-inclusive in India; selling_price ≤ MRP)
tax_amount   = Σ line_total × gst% / (100 + gst%)    (extracted, shown on invoice as CGST+SGST)
delivery_fee = free if subtotal ≥ threshold
               else base_fee + per_km_fee × max(0, distance_km − included_km)
express_fee  = flat (if express selected)
discount     = coupon rule (capped by max_discount; never on Rx-only items if policy says so)
total        = subtotal + delivery_fee + express_fee − discount
```
Round each money field to 2 decimals using `RoundingMode.HALF_UP`; recompute on the server only (never trust client totals).

### 18.3 Cancellation and refund matrix
| Order state when cancelling | Who can cancel | Refund |
|---|---|---|
| PLACED / PRESCRIPTION_PENDING / CONFIRMED | Customer, Admin | 100% |
| PROCESSING | Customer (request), Pharmacist approves | 100% if items not yet packed, else Admin decides |
| READY_FOR_PICKUP / ASSIGNED | Admin only | 100% minus optional restocking fee |
| PICKED_UP / OUT_FOR_DELIVERY | Admin only (treated as failed delivery) | Per outcome |
| DELIVERED | Not cancellable; use return request | Only for wrong/damaged/expired items |
| Prescription REJECTED | System | 100% automatic |

Medicines delivered correctly are **not returnable** (safety and regulation); document this in the policy.

### 18.4 Delivery rules
- Delivery OTP: 4 digits, hashed, valid **until delivered or 6 hours**, max **3 attempts**, then the partner must call Admin/support (Admin can override with a logged reason).
- Max **2 delivery attempts**; after the second failure → `RETURNED_TO_STORE`, refund minus delivery fee (policy-based).
- Partner offer timeout **60–90 s**; after 3 radius expansions (3 km → 5 km → 8 km) alert Admin.
- A partner may carry at most **2 concurrent** deliveries (configurable).
- Partner earning = base per order + per-km rate + surge/bonus; COD cash must be settled within 24 h.
- For Rx orders the partner confirms the recipient's name (and ID if flagged); the recipient must be an adult.

### 18.5 Inventory rules
- Never allow negative stock (DB `CHECK (quantity_available >= 0)` plus the service check).
- All stock changes go through `InventoryService` and write a `stock_movements` row, with no direct updates.
- FEFO allocation can split one line across multiple batches (so `order_items` may hold several rows per product, or use an allocation table).
- Expired batches are auto-set to `EXPIRED` by the nightly job and excluded from sale.
- Reorder level breach triggers a low-stock alert (once per day per product).

---

## 19. Who Can Trigger Which State Change

| From → To | Triggered by | Preconditions |
|---|---|---|
| (cart) → PLACED | Customer | Stock OK, address in radius, valid Rx attached if needed |
| PLACED → PRESCRIPTION_PENDING | System | `has_rx_items` and payment OK (or COD) |
| PLACED → CONFIRMED | System | No Rx items and payment OK / COD |
| PRESCRIPTION_PENDING → CONFIRMED | Pharmacist | Rx approved |
| PRESCRIPTION_PENDING → REJECTED | Pharmacist | Reason mandatory; auto refund |
| CONFIRMED → PROCESSING | Pharmacist | Accepts order |
| PROCESSING → READY_FOR_PICKUP | Pharmacist | All items picked with batches; pickup code generated |
| READY_FOR_PICKUP → ASSIGNED | Delivery partner (accept) / System (auto) | Partner online and eligible |
| ASSIGNED → PICKED_UP | Delivery partner | Valid pickup code (Pharmacist confirms handover) |
| PICKED_UP → OUT_FOR_DELIVERY | Delivery partner | Delivery OTP sent to customer |
| OUT_FOR_DELIVERY → DELIVERED | Delivery partner | OTP verified (+ COD collected if COD) |
| OUT_FOR_DELIVERY → DELIVERY_FAILED | Delivery partner | Reason mandatory |
| DELIVERY_FAILED → OUT_FOR_DELIVERY | System/Admin | Re-attempt (attempt_no < 2) |
| DELIVERY_FAILED → RETURNED_TO_STORE | Pharmacist | Package received back; restock if sealed and valid |
| any early state → CANCELLED | Per matrix in 18.3 | |

Implement it as an `OrderStateMachine` class holding the map of allowed transitions plus a role check. Every transition writes `order_status_history` and publishes an event. Invalid transitions throw `409 Conflict`.

---

## 20. User Stories and Acceptance Criteria

**Customer**
- *US-C1:* As a customer, I can register with email/phone and verify via OTP so my account is trusted.
  - AC: invalid or expired OTP is rejected; max 5 attempts; account becomes ACTIVE after verification.
- *US-C2:* I can search medicines by brand or generic name and see availability.
  - AC: results in < 1 s for 10k products; out-of-stock items are labelled; substitutes are listed.
- *US-C3:* I can upload a prescription and attach it to my order.
  - AC: only JPG/PNG/PDF ≤ 5 MB; status is visible; rejection shows a reason.
- *US-C4:* I can pay online or by COD and see a confirmation.
  - AC: payment success without a callback is still reconciled via the webhook; no double charge on retry.
- *US-C5:* I can track my order live and share an OTP at delivery.
  - AC: map updates ≤ 10 s; OTP shown only to the owner of the order.
- *US-C6:* I can cancel according to the cancellation matrix and get the refund shown.

**Pharmacist**
- *US-P1:* I can see a queue of pending prescriptions sorted oldest-first and approve or reject.
  - AC: rejection requires a reason; approval records the doctor details and quantity limits; every action is audit-logged.
- *US-P2:* I can pick items; the system suggests batches by earliest expiry.
- *US-P3:* I can add stock with batch and expiry; I get alerts for low stock and expiry.
- *US-P4:* I can propose a substitute; the customer is notified and must accept.
- *US-P5:* I can see the controlled-drug register and export it.

**Delivery partner**
- *US-D1:* I can go online and receive offers within my radius.
- *US-D2:* I can verify pickup by code/QR and see the route.
- *US-D3:* I can complete delivery only with the correct OTP; failures need a reason.
- *US-D4:* I can see earnings and COD to be settled.

**Admin**
- *US-A1:* I can approve or reject partners/pharmacists with document review.
- *US-A2:* I can reassign a delivery, force-cancel and refund, with audit logging.
- *US-A3:* I can view the dashboard: orders/day, revenue, SLA, expiry loss, top products.
- *US-A4:* I can configure radius, fees, slots, coupons and tax.

---

## 21. Detailed Sequence Flows

### 21.1 Checkout and Payment (online)
```
Customer(React)      Backend              MySQL            Razorpay
   │ POST /orders (Idempotency-Key) │        │                │
   │──────────────►│ validate cart, radius, Rx                  │
   │               │ reserve stock (tx) ───►│                  │
   │               │ create order PLACED ──►│                  │
   │               │ create RZP order ─────────────────────────►
   │◄──────────────│ {orderId, rzpOrderId, amount}              │
   │ open Razorpay Checkout ─────────────────────────────────────►
   │◄───────────── payment_id, signature ───────────────────────│
   │ POST /payments/verify ───►│ HMAC check                     │
   │               │ payment SUCCESS, order→CONFIRMED/RX_PENDING │
   │               │◄──── webhook payment.captured (dedupe) ─────│
   │◄─ confirmation + notifications                              │
```

### 21.2 Delivery Handover
```
Pharmacist: READY_FOR_PICKUP → system creates delivery(SEARCHING) → offers sent
Partner: accepts (atomic UPDATE ... WHERE partner_id IS NULL) → ASSIGNED
Partner arrives → shows pickup code/QR → Pharmacist verifies → PICKED_UP
Partner taps "Start" → OTP generated, hashed, sent to customer → OUT_FOR_DELIVERY
Partner reaches → customer says OTP → POST /complete {otp, cod?} → DELIVERED
Backend: invoice finalized, COD recorded, earnings credited, review prompt sent
```

### 21.3 Rejected Prescription
```
Pharmacist rejects (reason) → order REJECTED → stock released → refund initiated
→ customer notified with reason and option to re-upload a valid prescription
```

---

## 22. Sample Code Skeletons

### 22.1 JWT utility
```java
@Component
public class JwtUtil {
  @Value("${app.jwt.secret}") private String secret;
  @Value("${app.jwt.access-exp-min}") private long accessExpMin;

  private Key key() { return Keys.hmacShaKeyFor(Decoders.BASE64.decode(secret)); }

  public String generateAccess(UserPrincipal u) {
    return Jwts.builder()
      .setSubject(String.valueOf(u.getId()))
      .claim("roles", u.getAuthorities().stream().map(GrantedAuthority::getAuthority).toList())
      .setIssuedAt(new Date())
      .setExpiration(Date.from(Instant.now().plus(accessExpMin, ChronoUnit.MINUTES)))
      .signWith(key(), SignatureAlgorithm.HS256).compact();
  }
  public Claims parse(String token) {
    return Jwts.parserBuilder().setSigningKey(key()).build().parseClaimsJws(token).getBody();
  }
}
```

### 22.2 Order state machine
```java
@Component
public class OrderStateMachine {
  private static final Map<OrderStatus, Map<OrderStatus, Set<Role>>> RULES = Map.of(
    CONFIRMED,        Map.of(PROCESSING, Set.of(PHARMACIST)),
    PROCESSING,       Map.of(READY_FOR_PICKUP, Set.of(PHARMACIST)),
    READY_FOR_PICKUP, Map.of(ASSIGNED, Set.of(DELIVERY, SYSTEM)),
    ASSIGNED,         Map.of(PICKED_UP, Set.of(DELIVERY)),
    PICKED_UP,        Map.of(OUT_FOR_DELIVERY, Set.of(DELIVERY)),
    OUT_FOR_DELIVERY, Map.of(DELIVERED, Set.of(DELIVERY), DELIVERY_FAILED, Set.of(DELIVERY))
    // ... remaining transitions from Section 19
  );

  public void transition(Order o, OrderStatus to, Role actor, String note) {
    var allowed = RULES.getOrDefault(o.getStatus(), Map.of()).get(to);
    if (allowed == null || !allowed.contains(actor))
      throw new InvalidTransitionException(o.getStatus(), to, actor);
    historyRepo.save(new OrderStatusHistory(o.getId(), o.getStatus(), to, actor, note));
    o.setStatus(to);
  }
}
```

### 22.3 FEFO allocation with locking
```java
@Transactional
public List<Allocation> allocate(Long productId, int qty, Long pharmacyId) {
  List<ProductBatch> batches = batchRepo.findAvailableForUpdate(productId, pharmacyId, LocalDate.now().plusDays(minShelfLifeDays));
  // @Lock(PESSIMISTIC_WRITE) + ORDER BY expiry_date ASC
  List<Allocation> result = new ArrayList<>();
  int remaining = qty;
  for (ProductBatch b : batches) {
    int take = Math.min(remaining, b.getQuantityAvailable() - b.getQuantityReserved());
    if (take <= 0) continue;
    b.setQuantityReserved(b.getQuantityReserved() + take);
    stockMovementRepo.save(StockMovement.reserve(b, take));
    result.add(new Allocation(b.getId(), take));
    remaining -= take;
    if (remaining == 0) break;
  }
  if (remaining > 0) throw new InsufficientStockException(productId);
  return result;
}
```

### 22.4 Razorpay signature verification
```java
public boolean verify(String orderId, String paymentId, String signature) {
  String payload = orderId + "|" + paymentId;
  String expected = HmacUtils.hmacSha256Hex(secret, payload);
  return MessageDigest.isEqual(expected.getBytes(UTF_8), signature.getBytes(UTF_8)); // constant time
}
```

### 22.5 Delivery OTP
```java
public String issueOtp(Order o) {
  String otp = String.format("%04d", new SecureRandom().nextInt(10000));
  o.setDeliveryOtpHash(passwordEncoder.encode(otp));
  o.setDeliveryOtpExpires(LocalDateTime.now().plusHours(6));
  notificationService.sendSms(o.getCustomer().getPhone(), "MediTrack delivery OTP: " + otp);
  return otp; // never return to the delivery partner's API response
}
public void verifyOtp(Delivery d, Order o, String input) {
  if (d.getDeliveryOtpAttempts() >= 3) throw new TooManyAttemptsException();
  if (!passwordEncoder.matches(input, o.getDeliveryOtpHash())) {
    d.setDeliveryOtpAttempts(d.getDeliveryOtpAttempts() + 1);
    throw new InvalidOtpException();
  }
}
```

### 22.6 Atomic delivery accept (prevents double-assignment)
```java
@Modifying
@Query("UPDATE Delivery d SET d.partnerId = :pid, d.status = 'ASSIGNED', d.assignedAt = CURRENT_TIMESTAMP " +
       "WHERE d.id = :id AND d.partnerId IS NULL AND d.status = 'SEARCHING'")
int tryAssign(@Param("id") Long id, @Param("pid") Long partnerId);   // 1 = won, 0 = lost
```

### 22.7 Nearby partners (MySQL spatial)
```sql
SELECT u.user_id,
       ST_Distance_Sphere(POINT(p.current_lng, p.current_lat), POINT(:lng, :lat)) / 1000 AS km
FROM delivery_partner_profile p JOIN users u ON u.id = p.user_id
WHERE p.is_online = TRUE AND p.approval_status = 'APPROVED'
  AND p.last_location_at > NOW() - INTERVAL 2 MINUTE
HAVING km <= :radiusKm
ORDER BY km LIMIT 10;
```

### 22.8 Scheduled jobs
| Job | Cron | Action |
|---|---|---|
| `expireUnpaidOrders` | every 1 min | Cancel unpaid orders older than 15 min, release stock |
| `expireBatches` | daily 00:30 | Set past-expiry batches to `EXPIRED`, log movement |
| `expiryAlerts` | daily 08:00 | Notify pharmacist and admin of batches expiring in ≤ 60 days |
| `lowStockAlerts` | daily 08:05 | Products below `reorder_level` |
| `unassignedDeliveryWatch` | every 1 min | Widen radius / alert admin |
| `staleOnlinePartners` | every 2 min | Mark partners offline if no GPS ping > 2 min |
| `cleanupOtp/Tokens` | daily | Purge expired OTPs, refresh tokens |
| `prescriptionExpiry` | daily | Flag expired prescriptions |

---

## 23. API Conventions and Examples

**Response envelope**
```json
{ "success": true, "message": "Order placed", "data": { "orderId": 1021, "orderNumber": "MT-20261017-0042" },
  "errors": null, "timestamp": "2026-10-17T16:20:00+05:30" }
```
**Error example**
```json
{ "success": false, "message": "Validation failed",
  "errors": [{ "field": "quantity", "code": "MIN_1", "message": "Quantity must be at least 1" }],
  "timestamp": "2026-10-17T16:20:00+05:30" }
```

**Standard error codes:** `400 VALIDATION_FAILED`, `401 UNAUTHENTICATED / TOKEN_EXPIRED`, `403 FORBIDDEN`, `404 NOT_FOUND`, `409 INVALID_STATE_TRANSITION / INSUFFICIENT_STOCK / DUPLICATE`, `422 RX_REQUIRED / RX_EXPIRED / OUT_OF_SERVICE_AREA`, `429 RATE_LIMITED`, `500 INTERNAL_ERROR`.

**Conventions:** versioned base path `/api/v1`, `Idempotency-Key` header on `POST /orders` and `POST /payments/*`, pagination `?page=0&size=20&sort=placedAt,desc`, ISO-8601 timestamps, money as decimal strings or numbers with 2 decimals, and snake_case or camelCase used consistently (choose camelCase).

**JWT payload sample**
```json
{ "sub": "42", "roles": ["ROLE_CUSTOMER"], "iat": 1760698200, "exp": 1760699100 }
```

**Place-order request sample**
```json
POST /api/v1/customer/orders
Idempotency-Key: 7c1f6e0e-...
{ "addressId": 12, "paymentMethod": "ONLINE", "prescriptionId": 88,
  "slotId": 3, "slotDate": "2026-10-18", "couponCode": "WELCOME10", "express": false }
```

**WebSocket topics**
| Topic | Subscribers | Payload |
|---|---|---|
| `/topic/orders/{id}/status` | Customer (owner) | `{status, at}` |
| `/topic/orders/{id}/location` | Customer (owner) | `{lat, lng, etaMin}` |
| `/user/queue/offers` | Delivery partner | New offer |
| `/topic/pharmacy/{id}/orders` | Pharmacists | New order / Rx |
Authenticate the WebSocket handshake with the JWT and authorize subscriptions (a customer can subscribe only to their own order).

---

## 24. Frontend Screens and Routes

| Role | Route | Screen |
|---|---|---|
| Public | `/` `/products` `/products/:id` `/login` `/register` `/verify-otp` `/forgot-password` | Home, listing, details, auth |
| Customer | `/cart` `/checkout` `/orders` `/orders/:id` `/orders/:id/track` `/prescriptions` `/addresses` `/profile` `/wishlist` `/support` | Shopping, tracking, records |
| Pharmacist | `/pharmacist` `/pharmacist/rx` `/pharmacist/orders` `/pharmacist/orders/:id` `/pharmacist/inventory` `/pharmacist/batches` `/pharmacist/suppliers` `/pharmacist/purchases` `/pharmacist/register` `/pharmacist/reports` | Queue, picking, stock |
| Delivery | `/delivery` `/delivery/offers` `/delivery/active` `/delivery/history` `/delivery/earnings` `/delivery/profile` | Mobile-first |
| Admin | `/admin` `/admin/users` `/admin/approvals` `/admin/orders` `/admin/payments` `/admin/payouts` `/admin/catalog` `/admin/coupons` `/admin/slots` `/admin/settings` `/admin/audit` `/admin/support` | Governance |

**UI states to design for every screen:** loading skeleton, empty, error with retry, offline banner (especially for the delivery partner), and a permission-denied page. Also include toast notifications, form validation, a confirm dialog for destructive actions, and a 401 auto-logout.

---

## 25. Security Hardening Checklist

- [ ] BCrypt strength ≥ 10; password policy (min 8, mixed); breached-password check optional
- [ ] JWT secret ≥ 256 bits from env/secret manager; rotate keys periodically; short access TTL
- [ ] Refresh token rotation with reuse detection (revoke the whole family on reuse)
- [ ] Rate limiting: login (5/min/IP), OTP request (3/10 min), payment endpoints
- [ ] Account lockout / CAPTCHA after repeated failures (Cloudflare Turnstile is free)
- [ ] IDOR checks on every `/{id}` endpoint (ownership or assignment)
- [ ] Bean Validation on all DTOs; reject unknown JSON fields
- [ ] Upload security: whitelist types, check magic bytes, random filenames, size limit, optional antivirus scan (ClamAV), serve via authorized endpoint only
- [ ] Security headers: HSTS, `X-Content-Type-Options`, `X-Frame-Options`, CSP
- [ ] Never log passwords, OTPs, tokens or full card/health data; mask PII in logs
- [ ] Webhook signature verification and replay protection (`webhook_events` unique `event_id`)
- [ ] Admin actions are audit-logged; admin account protected (consider 2FA/TOTP)
- [ ] Dependency scanning (OWASP Dependency-Check, Dependabot) and secret scanning in CI
- [ ] DB user with least privilege; DB not publicly exposed; TLS to the DB in production
- [ ] Encrypt sensitive columns or files at rest where feasible
- [ ] Data retention and deletion policy for prescriptions and personal data

---

## 26. DevOps, Environments and Operations

**Environments:** `local` (Docker Compose) → `staging` → `production`, each with its own DB, keys (Razorpay test vs live) and configuration profiles.

**Git workflow:** `main` (protected) ← `develop` ← `feature/*`; conventional commits; PR review and CI must pass.

**CI pipeline (GitHub Actions):** build → unit tests → integration tests (Testcontainers) → lint (Checkstyle/ESLint) → dependency scan → Docker build → deploy to staging → manual approval → production.

**Repository layout**
```
meditrack/
├── backend/          (Spring Boot, Maven/Gradle)
├── frontend/         (React + Vite)
├── docs/             (this file, ER diagram, API collection)
├── docker-compose.yml
├── .github/workflows/
└── README.md
```

**Configuration and secrets list:** `DB_URL, DB_USER, DB_PASS, JWT_SECRET, RZP_KEY, RZP_SECRET, RZP_WEBHOOK_SECRET, SMTP_*, SMS_API_KEY, STORAGE_*, FRONTEND_ORIGIN, PHARMACY_LAT/LNG`.

**Monitoring and logging:** Actuator `/health`, `/metrics`; JSON logs with a `traceId` per request; alerts for 5xx spikes, payment failures, unassigned deliveries; uptime check (UptimeRobot free tier).

**Backups and DR:** daily `mysqldump` plus binlogs where possible, retained 14–30 days, a restore drill monthly, and uploads bucket versioning. Target RPO 24 h and RTO 4 h (adjust to need).

**Free hosting ideas:** frontend on Vercel/Netlify/Cloudflare Pages; backend on Render/Railway/Fly.io (free tiers sleep or are limited); MySQL on Aiven free tier or a container on a small VM; files on Cloudinary free tier. Free tiers change often, so verify current limits.

---

## 27. Risks and Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Regulatory non-compliance | Legal/business shutdown | Licences, pharmacist verification, register, legal review before launch |
| Fake/forged prescriptions | Patient harm | Pharmacist review, doctor reg. no. check, quantity caps, audit trail |
| Overselling stock | Cancellations, trust loss | Locked FEFO allocation, reservations, stock ledger |
| Payment/webhook mismatch | Lost orders, double charge | Signature verify, webhook source of truth, idempotency |
| Delivery fraud (OTP sharing, COD theft) | Financial loss | OTP + ID checks, COD limits, daily settlement, ratings |
| Data breach of health data | Legal/reputation | Encryption, access controls, minimal retention, audit logs |
| Free-tier API limits (Nominatim, OSRM) | Broken maps/ETA | Cache, throttle, fallback to straight-line distance, self-host later |
| GPS inaccuracy/battery drain | Poor tracking | Adaptive ping interval, smoothing, show last-updated time |
| Single point of failure | Downtime | Stateless instances, health checks, backups |

---

## 28. Testing: Key Scenarios to Cover

1. Register → OTP → login → token refresh → logout (refresh token revoked).
2. Role isolation: each role gets 403 on other roles' endpoints; a customer cannot read another customer's order (IDOR).
3. Rx item without a prescription → 422; expired Rx → 422; Rx quantity above the cap → 422.
4. Two simultaneous orders for the last unit → exactly one succeeds.
5. Payment: valid signature OK, tampered signature rejected, webhook replay ignored, payment succeeds but the browser closes (webhook completes the order).
6. Unpaid order auto-cancel after 15 min and stock released.
7. Two partners accept the same delivery at once → one wins.
8. Wrong OTP 3 times → locked; admin override logged.
9. Delivery failed twice → returned to store → refund policy applied.
10. Expiry job: expired batch is never allocated.
11. Cancellation matrix for each status.
12. Substitution accepted/declined/expired paths.
13. Refund idempotency (calling refund twice does not double-refund).

**Targets:** ≥ 80% service-layer coverage, all state transitions covered, and an E2E golden path in CI.

---

## 29. KPIs and Reports

- **Customer/ops:** orders/day, conversion (cart→order), average order value, repeat rate, cancellation %, Rx rejection %.
- **Fulfilment SLA:** order→confirmed, confirmed→ready, ready→assigned, assigned→delivered, on-time %.
- **Inventory:** stock turnover, stockouts, near-expiry value, expired write-off value, fill rate.
- **Finance:** GMV, revenue, GST collected, COD pending, refunds, partner payouts.
- **Delivery:** acceptance rate, avg delivery time, failed %, rating.

---

## 30. Future Enhancements (post-MVP)

Mobile apps (React Native, reusing the API) · push notifications (FCM free) · OCR on prescriptions (Tesseract free, or a cloud API) to pre-fill the doctor and drug fields · drug interaction/allergy checks · teleconsultation integration · loyalty points · subscription refills · multi-pharmacy marketplace · route optimization for multi-drop · demand forecasting for reorder · e-invoicing and accounting export (Tally/CSV) · multi-language UI (English, Hindi, Kannada, etc.).

---

## 31. Assumptions and Open Decisions

| # | Decision | Default in this doc | Change if |
|---|---|---|---|
| 1 | Country/currency | India, INR, GST | Another market |
| 2 | Single vs multi pharmacy | Single, schema ready for multi | Marketplace model |
| 3 | Monolith vs microservices | Modular monolith | Large scale/teams |
| 4 | Payment gateway | Razorpay | Stripe/PayU/Cashfree |
| 5 | Refresh token storage | HttpOnly cookie | Mobile client needs body tokens |
| 6 | Assignment model | Broadcast/accept | Auto-assign at scale |
| 7 | File storage | Local → S3/Cloudinary | Compliance needs |
| 8 | Real-time | WebSocket (polling fallback) | Simplicity |
| 9 | SMS provider | Console in dev, provider in prod | Cost/region |
| 10 | Returns | Only wrong/damaged/expired | Different policy |

---

## 32. Glossary

- **Rx / OTC:** prescription-only / over-the-counter
- **Schedule H, H1, X:** Indian drug schedule classes with increasing dispensing restrictions
- **FEFO:** First Expiry, First Out stock allocation
- **Batch:** a manufacturing lot with its own number and expiry
- **MRP:** maximum retail price (inclusive of tax in India)
- **COD:** cash on delivery
- **IDOR:** insecure direct object reference (accessing others' records by guessing IDs)
- **Idempotency:** repeating a request produces the same single effect
- **RPO / RTO:** acceptable data loss / acceptable downtime

---

## 33. Final Pre-Launch Checklist

- [ ] Drug licence, GST registration, pharmacist registration verified
- [ ] Privacy policy, terms, refund/return and prescription policies published
- [ ] Production keys and secrets set; test keys removed; default admin password changed
- [ ] HTTPS, CORS, security headers, rate limits verified
- [ ] Backups running and a restore tested
- [ ] Load test (e.g., k6/JMeter) on search, checkout and tracking
- [ ] Pen-test/IDOR review done
- [ ] Razorpay webhook configured on the production URL
- [ ] Monitoring and alerting live; on-call contact defined
- [ ] Staff trained: pharmacist workflow, handling rejected Rx, COD settlement
- [ ] Pilot with a small area/user group before the full launch

---

*Next step suggestion: generate the Spring Boot project skeleton (entities, security config, auth module) and the React scaffold, then build phase by phase following the roadmap in Section 13.*
