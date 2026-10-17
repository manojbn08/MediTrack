# MediTrack: Comprehensive Technical Interview & Architecture Mastery Guide

This guide is designed for engineering interviews. It equips you to articulate MediTrack with authority, justify architectural tradeoffs, elaborate on deep technical mechanics, and anticipate follow-up questions from senior staff interviewers.

---

## 1. The 45-Second Elevator Pitch

> *"MediTrack is an enterprise-grade, compliance-first pharmaceutical supply chain and hyper-local last-mile delivery ecosystem built with Spring Boot 3, Java 21, MySQL, and React. Unlike generic e-commerce applications, MediTrack enforces statutory drug control regulations (CDSCO & Drugs and Cosmetics Act). It features a strict FEFO (First-Expired, First-Out) batch allocation engine to eliminate expired medicine sales, dual-gate prescription verification, dual-code physical handover security (pickup code at pharmacy counter and 4-digit OTP at doorstep), and real-time STOMP WebSocket tracking with in-app Haversine route & ETA modeling—all operating without paid third-party API dependencies."*

---

## 2. Layered Elaboration Framework

When the interviewer says: *"Can you walk me through the system in more detail?"*, follow this structured narrative:

```
[Business Problem & Statutory Compliance]
                     │
                     ▼
[Core Actors & Role-First Architecture]
                     │
                     ▼
[End-to-End Order & Dispensing State Machine]
                     │
                     ▼
[Engineering Safeguards (FEFO, Schedulers, Dual-OTP, In-App Maps)]
```

### A. The 2-Minute Architecture Walkthrough
1. **Four Dedicated Actor Workspaces:**
   - **Customer:** Browses medicines with FEFO availability, drops precise delivery pins on an interactive Leaflet map, checks CDSCO generic bio-equivalents, attaches prescriptions when buying Schedule H/H1 drugs, and verifies doorstep delivery via OTP.
   - **Licensed Pharmacist:** Reviews uploaded prescription scans against statutory validity rules, dispatches clinical approvals, oversees FEFO picking/packing, inspects returned medicines, and executes batch inwards.
   - **Fleet Delivery Partner:** Accepts nearby ready-for-pickup packages, authenticates physical handover at the counter using a 6-character pickup code, streams live GPS location, and confirms delivery with customer OTP.
   - **System Administrator:** Oversees platform governance, approves licensed pharmacists and delivery riders before they can access the portal, suspends bad actors, and audits immutable regulatory logs.

2. **The Deterministic State Machine:**
   Orders transition strictly through audited states:
   $$\text{PLACED} \longrightarrow \begin{cases} \text{PRESCRIPTION\_PENDING} \longrightarrow \text{CONFIRMED} & (\text{Rx Drugs}) \\ \text{CONFIRMED} & (\text{Pure OTC}) \end{cases}$$
   $$\longrightarrow \text{PROCESSING (FEFO Batch Pick)} \longrightarrow \text{READY\_FOR\_PICKUP} \longrightarrow \text{PICKED\_UP} \longrightarrow \text{OUT\_FOR\_DELIVERY} \longrightarrow \text{DELIVERED}$$

---

## 3. Technology Choices, Alternatives & Tradeoffs

