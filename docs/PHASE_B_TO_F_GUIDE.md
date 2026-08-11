# Impactory · Phase B → F Setup & Next Steps

Dokumen ini melengkapi `docs/AZURE_FOUNDRY_SETUP.md` (Phase A). Setelah semua phase di-push,
berikut yang perlu **kamu (user) lakukan** sebelum AI bisa benar-benar hidup.

---

## Ringkasan apa yang sudah dibangun

| Phase | Komponen | Apa yang dilakukan |
|-------|----------|--------------------|
| A | `db/chunk4_ai_extras.sql` | Tabel pgvector untuk RAG, ads, grants, library + RPC `match_*` |
| A | `supabase/functions/_shared/*` | Klien Foundry, CORS, auth helper |
| A | `supabase/functions/grant-writer-generate` | LFA + proposal generator |
| **B** | `supabase/functions/grant-writer-chat` | Streaming chat (SSE) untuk wizard sidebar |
| **B** | `src/components/grant-writer/chat/GrantWriterChat.tsx` | Wired ke edge function + fallback ke mock |
| **C** | `supabase/functions/grantfinder-search` | Pencarian semantik + ranking AI |
| **C** | `supabase/functions/grantfinder-index` | Admin tool untuk re-embed `grants_catalog` |
| **C** | `src/lib/grantfinder/aiSearch.ts` | Helper client untuk Grantfinder UI |
| **D** | `supabase/functions/library-ingest` | Chunk + embed dokumen plain-text |
| **D** | `supabase/functions/library-rag` | Tanya-jawab dengan sitasi |
| **D** | `src/lib/library/ai.ts` | `ingestLibraryText()` + `askLibrary()` |
| **E** | `supabase/functions/ads-generate` | Generator copy iklan multi-varian |
| **E** | `src/lib/ads/ai.ts` | `generateAds()` helper |
| **F** | `src/components/landing/Hero.tsx` | Fix: gradient text tidak lagi tampil sebagai blok solid |

---

## ⚙️ Setup yang harus user lakukan

### 1) Jalankan SQL chunk 4

Buka **Supabase Dashboard → SQL Editor**, copy isi `db/chunk4_ai_extras.sql`, jalankan.
Akan membuat tabel: `library_documents`, `library_chunks`, `grants_catalog`, `grantfinder_searches`,
`ads_briefs`, `ads_generations`, plus 2 RPC `match_library_chunks` dan `match_grants`, semua dengan RLS.

### 2) Provision Azure AI Foundry

1. Login ke Azure Portal → buat resource **Azure AI Foundry** (atau **Azure OpenAI**).
2. Di Foundry studio, **deploy 2 model**:
   - Chat model (mis. `gpt-5-5`, `gpt-4o`, atau apapun yang tersedia di subscription kamu).
   - Embedding model (rekomendasi: `text-embedding-3-small`, dim = **1536** — sesuai default schema).
   - ⚠️ Kalau pakai `text-embedding-3-large` (dim 3072), kamu HARUS edit `chunk4_ai_extras.sql` ganti `vector(1536)` → `vector(3072)` sebelum jalanin.
3. Catat 4 nilai berikut dari portal Foundry:
   - **Endpoint**: `https://<resource-name>.openai.azure.com`
   - **API Key** (Key 1 atau Key 2)
   - **Deployment name** untuk chat model
   - **Deployment name** untuk embedding model
   - **API version** (mis. `2024-10-21`)

### 3) Set Edge Function Secrets di Supabase

**Dashboard → Edge Functions → Manage secrets**, tambahkan 5 secret berikut (paste sendiri,
jangan kirim ke AI assistant):

```
AZURE_FOUNDRY_ENDPOINT=https://<your-resource>.openai.azure.com
AZURE_FOUNDRY_API_KEY=<your-key>
AZURE_FOUNDRY_DEPLOYMENT=<chat-deployment-name>
AZURE_FOUNDRY_EMBEDDING_DEPLOYMENT=<embedding-deployment-name>
AZURE_FOUNDRY_API_VERSION=2024-10-21
```

