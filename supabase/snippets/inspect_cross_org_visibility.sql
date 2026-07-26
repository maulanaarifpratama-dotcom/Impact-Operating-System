-- Kenapa akun info@bisabaik.or.id bisa melihat organisasi dan proposal milik
-- orang lain?
--
-- Dua kemungkinan, dan keduanya perlu tindakan berbeda:
--
--   (a) Disengaja — kebijakannya memang memberi akses ke admin platform.
--       Kalau begitu, test isolasi tenant yang perlu diperbarui.
--
--   (b) Bocor — kebijakannya longgar untuk semua pengguna yang login, dan
--       kebetulan tertangkap karena akun ini dipakai untuk test. Kalau begitu,
--       setiap pengguna Impactory bisa melihat daftar organisasi pengguna lain
--       beserta judul proposalnya, dan itu harus ditutup hari ini juga.
--
-- Query ini membedakan keduanya. Kirimkan seluruh hasilnya.

-- 1. Kebijakan baca pada dua tabel yang bocor.
--    Perhatikan kolom "qual": kalau isinya menyebut admin_users atau semacamnya,
--    berarti (a). Kalau isinya true, atau tidak menyebut keanggotaan sama
--    sekali, berarti (b).
SELECT
  tablename  AS tabel,
  policyname AS nama_kebijakan,
  cmd        AS perintah,
  roles      AS untuk_role,
  qual       AS syarat_baca
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('organizations', 'gw_projects')
  AND cmd IN ('SELECT', 'ALL')
ORDER BY tablename, policyname;

-- 2. Siapa saja yang terdaftar sebagai admin platform.
SELECT u.email, a.*
FROM public.admin_users a
LEFT JOIN auth.users u ON u.id = a.user_id;

-- 3. Fungsi bantu apa saja yang ada kaitannya dengan admin, kalau ada.
SELECT p.proname AS nama_fungsi, pg_get_functiondef(p.oid) AS definisi
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname ILIKE '%admin%';
