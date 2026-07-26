-- Run AFTER 20260727020000_plan_entitlements.sql.
-- Every row should read AMAN. Anything else means the migration did not take.

-- 1. Does every organisation have a subscription row?
SELECT
  'Semua organisasi punya baris langganan' AS cek,
  CASE WHEN COUNT(*) = 0 THEN 'AMAN' ELSE 'GAGAL — ' || COUNT(*) || ' organisasi tanpa langganan' END AS hasil
FROM public.organizations o
WHERE NOT EXISTS (SELECT 1 FROM public.subscriptions s WHERE s.organization_id = o.id)

UNION ALL

-- 2. Is the trigger in place for organisations created from now on?
SELECT
  'Trigger langganan default aktif',
  CASE WHEN COUNT(*) = 1 THEN 'AMAN' ELSE 'GAGAL — trigger tidak ditemukan' END
FROM pg_trigger
WHERE tgname = 'trg_org_default_subscription' AND NOT tgisinternal

UNION ALL

-- 3. Does the entitlement function exist?
SELECT
  'Fungsi has_paid_plan ada',
  CASE WHEN COUNT(*) = 1 THEN 'AMAN' ELSE 'GAGAL — fungsi tidak ditemukan' END
FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public' AND p.proname = 'has_paid_plan'

UNION ALL

-- 4. Do all five paid entry points actually call it?
SELECT
  'Lima modul berbayar memanggil has_paid_plan',
  CASE WHEN COUNT(*) = 5 THEN 'AMAN' ELSE 'GAGAL — hanya ' || COUNT(*) || ' dari 5 tabel yang terkunci' END
FROM pg_policies
WHERE schemaname = 'public'
  AND cmd = 'INSERT'
  AND with_check LIKE '%has_paid_plan%'
  AND tablename IN ('gw_projects', 'lfa_projects', 'library_documents', 'beneficiaries', 'grantfinder_searches')

UNION ALL

-- 5. The free modules must stay free — no plan test anywhere near them.
SELECT
  'Modul Dasar tetap gratis',
  CASE WHEN COUNT(*) = 0 THEN 'AMAN' ELSE 'GAGAL — ' || COUNT(*) || ' kebijakan modul gratis ikut terkunci' END
FROM pg_policies
WHERE schemaname = 'public'
  AND with_check LIKE '%has_paid_plan%'
  AND tablename IN ('readiness_scores', 'donors', 'donations', 'donor_followups', 'ads_briefs', 'ads_generations')

UNION ALL

-- 6. Reading and editing must NOT be gated — a lapsed organisation keeps its data.
SELECT
  'Baca & ubah tidak ikut terkunci',
  CASE WHEN COUNT(*) = 0 THEN 'AMAN' ELSE 'GAGAL — ' || COUNT(*) || ' kebijakan SELECT/UPDATE ikut terkunci' END
FROM pg_policies
WHERE schemaname = 'public'
  AND cmd IN ('SELECT', 'UPDATE')
  AND COALESCE(qual, '') || COALESCE(with_check, '') LIKE '%has_paid_plan%'

UNION ALL

-- 7. Your own foundation must still be on the paid plan.
SELECT
  'Yayasan Anda tetap berbayar',
  COALESCE(
    (SELECT 'AMAN — ' || o.name || ' / ' || s.plan || ' / ' || s.status
     FROM public.organizations o
     JOIN public.subscriptions s ON s.organization_id = o.id
     JOIN public.organization_members m ON m.organization_id = o.id
     JOIN auth.users u ON u.id = m.user_id
     WHERE u.email = 'info@bisabaik.or.id' AND s.plan <> 'free'
     LIMIT 1),
    'GAGAL — organisasi info@bisabaik.or.id tidak berbayar'
  );

-- Daftar lengkap paket tiap organisasi.
SELECT o.name AS organisasi, s.plan AS paket, s.status, s.current_period_end AS berlaku_sampai
FROM public.organizations o
LEFT JOIN public.subscriptions s ON s.organization_id = o.id
ORDER BY (s.plan = 'free') NULLS FIRST, o.name;


-- ===========================================================================
-- MENAIKKAN PAKET SETELAH ADA YANG MEMBAYAR
--
-- Kolom plan memakai enum plan_tier, jadi hanya empat nilai ini yang diterima:
--
--   free        -> paket Dasar (Rp 0)
--   premium     -> paket Berdaya (Rp 499.000/bln)
--   enterprise  -> paket Institusi
--   starter     -> belum dipakai; tersedia bila nanti ada tier di bawah Berdaya
--
-- Semua yang bukan 'free' membuka modul berbayar. Perbedaan Berdaya dan
-- Institusi ada di white label, API, SSO dan pendampingan — hal di luar
-- aplikasi, jadi tidak ada yang perlu dibedakan di tingkat basis data.
--
-- Ganti alamat surel dan tanggalnya, lalu jalankan:
-- ===========================================================================

-- UPDATE public.subscriptions s
-- SET plan = 'premium',
--     status = 'active',
--     current_period_start = now(),
--     current_period_end = now() + interval '1 month',
--     cancel_at_period_end = false,
--     updated_at = now()
-- FROM public.organization_members m
-- JOIN auth.users u ON u.id = m.user_id
-- WHERE m.organization_id = s.organization_id
--   AND u.email = 'ganti@dengan-email-pembeli.com';

-- Menurunkan kembali saat langganan habis dan tidak diperpanjang:
-- UPDATE public.subscriptions SET plan = 'free', status = 'canceled', updated_at = now()
-- WHERE organization_id = 'ganti-dengan-uuid-organisasi';