| Component | Selected Technology | Evaluated Alternatives | Why Chosen Over Alternatives? |
| :--- | :--- | :--- | :--- |
| **Backend Core** | **Java 21 + Spring Boot 3.3** | Node.js (Express/Nest), Python (FastAPI), Go | **Financial & Inventory Integrity:** Banking-grade ACID transactions (`@Transactional`), compile-time type safety preventing quantity/currency drift, and battle-tested Spring Security filter chains. |
| **Database** | **MySQL 8 (InnoDB Engine)** | MongoDB, PostgreSQL, DynamoDB | **Relational Integrity:** Strict foreign keys and unique constraints across orders, payments, prescriptions, and batch stocks. Relational row-level locking avoids eventual consistency race conditions where two customers buy the same expiring batch. |
| **Auth & Security** | **JWT (15m Access) + DB Refresh Token (7d) + In-Memory Token Blacklist** | Stateful Sessions, Pure JWT (No Revocation), OAuth2 / Auth0 | **Stateless Scale with Revocation:** Pure stateless JWT cannot be revoked on logout or account suspension. MediTrack introduces a token blacklist service and refresh rotation to revoke tokens immediately while maintaining stateless verification for high throughput. |
| **Real-time Messaging** | **Spring WebSocket + STOMP Relay + Graceful Fallback** | HTTP Polling, Server-Sent Events (SSE), Socket.IO | **Full Duplex Pub/Sub:** STOMP provides clean pub/sub topic routing (`/topic/orders/{id}/location`). SSE is only one-way; Socket.IO is non-standard in Java. System uses in-memory broker with optional RabbitMQ relay. |
| **Mapping & Live ETA** | **Haversine Spherical Geometry + Speed Matrix + Leaflet (OSM)** | Google Maps Distance Matrix API, Mapbox | **Zero-Cost Self-Contained:** Eliminates recurring paid API bills and credit card dependencies. Runs completely offline/self-contained with sub-millisecond calculation and zero external rate limits. |
| **Document Generation** | **OpenPDF (Flyingsaucer compatible)** | JasperReports, Headless Chrome (Puppeteer) | **Lightweight Pure JVM:** Runs inside the JVM container with zero external browser process overhead, compiling GST-compliant tax invoices in <100ms. |
| **Rate Limiting** | **Bucket4j (Token Bucket Algorithm)** | Nginx rate limit, Guava RateLimiter | **Granular In-Application Control:** Protects sensitive endpoints (`/api/auth/login`, `/api/auth/verify-otp`) per client IP directly in Spring filter chain before database queries execute. |

---

## 4. System Architecture Diagram

```
[ Browser / Mobile Client (React 18 + Vite + Tailwind) ]
                    │
            HTTPS / WSS (Port 5173 / 8080)
                    ▼
[ RateLimitingFilter (Bucket4j: 10 req/min per IP) ]
                    │
[ JwtAuthFilter (Extracts Bearer Token & Validates Blacklist) ]
                    │
                    ├── /api/auth/** ──────────► [ AuthService (BCrypt, OTP Gen, Token Gen) ]
                    ├── /api/catalog/** ───────► [ CatalogService (FEFO Availability, Substitutes) ]
                    ├── /api/customer/orders ──► [ OrderService (FEFO Batch Reservation) ]
                    ├── /api/delivery/** ──────► [ DeliveryService (Haversine Distance & ETA) ]
                    ├── /api/pharmacist/** ────► [ PharmacistWorkstation (Rx Audit, Stock Inward) ]
                    └── /api/admin/** ─────────► [ AdminApprovalController (Partner Verification) ]
                                                            │
                       ┌────────────────────────────────────┴───────────────────────────┐
                       ▼                                                                ▼
             [ MySQL 8.0 Database ]                                      [ Spring STOMP WebSocket Broker ]
      (Tables: users, roles, products,                             (/topic/orders/{id}/status)
       product_batches, orders, order_items,                        (/topic/orders/{id}/location)
       prescriptions, audit_logs, signup_otps)                     (/topic/pharmacist/orders)
```

---

## 5. Most Probable Interview Questions & Model Answers

