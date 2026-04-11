# PantryIQ -- Product Requirements Document (MVP)

**Version:** 0.4 (Final)
**Date:** 2026-04-10
**Author:** Harry (CTO)
**Status:** Final
**Previous versions:** PRD.md (v0.1), PRD-v2.md (v0.2), PRD-v3.md (v0.3)

---

## 1. Problem Statement

Restaurants routinely over-purchase ingredients, over-staff shifts, and under-utilize menu items -- leading to significant food waste, margin erosion, and operational inefficiency. Operators lack data-driven tools that turn their existing POS transaction data into actionable purchasing, staffing, and menu decisions. Meanwhile, food that could safely feed people ends up rotting in landfills.

## 2. Product Overview

PantryIQ is a SaaS application that ingests a restaurant's POS transaction history and exposes an AI-powered conversational interface (chatbot) that answers natural-language questions about staffing, inventory purchasing, menu optimization, and food donation opportunities. The AI also surfaces local organizations (soup kitchens, food banks) that could receive surplus food before it goes to waste.

## 3. Target Users

| Persona | Description |
|---|---|
| Restaurant owner/operator | Single or multi-location, uses Square POS or exports data to CSV |
| Food truck operator | Smaller scale, cost-sensitive ($10/mo tier) |

---

## 4. MVP Feature Requirements

### 4.1 Authentication & Account Management

- Email/password sign-up, login, logout, password reset.
- Each account is scoped to one or more restaurant locations.
- Session management with secure token handling.

### 4.2 Data Import

Two import paths:

| Method | Priority | Description |
|---|---|---|
| **Square POS** | P0 | OAuth integration. System ingests and normalizes transaction records automatically. |
| **CSV upload** | P0 | User uploads CSV files containing POS transactions, vendor/distributor invoices, inventory records, or any tabular operational data. Least-common-denominator import path -- any restaurant with a spreadsheet or software that exports CSV can use PantryIQ. |

**Requirements:**

- **Square:** User connects via OAuth. System pulls transaction records (items sold, quantities, timestamps, revenue). Incremental sync after initial import.
- **CSV:** User uploads one or more CSV files. System parses, validates, and presents a field-mapping UI:
  1. AI attempts to auto-detect which columns map to standard fields (date, item, quantity, revenue, cost, location, etc.).
  2. AI presents recommended mappings to the user.
  3. User confirms or corrects the mappings before data is normalized and imported.
  4. This ensures accuracy while reducing user friction.
- Common normalized schema: items, quantities, timestamps, revenue, cost (if available), location.
- Surface import status and error states clearly in the UI.
- Support re-upload and append for incremental CSV imports.

**Testing infrastructure:**

- A script/utility to generate sample CSV files for testing purposes must be included in the MVP scope.
- These test CSVs should cover realistic restaurant data scenarios (transactions, inventory, vendor invoices).
- Must be documented and accessible to QA and developers.

### 4.3 AI Chatbot

A conversational interface where users ask natural-language questions and receive answers grounded in their imported data.

**Core question categories the AI must handle:**

| Category | Example prompts |
|---|---|
| **Staffing** | "Which days do I regularly overstaff?" / "What shifts could I safely run lean?" / "How did weather affect staffing needs last year?" |
| **Inventory & Purchasing** | "What ingredients do I consistently over-buy?" / "What items spoil the most, and on which days?" / "What should I buy less of next month without hurting sales?" |
| **Menu Optimization** | "Which menu items are loved but barely ordered?" / "What items sell great but destroy margins?" / "If I cut one menu item, which one hurts the least?" |
| **Donation Opportunities** | "Which days will we likely have surplus food?" / "How much food could we donate without risk?" / "What local soup kitchens or food banks near me could receive this food?" |

**Behavior:**

