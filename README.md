# StandSync

**Automated daily standups for engineering teams.**

Instead of chasing updates across Slack and Discord, team members submit their
standup once. At a scheduled time each working day, StandSync compiles every
submission into a single report, flags who's missing, and delivers it to your
team's channel via webhook — with reminders, history, weekly reports, and
analytics on top.

> Status: **early development** — this README tracks the project as it's built.

---

## Why

Engineering managers lose time collecting standups manually, with no central
history, no reminders, and no visibility into participation. StandSync automates
the whole loop. See [docs/overview.md](docs/overview.md) and
[docs/target_audience.md](docs/target_audience.md).

## Features

- Multi-team support with role-based access (Owner / Admin / Member)
- Standup submission — one per day, editable before deadline, late-submission aware
- Automated daily digest compiled and sent to Slack / Discord / Teams / generic webhook
- Reminder system for non-submitters (before and after deadline)
- Standup history, search, and filtering
- Weekly reports, analytics dashboard data, and CSV/Excel/PDF export
- Reliable, idempotent background processing (no duplicate standups or digests)

Full list: [docs/functional_requirement.md](docs/functional_requirement.md).

## Tech Stack

| Area      | Choice                                   |
| --------- | ---------------------------------------- |
| Runtime   | Node.js + TypeScript                     |
| Framework | NestJS                                   |
| Database  | PostgreSQL + Prisma                       |
| Queue     | Redis + BullMQ (jobs & scheduling)       |
| Auth      | JWT (access + rotating refresh), bcrypt  |
| Docs      | Swagger / OpenAPI                         |
| Deploy    | Docker, Docker Compose, Nginx, AWS       |
| CI/CD     | GitHub Actions                           |

Details: [docs/tech_stack.md](docs/tech_stack.md).

## Architecture at a Glance

Modular monolith: one NestJS codebase, two entrypoints — an **API** process and a
**worker** process (BullMQ) — that scale independently. All slow or failure-prone
work (digests, reminders, webhooks, exports) runs on the queue, never in the
request path. Deep dive: [docs/architecture.md](docs/architecture.md).

```
API (HTTP)  ──▶  Services  ──▶  PostgreSQL
                    │
                    ├─▶ Redis (BullMQ) ──▶ Worker ──▶ Slack/Discord/Teams/Webhook
```

## Getting Started

> These steps describe the intended developer setup; commands land as the
> corresponding phases in the [roadmap](docs/roadmap.md) are implemented.

### Prerequisites

- Node.js (LTS), Docker + Docker Compose

### Setup

```bash
# 1. Install dependencies (each app manages its own — not a single workspace install)
cd apps/api && npm install && cd ../web && npm install && cd ../..

# 2. Configure environment
cp apps/api/.env.example apps/api/.env    # then edit values

# 3. Start infrastructure (PostgreSQL + Redis)
docker compose up -d postgres redis

# 4. Apply database schema
cd apps/api && npx prisma migrate dev && cd ../..

# 5. Run all THREE processes (each in its own terminal)
npm run api          # API        → http://localhost:3000
npm run api:worker   # background worker
npm run web           # web (Next.js) → http://localhost:3001
```

> ⚠️ **The worker is not optional.** Since transactional email is sent
> asynchronously via a BullMQ queue (ADR-017), registration/verification/password-
> reset emails are only *enqueued* by the API — nothing sends them until
> `npm run api:worker` is also running. If signup or password-reset emails "aren't
> arriving," check the worker is up before debugging anything else.

API docs (Swagger) will be available at `http://localhost:3000/api/docs`.

Configuration reference: [docs/environment_variables.md](docs/environment_variables.md).

## Documentation

| Doc | What's inside |
| --- | ------------- |
| [overview.md](docs/overview.md) | Problem, solution, goals |
| [target_audience.md](docs/target_audience.md) | Who it's for |
| [functional_requirement.md](docs/functional_requirement.md) | What it must do |
| [non-functional_requirement.md](docs/non-functional_requirement.md) | Performance, security, reliability targets |
| [tech_stack.md](docs/tech_stack.md) | Technology choices |
| [architecture.md](docs/architecture.md) | System design, modules, queues, deployment |
| [database_schema.md](docs/database_schema.md) | Data model, tables, constraints |
| [api_specification.md](docs/api_specification.md) | REST endpoints and contracts |
| [error_handling.md](docs/error_handling.md) | Error envelope, codes, retries |
| [folder_structure.md](docs/folder_structure.md) | How the code is organized |
| [frontend_architecture.md](docs/frontend_architecture.md) | Next.js app structure, auth/session flow |
| [user_flow.md](docs/user_flow.md) | End-to-end user and system flows |
| [environment_variables.md](docs/environment_variables.md) | Configuration reference |
| [coding_guidelines.md](docs/coding_guidelines.md) | Conventions and standards |
| [roadmap.md](docs/roadmap.md) | Phased delivery plan |
| [decisions.md](docs/decisions.md) | Architecture Decision Records |

## Project Layout

```
standsync/
├── docs/            # Documentation (start here)
├── apps/
│   ├── api/         # NestJS backend — src/, prisma/, test/ (own package.json)
│   └── web/         # Next.js frontend — src/ (own package.json)
├── docker-compose.yml
└── MEMORY.md        # Working agreement + session handoff notes
```

Each app is self-contained (own `node_modules`) — not an npm workspace. Root
`package.json` just proxies commands: `npm run api`, `npm run api:worker`,
`npm run web`.

See [docs/folder_structure.md](docs/folder_structure.md).

## Contributing

- Conventional Commits (`feat:`, `fix:`, `docs:`, …)
- Small PRs; keep docs updated alongside code
- Lint + unit + e2e must pass in CI

Conventions: [docs/coding_guidelines.md](docs/coding_guidelines.md).

## License

TBD.
