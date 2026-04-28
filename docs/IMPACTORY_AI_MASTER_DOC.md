# 🧠 Impactory AI Integration — Master Document

> **Status: Phase A–F COMPLETE (code-side). Tinggal config Foundry + deploy.**
> Last updated: April 2026
>
> Dokumen ini adalah single-source-of-truth untuk integrasi AI Impactory.
> Kalau melanjutkan di Lovable.ai atau session AI baru, **paste seluruh isi file ini sebagai context**.

---

## 1. 🎯 Tujuan & Arsitektur

Impactory adalah SaaS untuk NGO/yayasan/social enterprise di Indonesia.
Tujuan integrasi: tiap menu produk (Grant Writer, Grantfinder, Library, Ads) punya 'otak' AI
yang dijalankan oleh **Azure AI Foundry**, dengan **Supabase** sebagai database + edge runtime.

### Arsitektur

```
┌─────────────────────────────────────────────────────────────┐
│  Frontend (Vite + React + TypeScript + shadcn/ui)           │
│  Hosted: Vercel (impactory.id / impactory.vercel.app)        │
│                                                              │
│  src/lib/<feature>/ai.ts  ──────► fetch w/ Supabase JWT      │
└──────────────────┬──────────────────────────────────────────┘
                   │ HTTPS (Bearer token)
                   ▼
┌─────────────────────────────────────────────────────────────┐
│  Supabase Edge Functions (Deno)                              │
│                                                              │
│  supabase/functions/_shared/      → foundry, auth, cors      │
│  supabase/functions/<feature>/    → 7 endpoint AI            │
│                                                              │
│  Read JWT  → Verify org membership → RLS-scoped query        │
│  Call Foundry  → Persist result  → Return JSON / SSE         │
└──────────────────┬──────────────────────────────────────────┘
                   │                          │
                   ▼                          ▼
┌──────────────────────────┐    ┌──────────────────────────────┐
│  Azure AI Foundry        │    │  Supabase Postgres + pgvector│
│  - Chat model (GPT-x)    │    │  - 14 tabel (org + AI)        │
│  - Embedding model       │    │  - RLS multi-tenant           │
│  - JSON mode + streaming │    │  - 2 RPC vector search        │
└──────────────────────────┘    └──────────────────────────────┘
```

### Prinsip keamanan (TIDAK BOLEH dilanggar)

- ❌ Azure API key **tidak pernah** masuk ke frontend bundle (Vite SPA = public).
- ❌ Tidak ada secret di repo (.env.local di-gitignore).
- ✅ Semua call AI lewat edge function sebagai proxy.
- ✅ RLS aktif di semua tabel. Edge function pakai `service role` hanya untuk insert log yang sudah divalidasi.
- ✅ User wajib paste secret sendiri di Supabase Dashboard, jangan via AI assistant.

---

## 2. 📊 Status Phase

| Phase | Nama | Status | Komponen utama |
|-------|------|--------|----------------|
| **A** | Foundation | ✅ Done | DB schema AI, edge fn shared, Grant Writer generator |
| **B** | Streaming chat | ✅ Done | grant-writer-chat (SSE) + UI wired |
| **C** | Grantfinder semantik | ✅ Done | grantfinder-search + grantfinder-index + helper |
| **D** | Library RAG | ✅ Done | library-ingest + library-rag + helper |
| **E** | Ads generator | ✅ Done | ads-generate + helper |
| **F** | Design polish | ✅ Done | Hero gradient text fix |
| **G** | (Belum) UI integration | ⏳ Pending | Wire Grantfinder/Library/Ads pages ke helper |
| **H** | (Belum) PDF parser Library | ⏳ Pending | Client-side pdfjs-dist |
| **I** | (Belum) Function calling | ⏳ Pending | Tool-call autofill di chat |
| **J** | (Belum) Quota & rate limit | ⏳ Pending | Pakai ai_generations untuk billing |
| **K** | (Belum) Cron re-index | ⏳ Pending | Schedule grantfinder-index nightly |