- The AI determines whether it _can_ answer a given question based on available data.
- If the data is insufficient, it must say so rather than hallucinate.
- Conversation history is persisted -- users can revisit prior conversations.
- When asked about donation, the AI should identify and surface contact information for local soup kitchens, food banks, and charitable organizations that accept food donations. The food may not meet the restaurant's service standards but is still safe to eat and valuable to these organizations.

### 4.4 AI Model Selection

Users can select which AI model powers their chatbot from a set of supported models on a per-conversation basis. The system must default to an affordable model but allow the user to switch for any new conversation.

**Supported model tiers (MVP):**

| Tier | Models | Power-user cost/mo | Notes |
|---|---|---|---|
| **Budget (default)** | Gemini 2.0 Flash Lite, Gemini 2.0 Flash, Claude Haiku 3 (legacy), GPT-5.4 nano | $0.23 -- $0.83 | Safe at all pricing tiers |
| **Mid-tier** | GPT-5.4 mini, Claude Haiku 4.5, Gemini 2.5 Flash | $1.30 -- $3.33 | Viable at $20/location; tight at $10/truck |

**Not supported in MVP:** GPT-5.4, Claude Sonnet 4.6, Claude Opus, GPT-5.4 pro -- these are loss-making at flat-rate pricing. Can revisit with credit-based pricing in v2.

**UX details:**

- Each new conversation includes a model selector (defaulting to the budget tier).
- When a user selects a mid-tier model, the UI should show a cost/quality trade-off notice (e.g., "This model is more capable but may cost ~3x more").
- Conversation history retains which model was used for each response.

**Cost guardrail:** AI cost per location must stay below 40% of that location's monthly revenue at power-user volumes (600 queries/month). The UI should make cost implications clear when users select higher-tier models.

Refer to `.agents/spec/cost-analysis.md` for full model pricing, margin analysis, and caching strategy.

### 4.5 Weather Data Integration

Weather directly impacts restaurant traffic -- a snowstorm can turn an expected busy weekend into a dead one, leaving perishable inventory to spoil.

**Requirements:**

- Integrate an external weather API to ingest historical and forecast weather data for each restaurant's location.
- Weather data is injected into the AI's context so it can correlate weather patterns with transaction history.
- Enables prompts like: "How did weather affect staffing needs last year?" and "Should I order less this week given the forecast?"

**Implementation details:**

- **API choice:** OpenWeatherMap (free tier) or equivalent low-cost option.
- **Caching strategy:** Weather results are cached in Postgres per ZIP code / location, keyed by date. Forecast data (7-14 day) is refreshed once daily per location. Historical data is fetched once and retained indefinitely.
- **Update frequency:** Forecast refresh is a low-cost scheduled job (e.g., once per day at off-peak hours).
- Store historical weather data alongside transaction data, keyed by location and date.

### 4.6 Donation Intelligence

The charitable mission is core to PantryIQ's identity. In the MVP, this is handled through the AI chatbot -- not a separate operational workflow.

**What the AI does:**

- Forecasts which days/items are likely to produce surplus food based on historical patterns and weather.
- Identifies local soup kitchens, food banks, and charitable organizations that accept food donations near the restaurant's location.
- Surfaces their contact info (name, address, phone, hours, what they accept) so the operator can coordinate directly.

**Implementation details:**

- **Local org discovery:** Google Places API with aggressive caching. Results per location (ZIP code / area) are cached in Postgres and refreshed at most twice per month.
- **Cost:** Minimal with caching; typical restaurant will trigger ~1-2 Places API calls/month for "food bank near [location]" queries.

**What is NOT in MVP:**

- Automated pickup scheduling or logistics coordination.
- Direct integration with charitable organizations' systems.
- Donation tracking/reporting dashboard.

These are noted for future consideration.

### 4.7 Dashboard / Data Visibility

- Minimal UI showing import status, connected POS accounts / uploaded CSVs, and location overview.
- Not a full analytics dashboard in v1 -- the chatbot is the primary interface.

