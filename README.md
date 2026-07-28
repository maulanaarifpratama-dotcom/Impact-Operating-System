# Impactory

**NGO Growth Operating System** — an AI platform helping Indonesian NGOs design programs, build budgets, track progress, and quantify social impact.

🔗 **Live:** [impactory.id](https://impactory.id) · 🏆 Google Cloud Gen AI Academy APAC Edition — Cohort 2

Impactory helps grassroots civil society organizations (CSOs) in Indonesia turn a simple program idea into a donor-ready proposal and a structured, operational program — from Logical Framework Approach (LFA), Work Breakdown Structure (WBS), and SBM 2026/INKINDO-referenced budgeting, to MEAL, SROI, and impact reporting — in one integrated workflow (the G.R.O.W.T.H. System).

Built 100% through agentic vibe coding on **Google Antigravity** with **Gemini** as the coding agent, verified visually via Chrome MCP before every commit.

> 🇮🇩 [Baca dalam Bahasa Indonesia](#impactory-bahasa-indonesia)

---

## For reviewers and judges

A demo account with a complete, pre-loaded program is available on request — no setup, nothing to build from scratch.

**→ [docs/HACKATHON_JUDGE_ACCESS.md](docs/HACKATHON_JUDGE_ACCESS.md)**

Credentials are deliberately **not** in this repository. It is public, and Git history keeps a password long after the file holding it is deleted. They are provisioned by [`scripts/seed-judge-demo.mjs`](scripts/seed-judge-demo.mjs), which reads them from a gitignored file and prints a paste-ready handoff block for the submission form.

Three things worth knowing before you sign in:

- Choose the **Password** tab on the login page. The default is a passwordless magic link, which mails an inbox you do not control.
- Sidebar module names are **English**, so navigation needs no help. Action buttons inside a page are Indonesian; the handoff block lists the six you actually need to click.
- Program content is **Indonesian by design**, not for want of translation. Impactory serves Indonesian CSOs and the logframe wording is tuned to how local donors read it.

## What it actually does

One chain, each step derived from the one before it rather than re-entered by hand:

| Step | Module | Output |
| ---- | ------ | ------ |
| 1 | **Grant Writer** | AI-drafted proposal + canonical logframe matrix, graded against a methodology quality gate |
| 2 | **LFA Builder** | Goal, purpose, outcomes, outputs with indicators, baselines, targets, means of verification |
| 3 | **WBS** | Tiered work breakdown with dependencies, durations, and critical-path candidates |
| 4 | **Budget** | Cost lines linked to tasks, priced against Indonesia's government **SBM 2026** and INKINDO standards |
| 5 | **MEAL** | Indicators with baseline, target, collection frequency, data source, disaggregation |
| 6 | **SROI** | Stakeholder models and financial proxies — see the note below |

Materialization runs as a single transactional Postgres RPC (`materialize_grantwriter_document`), so the chain either lands whole or not at all.

**On SROI.** The design-stage chain deliberately stops at MEAL. Computing an SROI ratio requires field data that does not exist before a program runs, so the product surfaces the model and the inputs it still needs rather than a number. A ratio displayed here would be fabricated, and inviting a donor to act on a fabricated one is the failure mode this is built to avoid.

## Architecture

```
Browser (React SPA + prerendered public routes)
   │
   ├── Supabase Auth ......... Google OAuth · magic link · password
   ├── PostgreSQL ........... 33 migrations, RLS on every tenant table
   └── 22 Edge Functions .... AI drafting, RAG, exports, integrations
            │
            └── Azure OpenAI ... retrieval-augmented drafting & suggestions
```

### The canonical ontology

Program logic is not free-form prose. It resolves against a versioned ontology in [`ontology/`](ontology/), transcribed verbatim from the methodology corpus under a `CANONICAL_VERBATIM` epistemic policy:

| Entity | Count |
| ------ | ----- |
| Sectors | 30 |
| Problem families | 29 |
| Outcome families | 26 |
| Actors | 35 |
| Archetypes | 14 |

The YAML compiles to a typed registry at [`generated/registry.generated.ts`](generated/registry.generated.ts). Authority rules are recorded in [ADR-0001](docs/adr/ADR-0001-canonical-ontology-authority.md); the scoring contract that consumes it is [documented separately](docs/impactory_deterministic_scoring_contract_v1.md).

This is what makes the drafting deterministic rather than improvisational: the model selects from a fixed, auditable vocabulary instead of inventing sector and outcome labels per request.

## Tech Stack

| Layer | Technology |
| ---------- | --------------------------------------- |
| Framework | React 18.3 + TypeScript 5.8 |
| Build | Vite 5.4 (SWC) |
| Styling | Tailwind CSS 3.4 + shadcn/ui |
| Routing | React Router DOM 6.30 |
| Backend | Supabase (PostgreSQL + 22 Edge Functions) |
| AI | Azure OpenAI (RAG, drafting) |
| Auth | Supabase Auth — Google OAuth, magic link, password |
| State | TanStack React Query 5 |
| Forms | React Hook Form + Zod |
| Charts | Recharts |
| Testing | Vitest 3 (unit) + Playwright 1.60 (E2E) |
| Deployment | Vercel |

## Getting Started

```bash
# Install dependencies
npm install

# Copy environment variables, then fill in your Supabase project values
cp .env.example .env.local

# Run dev server (http://localhost:8080)
npm run dev
```

Only two variables are needed to boot: `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`. The anon key is public by design — it ships in every browser bundle, which is precisely why row-level security, not secrecy, is what protects tenant data.

The E2E suite reads `.env` (not `.env.local`) plus a separate `.env.e2e`; see [`.env.e2e.example`](.env.e2e.example).

## Scripts

| Command | Description |
| ------------------- | --------------------- |
| `npm run dev` | Dev server (Vite) |
| `npm run build` | Production build + prerender of public routes |
| `npm run lint` | ESLint check |
| `npm run test` | Vitest unit tests |
| `npm run test:e2e` | Playwright E2E tests |
| `npm run typecheck` | TypeScript check |

## Structure

```
src/
├── components/     # UI components (landing, dashboard, shared, ui)
├── pages/          # Page components per route
├── hooks/          # Custom React hooks
├── lib/            # Utilities, types, deterministic engines
├── data/           # Static data & translations
├── integrations/   # Supabase client & generated DB types
├── providers/      # Auth provider
└── test/           # Unit tests

ontology/           # Canonical YAML ontology (source of truth)
generated/          # Typed registry compiled from ontology/
supabase/
├── migrations/     # 33 schema migrations — the schema source of truth
├── functions/      # 22 Deno edge functions
└── snippets/       # Read-only SQL for auditing live RLS state
db/                 # Historical archive, superseded — see db/README.md
docs/               # ADRs, audits, methodology corpus, setup guides
tests/e2e/          # 11 Playwright specs
scripts/            # Build, prerender, ontology generation, demo seeding
```

## Testing and known state

11 Playwright E2E specs and 31 Vitest files. Tenant isolation is asserted against the REST API with a real user token rather than through the UI, because [the UI is not the boundary](tests/e2e/tenant-isolation.spec.ts) — anyone can open devtools and call the same endpoints. What holds the line is RLS.

Being straight about the current state, since you may run these yourself: `main` carries **61 pre-existing `tsc` errors and 38 failing unit tests** (415 pass). `npm run build` passes — Vite does not typecheck, so a green build proves nothing about types. These are tracked, concentrated in the Grant Writer canonical-payload area, and none of them block the demo chain above.

## Security posture

- **Tenant isolation by RLS**, regression-tested per hole closed in the [July 2026 security remediation](docs/audit/2026-07-26-security-remediation.md).
- **No secrets in the repository.** Only `.env*.example` files are tracked; every service-role key is read from the environment at runtime.
- **Seven security headers** set at the edge in [`vercel.json`](vercel.json): HSTS, CSP, `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`, COOP.
- **No platform super-admin.** Authority is scoped to an organization, which is why reviewer access can be granted as ownership of one demo org without exposing any other tenant.

## The G.R.O.W.T.H. System

Six operational dimensions for NGOs: **G**rant & Resource Access · **R**eadiness & Baseline · **O**perating Program · **W**ork Evidence & Proof · **T**racking & Monitoring · **H**igh-Impact Reporting.

## Submission

🏆 **Google Cloud Gen AI Academy APAC Edition — Cohort 2**
Ranked **68 of 101 finalists**, shortlisted from **1,500+ participants**.

---
---

# Impactory (Bahasa Indonesia)

**NGO Growth Operating System** — Platform AI untuk NGO Indonesia merancang program, menyusun anggaran, memantau capaian, dan menghitung nilai dampak sosial.

🔗 **Live:** [impactory.id](https://impactory.id) · 🏆 Google Cloud Gen AI Academy APAC Edition — Cohort 2

Impactory membantu organisasi masyarakat sipil (CSO) grassroot di Indonesia mengubah ide program sederhana menjadi proposal donor-ready dan program operasional terstruktur — dari Logical Framework Approach (LFA), Work Breakdown Structure (WBS), anggaran berbasis SBM 2026/INKINDO, MEAL, hingga SROI dan pelaporan dampak — dalam satu alur kerja terintegrasi (G.R.O.W.T.H. System).

Dibangun 100% melalui agentic vibe coding di **Google Antigravity** dengan **Gemini** sebagai coding agent, dengan verifikasi visual via Chrome MCP sebelum setiap commit.

> Tabel teknis (Tech Stack, Scripts, Structure) tidak diduplikasi di bawah ini — isinya nama produk dan perintah yang tidak berubah antarbahasa. Lihat [Tech Stack](#tech-stack), [Scripts](#scripts), dan [Structure](#structure) di atas.

## Untuk juri dan reviewer

Akun demo berisi satu program lengkap tersedia atas permintaan — tanpa setup, tidak ada yang perlu dibangun dari nol.

**→ [docs/HACKATHON_JUDGE_ACCESS.md](docs/HACKATHON_JUDGE_ACCESS.md)**

Kredensial **sengaja tidak** ada di repositori ini. Repo ini publik, dan riwayat Git menyimpan password lama setelah berkasnya dihapus. Kredensial disiapkan oleh [`scripts/seed-judge-demo.mjs`](scripts/seed-judge-demo.mjs), yang membacanya dari berkas gitignored dan mencetak blok siap-tempel untuk formulir submission.

## Apa yang sebenarnya dikerjakan

Satu rantai, setiap langkah diturunkan dari langkah sebelumnya, bukan diisi ulang manual:

| Langkah | Modul | Keluaran |
| ---- | ------ | ------ |
| 1 | **Grant Writer** | Draf proposal AI + matriks logframe kanonis, dinilai lewat quality gate metodologi |
| 2 | **LFA Builder** | Goal, purpose, outcomes, outputs beserta indikator, baseline, target, alat verifikasi |
| 3 | **WBS** | Struktur kerja bertingkat dengan dependensi, durasi, dan kandidat jalur kritis |
| 4 | **Budget** | Item biaya tertaut ke tugas, mengacu **SBM 2026** pemerintah dan standar INKINDO |
| 5 | **MEAL** | Indikator dengan baseline, target, frekuensi, sumber data, disagregasi |
| 6 | **SROI** | Model stakeholder dan proxy finansial — lihat catatan di bawah |

Materialisasi berjalan sebagai satu RPC Postgres transaksional (`materialize_grantwriter_document`), jadi rantainya terbentuk utuh atau tidak sama sekali.

**Tentang SROI.** Rantai tahap desain sengaja berhenti di MEAL. Menghitung rasio SROI butuh data lapangan yang belum ada sebelum program berjalan, sehingga produk ini menampilkan modelnya dan input yang masih dibutuhkan — bukan angkanya. Rasio yang ditampilkan di titik ini akan menjadi angka karangan, dan mengajak donor mengambil keputusan atas angka karangan justru kegagalan yang ingin dicegah platform ini.

## Ontologi kanonis

Logika program bukan prosa bebas. Semuanya diresolusi terhadap ontologi berversi di [`ontology/`](ontology/), ditranskripsi verbatim dari korpus metodologi di bawah kebijakan epistemik `CANONICAL_VERBATIM`: **30 sektor, 29 problem family, 26 outcome family, 35 aktor, 14 arketipe**.

YAML tersebut dikompilasi menjadi registry bertipe di [`generated/registry.generated.ts`](generated/registry.generated.ts). Aturan otoritasnya tercatat di [ADR-0001](docs/adr/ADR-0001-canonical-ontology-authority.md).

Inilah yang membuat drafting bersifat deterministik, bukan improvisatif: model memilih dari kosakata tetap yang bisa diaudit, alih-alih mengarang label sektor dan outcome tiap permintaan.

## Memulai

```bash
npm install
cp .env.example .env.local   # isi nilai proyek Supabase Anda
npm run dev                  # http://localhost:8080
```

Hanya dua variabel dibutuhkan untuk boot: `VITE_SUPABASE_URL` dan `VITE_SUPABASE_ANON_KEY`. Anon key memang publik — ia ikut terkirim di setiap bundle browser, dan justru karena itu yang melindungi data tenant adalah row-level security, bukan kerahasiaan kunci.

## Pengujian dan kondisi saat ini

11 spesifikasi E2E Playwright dan 31 berkas Vitest. Isolasi tenant diuji langsung terhadap REST API dengan token pengguna nyata, bukan lewat UI, karena [UI bukan batas keamanannya](tests/e2e/tenant-isolation.spec.ts) — siapa pun bisa membuka devtools dan memanggil endpoint yang sama. Yang menahan garis itu adalah RLS.

Terus terang soal kondisi sekarang, karena Anda mungkin menjalankannya sendiri: `main` membawa **61 error `tsc` dan 38 unit test gagal** yang sudah ada sebelumnya (415 lolos). `npm run build` lolos — Vite tidak melakukan typecheck, jadi build hijau tidak membuktikan apa pun soal tipe. Semuanya terlacak, terkonsentrasi di area canonical payload Grant Writer, dan tidak ada yang memblokir rantai demo di atas.

## Postur keamanan

- **Isolasi tenant lewat RLS**, diuji regresi per lubang yang ditutup pada [remediasi keamanan Juli 2026](docs/audit/2026-07-26-security-remediation.md).
- **Tidak ada secret di repositori.** Hanya berkas `.env*.example` yang ter-track; setiap service-role key dibaca dari environment saat runtime.
- **Tujuh security header** dipasang di edge lewat [`vercel.json`](vercel.json): HSTS, CSP, `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`, COOP.
- **Tidak ada super-admin platform.** Otoritas terikat pada organisasi, dan itulah sebabnya akses reviewer bisa diberikan sebagai kepemilikan satu organisasi demo tanpa membuka tenant lain.

## G.R.O.W.T.H. System

Enam dimensi operasional NGO: **G**rant & Resource Access · **R**eadiness & Baseline · **O**perating Program · **W**ork Evidence & Proof · **T**racking & Monitoring · **H**igh-Impact Reporting.

## Submission

🏆 **Google Cloud Gen AI Academy APAC Edition — Cohort 2**
Ranked **68 of 101 finalists**, shortlisted from **1,500+ participants**.
