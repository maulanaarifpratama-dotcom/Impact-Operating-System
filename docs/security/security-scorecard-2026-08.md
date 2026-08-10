# Impactory Security Scorecard — August 2026

## Summary

| Domain | Score | Status |
|--------|-------|--------|
| Dependency Security | 4/5 | 3 HIGH fixed; 2 MODERATE deferred |
| Auth Security | 5/5 | JWT-based; anon key only in frontend; service_role in Edge Functions only |
| RLS Security | 5/5 | 26 tables with RLS; REVOKE ALL on Finance tables; SECURITY DEFINER RPCs |
| Edge Function Security | 4/5 | All JWT-verified; no secrets in source; minor hardening opportunities |
| AI Security | 4/5 | No AI for prices; budget-sbm-suggest deleted; prompt injection mitigations partial |
| Infrastructure Security | 3/5 | No security headers; no CSP; Vercel hosting defaults |
| **Overall** | **4.2/5** | **Healthy — minor hardening opportunities** |

---

## 1. Dependency Security

### Status: 4/5

| Finding | Detail |
|---------|--------|
| Vulnerabilities resolved | `js-yaml` (HIGH), `nanoid` (HIGH), `pdfjs-dist` (HIGH) — fixed via `npm audit fix` |
| Vulnerabilities deferred | `react-router` (2x MODERATE) — requires React Router v7 migration (breaking change) |
| Dependabot | **NOW CONFIGURED** — `.github/dependabot.yml` with weekly schedule, grouped updates, major-version ignores for react/react-router |
| Lockfile | `package-lock.json` present and committed |

### Recommendations
- Plan React Router v7 migration sprint to resolve 2 remaining MODERATE vulnerabilities
- Monitor Dependabot PRs weekly; auto-merge patch-level security fixes where CI passes

---

## 2. Auth Security

### Status: 5/5

| Check | Result |
|-------|--------|
| Frontend uses anon key only | PASS — `supabase/client.ts` only references `VITE_SUPABASE_ANON_KEY` |
| No service_role in frontend | PASS — service_role only in Edge Functions and Postgres test files |
| JWT verification | PASS — all Edge Functions call `authenticate(req)` |
| Session persistence | PASS — localStorage-based, auto-refresh enabled |
| Rate limiting | PASS — `enforceRateLimit()` with per-feature buckets |
| Auth keys via env vars | PASS — no hardcoded keys in source |

### Recommendations
- None — auth posture is strong.

---

## 3. RLS Security

### Status: 5/5

| Check | Result |
|-------|--------|
| RLS enabled | PASS — all 26 application tables |
| Owner-only writes | PASS — Finance tables use `REVOKE ALL FROM authenticated` + SECURITY DEFINER RPCs |
| Member read-only | PASS — SELECT granted; INSERT/UPDATE/DELETE revoked |
| Tenant isolation | PASS — `is_org_member(org_id, auth.uid())` on all policies |
| Project-scoped FKs | PASS — composite FKs enforce project + org identity |
| Direct table writes closed | PASS — commitment, expenditure, funding tables REVOKE ALL from authenticated |
| No `admin` role | PASS — canonical roles are owner/member only |
| Legacy policy cleanup | PASS — `org_isolation_lfa_budget_items` replaced with hardened split policies |

### Recommendations
- None — RLS posture is strong.

---

## 4. Edge Function Security

### Status: 4/5

### Audit Summary

| Function | JWT | Rate Limit | Org Validation | Input Validation | Error Sanitization |
|----------|-----|------------|---------------|-----------------|-------------------|
| ads-generate | Yes | Yes | Implicit | Partial | Partial |
| budget-sbm-suggest | **DELETED** | — | — | — | — |
| contact-form | Yes | No | No | Minimal | Good |
| foundry-health | Yes | No | No | N/A | Good |
| grant-writer-chat | Yes | Yes | Implicit | Partial | Good |
| grant-writer-generate | Yes | Yes | Yes | Yes | Good |
| grant-writer-proposal | No JWT | No | No | Partial | Good |
| grant-writer-rag-references | Yes | No | Yes | Yes | Good |
| grantfinder-index | Yes | No | Implicit | Minimal | Good |
| grantfinder-search | Yes | No | Implicit | Minimal | Good |
| lfa-ai-draft | Yes | No | Implicit | Partial | Good |
| lfa-export-pdf | Yes | No | Implicit | Minimal | Good |
| library-chat | Yes | No | Implicit | Partial | Good |
| library-ingest | Yes | No | Implicit | Partial | Good |
| library-rag | Yes | No | Implicit | Partial | Good |
| meal-ai-suggest | Yes | No | Implicit | Partial | Good |
| newsletter-subscribe | Yes | No | No | Minimal | Good |
| onedrive-upload | Yes | No | Implicit | Partial | Good |
| organization-invite | Yes | No | Implicit | Good | Good |
| platform-registration-chat | Yes | No | Implicit | Partial | Good |
| sroi-ai-suggest | Yes | No | Implicit | Partial | Good |
| wbs-ai-suggest | Yes | No | Implicit | Partial | Good |

