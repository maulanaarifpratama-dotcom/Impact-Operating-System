# Impactory

**NGO Growth Operating System** — Platform SaaS untuk organisasi sosial dan UMKM dampak di Indonesia.

## Tech Stack

| Layer | Teknologi |
|-------|-----------|
| Framework | React 18 + TypeScript |
| Build | Vite 5 (SWC) |
| Styling | Tailwind CSS 3 + shadcn/ui |
| Routing | React Router DOM v6 |
| Backend | Supabase (PostgreSQL + Edge Functions) |
| Auth | Supabase Auth + Azure MSAL |
| State | TanStack React Query v5 |
| Forms | React Hook Form + Zod |
| Deployment | Vercel |

## Memulai

```bash
# Install dependencies
npm install

# Copy environment variables
cp .env.example .env.local

# Jalankan dev server
npm run dev
```

## Scripts

| Perintah | Deskripsi |
|----------|-----------|
| `npm run dev` | Dev server (Vite) |
| `npm run build` | Build production |
| `npm run lint` | ESLint check |
| `npm run test` | Vitest unit test |
| `npm run test:e2e` | Playwright E2E test |
| `npx tsc --noEmit` | TypeScript check |

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