---

## 3. 📁 Inventory File yang Sudah Dibuat

### Database
```
db/chunk1_foundation.sql       (sudah ada sebelumnya: profiles, organizations, subscriptions, ai_generations)
db/chunk2_grant_writer.sql     (sudah ada: gw_projects, gw_lfa_documents, gw_proposals)
db/chunk3_chat.sql             (sudah ada: gw_chat_messages dengan tool-call support)
db/chunk4_ai_extras.sql        ★ BARU (Phase A): pgvector + library/grants/ads tables + RPC + RLS
```

### Supabase Edge Functions
```
supabase/config.toml                              ★ Phase A
supabase/functions/_shared/foundry.ts             ★ Phase A: chat, stream, embed, JSON mode
supabase/functions/_shared/cors.ts                ★ Phase A
supabase/functions/_shared/auth.ts                ★ Phase A: JWT + RLS-scoped + admin client
supabase/functions/grant-writer-generate/index.ts ★ Phase A: LFA + proposal generator (JSON)
supabase/functions/grant-writer-chat/index.ts     ★ Phase B: streaming chat (SSE)
supabase/functions/grantfinder-search/index.ts    ★ Phase C: vector search + AI ranking summary
supabase/functions/grantfinder-index/index.ts     ★ Phase C: admin re-embed grants_catalog
supabase/functions/library-ingest/index.ts        ★ Phase D: chunk + embed dokumen
supabase/functions/library-rag/index.ts           ★ Phase D: cited Q&A
supabase/functions/ads-generate/index.ts          ★ Phase E: ad copy variants (JSON)
```

### Frontend (Client Helpers + UI Edits)
```
src/lib/grantfinder/aiSearch.ts                   ★ Phase C: aiGrantSearch()
src/lib/library/ai.ts                             ★ Phase D: ingestLibraryText() + askLibrary()
src/lib/ads/ai.ts                                 ★ Phase E: generateAds()
src/components/grant-writer/chat/GrantWriterChat.tsx ★ Phase B: wired ke edge fn dgn fallback mock
src/pages/dashboard/grant-writer/GrantWriterWizard.tsx ★ Phase A: handleGenerate via edge fn
src/components/landing/Hero.tsx                   ★ Phase F: fix gradient text
```

### Documentation
```
docs/AZURE_FOUNDRY_SETUP.md      ★ Phase A: setup guide awal
docs/PHASE_B_TO_F_GUIDE.md       ★ Phase B–F: lanjutan
docs/IMPACTORY_AI_MASTER_DOC.md  ★ INI (master doc gabungan)
```

---

## 4. 🗄️ Skema Database Lengkap (chunk 4)

Tabel baru di Phase A:

| Tabel | Tujuan | Kolom kunci |
|-------|--------|-------------|
| `library_documents` | Dokumen yang user upload | id, organization_id, title, char_count, chunk_count, status |
| `library_chunks` | Potongan teks + embedding | document_id, chunk_index, content, embedding(1536) |
| `grants_catalog` | Master data hibah | title, donor, sector[], country[], amount_usd, embedding(1536) |
| `grantfinder_searches` | Log pencarian | query, filters, result_count |
| `ads_briefs` | Brief iklan | audience, goal, platform, tone, key_points |
| `ads_generations` | Output varian iklan | brief_id, variants(jsonb), raw_output |

RPC functions (untuk vector search):
- `match_library_chunks(query_embedding, match_threshold, match_count, filter_organization_id, filter_document_ids)`
- `match_grants(query_embedding, match_threshold, match_count, filter_sector, filter_country, filter_min_amount, filter_max_amount)`

Semua tabel punya **RLS policy**: user hanya bisa baca/tulis data org-nya sendiri.
`grants_catalog` adalah READ-ONLY untuk user biasa (insert hanya admin).