### Question 1: How do you prevent stock overselling when two customers purchase the last batch simultaneously?
- **Answer:** *"Stock allocation occurs during checkout within a Spring `@Transactional` boundary. When the customer submits an order, the `InventoryService` executes a query for available batches matching the SKU. We enforce FIFO/FEFO priority by sorting batches by `expiryDate ASC`. For concurrency, we employ row-level locking or optimistic locking with `@Version` on the batch entity. If two threads compete for the remaining 5 units, the second transaction detects a version conflict or insufficient stock and rolls back, throwing a `BusinessException('Insufficient stock for earliest batch')`. Stock is temporarily reserved in `RESERVED` state, and if the order is unpaid within 15 minutes, the `OrderExpiryScheduler` automatically releases the reservation."*
- **Anticipated Follow-up:** *Why not reserve stock when the user adds it to the cart?*
- **Counter-Answer:** *"Reserving stock on 'Add to Cart' exposes the pharmacy to inventory denial-of-service (DoS) attacks, where malicious users place hundreds of items in carts to starve inventory without buying. Reserving at checkout with a strict 15-minute unpaid timeout balances user convenience with inventory turnover."*

---

### Question 2: How does the 15-minute unpaid auto-cancellation scheduler work under high load?
- **Answer:** *"In `OrderExpiryScheduler`, a scheduled task runs every 60 seconds (`@Scheduled(fixedRate = 60000)`). It queries orders in `PLACED` or `PRESCRIPTION_PENDING` status with `paymentMethod == ONLINE` where `placedAt < now() - 15 minutes`. For each expired order, it queries `PaymentRepository` to confirm no successful transaction exists. It then invokes the `OrderStateMachine` to transition the status to `CANCELLED`, calls `inventoryService.releaseReservedStock(batchId, quantity)` for all constituent items, and pushes a WebSocket status notification to `/topic/orders/{id}/status` so the customer's UI reflects the timeout immediately."*
- **Anticipated Follow-up:** *What if a webhook from Razorpay/Stripe arrives at minute 15:01 right as the scheduler cancels the order?*
- **Counter-Answer:** *"In the payment webhook handler, we inspect the current order state inside a database lock. If the order is already in `CANCELLED` status, the webhook marks the payment as `REFUND_PENDING` and triggers an automated refund API call through the payment gateway, logging an immutable audit record. This prevents orphan payments and ensures stock is never erroneously consumed."*

---

### Question 3: How does Rx compliance work? Can an attacker bypass the prescription upload by sending a raw POST request?
- **Answer:** *"Statutory compliance cannot rely on frontend validation. In `OrderService.createOrder()`, the backend inspects each `OrderItem`. For each product, it re-queries the database to check `product.isRequiresPrescription()`. If any item requires a prescription, the request payload must provide a non-null `prescriptionId`. The backend verifies that the prescription belongs to the authenticated customer (`customerId == principal.getId()`) and that its status is `APPROVED` or `PENDING`. Pure OTC orders skip this check; however, any order with mixed OTC and Rx is strictly gated. The order status is set to `PRESCRIPTION_PENDING` until a licensed pharmacist approves the doctor's registration number."*
- **Anticipated Follow-up:** *Why allow PENDING prescriptions to place an order?*
- **Counter-Answer:** *"Because in pharmacy workflows, pharmacists pick and inspect items only after receiving the confirmed order. Placing the order with a PENDING Rx reserves the stock, allowing the on-duty pharmacist to inspect both the prescription and the physical batch simultaneously before dispensing."*

---

### Question 4: How does physical handover security prevent theft or driver diversion?
- **Answer:** *"MediTrack implements a two-stage cryptographic verification scheme:*
  1. *Counter Pickup Verification (Pharmacist to Driver): The backend generates a random 6-character alphanumeric pickup code (`PK-XXXX`) visible only to the pharmacist workstation. The delivery driver must physically arrive at the dispensing counter and inspect the package. The pharmacist provides the code, and the driver inputs it via `POST /api/delivery/{id}/pickup`. Only upon valid matching does the order transition to `PICKED_UP`.*
  2. *Doorstep Delivery Verification (Driver to Customer): When the driver transitions the order to `OUT_FOR_DELIVERY`, the system generates a secure 4-digit OTP (`deliveryOtp`) visible only on the customer's mobile screen and via email. The driver cannot mark the delivery complete without entering this exact OTP (`POST /api/delivery/{id}/complete`). This prevents drivers from prematurely marking deliveries complete."*
