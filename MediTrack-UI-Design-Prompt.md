# MediTrack: UI/UX Design Prompt (Anti "Vibe-Coded" Edition)

Paste **Section 1** into Claude, Cursor, v0 or any other coding assistant at the start of every UI task. Sections 2–8 are the reference behind it. Keep this file in `docs/` and point the assistant at it.

---

## 1. The Master Prompt (copy-paste)

```
You are a senior product designer and frontend engineer building MediTrack, a pharmacy
management and delivery platform with four roles: Customer, Pharmacist, Delivery Partner,
Admin. Stack: React + Vite, Tailwind CSS (with a custom theme), Axios, React Router.

GOAL
The UI must look like it was designed by a human product team for a real healthcare-adjacent
business: calm, trustworthy, precise, quietly confident. It must NOT look like a generic
AI-generated landing page or a template.

DESIGN DIRECTION
- Tone: clinical clarity with human warmth. Think a well-run modern pharmacy, not a SaaS
  startup, not a crypto dashboard.
- Restraint over decoration. Every element must earn its place. If it does not help the user
  read, decide, or act, remove it.
- Information first. Medicines, prices, expiry dates, order status and prescriptions are the
  content. Design around them.

HARD RULES (never do these)
- No purple/blue-to-pink gradients, no gradient text, no glowing blobs, no neon.
- No glassmorphism or backdrop-blur cards as a default style.
- No emojis as icons or bullets. Use one consistent icon set (Lucide), 1.5px stroke, 16/20/24px.
- No generic hero with "Revolutionize your healthcare" style copy. No lorem ipsum, no fake
  testimonials, no invented statistics, no stock "team of smiling doctors" imagery.
- No card-inside-card-inside-card nesting, and not everything in a rounded-2xl shadow-xl card.
  Use cards only to group related content; prefer dividers, whitespace and tables.
- No centered-everything layouts. Align to a grid, left-align text and numbers sensibly
  (numbers right-aligned in tables).
- No more than one accent color. No rainbow status chips.
- No decorative animations (floating, bouncing, parallax). Motion only to explain a change
  (150-200ms ease-out for state changes, skeleton shimmer for loading).
- No default Tailwind look: do not ship unmodified blue-500 buttons, gray-100 backgrounds,
  rounded-lg everywhere. Use the design tokens below.
- No placeholder text such as "Something went wrong". Write specific, helpful messages.

DESIGN TOKENS (use CSS variables / Tailwind theme, never hard-coded hex in components)
- Brand/primary: deep teal  #0F6B66  (hover #0C5753, pressed #094541, tint #E6F2F1)
- Neutral scale (slightly warm gray): 
  50 #F8F8F6, 100 #F0EFEC, 200 #E2E0DB, 300 #CBC8C1, 500 #7A766E, 700 #46433D, 900 #1E1C19
- Surface: page #F8F8F6, panel #FFFFFF, border #E2E0DB
- Semantic (used ONLY for meaning, always paired with an icon or text label):
  success #1F7A4D, warning #B7791F, danger #B42318, info #1D5FA8 (each with a 10% tint bg)
- Rx indicator: dedicated badge style (outlined, danger-tint) used only for prescription items.
- Typography: one family for UI (Inter is acceptable but set tracking and weights deliberately;
  better: "Source Sans 3" or "IBM Plex Sans"), plus a monospace (JetBrains Mono / IBM Plex Mono)
  for order IDs, batch numbers, OTPs, prices in tables.
  Scale: 12 / 13 / 14 (body) / 16 / 18 / 22 / 28. Weights 400, 500, 600 only.
  Line-height 1.5 body, 1.25 headings. Max line length ~70ch.
- Spacing: 4px base (4, 8, 12, 16, 24, 32, 48). Layout gutters 24px desktop, 16px mobile.
- Radius: 6px inputs/buttons, 10px panels, 999px only for pills/badges. Be consistent.
- Elevation: borders first (1px), shadow only for popovers/modals (one soft shadow token).
- Focus ring: 2px teal outline with 2px offset, always visible for keyboard users.

COMPONENT BEHAVIOUR
- Buttons: primary (filled teal), secondary (outlined), ghost, destructive (danger outline,
  filled only inside a confirm dialog). Height 36/40px. Loading state shows a spinner and
  disables the button, label unchanged. One primary action per view.
- Forms: labels above inputs, helper text below, inline validation on blur, error text in
  danger color with an icon. Required marked consistently. Never placeholder-as-label.
- Tables: dense but readable, sticky header, zebra OFF (use row dividers), sortable columns
  with clear indicator, right-aligned numerics, row hover, bulk-select where useful,
  pagination with total count, empty state with a next action.
- Status chips: text + small dot, never color alone. Fixed mapping, e.g.
  Pending=warning, Confirmed/Processing=info, Delivered=success, Rejected/Failed=danger.
- Toasts for confirmations, inline alerts for blocking problems, dialogs only for decisions.
- Skeleton loaders that match the final layout; never a lone spinner for page loads.
- Empty states: one line explaining why it is empty + the action to fix it. No illustrations
  of cartoon people.

ROLE-SPECIFIC DESIGN
- Customer: lighter, spacious, reassuring. Product cards show name, strength, pack size, price,
  Rx badge, availability. Persistent cart summary. Checkout in a single clear flow with a
  visible order summary. Order tracking is a vertical timeline with timestamps and a map.
- Pharmacist: dense, keyboard-friendly workstation. Split view: queue on the left, detail on
  the right. Prescription image viewer with zoom/rotate beside the order items. Batch and
  expiry shown as monospace with expiry color-coded by days left (with text, e.g. "41 days").
  Approve/Reject always visible, rejection requires a reason.
- Delivery partner: mobile-first, large touch targets (min 48px), high contrast, one task per
  screen, bottom action bar, big OTP/code inputs, map takes most of the screen, works in
  sunlight and one-handed use. Minimal text.
- Admin: analytical. Top-level KPI row (4 numbers max, no fake sparkline decoration), then
  tables and filters. Everything filterable, exportable (CSV), with audit trail visible.

CONTENT AND COPY
- Plain, specific, human language. Sentences like "Your prescription was rejected: the doctor's
  registration number is not visible." Not "Oops! Something went wrong."
- Sentence case everywhere. No exclamation marks, no marketing superlatives.
- Use real-looking domain data in mocks (actual medicine names with strengths, realistic
  batch numbers, INR with the ₹ symbol and Indian number grouping 1,25,000).
- Dates in a consistent format (17 Oct 2026, 4:24 pm IST). Relative time only as a tooltip.

LAYOUT AND NAVIGATION
- App shell: left sidebar (collapsible) for Pharmacist/Admin; top bar + bottom tab bar on mobile
  for Customer/Delivery. Breadcrumbs on deep admin pages.
- 12-column grid, max content width 1280px, consistent page header (title, short
  description, primary action on the right).
- Responsive: designed for 360px, 768px, 1280px+. No horizontal scroll. Tables become stacked
  cards or scroll within their container on mobile.

ACCESSIBILITY (non-negotiable)
- WCAG AA contrast (4.5:1 text). Never convey meaning by color alone.
- Full keyboard navigation, visible focus, logical tab order, ARIA labels on icon buttons,
  semantic HTML (button, nav, main, table), form fields linked to labels.
- Respect prefers-reduced-motion. Touch targets at least 44px.
- Support dark mode only if tokens are defined for it; do not half-ship it.

ENGINEERING QUALITY SIGNALS
- Build a small design-system layer first: tokens, Button, Input, Select, Badge, Table, Modal,
  Toast, Skeleton, EmptyState, PageHeader. Pages compose these, they do not restyle them.
- No inline magic numbers or one-off colors. No copy-pasted card markup.
- Every screen implements: loading, empty, error (with retry), and success states.
- Realistic data shapes from the API contract, not hard-coded arrays that hide layout issues.
- Use the real API error codes to show specific messages.

WHEN YOU RESPOND
1. State the layout and component choices briefly before coding.
2. List which design tokens/components you reused.
3. After coding, self-review against the "Anti-vibe-code checklist" and fix violations.
```

