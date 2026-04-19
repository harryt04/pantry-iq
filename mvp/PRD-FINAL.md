# PantryIQ -- Product Requirements Document (Final MVP)

**Version:** 1.0 (Final MVP)
**Date:** 2026-04-10
**Author:** Harry (CTO)
**Status:** Ready for Implementation
**Database Decision:** PostgreSQL v18 (standard edition)
**Sync Layer:** Zero (Rocicorp) - self-hosted
**Cache Layer:** None (PostgreSQL + Zero handle caching)
**Previous versions:** PRD.md (v0.1), PRD-v2.md (v0.2), PRD-v3.md (v0.3), PRD-v4.md (v0.4)

---

## 1. Problem Statement

Restaurants routinely over-purchase ingredients, over-staff shifts, and under-utilize menu items -- leading to significant food waste, margin erosion, and operational inefficiency. Operators lack data-driven tools that turn their existing POS transaction data into actionable purchasing, staffing, and menu decisions. Meanwhile, food that could safely feed people ends up rotting in landfills.

## 2. Product Overview

PantryIQ is a SaaS application that ingests a restaurant's POS transaction history and exposes an AI-powered conversational interface (chatbot) that answers natural-language questions about staffing, inventory purchasing, menu optimization, and food donation opportunities. The AI also surfaces local organizations (soup kitchens, food banks) that could receive surplus food before it goes to waste.

## 3. Target Users

| Persona                   | Description                                                      |
| ------------------------- | ---------------------------------------------------------------- |
| Restaurant owner/operator | Single or multi-location, uses Square POS or exports data to CSV |
| Food truck operator       | Smaller scale, cost-sensitive ($10/mo tier)                      |

---

## 4. MVP Feature Requirements

### 4.1 Authentication & Account Management

- Email/password sign-up, login, logout, password reset.
- Each account is scoped to one or more restaurant locations.
- Session management with secure token handling.

### 4.2 Data Import

Two import paths:

| Method         | Priority | Description                                                                                                                                                                                                                                                   |
| -------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Square POS** | P0       | OAuth integration. System ingests and normalizes transaction records automatically.                                                                                                                                                                           |
| **CSV upload** | P0       | User uploads CSV files containing POS transactions, vendor/distributor invoices, inventory records, or any tabular operational data. Least-common-denominator import path -- any restaurant with a spreadsheet or software that exports CSV can use PantryIQ. |

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

| Category                   | Example prompts                                                                                                                                                            |
| -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Staffing**               | "Which days do I regularly overstaff?" / "What shifts could I safely run lean?" / "How did weather affect staffing needs last year?"                                       |
| **Inventory & Purchasing** | "What ingredients do I consistently over-buy?" / "What items spoil the most, and on which days?" / "What should I buy less of next month without hurting sales?"           |
| **Menu Optimization**      | "Which menu items are loved but barely ordered?" / "What items sell great but destroy margins?" / "If I cut one menu item, which one hurts the least?"                     |
| **Donation Opportunities** | "Which days will we likely have surplus food?" / "How much food could we donate without risk?" / "What local soup kitchens or food banks near me could receive this food?" |

**Behavior:**

- The AI determines whether it _can_ answer a given question based on available data.
- If the data is insufficient, it must say so rather than hallucinate.
- Conversation history is persisted -- users can revisit prior conversations.
- When asked about donation, the AI should identify and surface contact information for local soup kitchens, food banks, and charitable organizations that accept food donations. The food may not meet the restaurant's service standards but is still safe to eat and valuable to these organizations.

### 4.4 AI Model Selection

Users can select which AI model powers their chatbot from a set of supported models on a per-conversation basis. The system must default to an affordable model but allow the user to switch for any new conversation.

**Supported model tiers (MVP):**

