# `db/` — historical archive, not the source of truth

The `chunk*.sql` files here date from the project's early stage, when the schema
was applied by pasting SQL into the Supabase SQL Editor by hand.

**The schema's source of truth is now [`supabase/migrations/`](../supabase/migrations/).**
Apply it through the Supabase CLI, not from this folder.

These files are kept for two reasons: they are still referenced as setup steps
by [`docs/AZURE_FOUNDRY_SETUP.md`](../docs/AZURE_FOUNDRY_SETUP.md) and
[`docs/IMPACTORY_AI_MASTER_DOC.md`](../docs/IMPACTORY_AI_MASTER_DOC.md), and
their equivalence to the migrations has never been verified line by line.
Deleting them now would risk breaking a setup path that is still documented.

Do not apply anything in this folder to a running database. Its contents may
differ from production — the same lesson recorded in
[`docs/audit/2026-07-26-security-remediation.md`](../docs/audit/2026-07-26-security-remediation.md):
for anything whose schema lives outside the repo, read the database before
writing or running SQL against it.