`SUPABASE_URL` dan `SUPABASE_SERVICE_ROLE_KEY` biasanya sudah otomatis di-inject oleh Supabase.

### 4) Deploy semua edge functions

Dari local machine kamu (perlu Supabase CLI: `npm i -g supabase`):

```bash
supabase login
supabase link --project-ref <your-project-ref>

supabase functions deploy grant-writer-generate
supabase functions deploy grant-writer-chat
supabase functions deploy grantfinder-search
supabase functions deploy grantfinder-index
supabase functions deploy library-ingest
supabase functions deploy library-rag
supabase functions deploy ads-generate
```

### 5) Seed data awal (opsional tapi disarankan)

- **Grantfinder**: insert beberapa baris ke `public.grants_catalog` (manual via SQL Editor atau import CSV).
  Lalu trigger embedding dengan POST ke `<SUPABASE_URL>/functions/v1/grantfinder-index`
  (dari user dengan role `admin` di tabel `profiles`).
- **Library**: upload dokumen via UI (akan otomatis chunk + embed lewat `library-ingest`).

### 6) Frontend env (kalau belum)

Pastikan `.env.local` di repo punya:

```
VITE_SUPABASE_URL=https://<your-project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<your-anon-key>
```

`VITE_SUPABASE_URL` wajib supaya helper-helper di `src/lib/*/ai.ts` bisa menemukan edge functions.

---

## 🧪 Cara test tiap fitur

| Fitur | Cara test |
|-------|-----------|
| Grant Writer chat | Buka wizard, kirim pesan di sidebar. Badge berubah jadi **Live** kalau Foundry aktif, **Mock** kalau fallback. |
| Grantfinder semantik | Setelah seed grants_catalog + index, panggil `aiGrantSearch({ query: 'pendidikan anak terpencil' })` — kembalikan hasil + `summary` AI. |
| Library RAG | `await ingestLibraryText({ title, text })` lalu `await askLibrary({ question })`. |
| Ads | `await generateAds({ audience, goal, platform, tone, key_points })`. |

Semua fungsi punya **graceful fallback**: kalau secrets belum di-set, kembalikan stub/mock data
sehingga UI tidak crash.

---

## 🐛 Bug yang sudah di-fix di Phase F

- **Hero gradient text tampil sebagai blok solid**: ditambah `-webkit-background-clip: text` dan
  `WebkitTextFillColor: transparent` secara eksplisit.

## 🔭 Next steps yang masih perlu dikerjakan (opsional)

1. **PDF upload di Library**: parser client-side pakai `pdfjs-dist`. Saat ini `library-ingest` hanya menerima plain text.
2. **UI integration untuk Grantfinder/Library/Ads**: helper sudah siap, tapi halaman aslinya (Grantfinder.tsx, ImpactoryLibrary.tsx, ImpactoryAds.tsx) masih pakai data mock. Tinggal panggil helper di handler tombol.
3. **Streaming chat tool-calls**: edge function saat ini hanya streaming text. Untuk fitur autofill wizard via tool call, perlu extend `grant-writer-chat` dengan function calling Foundry.
4. **Quota & rate limit**: tabel `ai_generations` sudah merekam tiap call → pakai untuk quota per organisasi.
5. **Cron untuk re-index**: schedule `grantfinder-index` jalan tiap malam supaya grant baru otomatis di-embed.

---

## 🔐 Catatan keamanan

- API key Azure **tidak boleh** masuk ke frontend. Semua call AI dilakukan via edge function.
- RLS aktif di semua tabel — user hanya bisa baca/tulis data organisasinya sendiri.
- Edge function pakai `service role` hanya untuk insert log & write yang sudah divalidasi via JWT.

---

_Last updated: Phase A–F lengkap, tinggal config Foundry dan deploy._