⚠️ **Catatan dimensi vector**: default `vector(1536)` cocok untuk `text-embedding-3-small`.
Kalau pakai `text-embedding-3-large` (3072 dim), edit `chunk4_ai_extras.sql` ganti semua `vector(1536)` → `vector(3072)` SEBELUM jalanin.

---

## 5. 🔌 API Reference Edge Functions

Base URL: `https://<project-ref>.supabase.co/functions/v1/<function-name>`
Header wajib: `Authorization: Bearer <user-jwt>` + `Content-Type: application/json`

### `grant-writer-generate` (POST)
```json
// Input
{ "project_id": "uuid", "mode": "lfa" | "proposal", "context": {...} }
// Output
{ "document": {...}, "used_ai": true }
```

### `grant-writer-chat` (POST, streaming SSE)
```json
// Input
{ "project_id": "uuid", "message": "..." }
// Output: SSE stream
// data: {"delta":"..."}
// data: [DONE]
```

### `grantfinder-search` (POST)
```json
// Input
{ "query": "pendidikan anak terpencil", "filters": { "sector": ["education"] }, "match_count": 10 }
// Output
{ "results": [...], "summary": "...", "used_embedding": true }
```

### `grantfinder-index` (POST, admin only)
```json
// Input: {} (no body needed)
// Output
{ "updated": 18, "attempted": 20, "errors": [] }
```

### `library-ingest` (POST)
```json
// Input
{ "title": "...", "text": "plain text >=50 chars", "source_url": "...", "tags": [], "metadata": {} }
// Output
{ "document_id": "uuid", "chunks_inserted": 12, "errors": [] }
```

### `library-rag` (POST)
```json
// Input
{ "question": "...", "document_ids": ["uuid", ...], "match_count": 6 }
// Output
{ "answer": "...", "citations": [{n, document_id, document_title, chunk_index, similarity, excerpt}], "used_ai": true }
```

### `ads-generate` (POST)
```json
// Input
{ "audience": "...", "goal": "...", "platform": "instagram", "tone": "inspiratif", "key_points": [...], "variant_count": 3 }
// Output
{ "brief_id": "uuid", "variants": [{headline, body, cta, hashtags, platform, why_it_works}], "fallback": false }
```

---

## 6. ⚙️ Setup yang HARUS user lakukan (urut)

### Step 1: Jalankan SQL chunk 4

Buka **Supabase Dashboard → SQL Editor → New Query**, copy seluruh isi `db/chunk4_ai_extras.sql`, klik Run.
Pastikan ada output 'Success. No rows returned'.

### Step 2: Provision Azure AI Foundry

