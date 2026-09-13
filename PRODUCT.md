# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Primary users are students who log in to take assigned and self-started tests, read theory, and review their own history and stats.

Other confirmed audiences:

- Teachers who build tests, manage groups, assign work with deadlines, generate theory, and review student results.
- Admins who manage users, the task bank, and theory across the whole platform.

The product UI is in Russian. Role is decided at login and each role lands in its own dashboard (`/student`, `/teacher`, `/admin`).

## Product Purpose

EDU.CORE is a web testing platform for creating, assigning, taking, and analyzing educational tests. Success means a student can sit a test (including math-heavy items), get a scored result with explanations, and a teacher can assemble, assign, and inspect that work without leaving the app.

## Positioning

The product is not a generic LMS. Its distinct mechanism is an exam-oriented workflow: a task bank plus constructor, AI generation of tests and theory, assigned attempts with deadlines, and per-topic / per-difficulty analytics after the attempt — including KaTeX math, GeoGebra embeds, and image upload.

## Operating Context

Typical session: sign in → role dashboard → either take/retake a test or build/assign one → inspect a result.

Confirmed workflows:

- Student: tests, theory by topic/section, attempt history, profile; statistics lives on `/student/stats`.
- Teacher: calendar, task bank, test constructor, students, tests list, groups, theory generator, assign-to-group with deadline, result review.
- Admin: users, task bank, theory, result inspection.
- Auth: login, register, password reset. Unauthenticated visitors are sent to login. Authenticated users hitting `/` are routed by role.

Local development serves the SPA at `http://localhost:5173` (`npm run dev`) against `http://localhost:8000`. Production frontend is Vercel; the default API is a Railway backend unless `VITE_API_URL` overrides it.

## Capabilities and Constraints

Confirmed:

- Roles: `student`, `teacher`, `admin`, with route guards.
- Tests: class/subject/exam filters, AI-generated tests from a text prompt, retakes, assignments.
- Theory: topics and sections; teacher/admin can generate and bank materials.
- Results: per-task review, difficulty stats, question map, hints and solutions.
- Content: Markdown, KaTeX, GeoGebra, images (R2 storage).
- UI chrome: light/dark theme, sticky navbar branded **EDU.CORE**.
- Architecture: Feature-Sliced Design; React 19, Vite 8, React Router v7, Axios, Lucide, FullCalendar, Tailwind CSS (Vite plugin).
- Document language: `html lang="ru"`; page title «Платформа тестирования».

Undecided / not in the repo:

- Exact school vs university vs tutoring market, pricing, and legal entity.
- A named accessibility standard (WCAG level) — none is recorded.
- Public marketing site: there is no marketing landing; `/` is an auth redirect.

## Brand Commitments

- Product name in the chrome: **EDU.CORE**.
- Voice in shipped UI: Russian, short, instructional (e.g. «Вход», «Войдите в аккаунт», role labels «Студент» / «Учитель» / «Администратор»).
- Do not replace this name or switch the product language unless asked.

## Evidence on Hand

- App shell and routes: `src/app/routes/index.jsx`, `src/widgets/Navbar/index.jsx`
- Student/teacher/admin dashboards under `src/pages/`
- Shared UI kit: `src/shared/ui/` (Button, Card, Modal, Badge, charts, Markdown/math)
- README describes FSD layout, roles, and deploy
- No testimonials, customer logos, or case-study assets exist. Do not invent them.

## Product Principles

- Role-first: every screen belongs to one job (take a test, build a test, administer users).
- Keep the attempt honest and inspectable: score, mistakes, hints, and solutions stay attached to the result.
- Support real exam content: math, diagrams, and theory are first-class, not extras.
- Stay in Russian unless the user asks to localize.
- Prefer operable dashboards over marketing spectacle; this is an Operate product.

## Accessibility & Inclusion

No product-specific accessibility standard was recorded. Future UI work should still keep forms labeled, contrast readable in both themes, and test-taking usable on laptop and phone, but a formal WCAG target is open.
