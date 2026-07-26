# Impactory

**NGO Growth Operating System** — an AI platform helping Indonesian NGOs design programs, build budgets, track progress, and quantify social impact.

🔗 **Live:** [impactory.id](https://impactory.id)

Impactory helps grassroots civil society organizations (CSOs) in Indonesia turn a simple program idea into a donor-ready proposal and a structured, operational program — from Logical Framework Approach (LFA), Work Breakdown Structure (WBS), and SBM 2026/INKINDO-referenced budgeting, to MEAL, SROI, and impact reporting — in one integrated workflow (the G.R.O.W.T.H. System).

Built 100% through agentic vibe coding on **Google Antigravity** with **Gemini** as the coding agent, verified visually via Chrome MCP before every commit.

## Tech Stack

| Layer      | Technology                             |
| ---------- | --------------------------------------- |
| Framework  | React 18 + TypeScript                  |
| Build      | Vite 5 (SWC)                           |
| Styling    | Tailwind CSS 3 + shadcn/ui              |
| Routing    | React Router DOM v6                    |
| Backend    | Supabase (PostgreSQL + Edge Functions) |
| AI         | Azure OpenAI (RAG, drafting)            |
| Auth       | Supabase Auth (Google OAuth)            |
| State      | TanStack React Query v5                |
| Forms      | React Hook Form + Zod                  |
| Deployment | Vercel                                  |

## Getting Started

```
# Install dependencies
npm install

# Copy environment variables
cp .env.example .env.local

# Run dev server
npm run dev
```

## Scripts

| Command             | Description          |
| ------------------- | --------------------- |
| `npm run dev`        | Dev server (Vite)     |
| `npm run build`      | Production build      |
| `npm run lint`       | ESLint check           |
| `npm run test`       | Vitest unit tests      |
| `npm run test:e2e`   | Playwright E2E tests   |
| `npm run typecheck`  | TypeScript check       |

## Structure

```
src/
├── components/     # UI components (landing, dashboard, shared, ui)
├── pages/          # Page components per route
├── hooks/          # Custom React hooks
├── lib/            # Utilities, types, AI generators
├── data/           # Static data & translations
├── integrations/   # Supabase client & types
├── providers/      # Auth provider
└── test/           # Unit tests
```

## The G.R.O.W.T.H. System

Six operational dimensions for NGOs: **G**rant & Resource Access · **R**eadiness & Baseline · **O**perating Program · **W**ork Evidence & Proof · **T**racking & Monitoring · **H**igh-Impact Reporting.

## Submission

🏆 Google Cloud Gen AI Academy APAC Edition — Cohort 2 (Top 68/1500+)

---
---

# Impactory (Bahasa Indonesia)

**NGO Growth Operating System** — Platform AI untuk NGO Indonesia merancang program, menyusun anggaran, memantau capaian, dan menghitung nilai dampak sosial.

🔗 **Live:** [impactory.id](https://impactory.id)

Impactory membantu organisasi masyarakat sipil (CSO) grassroot di Indonesia mengubah ide program sederhana menjadi proposal donor-ready dan program operasional terstruktur — dari Logical Framework Approach (LFA), Work Breakdown Structure (WBS), anggaran berbasis SBM 2026/INKINDO, MEAL, hingga SROI dan pelaporan dampak — dalam satu alur kerja terintegrasi (G.R.O.W.T.H. System).

Dibangun 100% melalui agentic vibe coding di **Google Antigravity** dengan **Gemini** sebagai coding agent, dengan verifikasi visual via Chrome MCP sebelum setiap commit.

## Tech Stack

| Layer      | Teknologi                              |
| ---------- | -------------------------------------- |
| Framework  | React 18 + TypeScript                  |
| Build      | Vite 5 (SWC)                           |
| Styling    | Tailwind CSS 3 + shadcn/ui             |
| Routing    | React Router DOM v6                    |
| Backend    | Supabase (PostgreSQL + Edge Functions) |
| AI         | Azure OpenAI (RAG, drafting)           |
| Auth       | Supabase Auth (Google OAuth)           |
| State      | TanStack React Query v5                |
| Forms      | React Hook Form + Zod                  |
| Deployment | Vercel                                 |

## Memulai

```
# Install dependencies
npm install

# Copy environment variables
cp .env.example .env.local

# Jalankan dev server
npm run dev
```

## Scripts

| Perintah           | Deskripsi           |
| ------------------ | ------------------- |
| `npm run dev`      | Dev server (Vite)   |
| `npm run build`    | Build production    |
| `npm run lint`     | ESLint check        |
| `npm run test`     | Vitest unit test    |
| `npm run test:e2e` | Playwright E2E test |
| `npm run typecheck` | TypeScript check    |

## Struktur

```
src/
├── components/     # UI components (landing, dashboard, shared, ui)
├── pages/          # Page components per route
├── hooks/          # Custom React hooks
├── lib/            # Utilities, types, AI generators
├── data/           # Static data & translations
├── integrations/   # Supabase client & types
├── providers/      # Auth provider
└── test/           # Unit tests
```

## G.R.O.W.T.H. System

Enam dimensi operasional NGO: **G**rant & Resource Access · **R**eadiness & Baseline · **O**perating Program · **W**ork Evidence & Proof · **T**racking & Monitoring · **H**igh-Impact Reporting.

## Submission

🏆 Google Cloud Gen AI Academy APAC Edition — Cohort 2 (Top 68/1500+)
