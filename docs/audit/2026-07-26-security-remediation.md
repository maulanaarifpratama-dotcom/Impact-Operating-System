# Security remediation — 2026-07-26

Covers the audit of impactory.id (live site, codebase, landing UX) and the fixes
applied. Three items still need a human: they cannot be done from the repo.

---

## Status: applied and verified — 2026-07-26

All six pending migrations were applied by hand through the SQL editor
(`supabase/snippets/apply_pending_manual.sql`), and
`supabase/snippets/verify_remediation.sql` returns AMAN/ADA on all twelve checks:
the five policy fixes, the three restored feature columns, the rate-limit table
and RPC, and the `schema_migrations` backfill.

The anon-key bypass was additionally verified end-to-end against production. All
six affected endpoints — `meal-ai-suggest`, `wbs-ai-suggest`,
`budget-sbm-suggest`, `lfa-ai-draft`, `sroi-ai-suggest`, `foundry-health` — now
answer **HTTP 401** when called with nothing but the public anon key. Before the
fix they would have answered 400, having passed authentication and failed only on
input validation.

The `LIMIT 1` multi-org policy bug and the CSP flip have since been closed too —
see below. The sections after that are kept as the record of what was wrong and
why.

### CSP is now enforcing

`vercel.json` serves `Content-Security-Policy` rather than the report-only
variant. What had blocked it was the print/export pop-ups: a document opened with
`window.open('')` inherits the opener's policy, and those templates pulled
`cdn.tailwindcss.com` plus carried inline `<script>` blocks and
`onclick="window.print()"` attributes — between them requiring a CDN whitelist,
`'unsafe-eval'` and `'unsafe-inline'`, which is most of what a CSP is for.

None of it was necessary. `src/lib/print/printWindow.ts` now supplies:

- `appStylesheetTags()` — same-origin `<link>` tags copied from the live
  document. Tailwind scans `./src/**/*.{ts,tsx}` and the print markup lives in
  template literals inside those files, so every class it uses is already
  compiled into the app's own stylesheet. Verified by grepping the built CSS for
  classes that appear only in print templates. `.page-break` and `.avoid-break`
  are not Tailwind utilities and were already declared inline.
- `finalizePrintWindow(win, { auto })` — replaces `win.document.close()`,
  attaching click handlers to `[data-print-trigger]` elements and auto-printing
  where the old inline `window.onload` did. The opener drives the pop-up through
  its Window handle, so the pop-up needs no script of its own.

Four CDN references and seven inline-JS sites across `BudgetCalculator`,
`WBSBuilder`, `MEALPlanner`, `SROICalculator` and `SROIStandalone` are gone.

### `npx tsc --noEmit` was checking nothing

Found while verifying the above. Root `tsconfig.json` has `"files": []` and only
project `references`, so the command the README documented resolved to an empty
project and exited 0 no matter what — a plain missing import went undetected.

`npm run typecheck` (`tsc --noEmit -p tsconfig.app.json`) is now the real check,
and the README points at it. It currently reports **441 pre-existing errors**,
mostly `never` inference against the generated Supabase types plus a
`size="xs"` variant the Button component does not declare. None were introduced
here — the count is identical before and after this work. They are left alone
deliberately; that is its own piece of work, not something to bundle into a
security fix.

---

## What was fixed

### 1. Apply the RLS fix migration

`supabase/migrations/20260726020000_fix_rls_cross_tenant_gaps.sql` closes a live
cross-tenant takeover chain. Apply it on a Supabase branch first, exercise
signup → onboarding → invite a teammate → open a grant project, then promote.

Two production policies combined into a complete compromise:

- `organization_invitations.invitations_read_by_token` was `SELECT USING (true)`
  with no role restriction, so anyone holding the public anon key could read
  every pending invitation — email, token, and **organization_id**.
- `organization_members.members_self_insert` was
  `INSERT WITH CHECK (auth.uid() = user_id)`. It verified *who* you are but never
  that you were invited, so any authenticated user could insert themselves into
  any organization whose id they knew.

Chain: read the invitations table → take an `organization_id` → insert yourself
as a member → every `is_org_member()` policy in the database now answers true for
you → read that org's projects, proposals, library documents, donors and
beneficiaries.

Migration `20260725150000` already dropped the first policy but was evidently
never applied to production. Worth checking what else is unapplied:

```sql
select version from supabase_migrations.schema_migrations order by version;
```

Separately, `wbs_completion_claims` and `wbs_completion_evidence` carried
`OR (auth.role() = 'authenticated')` on a `FOR ALL` policy
([20260724180000:138,146](../../supabase/migrations/20260724180000_wbs_completion_claims_evidence.sql)),
which every signed-in user satisfies — making the org check ahead of it dead
code, for writes as well as reads. The migration fixes this too.

### 2. Decide what to do about `system_integrations`

`system_integrations` has `system_integrations_all_policy` —
`ALL USING (true) WITH CHECK (true)`. Read *and write*, for everyone.

It holds the OneDrive integration config; `onedrive-upload/index.ts:72` reads
`drive_id` from it, and `Settings.tsx:153` does `select('*')`. Two concerns:

- Anyone can **overwrite `drive_id`**, redirecting where NGO evidence documents
  are uploaded.
- If the table also stores tokens or secrets, they are world-readable.

The table exists in no repo migration, so it was created through the dashboard.
Check its columns before writing a policy:

```sql
select column_name, data_type from information_schema.columns
where table_schema = 'public' and table_name = 'system_integrations';
```

If it is org-scoped, it should route through `is_org_member()`. If it is a
single global config row, reads can stay open but writes should be admin-only
via `is_admin(auth.uid())`.

### 3. Brevo — no action needed (earlier advice was wrong)

An earlier version of this document said the Brevo key was confirmed present in
the production bundle and had to be rotated. **That was incorrect.** The grep
that "confirmed" it ran against a local `dist/` built from a local `.env` that
contained `VITE_BREVO_API_KEY` — not against the deployed bundle.

`dist/` was never committed, Vercel builds from git plus Vercel's own env vars,
and `VITE_BREVO_API_KEY` was never set there. So `import.meta.env.VITE_BREVO_API_KEY`
resolved to `undefined` in every production build and the key never shipped.

The real consequence was that newsletter signup was **silently broken** in
production — `api-key: undefined` meant Brevo rejected every request. Moving the
call into the `newsletter-subscribe` edge function repairs the feature; it was
not a security fix. No rotation required.

The one scenario that would change this: a manual `vercel --prod` deploy from a
machine holding that `.env`. Deploys via git push are unaffected.

### 4. Flip CSP from report-only to enforcing

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
  stale R2 URL. The prerenderer overrides it for the six public routes,
  so only non-prerendered paths are affected.
- **`LIMIT 1` multi-org bug**: roughly fourteen policies scope rows with
  `org_id = (SELECT organization_id FROM organization_members WHERE user_id = auth.uid() LIMIT 1)`
  — no `ORDER BY`. A user who belongs to two organizations silently loses access
  to everything outside whichever one Postgres returns first. Affects
  `beneficiaries`, `budget_items`, `wbs_tasks`, `impact_readiness_assessments`
  and most `lfa_*` tables. Not a leak — the check is still membership-scoped —
  but it will break real users as soon as the invite feature sees use. The fix
  is `org_id IN (SELECT ...)`, deliberately left out of the security migration
  to keep that one small and reviewable.

## Dependency advisories — triaged 2026-07-26

GitHub reports 35 advisories; `npm audit` resolves them to 16 affected packages
(1 critical, 11 high, 4 moderate). **Two reach the browser. Neither is
exploitable as the app is written.**

Method: check each package against the production dependency tree, then grep the
actual built bundle in `dist/assets/`. Being in the npm "prod tree" is not the
same as shipping — `postcss`, `glob`, `minimatch` and `picomatch` all appear
there but none survive into the bundle.

| Package | Severity | Ships to users? | Assessment |
| --- | --- | --- | --- |
| `vitest` | critical | no | Test runner. The advisory needs `vitest --ui` listening locally. Zero production surface. |
| `vite`, `rollup`, `esbuild`, `postcss` | high/moderate | no | Build-time only. |
| `glob`, `minimatch`, `picomatch`, `brace-expansion` | high | no | Globbing utilities; confirmed absent from the bundle. |
| `flatted`, `js-yaml`, `ajv`, `form-data` | high/moderate | no | ESLint and tooling dependencies. |
| `lodash` | high | **yes**, via recharts | `_.template` code injection needs the app to call `_.template` on untrusted input. The app never imports lodash directly and never calls it; recharts uses only internal keys with `_.omit`/`_.unset`. Not exploitable. |
| `react-router-dom` | moderate | **yes** | See below. |

### react-router-dom

Pinned at 6.30.3; the advisory range is 6.6.3 – 6.30.4 and `npm audit` offers
only `react-router-dom@7.18.1`, a **major** bump. Three advisories apply:

- Open redirect via `//path` reinterpreted as protocol-relative
- Open redirect via backslash in `<Link>`/`useNavigate` (CVE-2025-68470 bypass)
- Arbitrary constructor injection in `deserializeErrors()` during **SSR
  hydration** — not applicable; `main.tsx` uses `createRoot().render()`, and the
  prerenderer renders to a string through a separate entry.

For the redirect pair, the app has exactly one navigation driven by stored data:
`ProtectedRoute.tsx:56` stashes `state: { from: location.pathname }` and
`Login.tsx` navigates there after sign-in. `location.state` cannot be set from a
crafted URL, and a path like `//evil.com` matches no protected route, so it never
reaches `ProtectedRoute`. No `?redirect=` or `?returnTo=` parameter exists
anywhere.

**Decision: do not force the v6 → v7 migration for a non-exploitable advisory.**
Instead `Login.tsx` now runs the stored path through `safeInternalPath()`, which
rejects anything not starting with a single `/`. That closes the class outright
and holds no matter which router version is installed. Revisit v7 as planned
work, not as an incident.

### Accessibility, prompt fencing, dead weight