| Tier                 | Models                                                                         | Power-user cost/mo | Notes                                      |
| -------------------- | ------------------------------------------------------------------------------ | ------------------ | ------------------------------------------ |
| **Budget (default)** | Gemini 2.0 Flash Lite, Gemini 2.0 Flash, Claude Haiku 3 (legacy), GPT-5.4 nano | $0.23 -- $0.83     | Safe at all pricing tiers                  |
| **Mid-tier**         | GPT-5.4 mini, Claude Haiku 4.5, Gemini 2.5 Flash                               | $1.30 -- $3.33     | Viable at $20/location; tight at $10/truck |

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
- **Store historical weather data alongside transaction data, keyed by location and date.**

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
│   ├── Zero client library (client-side sync + optimistic updates)
│   └── Middleware (route protection, redirect logged-in users away from marketing)
│
├── Docker container: PostgreSQL v18 (5432)
│   └── All persistent data (users, locations, transactions, weather, conversations)
│
├── Docker container: Zero cache server (custom port, typically 8001)
│   ├── Read-only replica of Postgres database
│   ├── Maintains ZQL query engine for efficient incremental sync
│   └── Syncs client queries and mutations with server authority
│
└── Traefik reverse proxy (managed by Coolify)
    ├── SSL termination (Let's Encrypt, auto-renew)
    ├── HTTP → HTTPS redirect
    ├── /zero/* routing to Zero cache server
    └── Port forwarding (80, 443)
```

### Architectural philosophy

**Maximum simplicity, zero cloud cost for MVP, with instant frontend performance via Zero sync.** Self-hosted on home/business hardware using Coolify for infrastructure orchestration. Single Next.js monolith handles marketing pages and app. All services (app, database, cache, reverse proxy) run on one machine with minimal latency between components.

### Key architectural decisions

| Decision                                         | Rationale                                                                                                                                                                                                                                                                    |
| ------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Single Next.js app (marketing + app unified)** | One repo, one deployment, one domain. Seamless UX: user lands on marketing, clicks signup, logs in, sees dashboard. No domain switching. Shared components, auth, styling.                                                                                                   |
| **Home/business Coolify server**                 | Zero cloud hosting costs during MVP phase. Coolify automates Docker orchestration, backups, SSL, and deployments. Full control over infrastructure. Clear migration path to cloud provider (VPS, Vercel) if/when needed—standard Docker images + Postgres dump are portable. |
| **All services on one machine**                  | Minimal latency between Next.js app, Postgres, and Zero cache. No inter-service network calls. Simpler operations: one machine to monitor, one backup strategy, one point of failure (acceptable for MVP).                                                                   |
| **PostgreSQL v18 (standard)**                    | Latest stable, LTS support. Superior query optimization for analytical queries (chatbot's use case). Standard edition avoids vendor lock-in (Supabase unnecessary for self-hosted MVP). Native JSON improvements and parallel query enhancements.                            |
| **Zero sync engine**                             | Instant client-side reads and writes. Data synced to client on-demand via ZQL queries. Server maintains authority over permissions and business logic. Users get responsive UI without loading screens or polling.                                                           |
| **Middleware-driven routing**                    | Redirect logged-in users away from marketing pages. Redirect logged-out users away from /dashboard. Simple, performant, declarative.                                                                                                                                         |
| **Direct LLM API calls from Next.js API routes** | No separate service. Call OpenAI/Anthropic/Google directly from backend. When complexity warrants extraction (retries, fallbacks, queuing), split then.                                                                                                                      |
| **No separate cache layer (Redis removed)**      | Postgres + Zero together handle all caching needs: weather and Places API results cached in Postgres with TTL-aware queries; session storage in Postgres; Zero handles client-side caching transparently via ZQL. Simpler operations, one fewer service to manage.           |

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

**Zero sync endpoints (proxied via Traefik):**

```
POST /zero/sync                     → Client syncs queries and mutations
GET  /zero/...                      → ZQL query results (handled by Zero cache)
```

### Service responsibilities

| Component                              | Owns                                                                                                                                                                                                                                                               |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Next.js frontend (unauthenticated)** | Landing page, pricing page, login/signup forms, waitlist UI                                                                                                                                                                                                        |
| **Next.js frontend (authenticated)**   | Dashboard, import UI, field mapping UI, chatbot UI, conversation history, model selection, settings                                                                                                                                                                |
| **Zero client (frontend)**             | Transparent client-side sync: queries resolved from local store first (instant), server results merged asynchronously. Optimistic mutations. Automatic reactivity.                                                                                                 |
| **Next.js API routes**                 | All backend logic: auth (signup, login, session), Square OAuth flow, CSV parsing/validation, field mapping hints, transaction normalization, weather data fetching + caching, Places API queries + caching, conversation CRUD, LLM calls, user/location management |
| **Middleware**                         | Route protection, auth check, redirect logged-in users away from marketing pages, redirect logged-out users away from app pages                                                                                                                                    |
| **Postgres v18 (Docker)**              | Users, locations, normalized transactions, weather data, Places API results, conversations, messages, model preferences, OAuth tokens, waitlist signups                                                                                                            |
| **Zero cache server (Docker)**         | Read-only replica of Postgres. Maintains ZQL query engine. Efficiently syncs client queries and mutations. Validates permissions server-side. No business logic—just query execution and sync coordination.                                                        |
| **Traefik (Coolify)**                  | Reverse proxy, SSL termination (Let's Encrypt), HTTP → HTTPS redirect, port forwarding (80, 443), routing to /zero/\* endpoints                                                                                                                                    |
| **Coolify**                            | Docker orchestration, deployment automation, GitHub webhook, backup scheduling, dashboard UI                                                                                                                                                                       |

### Infrastructure requirements (home/business server)

| Resource             | Requirement                | Notes                                                                              |
| -------------------- | -------------------------- | ---------------------------------------------------------------------------------- |
| **CPU cores**        | 2-4                        | Next.js, Postgres, Zero cache are lightweight at MVP scale                         |
| **RAM**              | 4-8 GB                     | 2 GB headroom for OS/buffers, rest split among containers                          |
| **Storage**          | 50-100 GB                  | OS, app, Postgres data, rotating backups                                           |
| **Internet uptime**  | >99%                       | For MVP, acceptable if ISP outages are rare. Revisit if becomes limiting.          |
| **Upload bandwidth** | ≥5 Mbps                    | For initial user requests. If slower, users in distant regions may experience lag. |
| **ISP policy**       | Allow port 80/443 hosting  | Verify ToS; most don't enforce for personal use, but check yours.                  |
| **Backup strategy**  | Automated off-site backups | Postgres data dumped daily to S3 or external storage (see Section 11).             |

### When/if to migrate to cloud provider

**Extract/migrate to cloud (VPS, Vercel) only when you hit genuine constraints:**

1. **Home internet uptime becomes issue** (outages > 1x/month or SLA violation from paying customers)
2. **ISP policy enforcement** (unlikely, but blocks your hosting)
3. **Geographic latency complaints** (users in distant regions report slow performance)
4. **Revenue justifies cloud cost** (enough paying customers that €15-50/month cloud hosting is negligible vs. revenue)

**Migration is straightforward and low-risk:**

- **Docker images are portable** — Run same Dockerfile on any cloud provider
- **Postgres dumps are portable** — `pg_dump` home server → restore on cloud server (10 minutes)
- **Zero cache is portable** — Standard Docker image, runs anywhere
- **Zero code changes** — Next.js app works identically on cloud hardware
- **DNS is portable** — Update A record to new IP, wait for propagation
- **Estimated migration time: 2-4 hours** (mostly waiting for DNS)

Example migration path (if/when needed):

1. Rent Hetzner CPX21 VPS (€15.49/mo)
2. Install Coolify on new VPS (same setup as home)
3. Export app + database + Zero config from home server
4. Import to cloud VPS
5. Update DNS
6. Done — zero downtime during migration

### Development environment (local)

Developers run the exact same `docker-compose.yml` locally:

```
docker-compose up
├── Next.js app (http://localhost:3000)
├── Postgres v18 (localhost:5432)
└── Zero cache server (localhost:8001)
```

Production and local dev use identical containerization. No "works on my machine" surprises.

---

## 6. Data Model (High-Level)

**Postgres v18 (persistent data):**

```
users
  ├── id, email, password_hash, created_at
  └── locations
        ├── id, user_id, name, timezone, address, zip_code
        ├── pos_connections       (id, location_id, provider: square, oauth_token, sync_state, last_sync)
        ├── csv_uploads           (id, location_id, filename, upload_ts, row_count, status, error_details)
        ├── transactions          (id, location_id, date, item, qty, revenue, cost, source: square|csv, created_at)
        ├── weather_data          (id, location_id, date, temperature, conditions, precipitation, cached_at)
        ├── places_cache          (id, location_id, org_name, address, phone, hours, types, cached_at)
        └── conversations
              ├── id, location_id, created_at, default_model
              └── messages        (id, conversation_id, role: user|assistant, content, model_used, tokens_in, tokens_out, created_at)

waitlist_signups
  ├── id, email, created_at
```

**Zero-specific considerations:**

- Zero maintains a read-only replica of all Postgres tables above.
- ZQL queries define which data is synced to each client based on user's location scope.
- All mutations flow through Next.js API routes, which enforce permissions before writing to Postgres.
- Zero cache server validates that mutations don't violate row-level security (users can only see their own locations and data).

---

## 7. Non-Functional Requirements

| Requirement                     | Target                                                                                                       | Notes                                                                                                |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------- |
| Availability                    | 99% uptime (home internet dependent)                                                                         | Home server subject to ISP outages. Acceptable for MVP. Upgrade to VPS if SLA becomes requirement.   |
| Latency (chatbot - first token) | < 3s for default-tier models                                                                                 | All services on same machine → sub-millisecond internal calls. Network latency is LLM provider only. |
| Latency (frontend interactions) | Instant (< 100ms) via Zero sync                                                                              | Client-side queries resolve immediately from local cache. Server results merged asynchronously.      |
| Data retention                  | Transaction and weather data retained indefinitely while subscription active                                 | Postgres on home machine; daily backups to external storage.                                         |
| Security                        | HTTPS everywhere (Let's Encrypt via Traefik), secrets in env, no PII in logs, OAuth tokens encrypted at rest | Home server: firewall + SSH key-based access only. No password authentication.                       |
| Cost ceiling                    | AI cost must stay < 40% of revenue per location at power-user volume                                         | Zero infrastructure cost during MVP phase.                                                           |
| CSV upload limits               | Reasonable file size cap (e.g., 50MB per upload) with clear error messaging                                  |                                                                                                      |
| API response time (non-AI)      | < 200ms for auth, CSV parsing, import status checks                                                          | Same-machine Postgres ensures fast queries.                                                          |
| Weather API calls               | Cached; refreshed max 1x/day per location                                                                    | Minimal API calls due to caching.                                                                    |
| Places API calls                | Cached per location with 30-day TTL; typically 2-3 refreshes/month per location                              | Minimal API calls due to caching.                                                                    |
| Backup strategy                 | Daily automated Postgres dumps to external storage (S3, external drive, cloud backup service)                | See Section 11 for details.                                                                          |
| DNS                             | Static IP or dynamic DNS (DDNS) if ISP provides dynamic IP                                                   | If home IP changes, update DNS record (manual or DDNS service).                                      |

---

## 8. Pricing Model (MVP)

Simple flat-rate:

| Tier                | Price                                |
| ------------------- | ------------------------------------ |
| Restaurant location | $20 / month                          |
| Food truck          | $10 / month                          |
| Trial               | 7 days free, no credit card required |

The landing page already advertises these prices and the "unlimited questions" positioning. The cost analysis confirms this is viable with budget and mid-tier AI models.

Tiered/credit-based pricing is deferred to v2 pending real usage data.

---

## 9. Third-Party Integrations (MVP)

| Integration                                             | Purpose                                                                        | Auth method           | Notes                                                            |
| ------------------------------------------------------- | ------------------------------------------------------------------------------ | --------------------- | ---------------------------------------------------------------- |
| **Square API**                                          | POS transaction data import                                                    | OAuth 2.0             | User authorizes during import flow                               |
| **Weather API** (OpenWeatherMap or equivalent)          | Historical + forecast weather data per location                                | API key               | Free tier sufficient for MVP; cached aggressively                |
| **Google Places API**                                   | Local food bank/soup kitchen discovery                                         | API key               | Free tier sufficient for MVP; cached aggressively                |
| **LLM providers** (OpenAI, Anthropic, Google Vertex AI) | AI model inference                                                             | API keys              | User's choice of model; costs passed through to user via pricing |
| **PostHog**                                             | Product analytics (user journey from marketing page → signup → first question) | Client-side SDK       | Tracks user behavior across landing page and app                 |
| **Let's Encrypt**                                       | SSL/TLS certificates                                                           | Automated via Traefik | Auto-renews; managed by Coolify                                  |

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
- Redis caching layer (Postgres + Zero handle all caching needs)

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

### Zero Cache Server Setup (Coolify)

Zero cache server is not available as a Coolify template and must be set up manually. Follow these steps:

**1. Create a Docker Compose service for Zero cache in your production compose file:**

```yaml
services:
  zero-cache:
    image: rocicorp/zero:latest
    container_name: zero-cache
    environment:
      - POSTGRES_URL=postgres://postgres:PASSWORD@postgres:5432/pantryiq
      - ZERO_LOG_LEVEL=info
      - ZERO_PORT=8001
    ports:
      - '8001:8001'
    depends_on:
      - postgres
    volumes:
      - zero-data:/data
    restart: always

volumes:
  zero-data:
```

**2. Configure Traefik routing in Coolify:**

Add the following to your Traefik configuration (or via Coolify UI):

```yaml
# Route /zero/* traffic to Zero cache server
routers:
  zero:
    rule: 'PathPrefix(`/zero`)'
    service: zero-service
    middlewares:
      - https-redirect
      - https-headers

services:
  zero-service:
    loadBalancer:
      servers:
        - url: 'http://zero-cache:8001'

# Strip /zero prefix before sending to Zero cache
middlewares:
  zero-strip:
    stripPrefix:
      prefixes:
        - '/zero'
```

**3. Add environment variables to Coolify:**

- `POSTGRES_URL` → Full connection string to Postgres (postgres://user:pass@host:5432/dbname)
- `ZERO_LOG_LEVEL` → `info` (can adjust to `debug` if needed)
- `ZERO_PORT` → `8001`

**4. Deploy and verify:**

After restarting, test connectivity:

```bash
curl http://localhost:8001/health
```

Should return HTTP 200.

**5. Client-side configuration:**

In your Next.js app, install and configure Zero client:

```bash
npm install @zero-sync/client
```

Example usage in a React component:

```typescript
import { useQuery, useMutation } from '@zero-sync/client';
import { queries, mutators } from './zero-schema';

export function ConversationList({ locationId }) {
  // Queries resolve instantly from client cache, synced asynchronously
  const [conversations] = useQuery(
    queries.conversations.byLocationId({ locationId })
  );

  return (
    <div>
      {conversations?.map(c => (
        <div key={c.id}>{c.created_at}</div>
      ))}
    </div>
  );
}
```

For detailed Zero client documentation, see: https://zero.rocicorp.dev/docs

---

## 12. Success Criteria

| Metric                   | Target                                                                             |
| ------------------------ | ---------------------------------------------------------------------------------- |
| POS data import (Square) | User can connect and see imported transactions within 10 minutes                   |
| CSV import + mapping     | User uploads a CSV, confirms field mappings, and sees parsed data within 5 minutes |
| Chatbot accuracy         | AI correctly declines questions it cannot answer (no hallucinated metrics)         |
| Weather correlation      | AI can reference weather data when answering staffing/demand questions             |
| Donation intelligence    | AI can surface at least one local food bank/soup kitchen for a given location      |
| Model selection UX       | User can switch models on a per-conversation basis with clear cost indicators      |
| Time to value            | User asks their first useful question within 15 minutes of sign-up                 |
| Unit economics           | AI cost per power-user location < $8.00/month (40% of $20 revenue)                 |
| Frontend responsiveness  | All UI interactions (dashboard, import, chat) respond in < 100ms via Zero sync     |
| Backup integrity         | Monthly test restore from backup succeeds; data is consistent                      |

---

## Appendix: Key Decisions & Rationale

### Why PostgreSQL v18 (not MongoDB)?

PostgreSQL's relational integrity, ACID guarantees, and SQL query composability are essential for a data analytics chatbot. Normalized transaction history enables complex queries (e.g., "correlate items sold with weather by week") that MongoDB's aggregation pipeline handles poorly. Transaction normalization on import ensures consistent schema across all users regardless of POS provider, eliminating the need for per-user schema flexibility. Postgres is the right database for normalized, queryable operational data.

### Why Zero sync instead of hand-rolled real-time layer?

Zero provides instant client-side reads/writes with server authority, automatic reactivity, and permission-aware incremental sync. Building this in-house would require substantial engineering (replication layer, conflict resolution, permission filtering). Zero abstracts this complexity into a proven, open-source architecture used by companies like Linear and Figma. At MVP scale, Zero's value is enormous: users get responsive UI without loading screens or polling.

### Why no Redis?

Postgres handles all caching needs transparently:

- Weather and Places API results cached in Postgres with TTL-aware queries
- Zero client handles frontend caching and offline support
- Session data stored in Postgres (simple queries, not a bottleneck at MVP scale)
- No separate cache invalidation logic, no TTL coordination between services

Adding Redis introduces operational overhead (another service, backup strategy, monitoring) for negligible performance gain during MVP phase. Defer to v1.1 if profiling shows it's needed.

### Why standard Postgres (not Supabase)?

Supabase adds auth, storage, and real-time services that are redundant with your own code and Zero. Its value prop (managed hosting, auth layer) evaporates when self-hosting on Coolify. Standard Postgres avoids vendor lock-in and keeps the stack simple.

### Why single Next.js monolith?

One repo, one deployment, one domain. Seamless UX from marketing → signup → app. Shared components, styling, auth. Middleware handles routing elegantly. Zero operational complexity vs. separate marketing/app repos. Can split later if genuinely needed (unlikely).

---

**Document prepared:** 2026-04-10  
**Prepared by:** OpenCode AI (Final PRD incorporating all feedback)  
**Status:** Ready for implementation and developer onboarding
