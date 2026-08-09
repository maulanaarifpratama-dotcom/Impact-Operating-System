-- PD-M2: Cross-project WBS/Budget referential integrity hardening.
--
-- Root cause: lfa_budget_items.wbs_item_id references lfa_wbs_items(id) alone.
-- Postgres single-column FKs don't carry project scope, so a budget item can
-- reference a WBS item that belongs to a DIFFERENT lfa_project_id -- the FK is
-- satisfied (the row exists) even though it's the wrong project's row. This is
-- exactly the condition materialize_grantwriter_document's "budget_state_check"
-- has to detect defensively at runtime (join on both id AND lfa_project_id).
-- Making the FK composite makes a cross-project reference impossible to insert
-- in the first place, so that runtime check becomes unreachable dead code
-- instead of a live safety net.
--
-- lfa_wbs_items.id is already globally unique (primary key); the new UNIQUE
-- (id, lfa_project_id) constraint is required only so a composite FK can
-- target it -- it does not change any existing behavior on its own.

alter table public.lfa_wbs_items
  add constraint lfa_wbs_items_id_lfa_project_id_key unique (id, lfa_project_id);

alter table public.lfa_budget_items
  drop constraint if exists lfa_budget_items_wbs_item_id_fkey;

alter table public.lfa_budget_items
  add constraint lfa_budget_items_wbs_item_id_fkey
    foreign key (wbs_item_id, lfa_project_id)
    references public.lfa_wbs_items (id, lfa_project_id)
    on delete cascade;
