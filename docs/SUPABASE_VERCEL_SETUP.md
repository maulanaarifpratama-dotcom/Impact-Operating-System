# Impactory deployment wiring (GitHub → Supabase + Vercel)

This document describes how the **impactory.id** stack is wired together so
that a single push to `main` automatically deploys both the frontend
(Vercel) and the backend (Supabase edge functions).

> **Last verified:** 2 May 2026 — initial wiring complete and working.

## Architecture at a glance

```
                         Lovable.dev
                              |
                       (push commits)
                              v
                ┌────── GitHub: maulanaarifpratama-dotcom/impactory ──────┐
                │                                                         │
   on push to main:                                          on push to main:
        │                                                         │
        v                                                         v
   Vercel auto-deploy                            GitHub Actions workflow
   (Vite SPA → impactory.vercel.app)             .github/workflows/deploy-supabase-functions.yml
        │                                                         │
        │                                                         v
        │                                          Supabase CLI: supabase functions deploy
        │                                                         │
        v                                                         v
   Frontend served at impactory.id        7 edge functions live on Supabase
        \__________________ HTTPS calls __________________/
                              |
                              v
                Supabase project: <your-supabase-project-name>
                ref: <your-project-ref>
                              |
                              v (server-side)
                     Azure AI Foundry
                     (chat + embeddings)
```

## The three pieces

### 1. GitHub repository