- **Anticipated Follow-up:** *What if the customer's phone battery is dead and they cannot see the OTP?*
- **Counter-Answer:** *"The customer can also receive the OTP via their registered email address, or the pharmacist admin can trigger an authenticated OTP resend via the customer service console with an audit log entry."*

---

### Question 5: Why did you implement an in-app Haversine formula instead of using Google Maps API?
- **Answer:** *"While Google Maps API is standard for commercial mapping, it introduces severe architectural constraints for self-contained, enterprise deployments: recurring per-query financial costs, hard dependency on third-party network uptime, and API key exposure risks. By implementing the Haversine spherical trigonometric formula directly in `DeliveryService`, we compute exact great-circle distance between two GPS coordinates $(lat_1, lon_1)$ and $(lat_2, lon_2)$ with $R = 6371\text{ km}$ in sub-microsecond CPU time. Combined with an urban speed calibration matrix ($20\text{ km/h} + 5\text{ min packing buffer}$), the system delivers deterministic, offline-capable ETAs with zero recurring costs."*

$$\Delta lat = lat_2 - lat_1, \quad \Delta lon = lon_2 - lon_1$$
$$a = \sin^2\left(\frac{\Delta lat}{2}\right) + \cos(lat_1)\cos(lat_2)\sin^2\left(\frac{\Delta lon}{2}\right)$$
$$c = 2 \cdot \text{atan2}(\sqrt{a}, \sqrt{1-a}), \quad d = R \cdot c$$

---

### Question 6: How does the Token Blacklist and Refresh Token Rotation work?
- **Answer:** *"When a user logs in, the server generates a short-lived JWT access token (15 minutes) and a secure random UUID refresh token (7 days) stored in the database. When the access token expires, the client's Axios interceptor automatically hits `POST /api/auth/refresh`. The server revokes the old refresh token (`revoked = true`) and issues a brand-new access token and a brand-new refresh token (Single-Use Token Rotation). If a compromised refresh token is reused, the server detects that the token is already revoked, revokes all descendant tokens for that user ID, and forces re-authentication. On logout, the access token is added to the in-memory `TokenBlacklistService` with its remaining TTL, preventing reuse until natural expiration."*

---

## 6. Deep Technical Questions on Underlying Technologies

### A. Java & Spring Boot Deep Dive
1. **How does `@Transactional` work under the hood in Spring?**
   - *Answer:* Spring creates a dynamic CGLIB or JDK dynamic proxy around the bean. When a transactional method is called from outside the bean, the proxy's `TransactionInterceptor` begins a transaction via `PlatformTransactionManager`, binds the database connection to the current thread (`TransactionSynchronizationManager`), executes the target method, and commits or rolls back based on exceptions (default: rolls back on `RuntimeException` and `Error`, but commits on checked `Exception` unless `rollbackFor = Exception.class` is declared).
2. **What happens if method A calls transactional method B in the same service class?**
   - *Answer:* The transaction in method B is bypassed (proxy self-invocation problem) because the call is a direct `this.methodB()` invoke inside the JVM rather than through the Spring proxy. To fix this, you either inject the service into itself, use `TransactionTemplate`, or extract method B into a separate bean.

### B. MySQL & Concurrency Deep Dive
1. **Explain the difference between Optimistic and Pessimistic Locking.**
   - *Answer:* Pessimistic locking (`SELECT ... FOR UPDATE`) places an exclusive lock on the database rows at the start of the transaction, blocking concurrent readers/writers until commit. It is ideal for high-contention scenarios like physical stock picking. Optimistic locking relies on an application-level `@Version` column; no locks are held during reading. On update, the SQL includes `WHERE version = current_version`. If another transaction updated the row, the row count is 0 and Hibernate throws `OptimisticLockException`.