---

## 5. System Architecture

```
pantryiq.com  --> Single Next.js full-stack application
                  Repo: pantry-iq-app
                  Deployed on home/business Coolify server
                  
                  Unauthenticated routes (landing page):
                  ├── /                        (hero, features, problem section, pricing)
                  ├── /pricing
                  └── /waitlist (early access signup)
                  
                  Authenticated routes (app):
                  ├── /dashboard
                  ├── /import
                  ├── /conversations
                  └── /settings

Home/Business Coolify Server (Single machine)
│
├── Docker container: Next.js app (3000)
│   ├── React frontend (marketing pages + app UI)
│   ├── Next.js API routes (auth, Square, CSV, weather, Places, conversations, AI)
│   └── Middleware (route protection, redirect logged-in users away from marketing)
│
├── Docker container: Postgres database
│   └── All persistent data (users, locations, transactions, weather, conversations)
│
├── Docker container: Redis
│   └── Session store, API result caching (weather, Places, rate-limiting)
│
└── Traefik reverse proxy (managed by Coolify)
    ├── SSL termination (Let's Encrypt, auto-renew)
    ├── HTTP → HTTPS redirect
    └── Port forwarding (80, 443)
```

### Architectural philosophy

**Maximum simplicity and zero cloud cost for MVP.** Self-hosted on home/business hardware using Coolify for infrastructure orchestration. Single Next.js monolith handles marketing pages and app. All services (app, database, cache, reverse proxy) run on one machine with minimal latency between components.

### Key architectural decisions

| Decision | Rationale |
|---|---|
| **Single Next.js app (marketing + app unified)** | One repo, one deployment, one domain. Seamless UX: user lands on marketing, clicks signup, logs in, sees dashboard. No domain switching. Shared components, auth, styling. |
| **Home/business Coolify server** | Zero cloud hosting costs during MVP phase. Coolify automates Docker orchestration, backups, SSL, and deployments. Full control over infrastructure. Clear migration path to cloud provider (VPS, Vercel) if/when needed—standard Docker images + Postgres dump are portable. |
| **All services on one machine** | Minimal latency between Next.js app, Postgres, and Redis. No inter-service network calls. Simpler operations: one machine to monitor, one backup strategy, one point of failure (acceptable for MVP). |
| **Middleware-driven routing** | Redirect logged-in users away from marketing pages. Redirect logged-out users away from /dashboard. Simple, performant, declarative. |
| **Direct LLM API calls from Next.js API routes** | No separate service. Call OpenAI/Anthropic/Google directly from backend. When complexity warrants extraction (retries, fallbacks, queuing), split then. |
| **Postgres + Redis on same machine** | Postgres for persistent data; Redis for session cache and API result caching (weather, Places). Same-machine communication is sub-millisecond. |

### Deployment flow

```
Developer workflow:
├── Local: git commit → push to GitHub
├── GitHub: tests run (optional CI)
└── Coolify webhook: auto-pull latest code → docker build → docker compose restart
    └── Zero-downtime deploy (Coolify handles graceful restarts)

Result: Changes live in ~2-5 minutes with no manual intervention.
```

### Route structure

**Marketing (logged-out):**

```
GET  /                    → Landing page (hero, features, pricing)
GET  /pricing             → Pricing page
POST /api/subscribe       → Waitlist signup
GET  /login               → Login form
POST /api/auth/login      → Auth endpoint
GET  /signup              → Signup form
POST /api/auth/signup     → Auth endpoint
```

**App (logged-in):**

