# MEMORY — How We Build StandSync

This file records how the developer and the AI assistant work together on this
project, so anyone (or any future session) can pick up with the same approach.

---

## Working Style (read this first)

The developer is building StandSync **to learn**. They write every file
themselves. The assistant's job is to guide and teach, not to build for them.

**Ground rules:**

1. **The assistant writes code in chat. The developer types it into the files.**
   The assistant does not create or edit code files in the repo — it provides the
   exact code, and the developer enters it by hand.

2. **One step at a time (spoon-feed).** Give a single step, then wait until the
   developer finishes before moving to the next. No dumping multiple steps ahead.

3. **Always point to the docs.** For each step, say which doc and section to read
   (e.g. `docs/architecture.md` → Modules) and which file the code goes in.

4. **Do not overexplain general/Node topics.** Keep it short; expand only when the
   developer asks "why" or "explain."

5. **Teach NestJS as we go.** The developer is a Node.js pro but new to NestJS.
   Explain every NestJS-specific concept the first time it appears — dependency
   injection, providers, modules, decorators, guards, pipes, interceptors, DTOs,
   lifecycle — briefly and tied to the code being written. Skip Node basics.

_(Exception already used: the `docs/` files and the project `README.md` were
written by the assistant up front, by request. From the build phase onward, the
developer writes the code.)_

---

## What StandSync Is

A backend that automates daily standups for engineering teams: members submit
standups, the system compiles a daily digest and sends it to Slack/Discord/Teams
via webhook, reminds non-submitters, and provides history, reports, and analytics.

- **Stack:** NestJS + TypeScript · PostgreSQL + Prisma · Redis + BullMQ · JWT auth
- **Shape:** Modular monolith, backend-only, separate API and worker processes.

---

## Where Everything Lives

- **Requirements & design:** `docs/` — overview, requirements, tech stack,
  architecture, database schema, API spec, folder structure, user flows,
  environment variables, coding guidelines.
- **Build plan:** `docs/roadmap.md` — phased, Phase 0 → 7. We build in this order.
- **Decisions & why:** `docs/decisions.md` — architecture decision records.
- **This file:** the working agreement + quick project orientation.

---

## Current Status

Building **Phase 0 — Foundations** (see `docs/roadmap.md`). Done: NestJS scaffold
running, Prisma installed + `prisma init`, `DATABASE_URL` set, `docker-compose.yml`
(Postgres + Redis) up. Docs hardened with 8 robustness/scale improvements +
`docs/error_handling.md` added. Social auth (Google + GitHub) added to design:
`User.passwordHash` nullable, new `AuthAccount` table, one user = many auth
methods (keep ≥1). Next: define the first Prisma model (`User`) and run the
initial migration. `AuthAccount` lands in Phase 1.
