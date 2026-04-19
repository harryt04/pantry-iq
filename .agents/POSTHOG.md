# PostHog Analytics

Production-only. All events non-blocking (silent fail). No PII ever.

## Key Files

- `lib/analytics-utils.ts` – `captureAnalyticsEvent(name, props)`, `hashLocationId(id)`
- `providers/posthogProvider.tsx` – client-side wrapper (production only)
- `lib/posthog-server.ts` – server singleton
- `instrumentation-client.ts` – Next.js 16 init (production only)

## Reverse Proxy

`/ph/*` and `/ingest/*` → `https://us.i.posthog.com/` (configured in `next.config.ts`). Do not remove `skipTrailingSlashRedirect: true`.

## PII Rules

Never capture: emails, message content, location addresses/zip, API keys, tokens, session IDs. Location IDs must be hashed via `hashLocationId()` (SHA-256, 16 chars).

## Event Catalog

| Event | File | Properties |
|-------|------|------------|
| `user-signed-up` | `components/auth/signup-form.tsx:104` | `{}` |
| `user-logged-in` | `components/auth/login-form.tsx:40` | `{}` |
| `csv-upload-started` | `components/import/csv-upload.tsx:45` | `fileSize`, `fileName` |
| `csv-upload-completed` | `components/import/csv-upload.tsx:68` | `rowCount` |
| `square-connected` | `components/import/square-connect.tsx:36` | `{}` |
| `conversation-started` | `components/chat/conversation-list.tsx:46` | `locationId` (hashed) |
| `first-question-asked` | `components/chat/chat-interface.tsx:73` | `modelId`, `tier` |
| `location-created` | `components/settings/location-form.tsx:77` | `type` |

## Skill

See `.claude/skills/posthog-integration-nextjs-app-router/` for full integration patterns.
