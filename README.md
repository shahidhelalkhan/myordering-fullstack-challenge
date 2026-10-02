# myordering — Full-Stack Engineering Challenge

Thanks for taking the time to do this. It should take a strong engineer roughly
**one focused working day (~6–8 hours)**. We do **not** expect you to finish
everything — a smaller slice that is correct, tested and well explained beats a
broad one that is shaky. See [`RULES.md`](./RULES.md) before you start.

---

## What this is

A cut-down version of our ordering platform. You will build:

1. **A backend API** (Node.js) — three endpoints, defined precisely in
   [`API_SPEC.md`](./API_SPEC.md). One of them applies a **promo code**, and
   promo-code validation is the deliberately hard part of this exercise.
2. **A frontend** (React) — a single ordering screen at `/assignment`: browse
   products, build a cart, apply a promo code, place the order.

Both halves already have a running skeleton. Your job is to make them work to
spec, with tests and a short write-up.

## What we are assessing

| Area | What we look at |
| --- | --- |
| **API correctness** | Does it match `API_SPEC.md` exactly — status codes, error shapes, validation, money handling? |
| **The promo-code engine** | Correctness **and** operating within the stated memory / latency budget. This is where senior judgement shows. |
| **Code structure** | Clear modules, sensible names, no dead abstraction, matches the conventions already in the skeleton. |
| **Tests** | Meaningful coverage of edge cases, not just the happy path. |
| **Frontend state** | Server state vs. client state handled correctly; loading / error / empty states; no unnecessary re-renders. |
| **Written reasoning** | `DECISIONS.md` — what you chose, what you traded off, what you left out and why. |

## Our real stack (for context)

The skeleton is intentionally lighter than production so setup is instant, but it
mirrors the shape of what we actually run:

- **Backend:** Node + Express, module-per-feature (`routes/` + small
  controllers), plain response envelope (`{ data, code }`). Production uses
  MongoDB + Mongoose; here the data layer is in-memory behind a thin repository
  so you can swap it later.
- **Frontend:** React 17, `react-query` v3 for server state, `zustand` v3 for
  client state (cart is persisted to `localStorage`), `react-router` v5, plain
  scoped CSS. No component library beyond what is already wired.

You do not need to use TypeScript. You may, on either side, if you prefer — say
so in `DECISIONS.md`.

---

## Repository layout

```
API_SPEC.md              the contract you implement against
RULES.md                 how to work on this, how to submit
DECISIONS.md             <- you create this
scripts/
  generate-coupons.js    generates the 3 large coupon files locally
backend/
  src/                   Express app, routes, in-memory store, coupon stub
  test/                  Jest + supertest; some tests pass, some fail on purpose
frontend/
  src/                   Vite + React skeleton, one screen at /assignment
  test/                  Vitest + Testing Library
```

---

## Getting started

1. Read [`RULES.md`](./RULES.md) (how to work on this, how to submit) and
   [`API_SPEC.md`](./API_SPEC.md) (the contract).
2. Do the **Setup** below — including generating the coupon files.
3. Backend: make the failing `orders` and `coupons` test suites pass. Start with
   `orders` (the coupon engine can be faked, as the tests show), then the real
   `CouponValidator`.
4. Frontend: build the `/assignment` screen — make the failing `cart` tests
   pass, then wire the UI to the API.
5. Copy `DECISIONS.template.md` to `DECISIONS.md` and fill it in as you go.
6. Open a PR against `main`.

Budget roughly: half the day on the backend (most of it on the coupon engine),
half on the frontend and the write-up.

## Setup

Requires Node 18+.

### 1. Generate the coupon files — **required**

```bash
node scripts/generate-coupons.js            # 3 files, ~200 MB each, into ./coupons
```

This writes `coupons/couponbase1.gz`, `couponbase2.gz`, `couponbase3.gz` (a few
hundred MB on disk). They are git-ignored — never commit them. Generation is
deterministic and takes well under a minute; regenerating gives byte-identical
files.

- The `coupons` **unit tests build their own tiny fixtures**, so you can start
  implementing `CouponValidator` before generating anything.
- But you need the real files to run the server end-to-end, to place an order
  with a coupon, and — the point of the exercise — to show your engine stays
  within the memory / latency budget. Evaluation runs against the default size
  **or larger**; `--size-mb <n>` makes them bigger.
- `node scripts/generate-coupons.js --show-planted` lists the codes it guarantees.

### 2. Backend

```bash
cd backend
npm install
npm test            # products suite passes; orders + coupons fail — that's the job
npm run dev         # http://localhost:4000
```

The server reads the coupon directory from `COUPONS_DIR` (defaults to
`../coupons`).

### 3. Frontend

```bash
cd frontend
npm install
npm run dev         # http://localhost:5173/assignment  (proxies /api to :4000)
npm test
```

---

## The backend challenge

