# Setup Checklist -- PantryIQ MVP (Before Orchestration)

**Purpose:** Minimal required tasks for you to complete before the orchestration agent can begin work. API keys can be added later (stub values work for now).

**Estimated time:** 15-30 minutes

---

## Prerequisites (Must complete before starting orchestration)

### 1. Docker Setup

- [ ] **Install Docker Desktop** (if not already installed)
  - macOS: https://docs.docker.com/desktop/setup/install/mac-install/
  - Linux: https://docs.docker.com/engine/install/
  - Windows: https://docs.docker.com/desktop/setup/install/windows-install/
  - **Verify:** Run `docker --version` and `docker compose --version` in terminal

### 2. Create `.env` File

- [ ] **Copy `.env.sample` to `.env`** and populate with required values:

  ```bash
  cp .env.sample .env
  ```

- [ ] **Fill in these values now:**

  ```bash
  # Database (use defaults for local dev)
  DATABASE_URL=postgres://postgres:postgres@localhost:5432/pantryiq

  # Zero Sync (use defaults for local dev)
  ZERO_UPSTREAM_DB=postgres://postgres:postgres@localhost:5432/pantryiq
  ZERO_PORT=8001

  # Better Auth (generate secret, set URL)
  BETTER_AUTH_SECRET=<RUN: openssl rand -base64 32>
  BETTER_AUTH_URL=http://localhost:3000
  NEXT_PUBLIC_BETTER_AUTH_URL=http://localhost:3000

  # Square (stub values OK for now, replace later)
  SQUARE_APP_ID=stub_for_now
  SQUARE_APP_SECRET=stub_for_now
  SQUARE_ENVIRONMENT=sandbox

  # LLM Providers (stub values OK for now, replace later)
  OPENAI_API_KEY=stub_for_now
  ANTHROPIC_API_KEY=stub_for_now
  GOOGLE_GENERATIVE_AI_API_KEY=stub_for_now

  # Weather & Places (stub values OK for now, replace later)
  OPENWEATHERMAP_API_KEY=stub_for_now
  GOOGLE_PLACES_API_KEY=stub_for_now

  # PostHog (already set, don't change)
  NEXT_PUBLIC_POSTHOG_KEY=phc_...
  NEXT_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com
  ```

### 3. Generate Better Auth Secret

- [ ] **Run this command and copy the output to `BETTER_AUTH_SECRET` in `.env`:**
  ```bash
  openssl rand -base64 32
  ```

### 4. Verify Prerequisites

- [ ] **npm install has completed:**

  ```bash
  npm install
  ```

- [ ] **Current git branch is `mvp`:**

  ```bash
  git branch
  ```

  If not, run: `git checkout -b mvp`

- [ ] **All prerequisite checks pass:**
  ```bash
  docker --version
  docker compose --version
  npm --version
  node --version  # Should be 20.x or higher
  ```

---

## Optional: API Keys (Can be filled in later)

These APIs are NOT required to start orchestration. Stub values will work for development. Replace these once you have accounts set up:

- **Square API** (for POS integration): https://developer.squareup.com
- **OpenAI API** (for chatbot): https://platform.openai.com
- **Anthropic API** (for chatbot): https://console.anthropic.com
- **Google AI API** (for chatbot): https://ai.google.dev
- **OpenWeatherMap API** (for weather data): https://openweathermap.org/api
- **Google Places API** (for donation opportunities): https://console.cloud.google.com

You can replace stub values in `.env` anytime during development. The orchestrator won't fail if these are missing.

---

## Orchestration Readiness Checklist

Once all above is complete, verify:

- [ ] `.env` file exists and is populated (at minimum with stub values)
- [ ] `BETTER_AUTH_SECRET` is set (generated via `openssl rand -base64 32`)
- [ ] Docker Desktop is running (`docker ps` returns no error)
- [ ] `npm install` has completed (`node_modules/` directory exists)
- [ ] Current branch is `mvp` or `main` (`git branch` shows correct branch)

**Once all checked, orchestration can begin. The orchestrator will:**

1. Dispatch WU-0.1, WU-0.2, WU-0.3 in parallel
2. Wait for Layer 0 to complete
3. Then dispatch Layer 1, etc.
4. Update `.agents/ORCHESTRATION.md` status as work completes

---

**Note:** If orchestration halts, it will surface the error. You can then:

- Fix the issue manually
- Update `.env` with missing values
- Resume orchestration (restart from the failed layer)

---

**Last updated:** 2026-04-10
