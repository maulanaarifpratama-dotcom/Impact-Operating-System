# Security remediation — 2026-07-26

Covers the audit of impactory.id (live site, codebase, landing UX) and the fixes
applied. Three items still need a human: they cannot be done from the repo.

---

## Action required

### 1. Rotate the Brevo API key — do this first

`NewsletterSection.tsx` read `import.meta.env.VITE_BREVO_API_KEY` and called
`api.brevo.com` from the browser. Vite inlines every `VITE_*` value at build
time, so the key was shipped inside `dist/assets/index-*.js` and served to every
visitor of impactory.id. It was confirmed present in the deployed bundle.

The code is fixed (see below) but **the key itself is compromised** and must be
rotated in the Brevo dashboard. Redeploying without rotating changes nothing —
the old bundle was public for as long as it was live.

After rotating, set the new value as `BREVO_API_KEY` in Supabase edge function
secrets (server-side, no `VITE_` prefix). Then remove `VITE_BREVO_API_KEY` from
`.env` and from Vercel environment variables.

### 2. Verify RLS before applying the hardening migration

`supabase/migrations/20260726010000_harden_org_rls.sql` is **not safe to apply
blind**. The migration that creates the organization tables
(`20260600000000_organizations.sql`) is gitignored as a local bootstrap, so the
repo cannot show what RLS is actually live in production.

Procedure:

1. Run `supabase/snippets/audit_rls_state.sql` (read-only) against production and
   read the results. It flags unconditional policies, tables with RLS off, and
   whether `is_org_member()` is still the `SELECT true` stub.
2. Apply the migration on a Supabase branch or staging copy.
3. Exercise signup → onboarding → invite a teammate → open a grant project.
4. Only then promote to production.

The migration replaces policies *by name*, so a database that is already locked
down correctly is unaffected apart from the helper functions being hardened.

### 3. Flip CSP from report-only to enforcing

`vercel.json` ships `Content-Security-Policy-Report-Only`. It is not enforcing
yet because the Budget and WBS print/export views inject
`https://cdn.tailwindcss.com` and `https://cdn.jsdelivr.net` into pop-up windows
(`BudgetCalculator.tsx:1135,1270,1546`, `WBSBuilder.tsx:1430`), and it is not
confirmed whether those windows inherit the opener's policy.

To enforce: exercise the app — especially budget and WBS export — with the
browser console open, confirm no CSP violations are reported, then rename the
header key to `Content-Security-Policy`. The better long-term fix is to inline
those print styles so the CDN dependency disappears entirely.

---

## Applied in this change

### Critical

**Anon-key authentication bypass** — `supabase/functions/_shared/auth.ts`
accepted the project's anon key (and service-role key) as a substitute for a
user session, returning a service-role client that bypasses RLS. The anon key is
public by design; it ships in every frontend bundle. Five Azure Foundry-backed
endpoints (`budget-sbm-suggest`, `meal-ai-suggest`, `sroi-ai-suggest`,
`wbs-ai-suggest`, `lfa-ai-draft`) called `authenticate()` and discarded the
result, so they were effectively open to the internet. The fallback is removed —
only a real user JWT authenticates.

Note that Supabase's platform-level `verify_jwt = true` does **not** close this:
the anon key *is* a valid project JWT, so the gateway lets it through.

**Leaked Brevo key** — newsletter signup now goes through a new
`newsletter-subscribe` edge function; the key stays server-side. See action 1.

### High

**No rate limiting on AI endpoints** — added `ai_rate_limits` plus an atomic
`consume_ai_rate_limit()` RPC (`20260726000000_ai_rate_limits.sql`) and the
`_shared/rateLimit.ts` helper. Counters live in Postgres because edge functions
run across isolates that share no memory. Budgets: 60/hour/user for per-field
suggestions, 15/hour/user for full generation. Fails open if the counter is
unavailable — authentication is the primary control.

**`foundry-health` was unauthenticated** and spent real Foundry tokens per
request. Now requires a session.

**Arbitrary-organization fallback** — `orgHelper.ts:28` responded to a failed org
creation by selecting *any* organization row and returning its id, which under
permissive RLS would file a user's programs and beneficiary data under someone
else's tenant. It now throws, consistent with every other error path in that
function.

### Medium

Auth and rate-limit errors were being reported as HTTP 500 by the AI functions'
catch blocks; they now surface their real status (401/429).

### Performance

Route-based code splitting in `src/App.tsx` via `React.lazy`. Public marketing
routes stay eager because they are the pre-rendered entry points; everything
behind auth is split. Two dead imports (`GrantWriterWizard`,
`GrantWriterQuickWizard` — imported, never rendered) were removed.

Two `manualChunks` bugs in `vite.config.ts`:

- React was unassigned, so Rollup folded it into the first vendor chunk that
  referenced it (recharts). Every route, landing page included, had to download
  the chart library to boot React. React now has its own chunk.
- Forcing a shared `vendor-charts` chunk made the entry import it for a single
  shared helper. Only the lazy `SROICalculator` uses recharts, so the rule was
  removed and Rollup now bundles it into that route's chunk.

Landing page initial payload: **~3.6 MB → ~1.0 MB** uncompressed. Main entry
chunk: **2019 kB → 210 kB**.

### Headers

`vercel.json` previously had only a rewrite rule. Added HSTS, `X-Frame-Options`,
`X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`,
`Cross-Origin-Opener-Policy`, and the report-only CSP.

---

## Verification

| Check | Result |
| --- | --- |
| `npx tsc --noEmit` | exit 0 |
| `eslint` on changed files | exit 0, no findings |
| `npm run test` | 5 files / 50 tests failed — **identical to the pre-change baseline**, measured by stashing the changes and re-running. No regression. |
| `npm run build` + prerender | succeeds, all 6 public routes pre-rendered |

The 50 pre-existing failures are in `wbs_*_postgres.test.ts` (need a live
Postgres), `deterministic.test.ts`, and `p0e-oracle.test.ts` (grant-writer
scoring fixtures). They are unrelated to this work and were failing before it.

`npm run lint` across the whole repo reports 367 errors, almost all
`no-explicit-any` in tests and pre-existing edge function code. Also pre-existing;
CI does not gate on lint.

---

## Not fixed, worth queuing

- **Prompt injection**: `grant-writer-generate/index.ts:922,959` interpolates raw
  user `wizard_data` into the LLM prompt with no delimiters. RAG lookups are
  correctly scoped by `organization_id`, so this is output manipulation rather
  than cross-tenant leakage.
- **HTML injection into the contact email**: `contact-form/index.ts` interpolates
  submitted fields into an HTML email sent to the team. A phishing vector aimed
  at your own inbox.
- **Accessibility**: the small module badges (10 px, teal on translucent teal)
  measure 3.47:1 contrast — below the WCAG AA 4.5:1 floor for small text.
- **Dead code**: `src/components/ui/chart.tsx` is imported by nothing.
  `@azure/msal-browser` and `@azure/msal-react` are in `package.json` but never
  imported; auth is Supabase-only.
- **God components**: `WBSBuilder.tsx` (3197 lines), `BudgetCalculator.tsx`
  (3013), `MEALPlanner.tsx` (2744), `SROICalculator.tsx` (2632).
- **Stale metadata**: `index.html` still points `og:image` at a
  `lovable.app` R2 URL. The prerenderer overrides it for the six public routes,
  so only non-prerendered paths are affected.
