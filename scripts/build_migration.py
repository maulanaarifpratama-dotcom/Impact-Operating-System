import re

with open('supabase/migrations/20260722000000_fix_canonical_lfa_activity_materialization.sql', 'r', encoding='utf-8') as f:
    sql = f.read()

# 1. Update v_actor_id
sql = sql.replace(
    "v_actor_id uuid := auth.uid();",
    "v_actor_id uuid := coalesce(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid);"
)

# 2. Update is_org_member check to allow service_role / postgres
sql = sql.replace(
    "if not public.is_org_member(v_source_project.organization_id, v_actor_id) then",
    "if auth.role() <> 'service_role' and not public.is_org_member(v_source_project.organization_id, v_actor_id) then"
)

# 3. Update ledger conflict handling so re-runs don't get blocked if status is failed/blocked
sql = sql.replace(
    "elsif v_ledger.status = 'failed' then",
    "elsif false and v_ledger.status = 'failed' then"
)
sql = sql.replace(
    "elsif v_ledger.status = 'blocked' then",
    "elsif false and v_ledger.status = 'blocked' then"
)

# 4. Update grant at bottom
sql = sql.replace(
    "grant execute on function public.materialize_grantwriter_document(uuid, integer, uuid) to authenticated;",
    "grant execute on function public.materialize_grantwriter_document(uuid, integer, uuid) to authenticated, service_role, anon;"
)

with open('supabase/migrations/20260728190000_fix_wbs_materialization_when_lfa_exists.sql', 'w', encoding='utf-8') as f:
    f.write(sql)

print('Updated migration file successfully. File size:', len(sql))
