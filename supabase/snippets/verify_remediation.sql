-- supabase/snippets/verify_remediation.sql
-- READ-ONLY. Pemeriksaan akhir setelah apply_pending_manual.sql dijalankan.
-- Setiap baris harus berstatus AMAN atau ADA. Apa pun selain itu = belum beres.

SELECT 'KEAMANAN 1: invitations_read_by_token dihapus' AS pemeriksaan,
       CASE WHEN NOT EXISTS (
         SELECT 1 FROM pg_policy p JOIN pg_class c ON c.oid = p.polrelid
         WHERE c.relname = 'organization_invitations'
           AND p.polname = 'invitations_read_by_token'
       ) THEN 'AMAN' ELSE 'MASIH ADA' END AS status

UNION ALL SELECT 'KEAMANAN 2: members_self_insert wajib pembuat org',
       CASE WHEN EXISTS (
         SELECT 1 FROM pg_policy p JOIN pg_class c ON c.oid = p.polrelid
         WHERE c.relname = 'organization_members'
           AND p.polname = 'members_self_insert'
           AND pg_get_expr(p.polwithcheck, p.polrelid) LIKE '%is_org_creator%'
       ) THEN 'AMAN' ELSE 'BELUM' END

UNION ALL SELECT 'KEAMANAN 3: wbs_completion_claims tanpa auth.role()',
       CASE WHEN NOT EXISTS (
         SELECT 1 FROM pg_policy p JOIN pg_class c ON c.oid = p.polrelid
         WHERE c.relname = 'wbs_completion_claims'
           AND COALESCE(pg_get_expr(p.polqual, p.polrelid), '') LIKE '%auth.role()%'
       ) THEN 'AMAN' ELSE 'MASIH BOCOR' END

UNION ALL SELECT 'KEAMANAN 4: wbs_completion_evidence tanpa auth.role()',
       CASE WHEN NOT EXISTS (
         SELECT 1 FROM pg_policy p JOIN pg_class c ON c.oid = p.polrelid
         WHERE c.relname = 'wbs_completion_evidence'
           AND COALESCE(pg_get_expr(p.polqual, p.polrelid), '') LIKE '%auth.role()%'
       ) THEN 'AMAN' ELSE 'MASIH BOCOR' END

UNION ALL SELECT 'KEAMANAN 5: system_integrations tak bisa ditulis publik',
       CASE WHEN NOT EXISTS (
         SELECT 1 FROM pg_policy p JOIN pg_class c ON c.oid = p.polrelid
         WHERE c.relname = 'system_integrations'
           AND COALESCE(pg_get_expr(p.polwithcheck, p.polrelid), '') = 'true'
       ) THEN 'AMAN' ELSE 'MASIH TERBUKA' END

UNION ALL SELECT 'KEAMANAN 6: system_integrations_read hanya untuk login',
       CASE WHEN EXISTS (
         SELECT 1 FROM pg_policy p JOIN pg_class c ON c.oid = p.polrelid
         WHERE c.relname = 'system_integrations'
           AND p.polname = 'system_integrations_read'
           AND EXISTS (SELECT 1 FROM pg_roles r
                       WHERE r.oid = ANY (p.polroles) AND r.rolname = 'authenticated')
       ) THEN 'AMAN' ELSE 'PERIKSA' END

UNION ALL SELECT 'FITUR 1: kolom lfa_wbs_items.carbon_quantity',
       CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns
         WHERE table_schema='public' AND table_name='lfa_wbs_items'
           AND column_name='carbon_quantity') THEN 'ADA' ELSE 'HILANG' END

UNION ALL SELECT 'FITUR 2: kolom lfa_wbs_items.carbon_scope',
       CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns
         WHERE table_schema='public' AND table_name='lfa_wbs_items'
           AND column_name='carbon_scope') THEN 'ADA' ELSE 'HILANG' END

UNION ALL SELECT 'FITUR 3: kolom lfa_sroi_outcomes.stakeholder_group',
       CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns
         WHERE table_schema='public' AND table_name='lfa_sroi_outcomes'
           AND column_name='stakeholder_group') THEN 'ADA' ELSE 'HILANG' END

UNION ALL SELECT 'RATE LIMIT 1: tabel ai_rate_limits',
       CASE WHEN to_regclass('public.ai_rate_limits') IS NOT NULL
       THEN 'ADA' ELSE 'HILANG' END

UNION ALL SELECT 'RATE LIMIT 2: fungsi consume_ai_rate_limit',
       CASE WHEN EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
         WHERE n.nspname='public' AND p.proname='consume_ai_rate_limit')
       THEN 'ADA' ELSE 'HILANG' END

UNION ALL SELECT 'LEDGER: 7 versi migrasi tercatat',
       CASE WHEN (SELECT count(*) FROM supabase_migrations.schema_migrations
         WHERE version IN ('20260725020000','20260725130000','20260725140000',
                           '20260725150000','20260726000000','20260726020000',
                           '20260726030000')) = 7
       THEN 'AMAN' ELSE 'BELUM LENGKAP' END

ORDER BY 1;
