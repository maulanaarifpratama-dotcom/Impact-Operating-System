# Azure AI Foundry Setup for Impactory

This guide walks you through wiring **Azure AI Foundry** (cloud) as the AI brain for every Impactory product menu. Follow it once, then every menu (Grant Writer, Grantfinder, Library, Ads) automatically uses it.

## 0. What you will end up with

```
Frontend (Vite SPA on Vercel)
    │  supabase.functions.invoke()
    ▼
Supabase Edge Functions (Deno)  ── secrets ──▶  Azure AI Foundry
    │
    ▼
Supabase Postgres (RLS, pgvector)
```

Frontend NEVER sees the Azure key. Every AI call is proxied through edge functions.

## 1. Apply the database migration

1. Open Supabase Dashboard → **SQL Editor → New query**.
2. Paste each chunk in order and run:
   - `db/chunk1_foundation.sql`
   - `db/chunk2_grant_writer.sql`
   - `db/chunk3_chat.sql`
   - `db/chunk4_ai_extras.sql`  ← new (pgvector + library + grants + ads tables)
3. Verify the new tables exist:
   ```sql
   select tablename from pg_tables where schemaname='public'
   and tablename in ('library_documents','library_chunks','grants_catalog',
                    'grantfinder_searches','ads_briefs','ads_generations');
   ```
   Expect 6 rows.

## 2. Provision Azure AI Foundry

1. Sign in to the [Azure Portal](https://portal.azure.com) (use your $1500 credits subscription).
2. Create an **Azure AI Foundry** resource (or **Azure OpenAI** — same API contract).
   - Region: choose one that has the model you want. `swedencentral`, `eastus2`, and `westus3` typically have the freshest models.
   - Pricing tier: Standard S0.
3. After deployment, open the resource → **Resource Management → Keys and Endpoint**. Copy:
   - **Endpoint** (e.g. `https://impactory-ai.openai.azure.com/`)
   - **KEY 1** (treat as a password — never paste it in chat or commit it)
4. Open the **Azure AI Foundry portal** (link from your resource) → **Deployments → Create new deployment**:
   - **Chat model**: pick the latest GPT model your subscription has access to. Give it a deployment name like `gpt-chat`. Note this name — you will use it as `AZURE_FOUNDRY_CHAT_DEPLOYMENT`.
   - **Embedding model**: deploy `text-embedding-3-small` (1536 dimensions — matches the SQL schema). Name it `text-embed`. This becomes `AZURE_FOUNDRY_EMBED_DEPLOYMENT`.

> If you deploy `text-embedding-3-large` instead, change the SQL `vector(1536)` to `vector(3072)` in `db/chunk4_ai_extras.sql` BEFORE running it (or run an `alter table … alter column embedding type vector(3072)` later).

## 3. Add the secrets to Supabase

**Important**: do these in the Supabase Dashboard yourself. Do not paste keys in chat.

1. Open Supabase Dashboard → **Project Settings → Edge Functions → Secrets**.
2. Click **New secret** and add each of these:

| Name | Example value |
|---|---|
| `AZURE_FOUNDRY_ENDPOINT` | `https://impactory-ai.openai.azure.com` |
| `AZURE_FOUNDRY_API_KEY` | (KEY 1 from step 2.3) |
| `AZURE_FOUNDRY_CHAT_DEPLOYMENT` | `gpt-chat` (the deployment name from step 2.4) |
| `AZURE_FOUNDRY_EMBED_DEPLOYMENT` | `text-embed` |
| `AZURE_FOUNDRY_API_VERSION` | `2024-10-21` |

`SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` are auto-provided by Supabase to every edge function — you do NOT need to add those.

## 4. Deploy the edge functions

You need the [Supabase CLI](https://supabase.com/docs/guides/cli) installed locally.

```bash
# from the repo root
supabase login
supabase link --project-ref YOUR_PROJECT_REF

# deploy the function
supabase functions deploy grant-writer-generate
```

You should see `Function grant-writer-generate deployed.` and a public URL.

### Smoke test

```bash
curl -X POST \\
  "https://YOUR_PROJECT_REF.supabase.co/functions/v1/grant-writer-generate" \\
  -H "Authorization: Bearer YOUR_USER_JWT" \\
  -H "Content-Type: application/json" \\
  -d '{"projectId":"<an-existing-gw_projects-uuid>"}'
```

Expected: a JSON `{ document, version }` payload, OR a clear error message naming the missing secret if you skipped step 3.

## 5. Try it from the app

1. Log in to [impactory.id](https://impactory.id) (or `impactory.vercel.app`).
2. Go to **Grant Writer → Proyek baru → LFA Lengkap**.
3. Fill in at least the first 2-3 steps with real content (the better the input, the better the proposal).
4. On the last step, click **Buat Proposal**.
5. The toast will say either:
   - **"Proposal berhasil dibuat dengan AI"** ✅ Foundry is live.
   - **"Proposal berhasil dibuat (mode fallback)"** ⚠️ The edge function failed; check Supabase → Edge Functions → Logs for the reason (usually a missing secret).

## 6. Cost & rate-limiting (optional but recommended)

Every Foundry call is logged in `public.ai_generations` with token counts and model. Build a simple dashboard query:

```sql
select date_trunc('day', created_at) as day,
       sum(prompt_tokens) as prompt_tokens,
       sum(completion_tokens) as completion_tokens,
       count(*) as calls
from public.ai_generations
where created_at > now() - interval '30 days'
group by 1 order by 1 desc;
```

For per-org rate-limiting, increment `public.usage_counters` inside each edge function (or via a shared helper) and reject calls when the org has exceeded their plan quota (look up `subscriptions.plan` and `has_product_access()`).

## 7. Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| 401 from edge function | User not logged in / JWT expired | Refresh the session in the frontend |
| 403 "not a member of this organization" | Project belongs to an org the caller is not in | Use `ensureDefaultOrg()` to attach the user |
| `FoundryConfigError: missing AZURE_FOUNDRY_*` | Secret not set in Supabase | Add it in step 3, then redeploy |
| `Foundry chat error 404` | Wrong deployment name | Match `AZURE_FOUNDRY_CHAT_DEPLOYMENT` exactly to the name in Azure portal |
| `Foundry chat error 429` | Rate limit on Azure side | Increase TPM quota in Azure portal, or implement client-side back-off |
| Foundry returned invalid JSON | Model decided to chat instead of return JSON | Increase `max_tokens`, or strengthen the system prompt |

## 8. Next phases

After this Phase A is live, the following will be added in subsequent commits:

- Phase B: streaming chat (`grant-writer-chat` edge fn) wired to the existing `<GrantWriterChat>` component.
- Phase C: `grantfinder-search` edge fn + `embed` job that indexes `grants_catalog`.
- Phase D: `library-rag` edge fn + document upload + chunking pipeline.
- Phase E: `ads-generate` edge fn for the Impactory Ads copy generator.
- Phase F: design polish based on live-site review (the most visible bug right now is a gradient block covering part of the hero headline on the landing page).