- **Repo:** [`maulanaarifpratama-dotcom/impactory`](https://github.com/maulanaarifpratama-dotcom/impactory)
- **Default branch:** `main`
- **Authoring:** Lovable.dev pushes commits here automatically.
- **Workflow file:** `.github/workflows/deploy-supabase-functions.yml`

#### GitHub Actions secrets (repo level)

| Name | Description | Where to get it |
|---|---|---|
| `SUPABASE_ACCESS_TOKEN` | Personal access token for Supabase CLI | https://supabase.com/dashboard/account/tokens |
| `SUPABASE_PROJECT_ID` | Project ref (`<your-project-ref>`) | Supabase Dashboard URL |

The workflow triggers on:
- `push` to `main` that touches `supabase/functions/**`, `supabase/config.toml`, or the workflow file itself.
- Manual `workflow_dispatch` from the Actions tab.

It iterates every directory inside `supabase/functions/` (skipping `_shared`)
and runs `supabase functions deploy <name> --project-ref $SUPABASE_PROJECT_ID`
for each one.

### 2. Supabase project

- **Project:** `<your-supabase-project-name>`
- **Ref:** `<your-project-ref>`
- **URL:** `https://<your-project-ref>.supabase.co`
- **Dashboard:** `https://supabase.com/dashboard/project/<your-project-ref>`

#### Edge functions (deployed automatically)

| Function | Purpose |
|---|---|
| `ads-generate` | Foundry-powered ad-copy generator |
| `grant-writer-chat` | Streaming chat assistant for grant writer |
| `grant-writer-generate` | Foundry-powered LFA matrix + proposal generator |
| `grantfinder-index` | Admin: re-embed grant corpus into pgvector |
| `grantfinder-search` | Public: vector + keyword search over grants |
| `library-ingest` | Chunk + embed library documents |
| `library-rag` | Cited Q&A over library corpus |

`_shared/` contains code imported by the others (auth, foundry client,
CORS helpers) and is **not** itself a deployable function.

#### Edge function secrets (Dashboard → Edge Functions → Secrets)

These are the env vars that `Deno.env.get(...)` reads at runtime.

| Name | Used by | Notes |
|---|---|---|
| `AZURE_FOUNDRY_ENDPOINT` | `_shared/foundry.ts` | e.g. `https://<your-azure-openai-resource>.openai.azure.com` |
| `AZURE_FOUNDRY_API_KEY` | `_shared/foundry.ts` | Azure resource key |
| `AZURE_FOUNDRY_CHAT_DEPLOYMENT` | `_shared/foundry.ts` | Chat deployment name (canonical) |
| `AZURE_FOUNDRY_DEPLOYMENT` | `_shared/foundry.ts` | Legacy alias for chat deployment (still accepted as fallback) |
| `AZURE_FOUNDRY_EMBED_DEPLOYMENT` | `_shared/foundry.ts` | Embedding deployment name (canonical) |
| `AZURE_FOUNDRY_EMBEDDING_DEPLOYMENT` | `_shared/foundry.ts` | Legacy alias for embedding deployment |
| `AZURE_FOUNDRY_API_VERSION` | `_shared/foundry.ts` | e.g. `2024-10-21` |
| `SUPABASE_URL` | `_shared/auth.ts` | Provided automatically by Supabase runtime |
| `SUPABASE_ANON_KEY` | `_shared/auth.ts` | Provided automatically by Supabase runtime |
| `SUPABASE_SERVICE_ROLE_KEY` | `_shared/auth.ts` | Provided automatically by Supabase runtime |

`_shared/foundry.ts::readEnv` accepts both the canonical name and the
legacy alias for the two deployment-name secrets, so renaming is safe to
defer indefinitely.

### 3. Vercel project

- **Project:** `impactory`
- **Production domain:** `impactory.id` (`impactory.vercel.app` still resolves as the Vercel default)
- **Linked repo:** `maulanaarifpratama-dotcom/impactory`, branch `main`
- **Auto-deploy:** every push to `main` triggers a new build.

#### Vercel environment variables (Settings → Environment Variables)

| Name | Scope | Sensitive | Notes |
|---|---|---|---|
| `VITE_SUPABASE_URL` | Production + Preview | Yes (per Vercel default) | `https://<your-project-ref>.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | Production + Preview | Yes | Anon (publishable) JWT — protected by RLS |

Because the prefix is `VITE_`, Vite bundles these into the client-side
JavaScript. That is intentional and safe for the **anon key** (which is
explicitly designed to be public and is enforced by Row Level Security on
the database). **Never** put the `service_role` key here.

## End-to-end flow when you push a commit

1. Lovable pushes a commit to `main`.
2. GitHub fires two parallel pipelines:
   - **Vercel** detects the push, builds the Vite app, and deploys it.
   - **GitHub Actions** runs `deploy-supabase-functions.yml` if the
     commit touched `supabase/functions/**` or `supabase/config.toml`.
3. The Action installs the Supabase CLI, authenticates with
   `SUPABASE_ACCESS_TOKEN`, and redeploys every edge function listed
   above.
4. Within ~1 minute, both halves of impactory are running the new code.

## Verifying the wiring

- **Frontend:** open https://impactory.vercel.app and confirm there are
  no `VITE_SUPABASE_URL is undefined` errors in the console.
- **Edge functions:** Supabase Dashboard → Edge Functions should list 7
  functions, each with a recent "last deployed" timestamp.
- **GitHub Actions:** the latest run on
  `github.com/maulanaarifpratama-dotcom/impactory/actions` should be
  green with all 7 functions logged as `Deployed Functions on project`.

## Common pitfalls

- **Renaming a secret in Supabase Dashboard does not redeploy the
  functions.** Re-run the workflow or push a no-op commit to pick up the
  new value.
- **`VITE_`-prefixed env vars are only read at build time.** After
  changing them in Vercel you must trigger a redeploy (Vercel surfaces a
  toast prompting this).
- **Local development uses `supabase/.env.local`**, not the dashboard
  secrets. See `.env.example` at the repo root for the full list.

## Change log of this wiring

- **2 May 2026** — Initial wiring established.
  - `fix(supabase): expand config.toml with all 7 edge functions`
  - `ci(supabase): add github actions workflow to auto-deploy edge functions on push to main`
  - `fix(foundry): accept legacy AZURE_FOUNDRY_DEPLOYMENT and AZURE_FOUNDRY_EMBEDDING_DEPLOYMENT names as fallback`
  - GitHub repo secrets `SUPABASE_ACCESS_TOKEN` and `SUPABASE_PROJECT_ID` set.
  - Vercel env vars `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` set; production redeployed.