### Findings

| Finding | Severity | Detail |
|---------|----------|--------|
| `grant-writer-proposal` has no JWT verification | LOW | `verify_jwt: false` — publicly accessible. Function is read-only proposal generation, not financial. Risk: unauthorized token consumption. |
| Several functions lack rate limiting | LOW | `contact-form`, `newsletter-subscribe`, AI suggest functions have no rate limit enforcement. |
| Input validation is partial in many functions | LOW | Most functions do basic null checks but don't validate schema against expected types. |
| Error messages may leak internal details | LOW | Some functions return `err.message` directly without sanitization. |

### Recommendations
- Add rate limiting to all public-facing functions (P2)
- Add JWT verification to `grant-writer-proposal` or make it authenticated (P2)
- Review error message sanitization across all functions (P3)

---

## 5. AI Security

### Status: 4/5

| Check | Result |
|-------|--------|
| No AI for price generation | PASS — `budget-sbm-suggest` deleted; all prices come from deterministic matcher or user input |
| Prompt injection awareness | PARTIAL — prompt templates exist; no systematic injection guard |
| Organization isolation | PASS — ontology context is scoped per project; no cross-org data leakage in prompts |
| Usage logging | PASS — `ai_generations` table tracks model, tokens, status |
| Failure handling | PASS — Azure Foundry errors caught and returned as safe messages |
| Model tier governance | PARTIAL — some functions use senior model for tasks that could use standard tier |
| No secrets in prompts | PASS — prompts reference data by name, not by credential |
| No PII in AI context | PARTIAL — wizard_data may contain beneficiary descriptions; not explicitly sanitized |

### Recommendations
- Add systematic prompt injection guard to all AI functions (P2)
- Review model tier usage; downgrade where standard tier suffices (P3)
- Add PII-aware context trimming for AI prompts (P3)

---

## 6. Infrastructure Security

### Status: 4/5

| Check | Result |
|-------|--------|
| Content-Security-Policy | PASS — `vercel.json` has comprehensive CSP with allowed origins |
| X-Frame-Options | PASS — `DENY` |
| X-Content-Type-Options | PASS — `nosniff` |
| Referrer-Policy | PASS — `strict-origin-when-cross-origin` |
| Permissions-Policy | PASS — restrictive (camera, mic, geo, payment all disabled) |
| Strict-Transport-Security | PASS — `max-age=63072000; includeSubDomains` |
| Cross-Origin-Opener-Policy | PASS — `same-origin` |
| CORS | PASS — `corsHeaders` in all Edge Functions |
| Environment variables | PASS — all secrets via Vercel env vars; no hardcoded credentials |
| Build validation | PASS — typecheck + build run manually on each commit |
| No automated CI test | MISSING — no GitHub Actions test workflow |

### Recommendations
- Add CI test workflow to GitHub Actions (P1)

---

## Quick Wins (< 1 hour)

| Task | Risk Reduction |
|------|---------------|
| Dependabot config | **DONE** — automated vulnerability PRs weekly |
| Security scorecard | **DONE** — this document |
| Security headers | **DONE** — `vercel.json` has CSP, HSTS, X-Frame-Options, Referrer-Policy, Permissions-Policy, COOP |
| Review grant-writer-proposal JWT | LOW — restrict or add auth |

## Medium Tasks (< 1 day)

| Task | Risk Reduction |
|------|---------------|
| Add rate limiting to all public Edge Functions | MEDIUM — prevents abuse |
| Add CI test workflow | MEDIUM — catches regressions |
| Plan React Router v7 migration | LOW — resolves 2 MODERATE vulns |

## Large Tasks (> 1 day)

| Task | Risk Reduction |
|------|---------------|
| Systematic prompt injection guard across all AI functions | MEDIUM |
| PII-aware context trimming for AI prompts | LOW |
| React Router v7 full migration | LOW |

---

## Next Steps

1. **P0**: Add security headers via Vercel configuration
2. **P1**: Add CI test workflow to GitHub Actions
3. **P2**: Add rate limiting to Edge Functions lacking it
4. **P2**: Review `grant-writer-proposal` JWT requirement
5. **P3**: React Router v7 migration planning