---

## 2. Why UIs Look "Vibe-Coded" (tells to avoid)

| Tell | Why it reads as generated | What to do instead |
|---|---|---|
| Purple/pink gradient everywhere | The default AI palette | One restrained brand color + warm neutrals |
| Everything is a big rounded card with shadow | No hierarchy; template feel | Group with whitespace and dividers; tables for data |
| Emoji icons and bullet emojis | Fast, inconsistent, unserious in healthcare | One icon set, consistent size and stroke |
| Centered hero + three feature cards + CTA | Landing-page cliché | Task-first homepage: search, categories, upload-prescription |
| Perfectly symmetric empty layouts | No real data pressure-tested | Design with long names, 3-digit quantities, missing images |
| Lorem ipsum or "John Doe" | Unfinished | Real medicine names, realistic Indian addresses and ₹ prices |
| Fake metrics ("10k+ happy customers") | Dishonest and obvious | Omit until real; show real operational data |
| Inconsistent spacing, radius, font sizes | Values chosen per component | Tokens and a spacing scale |
| Over-animation | Decoration over function | Motion only for feedback |
| Generic error/empty text | No product thinking | Specific, actionable copy |
| Default component-library look (unthemed MUI/shadcn/Tailwind blue) | Looks like every other app | Theme tokens, custom radius, type, density |
| Stock photos and cartoon illustrations | Cheap trust signal | Product photography of real packs, or none |