Implement the three endpoints in [`API_SPEC.md`](./API_SPEC.md). `GET /products`
and `GET /products/:id` are already implemented in the skeleton as a reference
for the quality bar. You own `POST /orders` and the promo-code engine.

### Promo-code rule

A promo code is **valid** if and only if **both** hold:

1. Its length is **8 to 10 characters** inclusive.
2. It appears in **at least two of the three** coupon files.

A valid code applies **10% off the subtotal** (see `API_SPEC.md` for rounding).
A supplied code that is not valid → the order is rejected with `422` and
`code: "INVALID_COUPON"`; no order is created.

### Constraints on the promo-code engine

The coupon files are large. Each default file is ~200 MB uncompressed
(~15M codes); ~45M lines across the three. Your solution must:

- Keep steady-state process memory **under 350 MB RSS** while serving. Holding
  the code lists in a `Set`/`Map` will not fit — one file alone is over a
  gigabyte in memory.
- Answer a validation call in **under 25 ms p95** once warm.
- Use **no external service** (no Redis, no database, no search engine) for the
  coupon lookup — solve it in-process from the files.
- Start serving HTTP within **10 s**; the coupon subsystem may warm up lazily or
  build an on-disk index on first run, but must be fully ready within **90 s**
  and must never exceed the memory budget, including while warming.

How you get there is up to you. Explain the approach and its trade-offs in
`DECISIONS.md`, including what you would change to scale this to 50 files instead
of 3.

### Known codes for your own testing

| Code | Length | Valid? | Why |
| --- | --- | --- | --- |
| `HAPPYHRS` | 8 | ✅ | in all three files |
| `FIFTYOFF` | 8 | ✅ | in two files |
| `LONELY01` | 8 | ❌ | in only one file |
| `GHOSTCODE` | 9 | ❌ | in no file |
| `SHORT7` | 6 | ❌ | too short |
| `WAYTOOLONG11` | 12 | ❌ | too long |

We hold back additional codes for evaluation.

---

## The frontend challenge

Build the ordering screen at `/assignment`. The skeleton renders the route and
has `react-query` and `zustand` wired; components are stubs with `TODO`s.

Required behaviour:

- Load and display products (`GET /api/products`) with proper loading / error
  states.
- Add to cart, change quantities, remove lines. Cart lives in the `zustand`
  store and survives a page reload.
- Show line totals and subtotal. Money is integer cents from the API — format it,
  don't do float math.
- Promo-code field: the user enters a code and the UI tells them whether it was
  accepted, and if not, why. Handle the pending and error states.
- Place order (`POST /api/orders`). On success show the created order summary; on
  failure show the server's error message. Handle: empty cart, a product going
  out of stock, a rejected coupon, a network failure.
- Responsive down to a narrow phone width. Scope your CSS (`asg-` prefix is used
  in the skeleton) so it cannot leak.

Keep it clean and legible over pixel-perfect. We are looking at how you structure
state and handle the unhappy paths.

---

## Deliverables

1. Your implementation, pushed to the repo we shared with you (see `RULES.md`).
2. `DECISIONS.md` at the repo root:
   - the promo-code approach and its trade-offs; the 50-files question
   - anything you deliberately did not do, and why
   - roughly where your time went
3. Tests on both sides. Backend: the `coupons` suite green plus your own cases.
   Frontend: at least the cart logic and one component.
4. A commit history that shows the work progressing — not one squashed commit.

---

## API reference

Base URL: `http://localhost:4000/api`. The full contract, including validation
order and every error code, is in [`API_SPEC.md`](API_SPEC.md).

### Auth

There is no authentication: every route is public. The challenge is scoped to
the ordering flow, not to user accounts.

### Routes

| Method | Route           | Purpose                           | Success | Errors |
| ------ | --------------- | --------------------------------- | ------- | ------ |
| `GET`  | `/health`       | Liveness check                    | `200`   |        |
| `GET`  | `/products`     | List products with price and stock | `200`  |        |
| `GET`  | `/products/:id` | One product                       | `200`   | `404 PRODUCT_NOT_FOUND` |
| `POST` | `/orders`       | Create an order, optional coupon  | `201`   | `422 INVALID_ORDER`, `PRODUCT_NOT_FOUND`, `INSUFFICIENT_STOCK`, `INVALID_COUPON` |

Every success body is `{ "data": ..., "code": "SUCCESS" }`; every error body is
`{ "code", "message", "details"? }`. Unknown routes return `404 NOT_FOUND` and
malformed JSON returns `400 BAD_REQUEST`. Money is always integer cents.

### Example requests

```bash
# List products
curl http://localhost:4000/api/products

# Create an order with a coupon
curl -X POST http://localhost:4000/api/orders \
  -H 'Content-Type: application/json' \
  -d '{"items": [{"productId": "prod_margherita", "quantity": 2}], "couponCode": "HAPPYHRS"}'
```

`POST /orders` ships as a stub that returns `501 NOT_IMPLEMENTED`; implementing
it is the backend half of the challenge.