2. **What are Dirty Reads, Non-Repeatable Reads, and Phantom Reads?**
   - *Dirty Read:* Reading uncommitted data from another transaction (prevented by Read Committed).
   - *Non-Repeatable Read:* Rereading the same row within a transaction and seeing modified column values (prevented by Repeatable Read).
   - *Phantom Read:* Re-executing a range query and finding newly inserted rows matching the condition (prevented by Serializable or InnoDB Next-Key locking in Repeatable Read).

### C. Web & Security Deep Dive
1. **Where should JWTs be stored in the frontend, and how do you protect against XSS and CSRF?**
   - *Answer:* Storing tokens in `localStorage` protects against CSRF because browsers do not automatically attach `localStorage` values to cross-origin requests. However, it is vulnerable to XSS. In MediTrack, we sanitize and strictly avoid `dangerouslySetInnerHTML`, and use CSP headers. The best-practice enterprise alternative is storing refresh tokens in an `HttpOnly`, `SameSite=Strict`, `Secure` cookie, keeping the access token in frontend memory.

---

## 7. Step-by-Step Live Demonstration Playbook

Follow this exact walkthrough during your presentation:

### Step 1: Role Gateway & Access Enforcement
1. Open `http://localhost:5173`.
2. Show the **Role Selection Gateway**: 4 distinct roles.
3. Click **System Administrator** -> Click *Register* -> Observe automatic redirect to `/login?role=admin` (Demonstrating admin public registration lockout).
4. Click **Customer** -> Click *Register as Customer* -> Fill name, email, phone, password -> Click Submit -> Observe 6-digit OTP verification screen.

### Step 2: Customer Ordering with OTC vs. Rx Rules
1. Log in as Customer: `customer@meditrack.com` / `Password@123`.
2. Add **Dolo 650** (OTC) to cart -> Go to `/checkout`.
3. Observe the green banner: *"Pure Over-The-Counter (OTC) Order: No prescription required"*.
4. On the Leaflet map: Drag the pin around Bengaluru metro -> Observe dynamic distance update in km and geofence check (<= 15 km).
5. Place Order -> System redirects to `/customer/orders/:id/track`.

### Step 3: Pharmacist Prescription Audit & Picking
1. Log in as Pharmacist: `pharmacist@meditrack.com` / `Password@123`.
2. Navigate to **Pharmacist Station** -> View pending Rx queue.
3. View **Fulfillment Orders** tab -> Click *Start Picking* -> Click *Pack & Ready for Pickup*.
4. System allocates earliest expiring FEFO batch and displays 6-character Pickup Code (e.g. `PK-7741`).
5. Click **[Substitutes]** button on any medicine -> Show instant generic bio-equivalent dialog with cheaper salt matches.

### Step 4: Courier Pickup, Live GPS Transceiver & Customer OTP
1. Log in as Delivery Partner: `delivery@meditrack.com` / `Password@123`.
2. View **Available Nearby Jobs** -> Click *Accept Delivery*.
3. At the counter: enter the Pharmacist's pickup code -> Click *Verify Pickup*.
4. Click *Start Delivery Route* -> Order transitions to `IN_TRANSIT`.
5. Click *📡 Stream Current GPS Position to Customer* -> Live coordinates and Haversine ETA update in real time.
6. Switch to Customer tracking tab -> Observe courier motorcycle marker moving live on OpenStreetMap with updated ETA.
7. Enter Customer's 4-digit OTP into driver app -> Click *Confirm & Complete Delivery*.

### Step 5: Reverse Logistics & GST Tax Invoice
1. In Customer tracking screen: Click **GST Invoice PDF** -> Instant download of legal GST invoice generated via OpenPDF.
2. Click **Request Return** -> Select reason (e.g. "Physician modified dosage") -> Submit.
3. Switch to Pharmacist station -> Open **Returns Inspection** tab -> Inspect condition -> Click *Approve & Refund*.
4. Switch to Admin portal (`admin@meditrack.com` / `Password@123`) -> View **Regulatory Audit Logs** -> Show immutable trail of the return approval, order lifecycle, and user activations.