---

## 3. Visual System Details

### 3.1 Color usage
- 90% neutral, 8% brand teal, 2% semantic. If the screen feels colorful, remove color.
- Backgrounds: page `neutral-50`, content panels white, subtle section tint `brand-tint` for highlights only.
- Links and primary actions use brand; destructive actions use danger only after confirmation.
- Expiry color rule (always with text): >90 days neutral, 31–90 warning, ≤30 danger, expired danger + "Expired" label.

### 3.2 Typography
- Headings semibold, never bold-black; body regular.
- Use tabular numerals (`font-variant-numeric: tabular-nums`) for prices, quantities and tables.
- Monospace for IDs, batch numbers, OTPs, invoice numbers.
- Title case only for proper nouns; sentence case for everything else.

### 3.3 Iconography and imagery
- Lucide (or Phosphor regular) only. Icons support labels, they do not replace them, except in universally understood actions (close, search).
- Medicine images: white or neutral background, consistent aspect ratio (1:1), fallback to a neutral placeholder with the dosage-form icon (tablet/syrup/injection), not a broken image.
- No decorative illustration. If a brand illustration is wanted, commission one consistent style or skip it.

### 3.4 Density
- Customer: comfortable (row height 56–72px).
- Pharmacist/Admin: compact (row height 40–48px), more data per screen.
- Delivery: large (touch-first).

---

## 4. Key Screens: Layout Guidance

**Customer home:** search bar first (with autocomplete on brand/generic), a persistent "Upload prescription" action, category shortcuts as a simple list/grid with small icons, "Reorder from past orders" for returning users, trust information as plain text (licence number, pharmacy address) in the footer. No hero image.

**Product listing:** left filter column (Rx/OTC, category, price, in stock), result count, sort, product rows/cards with name, strength, pack size, manufacturer, price, Rx badge, stock state, quantity stepper and add-to-cart.

**Product detail:** name and strength as the title, composition (generic) prominently, price and availability, Rx notice with plain explanation, substitutes table, sections for uses, side effects and storage.

**Checkout:** single page with three clear steps (address → delivery slot → payment), an order summary always visible, prescription attached status, fee breakdown (items, GST, delivery, discount), and a clear total.

**Order tracking:** vertical timeline (status, timestamp, actor), delivery partner card (first name, vehicle, call masked), map with live position and ETA, and the delivery OTP shown only when out for delivery.

**Pharmacist Rx queue:** table with age of request, patient, items, status; the detail pane shows the zoomable prescription image beside a checklist (doctor reg. no., date, patient name, drug and dose match) and Approve / Reject (reason required) / Request clarification.

**Pharmacist inventory:** table of products with total available, nearest expiry chip, reorder level indicator, quick "Add batch" action; the batch drawer shows batch number, expiry, quantities, and movement history.

**Delivery partner:** a home with a large online/offline toggle and current job card; the active delivery screen is a map plus a bottom sheet showing the next action ("Confirm pickup" → "Start delivery" → "Enter customer OTP").