```
GET  /dashboard                     → Overview, import status
GET  /import                        → POS/CSV import UI
POST /api/square/connect            → Square OAuth initiate
GET  /api/square/callback           → Square OAuth callback
POST /api/csv/upload                → CSV file upload + parsing
POST /api/csv/field-mapping         → Field mapping confirmation
GET  /conversations                 → Conversation list
GET  /conversations/:id             → Conversation detail + chat UI
POST /api/conversations             → Create new conversation
POST /api/conversations/:id/message → Send message (calls LLM)
GET  /api/conversations/:id/history → Load conversation history
GET  /settings                      → User/location settings
POST /api/locations/:id/model       → Set default model per location
GET  /api/weather/:location         → Fetch/cache weather data
GET  /api/places/:location          → Fetch/cache local donation orgs
```

### Service responsibilities

| Component | Owns |
|---|---|
| **Next.js frontend (unauthenticated)** | Landing page, pricing page, login/signup forms, waitlist UI |
| **Next.js frontend (authenticated)** | Dashboard, import UI, field mapping UI, chatbot UI, conversation history, model selection, settings |
| **Next.js API routes** | All backend logic: auth (signup, login, session), Square OAuth flow, CSV parsing/validation, field mapping hints, transaction normalization, weather data fetching + caching, Places API queries + caching, conversation CRUD, LLM calls, user/location management |
| **Middleware** | Route protection, auth check, redirect logged-in users away from marketing pages, redirect logged-out users away from app pages |
| **Postgres (Docker)** | Users, locations, normalized transactions, weather data, Places API results, conversations, messages, model preferences, OAuth tokens, waitlist signups |
| **Redis (Docker)** | Session store, cached weather data (TTL: 24h), cached Places API results (TTL: 30d), rate-limiting state |
| **Traefik (Coolify)** | Reverse proxy, SSL termination (Let's Encrypt), HTTP → HTTPS redirect, port forwarding (80, 443) |
| **Coolify** | Docker orchestration, deployment automation, GitHub webhook, backup scheduling, dashboard UI |

### Infrastructure requirements (home/business server)

| Resource | Requirement | Notes |
|---|---|---|
| **CPU cores** | 2-4 | Next.js, Postgres, Redis are lightweight at MVP scale |
| **RAM** | 4-8 GB | 2 GB headroom for OS/buffers, rest split among containers |
| **Storage** | 50-100 GB | OS, app, Postgres data, rotating backups |
| **Internet uptime** | >99% | For MVP, acceptable if ISP outages are rare. Revisit if becomes limiting. |
| **Upload bandwidth** | ≥5 Mbps | For initial user requests. If slower, users in distant regions may experience lag. |
| **ISP policy** | Allow port 80/443 hosting | Verify ToS; most don't enforce for personal use, but check yours. |
| **Backup strategy** | Automated off-site backups | Postgres data dumped daily to S3 or external storage (see Section 11). |

### When/if to migrate to cloud provider

**Extract/migrate to cloud (VPS, Vercel) only when you hit genuine constraints:**

1. **Home internet uptime becomes issue** (outages > 1x/month or SLA violation from paying customers)
2. **ISP policy enforcement** (unlikely, but blocks your hosting)
3. **Geographic latency complaints** (users in distant regions report slow performance)
4. **Revenue justifies cloud cost** (enough paying customers that €15-50/month cloud hosting is negligible vs. revenue)

**Migration is straightforward and low-risk:**

- **Docker images are portable** — Run same Dockerfile on any cloud provider
- **Postgres dumps are portable** — `pg_dump` home server → restore on cloud server (10 minutes)
- **Zero code changes** — Next.js app works identically on cloud hardware
- **DNS is portable** — Update A record to new IP, wait for propagation
- **Estimated migration time: 2-4 hours** (mostly waiting for DNS)

Example migration path (if/when needed):
1. Rent Hetzner CPX21 VPS (€15.49/mo)
2. Install Coolify on new VPS (same setup as home)
3. Export app + database from home server
4. Import to cloud VPS
5. Update DNS
6. Done — zero downtime during migration

### Development environment (local)

Developers run the exact same `docker-compose.yml` locally:

```
docker-compose up
├── Next.js app (http://localhost:3000)
├── Postgres (localhost:5432)
└── Redis (localhost:6379)
```

Production and local dev use identical containerization. No "works on my machine" surprises.

---

## 6. Data Model (High-Level)

**Postgres (persistent data):**

```
users
  ├── email, password_hash, created_at
  └── locations
        ├── name, timezone, address, zip_code
        ├── pos_connections       (provider: square, oauth_token, sync_state, last_sync)
        ├── csv_uploads           (filename, upload_ts, row_count, status, error_details)
        ├── transactions          (date, item, qty, revenue, cost, source: square|csv)
        └── conversations
              └── messages        (role: user|assistant, content, model_used, tokens_in, tokens_out)
```

**Redis (cached data with TTL):**

```
sessions:{user_id}                 (auth session, TTL: 7 days)
weather:{zip_code}:{date}          (historical + forecast, TTL: 24 hours)
places_cache:{location}            (soup kitchens/food banks, TTL: 30 days)
```

**Note on Places API caching:** Results are cached per location (ZIP code) with 30-day TTL, refreshed only on new location addition or manual cache-clear. This keeps costs near-zero while providing fresh data 2-3x per month naturally.

---

## 7. Non-Functional Requirements

| Requirement | Target | Notes |
|---|---|---|
| Availability | 99% uptime (home internet dependent) | Home server subject to ISP outages. Acceptable for MVP. Upgrade to VPS if SLA becomes requirement. |
| Latency (chatbot - first token) | < 3s for default-tier models | All services on same machine → sub-millisecond internal calls. Network latency is LLM provider only. |
| Data retention | Transaction and weather data retained indefinitely while subscription active | Postgres on home machine; daily backups to external storage. |
| Security | HTTPS everywhere (Let's Encrypt via Traefik), secrets in env, no PII in logs, OAuth tokens encrypted at rest | Home server: firewall + SSH key-based access only. No password authentication. |
| Cost ceiling | AI cost must stay < 40% of revenue per location at power-user volume | Zero infrastructure cost during MVP phase. |
| CSV upload limits | Reasonable file size cap (e.g., 50MB per upload) with clear error messaging | |
| API response time (non-AI) | < 200ms for auth, CSV parsing, import status checks | Same-machine Postgres ensures fast queries. |
| Weather API calls | Cached; refreshed max 1x/day per location | Minimal API calls due to caching. |
| Places API calls | Cached per location with 30-day TTL; typically 2-3 refreshes/month per location | Minimal API calls due to caching. |
| Backup strategy | Daily automated Postgres dumps to external storage (S3, external drive, cloud backup service) | See Section 11 for details. |
| DNS | Static IP or dynamic DNS (DDNS) if ISP provides dynamic IP | If home IP changes, update DNS record (manual or DDNS service). |

---

## 8. Pricing Model (MVP)

Simple flat-rate:

| Tier | Price |
|---|---|
| Restaurant location | $20 / month |
| Food truck | $10 / month |
| Trial | 7 days free, no credit card required |

The landing page already advertises these prices and the "unlimited questions" positioning. The cost analysis confirms this is viable with budget and mid-tier AI models.

Tiered/credit-based pricing is deferred to v2 pending real usage data.

---

## 9. Third-Party Integrations (MVP)

| Integration | Purpose | Auth method | Notes |
|---|---|---|---|
| **Square API** | POS transaction data import | OAuth 2.0 | User authorizes during import flow |
| **Weather API** (OpenWeatherMap or equivalent) | Historical + forecast weather data per location | API key | Free tier sufficient for MVP; cached aggressively |
| **Google Places API** | Local food bank/soup kitchen discovery | API key | Free tier sufficient for MVP; cached aggressively |
| **LLM providers** (OpenAI, Anthropic, Google Vertex AI) | AI model inference | API keys | User's choice of model; costs passed through to user via pricing |
| **PostHog** | Product analytics (user journey from marketing page → signup → first question) | Client-side SDK | Tracks user behavior across landing page and app |
| **Let's Encrypt** | SSL/TLS certificates | Automated via Traefik | Auto-renews; managed by Coolify |

---

## 10. Out of Scope (MVP)

Explicitly deferred:

- Additional POS providers (Oracle Micros, Ziosk, Sysco)
- AI-initiated vendor ordering via MCP
- Integration with tokei.app or Dinetap
- Premium AI models that are loss-making at flat-rate pricing (GPT-5.4 flagship, Claude Sonnet/Opus)
- Credit/overage-based pricing tiers
- Donation operational workflow (pickup scheduling, logistics, tracking)
- Mobile apps
- Multi-user roles / permissions within a location
- Full analytics dashboard with charts/graphs

---

## 11. Testing, Validation & Operations

### CSV Test Data Generation

A utility must be provided to generate realistic sample CSV files for testing. This includes:

- Transaction CSVs (date, item name, quantity, price, cost)
- Vendor invoice CSVs (vendor name, item, unit cost, order date)
- Inventory CSVs (item, stock level, reorder point, last purchase date)

The utility should:

1. Accept parameters (number of records, date range, restaurant type).
2. Generate CSV files with realistic restaurant data.
3. Be usable by developers and QA without PII or sensitive data.
4. Be documented and included in the development setup guide.

### Home Server Backup & Operations

**Backup strategy:**

- **Frequency:** Daily automated Postgres dump (runs via cron at 2 AM)
- **Format:** SQL dump (`pg_dump`) compressed with gzip
- **Retention:** Keep 7 days of rolling backups locally, 30 days in off-site storage
- **Off-site storage:** S3 bucket (AWS), Backblaze B2, or external NAS
- **Recovery testing:** Monthly test restore from backup to verify integrity

**Backup script example:**

```bash
#!/bin/bash
# /opt/backups/backup-db.sh
BACKUP_DIR="/opt/backups"
DB_NAME="pantryiq"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/postgres_$TIMESTAMP.sql.gz"

docker exec coolify-postgres pg_dump -U postgres $DB_NAME | gzip > $BACKUP_FILE

# Upload to S3 (requires AWS CLI)
aws s3 cp $BACKUP_FILE s3://your-backup-bucket/

# Clean up local backups older than 7 days
find $BACKUP_DIR -name "postgres_*.sql.gz" -mtime +7 -delete
```

Add to crontab: `0 2 * * * /opt/backups/backup-db.sh`

**Uptime monitoring:**

- Use Uptime Robot or similar free service to monitor `pantryiq.com` every 5 minutes
- Get alerts if site is down for > 10 minutes
- Acceptable for MVP (non-SLA customers)

**Home server checklist:**

- [ ] Static IP or DDNS configured (so domain stays reachable if IP changes)
- [ ] Firewall configured to allow ports 80, 443; block SSH brute-force
- [ ] SSH key-based auth enabled (no password SSH)
- [ ] Daily backups automated and tested
- [ ] Monitoring alert configured
- [ ] UPS (uninterruptible power supply) for graceful shutdown on power loss (optional but recommended)

---

## 12. Success Criteria

| Metric | Target |
|---|---|
| POS data import (Square) | User can connect and see imported transactions within 10 minutes |
| CSV import + mapping | User uploads a CSV, confirms field mappings, and sees parsed data within 5 minutes |
| Chatbot accuracy | AI correctly declines questions it cannot answer (no hallucinated metrics) |
| Weather correlation | AI can reference weather data when answering staffing/demand questions |
| Donation intelligence | AI can surface at least one local food bank/soup kitchen for a given location |
| Model selection UX | User can switch models on a per-conversation basis with clear cost indicators |
| Time to value | User asks their first useful question within 15 minutes of sign-up |
| Unit economics | AI cost per power-user location < $8.00/month (40% of $20 revenue) |
