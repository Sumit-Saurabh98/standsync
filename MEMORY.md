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
methods (keep ≥1).

**Phase 0 essentially complete:** NestJS scaffold; `User` model + initial
migration; `PrismaModule`/`PrismaService`; `@nestjs/config` + Joi boot validation;
global `AllExceptionsFilter` (error envelope + x-request-id); Pino structured
logging; Swagger at `/api/docs`; `/health` DB check; Redis + BullMQ via
`QueueRootModule`; split API (`main.ts`) / worker (`worker.ts`) entrypoints proven
with a throwaway `/demo` route + `DemoProcessor` (delete in Phase 4).
Remaining Phase 0: `.env.example`, optional git init + CI.

**Full-stack decision:** Next.js frontend (`apps/web`) + NestJS (`apps/api`) in a
**monorepo**, built as **vertical slices** (finish a module's backend → build its
frontend → integrate → test live → next module). Browser session = httpOnly
refresh cookie + in-memory access token (ADR-015). See `docs/frontend_architecture.md`.
Monorepo restructure (`src` → `apps/api` + scaffold `apps/web`) happens when we
pivot to the auth frontend, not before.

**Now in Phase 1 (auth backend)**, still in current `src/`. DONE: register
(bcrypt, 409 dup); login (access JWT + refresh as httpOnly cookie, 200); JWT
strategy + `JwtAuthGuard` + `@CurrentUser` + `GET /auth/me`; `/auth/refresh`
rotation + reuse detection (familyId, sha256 tokenHash unique, jti nonce);
logout (revokes family + clears cookie). Refresh tokens: JWT signed w/ REFRESH
secret, payload {sub,familyId,jti}, row stored per token, revoked+replacedBy on
rotate. Prisma 7 driver-adapter setup (client in src/generated/prisma).
Mailer DONE: `MailService` (nodemailer `service:'gmail'`, console fallback if no
creds). Env names: **GMAIL_USER / GMAIL_APP_PASSWORD** (not SMTP_*), MAIL_FROM
optional (defaults to GMAIL_USER). Gmail SMTP for dev AND prod for now (user's
choice); swappable to SES/Postmark via env. Duration strings ('24h','1h') parsed
by a local `durationToMs` helper in AuthService (not `ms` lib).
Email verification DONE + tested live via real Gmail: register sends email,
`POST /auth/verify-email` (single-use, atomic $transaction sets isEmailVerified),
`POST /auth/verify-email/resend` (204, enumeration-safe). Test user:
sumitsaurabh112+standsync1@gmail.com (Gmail +alias trick for fresh signups).
Password reset DONE + tested live: `POST /auth/forgot-password` (204,
enumeration-safe, only for password accounts), `POST /auth/reset-password`
(single-use token, atomic $transaction sets new hash + marks used + **revokes ALL
refresh tokens**). Verified: old session dies, old pw fails, new pw works, token
reuse → 400 PASSWORD_RESET_INVALID.
Social login (Google + GitHub) DONE + tested live via browser: Passport
strategies (`google`/`github`), `GET /auth/{google,github}` + `/callback`,
`handleOAuthLogin` (existing AuthAccount→login; email-exists-other-provider→409
OAUTH_EMAIL_EXISTS_OTHER_PROVIDER, NO silent merge; new→create verified user +
AuthAccount). Callback sets refresh cookie + redirects to
`OAUTH_SUCCESS_REDIRECT/oauth/callback#accessToken=...`. Verified: Google creates
verified/no-password/avatar user, re-login idempotent, GitHub same-email → 409.
OAuthProfile type in `src/modules/auth/oauth-profile.type.ts`.

KNOWN GAP (deferred, do during frontend integration): **OAuth `state` CSRF
protection** not yet implemented (passport `state:true` needs session or signed
state). Also NOT built yet: account linking/unlinking endpoints
(`POST /auth/:provider/link`, `DELETE /auth/accounts/:id`, `GET /auth/accounts`).

Remaining Phase 1 backend: **rate limiting on /auth/\*** (Redis-backed throttler)
+ **CORS for web origin** → then account linking + OAuth state (with frontend).
Then monorepo restructure + auth frontend.

Email verification (ADR-016): password signups get a verify email (can log in
meanwhile, isEmailVerified=false until verified); social logins auto-verified.
`EmailVerification` table to be added to Prisma when we build that step.
