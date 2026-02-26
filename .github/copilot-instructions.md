# Copilot instructions for Payal Biryani app

This small Node.js + static frontend app serves a restaurant ordering/admin UI.
Use these instructions to make targeted, safe changes quickly.

- Repo overview: `server.js` is the single Express backend (API + static server). Static front-end lives in `public/`. UI spec and visual guidelines are in `SPEC.md`.
- Runtime: run `npm install` then `npm start` (or `npm run dev`). The app listens on port 3000 by default.
- Data: `better-sqlite3` creates `payal_biryani.db` at runtime. Deleting that file resets seeded data; server seeds default users and menu items on startup (see `server.js`).

- Key patterns and conventions:
  - Auth: session-based via `express-session`. Use `/api/login`, `/api/logout`, `/api/user` to interact with sessions.
  - Roles: `role` field on `users` (`owner`, `agent`). Route guards use `requireRole()` in `server.js` (owner-only routes under `/api/admin/*`, agent routes under `/api/agent/*`).
  - DB access: synchronous `better-sqlite3` queries (blocking). Avoid converting to async without considering request blocking and small scale of app.
  - Orders: `items` column stores JSON (stringified). Always `JSON.parse` when reading and `JSON.stringify` when writing orders.

- Important endpoints (examples):
  - Login: `POST /api/login` { username, password } — returns session user.
  - Public menu: `GET /api/menu` — returns available `menu_items`.
  - Place order: `POST /api/orders` { customer_name, customer_phone, items, total_amount, payment_method } (items is an array -> stored as JSON).
  - Owner admin menu: `GET/POST/PUT/DELETE /api/admin/menu` (owner-only).
  - Agent actions: `POST /api/agent/accept/:id`, `POST /api/agent/update/:id`.

- Dev/debug workflow:
  - Install dependencies: `npm install`
  - Start server: `npm start` (or `npm run dev`).
  - Database file `payal_biryani.db` appears in repo root on first run.
  - To reset seed data: stop server, delete `payal_biryani.db`, start server again.
  - Logs: server prints startup message and errors to stdout. Use the browser DevTools Network tab for frontend ↔ API interactions.

- Project-specific notes and gotchas:
  - Default seeded credentials exist in `server.js` (owner: `owner` / `owner123`, agents: `agent1` / `agent123`). Use these for local testing.
  - Frontend pages such as `public/owner.html` and `public/agent.html` depend on session-auth checks via `GET /api/user` — modifying these files requires maintaining the fetch-style calls and expected JSON shapes.
  - Because `better-sqlite3` is synchronous, large batch DB operations can block the event loop; keep changes minimal or migrate carefully.
  - Ordering data model stores `items` as JSON text; migrations should transform that column carefully.

- Files to inspect when changing behavior:
  - `server.js` — API routes, auth, DB schema and seed data.
  - `package.json` — scripts and dependencies.
  - `public/*.html` — front-end JS interacts with API via `fetch` calls; update UI and API in tandem.
  - `SPEC.md` — visual and content expectations for the site.

If anything above is incorrect or you want additional examples (e.g., typical `fetch` payloads, sample SQL queries, or a small test harness), tell me which area to expand.