**Admin dashboard:** four KPI numbers (orders today, revenue, on-time delivery %, pending approvals), an orders table filtered by status, then charts only where they answer a question (orders per day, delivery time trend).

---

## 5. Microcopy Examples

| Situation | Don't | Do |
|---|---|---|
| Rx required | "Prescription needed!" | "This medicine needs a valid prescription. Upload one at checkout." |
| Out of stock | "Sold out 😢" | "Not available right now. Similar medicines: Paracetamol 650 mg." |
| Out of range | "Oops, can't deliver" | "We don't deliver to this address yet. We cover areas within 8 km of Indiranagar." |
| Rx rejected | "Rejected" | "Prescription rejected: the doctor's registration number is not visible. Upload a clearer copy." |
| Payment failed | "Payment error" | "Your payment didn't go through and you were not charged. Try again or choose cash on delivery." |
| Wrong OTP | "Invalid!" | "That code doesn't match. 2 attempts left." |
| Empty orders | "Nothing here" | "You haven't placed any orders yet. Browse medicines to get started." |

---

## 6. Build Order for the UI

1. Define tokens (`tailwind.config.js` theme + CSS variables) and fonts.
2. Build primitives: Button, Input, Select, Checkbox, Badge/StatusChip, Card, Table, Modal/Drawer, Toast, Skeleton, EmptyState, PageHeader, Tabs.
3. Build app shells: public layout, customer layout, pharmacist/admin sidebar layout, delivery mobile layout.
4. Build domain components: ProductCard, RxBadge, ExpiryChip, OrderTimeline, MoneyBreakdown, AddressPicker (map), PrescriptionViewer, OtpInput, TrackingMap.
5. Compose pages using only the above.
6. Run the checklist (Section 7) per page before moving on.

---

## 7. Anti-Vibe-Code Checklist (run before every PR)

- [ ] Only one accent color; semantic colors used only for meaning
- [ ] No gradients, glass, glow, emoji icons, or stock imagery
- [ ] All colors, spacing, radius and font sizes come from tokens
- [ ] Consistent icon set, size and stroke
- [ ] Hierarchy is clear: one primary action per screen, headings sized by importance
- [ ] Tables used for tabular data; cards not nested more than one level
- [ ] Numbers right-aligned, tabular figures, ₹ and Indian grouping
- [ ] Every screen has loading, empty, error and success states
- [ ] Copy is specific and human; no lorem ipsum, no exclamation marks
- [ ] Tested with long names, 0 items, 100+ items, slow network, failed request
- [ ] Keyboard-only walkthrough passes; focus visible; AA contrast verified
- [ ] 360px, 768px and 1280px layouts checked; no horizontal scroll
- [ ] Delivery screens usable one-handed outdoors (large targets, high contrast)
- [ ] No unused animation; reduced-motion respected
- [ ] Components reused from the design system, no copy-pasted markup
- [ ] Status colors always paired with text/icon

---

## 8. Optional Follow-Up Prompts

**Design-system first**
```
Create the MediTrack design system in React + Tailwind using the tokens in the Master Prompt.
Output: tailwind.config.js theme, global CSS variables, and components: Button, Input, Select,
Badge, StatusChip, Table, Modal, Drawer, Toast, Skeleton, EmptyState, PageHeader. Include all
states (hover, focus, disabled, loading, error). Add a /design-system route showing every
component. Do not build any page yet.
```

**Single screen**
```
Build the Pharmacist prescription review screen using only the design-system components.
Split layout: queue table (left), detail (right) with zoomable prescription image, order items
with Rx badges, and an approve/reject panel (reason required on reject). Include loading,
empty, error and success states. Use realistic Indian medicine data. Then review your output
against the Anti-vibe-code checklist and list any fixes you made.
```

**Audit existing UI**
```
Audit the attached screen against the MediTrack Anti-vibe-code checklist. List each violation
with the exact element, why it looks generic, and the fix. Then apply the fixes using the
design tokens.
```

---

*Tip: give the assistant one or two real reference screens (e.g., screenshots of well-designed pharmacy, logistics or admin tools you like) along with this prompt. Concrete references improve the result far more than adjectives do.*
