import shutil

with open('supabase/migrations/20260728190000_fix_wbs_materialization_when_lfa_exists.sql', 'r', encoding='utf-8') as f:
    sql = f.read()

with open('supabase/migrations/20260728203000_update_materialize_grantwriter_document_fix.sql', 'w', encoding='utf-8') as f:
    f.write(sql)

print('Created 20260728203000_update_materialize_grantwriter_document_fix.sql')
