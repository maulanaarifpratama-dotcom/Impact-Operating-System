# `db/` — arsip historis, bukan sumber kebenaran

Berkas `chunk*.sql` di folder ini berasal dari tahap awal proyek, ketika skema
diterapkan dengan menyalin SQL ke Supabase SQL Editor secara manual.

**Sumber kebenaran skema sekarang ada di [`supabase/migrations/`](../supabase/migrations/).**
Jalankan lewat Supabase CLI, bukan dari folder ini.

Berkas di sini dipertahankan karena masih dirujuk sebagai langkah setup oleh
[`docs/AZURE_FOUNDRY_SETUP.md`](../docs/AZURE_FOUNDRY_SETUP.md) dan
[`docs/IMPACTORY_AI_MASTER_DOC.md`](../docs/IMPACTORY_AI_MASTER_DOC.md), dan
karena ekuivalensinya terhadap migration belum diverifikasi baris per baris.
Menghapusnya sekarang berisiko memutus jalur setup yang masih didokumentasikan.

Jangan menerapkan berkas di folder ini ke database yang sudah berjalan. Isinya
bisa berbeda dari kondisi produksi — pelajaran yang sama yang tercatat di
[`docs/audit/2026-07-26-security-remediation.md`](../docs/audit/2026-07-26-security-remediation.md):
untuk apa pun yang skemanya hidup di luar repo, baca dulu databasenya sebelum
menulis atau menjalankan SQL.
