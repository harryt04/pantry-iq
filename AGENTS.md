# AGENTS.md – PantryIQ Landing Page

**This file is a landing page repository only.** The main product is in `pantry-iq-app` (not here). This repo contains the marketing landing page deployed to `pantryiq.com`.

---

## Quick Reference

| Task             | Command                                    |
| ---------------- | ------------------------------------------ |
| **Install deps** | `npm install`                              |
| **Dev server**   | `npm run dev` (http://localhost:3000)      |
| **Build**        | `npm build`                                |
| **Lint**         | `npm run lint`                             |
| **Format**       | `npm run prettify`                         |
| **Type check**   | Built into build/dev (no separate command) |

---

## Project Structure

- **`app/`** – Next.js 16 App Router (SSR)
- **`components/landing-page.tsx`** – Main landing page React component (18KB)
- **`app/api/subscribe/route.ts`** – Waitlist signup endpoint; forwards to `https://harryt.dev/api/user`
- **`providers/posthogProvider.tsx`** – PostHog analytics wrapper (client-side, production-only)
- **`lib/posthog-server.ts`** – PostHog server client singleton
- **`instrumentation-client.ts`** – PostHog initialization (client-side via Next.js instrumentation)
- **`public/favicon/`** and **`public/favicon-light/`** – Adaptive favicons for dark/light modes

---

## Stack & Configuration

- **Next.js 16** with App Router (SSR only, no static export)
- **TypeScript 5** strict mode
- **Tailwind CSS v4** (postcss-based, not JIT)
- **shadcn/ui** components (New York style)
- **PostHog** analytics (reverse-proxied via `/ph` rewrite in `next.config.ts`)
- **Node.js 20+** required (per package.json engines)

### Next.js Config Quirks

- **`skipTrailingSlashRedirect: true`** – Required for PostHog trailing slash API requests (do not remove)
- **Favicon rewrites** → `/favicon.ico` and `/favicon-*.png` map to `/favicon/` subdir
- **PostHog rewrites** – `/ph/*` and `/ingest/*` proxy to `https://us.i.posthog.com/`; used for reverse-proxy analytics

### PostHog Integration

- **Client-side initialization:** `instrumentation-client.ts` only in production
- **PostHog Provider disabled in dev:** Wrapped component in `providers/posthogProvider.tsx` checks `NODE_ENV === 'production'`
- **Server-side:** Uses `getPostHogClient()` from `lib/posthog-server.ts` (singleton pattern)
- **API key:** `NEXT_PUBLIC_POSTHOG_KEY` (public, sent to client) and `NEXT_PUBLIC_POSTHOG_HOST` required in `.env`
- **Events tracked:** waitlist-form-focused, waitlist-form-submitted, waitlist-form-error, early-access-link-clicked, feature-card-viewed, pricing-card-viewed, launch-signup

---

## Development

### Environment

Copy `.env.sample` to `.env`:

```bash
NEXT_PUBLIC_POSTHOG_KEY=phc_...
NEXT_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com
```

Both keys must be set or PostHog provider throws during build.

### Editing the Landing Page

- Main JSX: `components/landing-page.tsx`
- Styling: inline Tailwind classes (no separate CSS files; PostCSS v4 included)
- UI components: `components/ui/` (card, button, etc. from shadcn)
- Dark mode: automatic via system preference; see `app/layout.tsx` for favicon strategy

### Common Edits

| Task                   | Location                                                                                            |
| ---------------------- | --------------------------------------------------------------------------------------------------- |
| Change messaging       | `components/landing-page.tsx` (main JSX)                                                            |
| Add new section        | Add to landing-page component, wrap with Tailwind + PostHog capture (if tracking needed)            |
| Update pricing table   | `components/landing-page.tsx` (hardcoded JSX)                                                       |
| Add new event tracking | Wrap UI with `posthog.capture()` call in landing-page component; declare event in PostHog dashboard |
| Change favicon         | Replace files in `public/favicon/` and `public/favicon-light/`                                      |

---

## Build & Deployment

- **Build artifact:** `.next/` (Next.js standalone output)
- **Build command:** `npm run build` (runs type check, linting happens separately)
- **Linting:** `npm run lint` (ESLint config from `eslint-config-next`)
- **Formatting:** `npm run prettify` (Prettier with Tailwind plugin for class sorting)

### Next.js Command Order

1. `npm run lint` (ESLint checks)
2. `npm run build` (TypeScript + Next.js build; fails if type errors)
3. `npm run dev` or `npm start` (local dev/preview)

No separate type-checking command; TypeScript is checked during build.

### Deployment Notes

- Landing page deployed to Coolify (home-hosted infrastructure)
- GitHub webhook triggers auto-deploy: pull latest code → `docker build` → `docker-compose restart`
- See main `pantry-iq-app` repo for Coolify/Docker setup details
- **This repo is marketing only; auth/dashboard are in `pantry-iq-app`**

---

## Important Constraints

### Do Not

- **Do not** modify `next.config.ts` rewrites unless updating PostHog or favicon paths (rewrites are critical for analytics and SSL)
- **Do not** remove `skipTrailingSlashRedirect: true` (breaks PostHog API)
- **Do not** change `instrumentation-client.ts` initialization without understanding Next.js 16+ instrumentation behavior
- **Do not** commit `.env` (secrets); use `.env.sample` for documentation

### Data Flow (Reference)

1. User fills waitlist form on landing page
2. Client-side captures `waitlist-form-submitted` event (PostHog)
3. Form submits to `POST /api/subscribe`
4. Server captures `launch-signup` event (PostHog)
5. Server forwards email to `https://harryt.dev/api/user` (external API; ignore failures per code comment)

### Typography & Branding

- Font: Geist (Google Fonts, loaded in `app/layout.tsx`)
- Dark mode: Automatic based on system preference; favicons switch via `media="(prefers-color-scheme: dark)"` meta tags
- Tailwind: v4 PostCSS (not JIT); all utilities available

---

## Spec References

For context on product scope and pricing:

- **Compaction (context summary):** `.agents/spec/compaction.md`
- **PRD (full spec):** `.agents/spec/PRD-v4.md`
- **Cost analysis:** `.agents/spec/cost-analysis.md`
- **Product outline:** `.agents/spec/PantryIQ Outline.md`

This landing page repo is separate from the main app repo (`pantry-iq-app`). Eventually may be consolidated into one monolith, but currently deployed independently.

---

## PostHog Agent Skill

See `.claude/skills/posthog-integration-nextjs-app-router/` for specialized instructions on PostHog integration patterns in Next.js App Router. Useful for extending analytics or troubleshooting instrumentation issues.