1. Login ke [Azure Portal](https://portal.azure.com).
2. Cari 'Azure AI Foundry' (atau 'Azure OpenAI'), buat resource baru.
3. Region: pilih yang dekat (Southeast Asia / Japan East).
4. Pricing tier: Standard (S0).
5. Setelah resource dibuat, masuk ke Foundry studio → Deployments.
6. **Deploy 2 model**:
   - Chat model: pilih sesuai availability (GPT-4o, GPT-5, atau model baru di subscription kamu).
   - Embedding model: `text-embedding-3-small` (REKOMENDASI, dim 1536, murah).
7. Catat 4 nilai dari Keys and Endpoint:
   - Endpoint URL
   - Key 1
   - Deployment name chat
   - Deployment name embedding

### Step 3: Set Edge Function Secrets

Buka **Supabase Dashboard → Project Settings → Edge Functions → Secrets**, tambahkan:

```
AZURE_FOUNDRY_ENDPOINT=https://<resource>.openai.azure.com
AZURE_FOUNDRY_API_KEY=<key-1>
AZURE_FOUNDRY_DEPLOYMENT=<chat-deployment-name>
AZURE_FOUNDRY_EMBEDDING_DEPLOYMENT=<embedding-deployment-name>
AZURE_FOUNDRY_API_VERSION=2024-10-21
```

⚠️ **Paste sendiri jangan kasih ke AI assistant**.

### Step 4: Install Supabase CLI & Deploy 7 Edge Functions

```bash
# Install (sekali aja)
npm install -g supabase

# Login + link
supabase login
supabase link --project-ref <your-project-ref>

# Deploy semua edge functions (dari root repo Impactory)
supabase functions deploy grant-writer-generate
supabase functions deploy grant-writer-chat
supabase functions deploy grantfinder-search
supabase functions deploy grantfinder-index
supabase functions deploy library-ingest
supabase functions deploy library-rag
supabase functions deploy ads-generate
```

### Step 5: Frontend env

Pastikan `.env.local` di root repo punya:
```
VITE_SUPABASE_URL=https://<your-project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon-key-dari-supabase-dashboard>
```

Kalau deploy di Vercel, set juga di Vercel Project Settings → Environment Variables.

### Step 6: Seed data awal

**Grantfinder:**
1. Insert beberapa baris ke `public.grants_catalog` via SQL Editor (atau import CSV).
2. Set role user kamu jadi admin: `UPDATE profiles SET role = 'admin' WHERE id = '<your-user-id>';`
3. Trigger embedding: POST ke `<SUPABASE_URL>/functions/v1/grantfinder-index` (pakai Postman atau curl).
4. Re-run sampai semua row punya embedding.

**Library:**
- Cukup test via `ingestLibraryText({ title, text })` dari frontend (perlu UI integration dulu).

### Step 7: Test tiap fitur

| Fitur | Cara test |
|-------|-----------|
| Grant Writer wizard generate | Buka wizard, isi 7 step, klik Generate. Liat response > 30 detik artinya AI jalan. |
| Grant Writer chat | Buka wizard, kirim pesan di sidebar. Badge 'Live' = AI aktif. |
| Grantfinder | Belum ada UI integration — tes via console: `window.aiGrantSearch?.()` (after Phase G). |
| Library RAG | Belum ada UI — tes via helper function langsung. |
| Ads | Belum ada UI — tes via helper function langsung. |

---

## 7. 🐛 Bug Fix yang Sudah Dilakukan (Phase F)

### Hero gradient text
- **Symptom**: di production (impactory.vercel.app), text 'dampak Indonesia' di hero
  tampil sebagai blok solid hijau-tosca, bukan gradient text.
- **Root cause**: Tailwind `bg-clip-text text-transparent` kadang gagal di Safari/Chrome lama
  kalau parent punya `text-foreground` yang override.
- **Fix**: tambah `inline-block` + inline style `WebkitBackgroundClip: 'text'`,
  `WebkitTextFillColor: 'transparent'`, `backgroundClip: 'text'`.
- **File**: `src/components/landing/Hero.tsx`

---

## 8. ⏭️ Roadmap Lanjutan (Phase G–K, BELUM dikerjakan)

### Phase G: UI Integration Page Asli
- `src/pages/dashboard/products/Grantfinder.tsx` → tambah AI search card di atas filter, pakai `aiGrantSearch()`.
- `src/pages/dashboard/products/ImpactoryLibrary.tsx` → tambah upload form + Q&A panel pakai `ingestLibraryText` + `askLibrary`.
- `src/pages/dashboard/products/ImpactoryAds.tsx` → tambah brief form + variant cards pakai `generateAds`.

### Phase H: PDF/DOCX Parser di Library
- `npm install pdfjs-dist mammoth`
- Buat `src/lib/library/parser.ts` yang baca File object → return plain text.
- Pipe ke `ingestLibraryText`.

### Phase I: Function Calling Tool-Calls di Chat
- Extend `grant-writer-chat` edge fn supaya support Foundry function calling.
- Define tools: `web_search`, `generate_document`, `autofill_wizard`.
- Frontend `<ChatMessage onApplyTool={...}>` sudah siap menerima tool calls.

### Phase J: Quota & Rate Limit
- Query `ai_generations` group by organization_id, count per bulan.
- Bandingkan dengan `subscriptions.plan` limits.
- Reject request kalau over quota.

### Phase K: Cron Re-index
- Pakai Supabase pg_cron atau Vercel Cron.
- Schedule: tiap malam jalan `grantfinder-index` untuk grants yang baru di-insert.

---

## 9. 🤖 Cara Lanjutkan di Lovable.ai / AI Assistant lain

Kalau session AI baru, paste prompt berikut sebagai context awal:

```
Saya punya repo Impactory (Vite + React + TypeScript + shadcn/ui + Supabase + Vercel).
Tujuan: SaaS untuk NGO/yayasan/social enterprise Indonesia, dengan AI brain via Azure AI Foundry.

Status integrasi AI sekarang: Phase A–F sudah complete (lihat docs/IMPACTORY_AI_MASTER_DOC.md).
Yang sudah ada:
- 7 Supabase edge functions di supabase/functions/
- 3 client helper di src/lib/<feature>/ai.ts
- Grant Writer wizard + chat sudah wired ke AI
- Database schema lengkap (db/chunk1-4.sql)
- Hero design fix (Phase F)

Yang BELUM:
- Phase G: UI integration di halaman Grantfinder/Library/Ads (helper sudah siap, tinggal pakai)
- Phase H: PDF parser client-side untuk Library
- Phase I: Function calling tool-calls di chat
- Phase J: Quota & rate limit
- Phase K: Cron re-index

User belum config Azure Foundry secrets, tapi semua kode punya graceful fallback ke mock.
Tolong lanjutkan ke phase berikutnya yang saya pilih.
```

Lalu pilih phase yang mau dilanjut.

---

## 10. 🔐 Catatan Penting

- ✅ Semua kode bisa jalan TANPA Azure secrets — fallback otomatis ke mock/template.
- ✅ Repo private — aman tapi tetap jangan commit secret.
- ✅ Multi-tenant: setiap user otomatis ter-scope ke organization_id-nya via RLS.
- ⚠️ Model name di-hardcode = jangan. Pakai env var `AZURE_FOUNDRY_DEPLOYMENT` supaya gampang ganti.
- ⚠️ Embedding dim mismatch = error. Hati-hati kalau ganti model embedding.
- ⚠️ Untuk debugging, cek `Supabase Dashboard → Edge Functions → Logs` per function.

---

## 11. 📝 Commit History (Phase A–F)

```
docs: add Phase B-F setup guide and next steps
fix(hero): add explicit -webkit-background-clip to gradient text (Phase F)
feat(ads): add generateAds client helper for edge function (Phase E)
feat(supabase): add ads-generate edge function for ad copy variants (Phase E)
feat(library): add ingestLibraryText + askLibrary client helpers (Phase D)
feat(supabase): add library-rag edge function for cited Q&A over Library (Phase D)
feat(supabase): add library-ingest edge function for chunking and embedding text (Phase D)
feat(grantfinder): add aiGrantSearch client helper for edge function (Phase C)
feat(supabase): add grantfinder-index admin function for embedding grants_catalog (Phase C)
feat(supabase): add grantfinder-search edge function with vector RPC + chat summary (Phase C)
feat(grant-writer): wire chat to streaming edge function with mock fallback (Phase B)
feat(supabase): add grant-writer-chat streaming edge function (Phase B)
docs: Azure Foundry setup guide (DB migration, secrets, deploy, troubleshooting)
feat(grant-writer): use Foundry edge function for proposal generation
feat(supabase): add edge function config (Phase A)
feat(supabase): add grant-writer-generate edge function (Phase A)
feat(supabase): add shared auth helper for edge functions (Phase A)
feat(supabase): add CORS helper for edge functions (Phase A)
feat(supabase): add Azure Foundry client (chat, stream, embed, JSON) (Phase A)
feat(db): add chunk4_ai_extras.sql with pgvector + RAG tables + RPC (Phase A)
```

---

_End of master document. Total 21 commits across Phase A–F. Ready for Phase G+._
