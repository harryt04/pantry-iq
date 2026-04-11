# Human TODO -- PantryIQ MVP

Manual tasks that must be completed by Harry (CTO). These are infrastructure, credentials, and configuration items that cannot be done by sub-agents.

Check off items as you complete them.

---

## Before Development Begins

- [ ] **Install Docker Desktop** (if not already installed) -- needed for `docker compose up` (Postgres + Zero cache)
- [ ] **Create `.env` file** from `.env.sample` with all required values (see below)
- [ ] **Set up Postgres 18** -- handled by `docker-compose.yml`, but verify Docker is running
- [ ] **Run initial DB migration** -- after WU-0.2 is complete: `npm run db:push`

## API Keys & Credentials to Obtain

- [ ] **BETTER_AUTH_SECRET** -- Generate: `openssl rand -base64 32` (min 32 chars, high entropy)
- [ ] **Square Developer Account** -- Sign up at https://developer.squareup.com
  - [ ] Create an application in Square Developer Dashboard
  - [ ] Get `SQUARE_APP_ID` and `SQUARE_APP_SECRET`
  - [ ] Set OAuth redirect URI to `http://localhost:3000/api/square/callback` (dev) and `https://pantryiq.com/api/square/callback` (prod)
  - [ ] Set `SQUARE_ENVIRONMENT=sandbox` for development
- [ ] **OpenAI API Key** -- https://platform.openai.com/api-keys → `OPENAI_API_KEY`
- [ ] **Anthropic API Key** -- https://console.anthropic.com → `ANTHROPIC_API_KEY`
- [ ] **Google AI API Key** -- https://ai.google.dev → `GOOGLE_GENERATIVE_AI_API_KEY`
- [ ] **OpenWeatherMap API Key** -- https://openweathermap.org/api (free tier) → `OPENWEATHERMAP_API_KEY`
- [ ] **Google Places API Key** -- https://console.cloud.google.com → Enable Places API → `GOOGLE_PLACES_API_KEY`

## Environment Variables (Complete List)

Copy to `.env`:

```bash
# Existing (already configured)
NEXT_PUBLIC_POSTHOG_KEY=phc_...
NEXT_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com

# Database
DATABASE_URL=postgres://postgres:password@localhost:5432/pantryiq

# Better Auth
BETTER_AUTH_SECRET=<generate with openssl rand -base64 32>
BETTER_AUTH_URL=http://localhost:3000

# Square OAuth
SQUARE_APP_ID=
SQUARE_APP_SECRET=
SQUARE_ENVIRONMENT=sandbox

# LLM Providers (at least one required for chatbot to work)
OPENAI_API_KEY=
ANTHROPIC_API_KEY=
GOOGLE_GENERATIVE_AI_API_KEY=

# Weather
OPENWEATHERMAP_API_KEY=

# Google Places
GOOGLE_PLACES_API_KEY=

# Zero Sync (used by docker-compose for Zero cache server)
ZERO_UPSTREAM_DB=postgres://postgres:password@localhost:5432/pantryiq
ZERO_PORT=8001
```

## Coolify / Production Deployment

- [ ] **Set up Coolify on home server** (if not already done)
  - [ ] Static IP or DDNS configured
  - [ ] Firewall: allow ports 80, 443; block SSH brute-force
  - [ ] SSH key-based auth (no password SSH)
- [ ] **Create Zero cache server in Coolify** -- not available as Coolify template, manual Docker Compose service (see PRD-FINAL Section 11)
- [ ] **Configure Traefik routing** for `/zero/*` traffic to Zero cache server
- [ ] **Set all env vars in Coolify** -- same as above but with production values
- [ ] **Set up GitHub webhook** for auto-deploy from `mvp` branch (or `main` after merge)
- [ ] **Configure SSL** -- Let's Encrypt via Traefik/Coolify (should be automatic)
- [ ] **Set up automated backups** -- Daily Postgres dump via cron (see PRD-FINAL Section 11 for script)
- [ ] **Set up Uptime Robot** -- Monitor `pantryiq.com` every 5 minutes

## Post-MVP Launch

- [ ] **Test backup restore** -- Monthly test restore from backup to verify integrity
- [ ] **UPS** -- Uninterruptible power supply for home server (recommended, not required)
- [ ] **ISP ToS check** -- Verify ISP allows port 80/443 hosting

---

**Last updated:** 2026-04-10