**Contrast** — thirteen elements across the pre-rendered routes were below the
WCAG AA 4.5:1 floor, all `text-slate-500` on a dark surface: four footer
qualifiers and four social handles (3.63:1), the four struck-through "not
included" features on `/pricing` (3.5:1), the second footer used by the
non-home routes (3.8:1), and a few helper lines. All moved to `text-slate-400`,
already the dominant secondary colour in those components — `· Baseline` went
3.63:1 → 6.74:1, `Grant Writer AI` 3.5:1 → 6.49:1. Both the landing page and
`/pricing` now measure zero failures. The decorative `ArrowRight` on Index sits
beside its own label, so 1.4.11 does not apply and it was left as is.

**Prompt injection** — `grant-writer-generate` interpolated `wizard_data`
straight into the user message. `JSON.stringify` stops the payload breaking the
JSON envelope, but the model still reads the inside of each string field as
prose. The payload is now wrapped by `fenceUserPayload()`, whose marker carries a
per-request UUID that form input cannot guess, and `SYSTEM_PROMPT` gained an
INPUT HANDLING section instructing the model to treat the fenced block as data
and reproduce rather than obey anything inside it. Applied to the first call and
the retry.

**Dead weight** — `@azure/msal-browser` and `@azure/msal-react` were declared but
imported nowhere; auth is Supabase-only. Removed, along with their `manualChunks`
rule and the README's stale tech-stack row. `src/components/ui/chart.tsx` had no
importers.

## Open: three competing definitions of Page1Input

147 of the 203 remaining typecheck errors sit in the grant-writer deterministic
engine and its tests. They are not 147 separate problems — they are one
architectural inconsistency, and it needs an owner's decision rather than a
guess.

The same concept is declared three ways, and no two agree:

| Where | Shape |
| --- | --- |
| `deterministic/types.ts` → `Page1Input` | every field optional, both casings of each name (`program_title` *and* `programTitle`), `beneficiaryCount?: number` |
| `provisionalAdapter.ts` → `Page1Input` | fields required, sentinels: `beneficiaryCount: number \| 'unknown' \| 'unentered'`; also carries `geography`, `durationMonths`, `budgetIdr`, `programStory` |
| `impactory_deterministic_scoring_contract_v1.md` → `Page1InputSnapshot` | `programId`, `programTitle`, `programStory`, `beneficiaryDescription`, `durationValue`, `fundingAmount`, `locationValue`, `candidates` |

The engine is *typed* against the first but *called* with the second —
`createPage2Payload(input: Page1Input)` in `page2-payload.ts` takes the loose
type, while `GrantWriterQuickWizardProvisional.tsx` and `deterministic.test.ts`
pass the strict one. That mismatch is where the 147 errors come from, and it is
why `GrantWriterQuickWizardProvisional.tsx` alone contributes 18. The third
shape, the one in the signed contract document, matches neither.

This was deliberately left alone. Runtime is fine — 108 of the engine's 116
tests pass, and the 8 failures predate this work and are unrelated. Picking a
canonical shape means deciding which of the three is authoritative, and getting
it wrong would quietly change scoring behaviour, which is to say the quality of
the LFA matrices and proposals NGOs submit to donors. That is not a call to make
from type errors alone.

What it needs, roughly in order:

1. Decide whether the contract document or `provisionalAdapter` is authoritative.
   The document is the more formal artefact, but the adapter is what production
   actually runs.
2. If the contract wins, update `provisionalAdapter` and the engine to match it
   and amend the document's version number.
3. If the adapter wins, amend the contract document to describe reality, then
   retype `page2-payload.ts` and the engine modules against it.
4. Delete `deterministic/types.ts`'s `Page1Input` either way — the dual-casing,
   all-optional shape looks like a legacy tolerance layer that nothing should
   still be typed against.
5. The 116 engine tests are the safety net for the change; run them at every
   step.

## Correction log

The first pass of this audit made two claims that later verification overturned.
Both came from reasoning about local artefacts instead of production:

1. **Brevo key exposure** — asserted from a local `dist/` build. See item 3
   above. No exposure occurred.
2. **Badge contrast at 3.47:1** — the first checker read `rgba()` backgrounds
   without compositing their alpha, so it measured `teal-300` against a solid
   brand colour rather than the dark surface actually behind it. Measured
   correctly the badges are 10.23:1 and always passed. The corrected checker,
   which composites every translucent ancestor and applies the large-text
   exemption, found thirteen real failures elsewhere — a different set entirely.

3. **RLS was wide open** — asserted from `20260600000000_organizations.sql`,
   which is gitignored as a local bootstrap and carries `USING (true)` stubs plus
   an `is_org_member()` that returns `SELECT true`. Production bears no
   resemblance to it: every public table has RLS enabled with at least one
   policy, `is_org_member()` is properly implemented, and the org-scoped tables
   route through it correctly.

   A blind hardening migration was written against that stub and has been
   deleted. It would have *reduced* security: Postgres OR-combines permissive
   policies, so its broad `FOR ALL` grants would have sat alongside the existing
   narrow ones and, for example, handed `gw_projects` DELETE to any member when
   production correctly restricts it to owners and admins.

   Lesson: for anything whose schema lives outside the repo, read the database
   before writing the migration.
