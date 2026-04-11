# PantryIQ

PantryIQ uses AI to help restaurants reduce food waste by analyzing transaction data and answering questions about staffing, inventory, menu optimization, and donation opportunities.

## 🎯 Overview

PantryIQ is a bootstrapped SaaS platform that tackles restaurant food waste through an AI-powered conversational interface. Import your POS transaction data via Square OAuth or CSV upload, then ask natural-language questions to optimize staffing, purchasing decisions, menu performance, and discover food donation opportunities with local charities.

**Pricing:** $20/month per restaurant location, $10/month per food truck (7-day free trial)

## 🚀 Architecture

- **Deployment:** Self-hosted monolith on Coolify (home/business server)
- **Frontend:** React with Next.js (App Router, SSR)
- **Backend:** Next.js API routes (no separate services)
- **Database:** PostgreSQL
- **Cache:** Redis
- **Reverse Proxy:** Traefik with Let's Encrypt SSL
- **Runtime:** Node.js 20+, Docker containers

## 💻 Tech Stack

- **Framework:** Next.js 16 (App Router, Server-Side Rendering)
- **Language:** TypeScript 5
- **Styling:** Tailwind CSS v4
- **UI Components:** shadcn/ui (New York style)
- **Icons:** Lucide React
- **Analytics:** PostHog
- **Database:** PostgreSQL (Docker)
- **Cache:** Redis (Docker)

## ✨ Core Features

### Data Import

- **Square POS Integration** - OAuth flow for direct transaction import with incremental syncing
- **CSV Upload** - AI-powered field mapping detection with user confirmation for any restaurant data format

### AI Chatbot

- **Natural Language Queries** - Ask questions about staffing optimization, inventory purchasing, menu performance, and food donations
- **Conversation History** - Persistent chat with ability to revisit prior conversations
- **Model Selection** - Choose from budget-tier (default) and mid-tier models with cost transparency
- **Supported Models** - Budget: Gemini 2.0 Flash Lite, Claude Haiku 3, GPT-5.4 nano | Mid-tier: GPT-5.4 mini, Claude Haiku 4.5, Gemini 2.5 Flash

### Operational Intelligence

- **Weather Integration** - Historical and forecast weather data correlated with transaction patterns to inform staffing and purchasing decisions
- **Donation Discovery** - Local food bank and soup kitchen finder powered by Google Places API with caching
- **Data Validation** - AI determines answerable questions; refuses to hallucinate on insufficient data

### Dashboard & Settings

- **Import Status** - Visual overview of connected POS accounts and uploaded datasets
- **Location Management** - Multiple locations per account with per-location model preferences
- **User Settings** - Account, password, and subscription management

## 📡 API Integrations

| Service               | Purpose                                                                |
| --------------------- | ---------------------------------------------------------------------- |
| **Square API**        | POS transaction data import via OAuth                                  |
| **OpenWeatherMap**    | Historical and forecast weather data (free tier, cached)               |
| **Google Places API** | Local food bank and charity discovery (free tier, cached 30 days)      |
| **LLM Providers**     | OpenAI, Anthropic, Google Vertex AI (user selectable per conversation) |
| **PostHog**           | Product analytics tracking user journey                                |

## 🛠️ Development

### Prerequisites

- Node.js 20+
- Docker & Docker Compose
- PostgreSQL (included in docker-compose)
- Redis (included in docker-compose)

### Local Setup

```bash
docker-compose up
```

Starts:

- Next.js app at `http://localhost:3000`
- PostgreSQL at `localhost:5432`
- Redis at `localhost:6379`

### Project Structure

- `/app` - Next.js pages and API routes
- `/components` - React components (marketing + app UI)
- `/lib` - Utilities and helpers
- `/public` - Static assets

## 📊 Database Schema

**Core tables:**

- `users` - Authentication and account management
- `locations` - Restaurant/food truck locations
- `pos_connections` - OAuth tokens and sync state
- `csv_uploads` - Import history and status
- `transactions` - Normalized POS data
- `weather_data` - Cached weather by location and date
- `places_cache` - Cached food bank/charity data
- `conversations` - Chat sessions per location
- `messages` - Individual chat messages with model and token metadata

## 🚀 Deployment

**Infrastructure Requirements:**

- 2-4 CPU cores
- 4-8 GB RAM
- 50-100 GB storage
- > 99% uptime ISP connection
- Ports 80/443 open (check ISP terms)

**Deployment Flow:**

1. Push to GitHub
2. Coolify webhook triggers auto-deploy
3. `docker build` → `docker compose restart`
4. Zero-downtime deployment with graceful restarts

**Backup Strategy:**

- Daily automated PostgreSQL dumps (gzip compressed)
- 7-day local retention, 30-day off-site storage (S3/Backblaze/NAS)
- Monthly recovery testing

**Monitoring:**

- Uptime Robot alerts on >10 minute downtime
- Home server checklist: static IP/DDNS, firewall rules, SSH key auth, automated backups

## 💰 Pricing & Unit Economics

- **AI Cost (power user, 600 queries/month):** $0.83–$3.33 depending on model
- **Gross Margin at $20/location:** 80–95% (AI + ops + infrastructure << revenue)
- **Cost Guardrail:** AI spend capped at 40% of monthly revenue per location

## 🎓 Out of Scope (MVP)

- Additional POS integrations (Oracle Micros, Ziosk, Sysco)
- Premium AI models (GPT-5.4, Claude Sonnet/Opus)
- Credit-based or tiered pricing
- Multi-user roles/permissions per location
- Donation pickup/logistics coordination
- Mobile apps
- Analytics dashboards with charts

## 🚦 Success Metrics

| Metric                      | Target                                                          |
| --------------------------- | --------------------------------------------------------------- |
| Square import time-to-value | <10 minutes to see transactions                                 |
| CSV import + mapping        | <5 minutes to parse and confirm                                 |
| First useful question       | <15 minutes from signup                                         |
| Chatbot accuracy            | AI declines unanswerable questions (no hallucinations)          |
| Donation discovery          | Surface ≥1 local food bank per location                         |
| Model selection UX          | Per-conversation switching with cost indicators                 |
| Unit economics              | AI cost < $8/month per power-user location (40% of $20 revenue) |

## 🔒 Security

- HTTPS everywhere (Let's Encrypt, auto-renewing)
- Environment-based secrets (no hardcoded credentials)
- SSH key-based authentication only
- OAuth tokens encrypted at rest
- No PII in logs
- Firewall rules: allow 80/443, block SSH brute-force

## 📚 Documentation

- **Product Requirements:** `.agents/spec/PRD-v4.md` (final MVP spec)
- **Architecture Decisions:** `.agents/spec/compaction.md` (design rationale)
- **Pricing Analysis:** `.agents/spec/cost-analysis.md` (model pricing and margins)

## 🤝 Contributing

This is a bootstrapped startup. For questions about architecture or technical decisions, see CTO documentation in `.agents/spec/`.

## 📄 License

All rights reserved © 2026 PantryIQ
