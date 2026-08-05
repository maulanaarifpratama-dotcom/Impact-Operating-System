-- Migration: 20260806000000_add_programme_deliverable_register_d1.sql
-- Description: Deliverable Register D1 database foundation (schema, lifecycle RPCs, RLS, append-only events).

CREATE TABLE IF NOT EXISTS public.programme_deliverables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id),
  lfa_project_id UUID NOT NULL REFERENCES public.lfa_projects(id),
  wbs_item_id UUID NULL REFERENCES public.lfa_wbs_items(id) ON DELETE SET NULL,
  deliverable_type TEXT NOT NULL DEFAULT 'OTHER',
  title TEXT NOT NULL,
  description TEXT NULL,
  lifecycle_status TEXT NOT NULL DEFAULT 'DRAFT',
  owner_id UUID NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  external_owner_text TEXT NULL,
  reviewer_id UUID NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  target_date DATE NOT NULL,
  target_date_is_estimated BOOLEAN NOT NULL DEFAULT false,
  forecast_date DATE NULL,
  submitted_at TIMESTAMPTZ NULL,
  approved_at TIMESTAMPTZ NULL,
  accepted_at TIMESTAMPTZ NULL,
  exception_reason TEXT NULL,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  archived_at TIMESTAMPTZ NULL,
  archived_by UUID NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  archive_reason TEXT NULL,

  CONSTRAINT programme_deliverables_title_nonblank
    CHECK (nullif(btrim(title), '') IS NOT NULL),

  CONSTRAINT programme_deliverables_type_check
    CHECK (deliverable_type IN (
      'REPORT',
      'DATASET',
      'CODEBOOK',
      'INSTRUMENT',
      'MATRIX',
      'WORKSHOP_OUTPUT',
      'PRESENTATION',
      'COMMUNICATION_PRODUCT',
      'CONTRACTUAL_SUBMISSION',
      'OTHER'
    )),

  CONSTRAINT programme_deliverables_lifecycle_status_check
    CHECK (lifecycle_status IN (
      'DRAFT',
      'PLANNED',
      'IN_PROGRESS',
      'READY_FOR_REVIEW',
      'CHANGES_REQUESTED',
      'APPROVED',
      'SUBMITTED',
      'ACCEPTED',
      'CANCELLED'
    )),

  CONSTRAINT programme_deliverables_owner_external_mutual_exclusive
    CHECK (
      owner_id IS NULL
      OR nullif(btrim(coalesce(external_owner_text, '')), '') IS NULL
    ),

  CONSTRAINT programme_deliverables_external_owner_nonblank
    CHECK (
      external_owner_text IS NULL
      OR nullif(btrim(external_owner_text), '') IS NOT NULL
    ),

  CONSTRAINT programme_deliverables_submitted_at_required
    CHECK (
      lifecycle_status NOT IN ('SUBMITTED', 'ACCEPTED')
      OR submitted_at IS NOT NULL
    ),

  CONSTRAINT programme_deliverables_approved_at_required
    CHECK (
      lifecycle_status NOT IN ('APPROVED', 'SUBMITTED', 'ACCEPTED')
      OR approved_at IS NOT NULL
    ),

  CONSTRAINT programme_deliverables_accepted_at_required
    CHECK (
      lifecycle_status <> 'ACCEPTED'
      OR accepted_at IS NOT NULL
    ),

  CONSTRAINT programme_deliverables_accepted_after_submitted
    CHECK (
      accepted_at IS NULL
      OR submitted_at IS NULL
      OR accepted_at >= submitted_at
    ),

  CONSTRAINT programme_deliverables_exception_reason_nonblank
    CHECK (
      exception_reason IS NULL
      OR nullif(btrim(exception_reason), '') IS NOT NULL
    ),

  CONSTRAINT programme_deliverables_archive_triplet
    CHECK (
      (archived_at IS NULL AND archived_by IS NULL AND archive_reason IS NULL)
      OR
      (
        archived_at IS NOT NULL
        AND archived_by IS NOT NULL
        AND nullif(btrim(coalesce(archive_reason, '')), '') IS NOT NULL
      )
    )
);

CREATE TABLE IF NOT EXISTS public.programme_deliverable_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id),
  lfa_project_id UUID NOT NULL REFERENCES public.lfa_projects(id),
  deliverable_id UUID NOT NULL REFERENCES public.programme_deliverables(id) ON DELETE RESTRICT,
  event_type TEXT NOT NULL,
  from_status TEXT NULL,
  to_status TEXT NULL,
  actor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  event_reason TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT programme_deliverable_events_type_check
    CHECK (event_type IN ('CREATED', 'METADATA_UPDATED', 'LIFECYCLE_CHANGED', 'ARCHIVED')),

  CONSTRAINT programme_deliverable_events_reason_nonblank
    CHECK (
      event_reason IS NULL
      OR nullif(btrim(event_reason), '') IS NOT NULL
    )
);

CREATE INDEX IF NOT EXISTS idx_programme_deliverables_org_project
  ON public.programme_deliverables(org_id, lfa_project_id);

CREATE INDEX IF NOT EXISTS idx_programme_deliverables_project_status
  ON public.programme_deliverables(lfa_project_id, lifecycle_status);

CREATE INDEX IF NOT EXISTS idx_programme_deliverables_project_target_date
  ON public.programme_deliverables(lfa_project_id, target_date);

CREATE INDEX IF NOT EXISTS idx_programme_deliverables_wbs_item
  ON public.programme_deliverables(wbs_item_id)
  WHERE wbs_item_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_programme_deliverables_owner
  ON public.programme_deliverables(owner_id)
  WHERE owner_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_programme_deliverables_reviewer
  ON public.programme_deliverables(reviewer_id)
  WHERE reviewer_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_programme_deliverables_archived_at
  ON public.programme_deliverables(archived_at);

CREATE INDEX IF NOT EXISTS idx_programme_deliverable_events_deliverable_created_at
  ON public.programme_deliverable_events(deliverable_id, created_at);

CREATE OR REPLACE FUNCTION public.trg_programme_deliverables_validate_integrity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_project_org UUID;
  v_wbs_org UUID;
  v_wbs_project UUID;
BEGIN
  SELECT p.org_id INTO v_project_org
  FROM public.lfa_projects p
  WHERE p.id = NEW.lfa_project_id;

  IF v_project_org IS NULL THEN
    RAISE EXCEPTION 'INVALID_DELIVERABLE_PROJECT';
  END IF;

  IF NEW.org_id <> v_project_org THEN
    RAISE EXCEPTION 'INVALID_DELIVERABLE_PROJECT';
  END IF;

  IF NEW.wbs_item_id IS NOT NULL THEN
    SELECT w.org_id, w.lfa_project_id
      INTO v_wbs_org, v_wbs_project
    FROM public.lfa_wbs_items w
    WHERE w.id = NEW.wbs_item_id;

    IF v_wbs_org IS NULL THEN
      RAISE EXCEPTION 'INVALID_DELIVERABLE_WBS_REFERENCE';
    END IF;

    IF v_wbs_project <> NEW.lfa_project_id THEN
      RAISE EXCEPTION 'CROSS_PROJECT_DELIVERABLE_WBS';
    END IF;

    IF v_wbs_org <> NEW.org_id THEN
      RAISE EXCEPTION 'CROSS_ORG_DELIVERABLE_WBS';
    END IF;
  END IF;

  IF NEW.owner_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1
      FROM public.organization_members m
      WHERE m.organization_id = NEW.org_id
        AND m.user_id = NEW.owner_id
    ) THEN
      RAISE EXCEPTION 'INVALID_DELIVERABLE_OWNER';
    END IF;
  END IF;

  IF NEW.reviewer_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1
      FROM public.organization_members m
      WHERE m.organization_id = NEW.org_id
        AND m.user_id = NEW.reviewer_id
    ) THEN
      RAISE EXCEPTION 'INVALID_DELIVERABLE_REVIEWER';
    END IF;
  END IF;

  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_programme_deliverables_validate_integrity ON public.programme_deliverables;
CREATE TRIGGER trg_programme_deliverables_validate_integrity
  BEFORE INSERT OR UPDATE OF org_id, lfa_project_id, wbs_item_id, owner_id, reviewer_id, external_owner_text, title, deliverable_type, lifecycle_status, submitted_at, approved_at, accepted_at, exception_reason, archived_at, archived_by, archive_reason
  ON public.programme_deliverables
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_programme_deliverables_validate_integrity();

CREATE OR REPLACE FUNCTION public.create_programme_deliverable(
  p_lfa_project_id UUID,
  p_wbs_item_id UUID DEFAULT NULL,
  p_deliverable_type TEXT DEFAULT 'OTHER',
  p_title TEXT DEFAULT '',
  p_description TEXT DEFAULT NULL,
  p_owner_id UUID DEFAULT NULL,
  p_external_owner_text TEXT DEFAULT NULL,
  p_reviewer_id UUID DEFAULT NULL,
  p_target_date DATE DEFAULT NULL,
  p_target_date_is_estimated BOOLEAN DEFAULT false,
  p_forecast_date DATE DEFAULT NULL
)
RETURNS public.programme_deliverables
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_actor UUID := auth.uid();
  v_org_id UUID;
  v_wbs_org UUID;
  v_wbs_project UUID;
  v_row public.programme_deliverables;
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'UNAUTHENTICATED';
  END IF;

  SELECT p.org_id INTO v_org_id
  FROM public.lfa_projects p
  WHERE p.id = p_lfa_project_id;

  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'INVALID_DELIVERABLE_PROJECT';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.organization_members m
    WHERE m.organization_id = v_org_id AND m.user_id = v_actor
  ) THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;

  IF p_owner_id IS NOT NULL AND p_external_owner_text IS NOT NULL AND nullif(btrim(p_external_owner_text), '') IS NOT NULL THEN
    RAISE EXCEPTION 'INVALID_DELIVERABLE_OWNER';
  END IF;

  IF p_owner_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.organization_members m
    WHERE m.organization_id = v_org_id AND m.user_id = p_owner_id
  ) THEN
    RAISE EXCEPTION 'INVALID_DELIVERABLE_OWNER';
  END IF;

  IF p_reviewer_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.organization_members m
    WHERE m.organization_id = v_org_id AND m.user_id = p_reviewer_id
  ) THEN
    RAISE EXCEPTION 'INVALID_DELIVERABLE_REVIEWER';
  END IF;

  IF p_wbs_item_id IS NOT NULL THEN
    SELECT w.org_id, w.lfa_project_id
      INTO v_wbs_org, v_wbs_project
    FROM public.lfa_wbs_items w
    WHERE w.id = p_wbs_item_id;

    IF v_wbs_org IS NULL THEN
      RAISE EXCEPTION 'INVALID_DELIVERABLE_WBS_REFERENCE';
    END IF;

    IF v_wbs_project <> p_lfa_project_id THEN
      RAISE EXCEPTION 'CROSS_PROJECT_DELIVERABLE_WBS';
    END IF;

    IF v_wbs_org <> v_org_id THEN
      RAISE EXCEPTION 'CROSS_ORG_DELIVERABLE_WBS';
    END IF;
  END IF;

  IF p_target_date IS NULL THEN
    RAISE EXCEPTION 'INVALID_TRANSITION';
  END IF;

  INSERT INTO public.programme_deliverables (
    org_id,
    lfa_project_id,
    wbs_item_id,
    deliverable_type,
    title,
    description,
    lifecycle_status,
    owner_id,
    external_owner_text,
    reviewer_id,
    target_date,
    target_date_is_estimated,
    forecast_date,
    created_by
  )
  VALUES (
    v_org_id,
    p_lfa_project_id,
    p_wbs_item_id,
    p_deliverable_type,
    p_title,
    p_description,
    'DRAFT',
    p_owner_id,
    p_external_owner_text,
    p_reviewer_id,
    p_target_date,
    coalesce(p_target_date_is_estimated, false),
    p_forecast_date,
    v_actor
  )
  RETURNING * INTO v_row;

  INSERT INTO public.programme_deliverable_events (
    org_id,
    lfa_project_id,
    deliverable_id,
    event_type,
    from_status,
    to_status,
    actor_id,
    event_reason
  )
  VALUES (
    v_row.org_id,
    v_row.lfa_project_id,
    v_row.id,
    'CREATED',
    NULL,
    'DRAFT',
    v_actor,
    NULL
  );

  RETURN v_row;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_programme_deliverable_metadata(
  p_deliverable_id UUID,
  p_wbs_item_id UUID,
  p_update_wbs_item_id BOOLEAN DEFAULT false,
  p_deliverable_type TEXT DEFAULT NULL,
  p_title TEXT DEFAULT NULL,
  p_description TEXT DEFAULT NULL,
  p_update_description BOOLEAN DEFAULT false,
  p_owner_id UUID DEFAULT NULL,
  p_update_owner_id BOOLEAN DEFAULT false,
  p_external_owner_text TEXT DEFAULT NULL,
  p_update_external_owner_text BOOLEAN DEFAULT false,
  p_reviewer_id UUID DEFAULT NULL,
  p_update_reviewer_id BOOLEAN DEFAULT false,
  p_target_date DATE DEFAULT NULL,
  p_target_date_is_estimated BOOLEAN DEFAULT false,
  p_forecast_date DATE DEFAULT NULL,
  p_update_forecast_date BOOLEAN DEFAULT false
)
RETURNS public.programme_deliverables
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_actor UUID := auth.uid();
  v_row public.programme_deliverables;
  v_current public.programme_deliverables;
  v_wbs_org UUID;
  v_wbs_project UUID;
  v_next_wbs_item_id UUID;
  v_next_description TEXT;
  v_next_owner_id UUID;
  v_next_external_owner_text TEXT;
  v_next_reviewer_id UUID;
  v_next_forecast_date DATE;
  v_external_owner_clean TEXT;
  v_changed BOOLEAN := false;
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'UNAUTHENTICATED';
  END IF;

  SELECT * INTO v_row
  FROM public.programme_deliverables d
  WHERE d.id = p_deliverable_id
  FOR UPDATE;

  IF v_row.id IS NULL THEN
    RAISE EXCEPTION 'INVALID_DELIVERABLE_PROJECT';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.organization_members m
    WHERE m.organization_id = v_row.org_id AND m.user_id = v_actor
  ) THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;

  IF v_row.archived_at IS NOT NULL THEN
    RAISE EXCEPTION 'ARCHIVED_DELIVERABLE';
  END IF;

  v_current := v_row;
  v_next_wbs_item_id := v_row.wbs_item_id;
  v_next_description := v_row.description;
  v_next_owner_id := v_row.owner_id;
  v_next_external_owner_text := v_row.external_owner_text;
  v_next_reviewer_id := v_row.reviewer_id;
  v_next_forecast_date := v_row.forecast_date;
  v_external_owner_clean := nullif(btrim(coalesce(p_external_owner_text, '')), '');

  IF coalesce(p_update_wbs_item_id, false) THEN
    v_next_wbs_item_id := p_wbs_item_id;
  END IF;

  IF coalesce(p_update_description, false) THEN
    v_next_description := nullif(btrim(coalesce(p_description, '')), '');
  END IF;

  IF coalesce(p_update_owner_id, false) AND coalesce(p_update_external_owner_text, false) THEN
    IF p_owner_id IS NOT NULL AND v_external_owner_clean IS NOT NULL THEN
      RAISE EXCEPTION 'INVALID_OWNER_PATCH';
    ELSIF p_owner_id IS NOT NULL THEN
      v_next_owner_id := p_owner_id;
      v_next_external_owner_text := NULL;
    ELSIF v_external_owner_clean IS NOT NULL THEN
      v_next_owner_id := NULL;
      v_next_external_owner_text := v_external_owner_clean;
    ELSE
      v_next_owner_id := NULL;
      v_next_external_owner_text := NULL;
    END IF;
  ELSIF coalesce(p_update_owner_id, false) THEN
    IF p_owner_id IS NULL THEN
      v_next_owner_id := NULL;
      v_next_external_owner_text := NULL;
    ELSE
      v_next_owner_id := p_owner_id;
      v_next_external_owner_text := NULL;
    END IF;
  ELSIF coalesce(p_update_external_owner_text, false) THEN
    IF v_external_owner_clean IS NULL THEN
      v_next_owner_id := NULL;
      v_next_external_owner_text := NULL;
    ELSE
      v_next_owner_id := NULL;
      v_next_external_owner_text := v_external_owner_clean;
    END IF;
  END IF;

  IF coalesce(p_update_reviewer_id, false) THEN
    IF p_reviewer_id IS NULL
       AND v_row.lifecycle_status IN ('READY_FOR_REVIEW', 'CHANGES_REQUESTED', 'APPROVED', 'SUBMITTED', 'ACCEPTED') THEN
      RAISE EXCEPTION 'REVIEWER_REQUIRED';
    END IF;
    v_next_reviewer_id := p_reviewer_id;
  END IF;

  IF coalesce(p_update_forecast_date, false) THEN
    v_next_forecast_date := p_forecast_date;
  END IF;

  IF v_next_owner_id IS NOT NULL AND v_next_external_owner_text IS NOT NULL THEN
    RAISE EXCEPTION 'INVALID_OWNER_PATCH';
  END IF;

  IF v_next_owner_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.organization_members m
    WHERE m.organization_id = v_row.org_id AND m.user_id = v_next_owner_id
  ) THEN
    RAISE EXCEPTION 'INVALID_DELIVERABLE_OWNER';
  END IF;

  IF v_next_reviewer_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.organization_members m
    WHERE m.organization_id = v_row.org_id AND m.user_id = v_next_reviewer_id
  ) THEN
    RAISE EXCEPTION 'INVALID_DELIVERABLE_REVIEWER';
  END IF;

  IF v_next_wbs_item_id IS NOT NULL THEN
    SELECT w.org_id, w.lfa_project_id
      INTO v_wbs_org, v_wbs_project
    FROM public.lfa_wbs_items w
    WHERE w.id = v_next_wbs_item_id;

    IF v_wbs_org IS NULL THEN
      RAISE EXCEPTION 'INVALID_DELIVERABLE_WBS_REFERENCE';
    END IF;

    IF v_wbs_project <> v_row.lfa_project_id THEN
      RAISE EXCEPTION 'CROSS_PROJECT_DELIVERABLE_WBS';
    END IF;

    IF v_wbs_org <> v_row.org_id THEN
      RAISE EXCEPTION 'CROSS_ORG_DELIVERABLE_WBS';
    END IF;
  END IF;

  v_changed :=
    v_next_wbs_item_id IS DISTINCT FROM v_current.wbs_item_id
    OR p_deliverable_type IS DISTINCT FROM v_current.deliverable_type
    OR p_title IS DISTINCT FROM v_current.title
    OR v_next_description IS DISTINCT FROM v_current.description
    OR v_next_owner_id IS DISTINCT FROM v_current.owner_id
    OR v_next_external_owner_text IS DISTINCT FROM v_current.external_owner_text
    OR v_next_reviewer_id IS DISTINCT FROM v_current.reviewer_id
    OR p_target_date IS DISTINCT FROM v_current.target_date
    OR coalesce(p_target_date_is_estimated, false) IS DISTINCT FROM v_current.target_date_is_estimated
    OR v_next_forecast_date IS DISTINCT FROM v_current.forecast_date;

  IF NOT v_changed THEN
    RETURN v_current;
  END IF;

  UPDATE public.programme_deliverables d
     SET wbs_item_id = v_next_wbs_item_id,
         deliverable_type = p_deliverable_type,
         title = p_title,
         description = v_next_description,
         owner_id = v_next_owner_id,
         external_owner_text = v_next_external_owner_text,
         reviewer_id = v_next_reviewer_id,
         target_date = p_target_date,
         target_date_is_estimated = coalesce(p_target_date_is_estimated, false),
         forecast_date = v_next_forecast_date,
         updated_at = now()
   WHERE d.id = p_deliverable_id
   RETURNING * INTO v_row;

  INSERT INTO public.programme_deliverable_events (
    org_id,
    lfa_project_id,
    deliverable_id,
    event_type,
    from_status,
    to_status,
    actor_id,
    event_reason
  )
  VALUES (
    v_row.org_id,
    v_row.lfa_project_id,
    v_row.id,
    'METADATA_UPDATED',
    v_row.lifecycle_status,
    v_row.lifecycle_status,
    v_actor,
    NULL
  );

  RETURN v_row;
END;
$$;

CREATE OR REPLACE FUNCTION public.transition_programme_deliverable(
  p_deliverable_id UUID,
  p_to_status TEXT,
  p_reason TEXT DEFAULT NULL,
  p_submitted_at TIMESTAMPTZ DEFAULT NULL
)
RETURNS public.programme_deliverables
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_actor UUID := auth.uid();
  v_row public.programme_deliverables;
  v_from_status TEXT;
  v_actor_role public.org_role;
  v_allowed BOOLEAN := false;
  v_reason TEXT := nullif(btrim(coalesce(p_reason, '')), '');
  v_new_approved_at TIMESTAMPTZ;
  v_new_submitted_at TIMESTAMPTZ;
  v_new_accepted_at TIMESTAMPTZ;
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'UNAUTHENTICATED';
  END IF;

  SELECT * INTO v_row
  FROM public.programme_deliverables d
  WHERE d.id = p_deliverable_id
  FOR UPDATE;

  IF v_row.id IS NULL THEN
    RAISE EXCEPTION 'INVALID_DELIVERABLE_PROJECT';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.organization_members m
    WHERE m.organization_id = v_row.org_id AND m.user_id = v_actor
  ) THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;

  IF v_row.archived_at IS NOT NULL THEN
    RAISE EXCEPTION 'ARCHIVED_DELIVERABLE';
  END IF;

  v_from_status := v_row.lifecycle_status;

  IF v_from_status IN ('ACCEPTED', 'CANCELLED') THEN
    RAISE EXCEPTION 'INVALID_TRANSITION';
  END IF;

  IF v_from_status = 'DRAFT' AND p_to_status = 'PLANNED' THEN v_allowed := true; END IF;
  IF v_from_status = 'PLANNED' AND p_to_status = 'IN_PROGRESS' THEN v_allowed := true; END IF;
  IF v_from_status = 'IN_PROGRESS' AND p_to_status = 'READY_FOR_REVIEW' THEN v_allowed := true; END IF;
  IF v_from_status = 'READY_FOR_REVIEW' AND p_to_status = 'CHANGES_REQUESTED' THEN v_allowed := true; END IF;
  IF v_from_status = 'CHANGES_REQUESTED' AND p_to_status = 'IN_PROGRESS' THEN v_allowed := true; END IF;
  IF v_from_status = 'READY_FOR_REVIEW' AND p_to_status = 'APPROVED' THEN v_allowed := true; END IF;
  IF v_from_status = 'APPROVED' AND p_to_status = 'SUBMITTED' THEN v_allowed := true; END IF;
  IF v_from_status = 'SUBMITTED' AND p_to_status = 'ACCEPTED' THEN v_allowed := true; END IF;
  IF v_from_status = 'APPROVED' AND p_to_status = 'IN_PROGRESS' THEN v_allowed := true; END IF;
  IF v_from_status = 'SUBMITTED' AND p_to_status = 'IN_PROGRESS' THEN v_allowed := true; END IF;

  IF v_from_status IN ('DRAFT','PLANNED','IN_PROGRESS','READY_FOR_REVIEW','CHANGES_REQUESTED','APPROVED','SUBMITTED')
     AND p_to_status = 'CANCELLED' THEN
    v_allowed := true;
  END IF;

  IF NOT v_allowed THEN
    RAISE EXCEPTION 'INVALID_TRANSITION';
  END IF;

  SELECT m.role INTO v_actor_role
  FROM public.organization_members m
  WHERE m.organization_id = v_row.org_id AND m.user_id = v_actor
  LIMIT 1;

  IF p_to_status = 'READY_FOR_REVIEW' AND v_row.reviewer_id IS NULL THEN
    RAISE EXCEPTION 'REVIEWER_REQUIRED';
  END IF;

  IF p_to_status IN ('CHANGES_REQUESTED', 'APPROVED', 'ACCEPTED') THEN
    IF v_row.reviewer_id IS NULL THEN
      RAISE EXCEPTION 'REVIEWER_REQUIRED';
    END IF;
    IF v_actor <> v_row.reviewer_id THEN
      RAISE EXCEPTION 'UNAUTHORIZED_REVIEWER';
    END IF;
    IF v_actor_role NOT IN ('owner', 'admin') THEN
      RAISE EXCEPTION 'UNAUTHORIZED_REVIEWER';
    END IF;
    IF v_row.owner_id IS NOT NULL AND v_actor = v_row.owner_id THEN
      RAISE EXCEPTION 'SELF_REVIEW_DENIED';
    END IF;
  END IF;

  IF p_to_status IN ('IN_PROGRESS', 'CANCELLED')
     AND v_from_status IN ('APPROVED', 'SUBMITTED')
     AND v_reason IS NULL THEN
    RAISE EXCEPTION 'EXCEPTION_REASON_REQUIRED';
  END IF;

  IF p_to_status = 'CANCELLED' AND v_reason IS NULL THEN
    RAISE EXCEPTION 'EXCEPTION_REASON_REQUIRED';
  END IF;

  IF p_to_status = 'CANCELLED' AND v_actor_role NOT IN ('owner', 'admin') THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;

  v_new_approved_at := v_row.approved_at;
  v_new_submitted_at := v_row.submitted_at;
  v_new_accepted_at := v_row.accepted_at;

  IF p_to_status = 'APPROVED' THEN
    v_new_approved_at := now();
  ELSIF p_to_status = 'SUBMITTED' THEN
    v_new_submitted_at := coalesce(p_submitted_at, now());
  ELSIF p_to_status = 'ACCEPTED' THEN
    v_new_accepted_at := now();
  ELSIF p_to_status = 'IN_PROGRESS' AND v_from_status = 'APPROVED' THEN
    v_new_approved_at := NULL;
    v_new_submitted_at := NULL;
    v_new_accepted_at := NULL;
  ELSIF p_to_status = 'IN_PROGRESS' AND v_from_status = 'SUBMITTED' THEN
    v_new_approved_at := NULL;
    v_new_submitted_at := NULL;
    v_new_accepted_at := NULL;
  END IF;

  UPDATE public.programme_deliverables d
     SET lifecycle_status = p_to_status,
         exception_reason = v_reason,
         approved_at = v_new_approved_at,
         submitted_at = v_new_submitted_at,
         accepted_at = v_new_accepted_at,
         updated_at = now()
   WHERE d.id = p_deliverable_id
   RETURNING * INTO v_row;

  INSERT INTO public.programme_deliverable_events (
    org_id,
    lfa_project_id,
    deliverable_id,
    event_type,
    from_status,
    to_status,
    actor_id,
    event_reason
  ) VALUES (
    v_row.org_id,
    v_row.lfa_project_id,
    v_row.id,
    'LIFECYCLE_CHANGED',
    v_from_status,
    p_to_status,
    v_actor,
    v_reason
  );

  RETURN v_row;
END;
$$;

CREATE OR REPLACE FUNCTION public.archive_programme_deliverable(
  p_deliverable_id UUID,
  p_archive_reason TEXT
)
RETURNS public.programme_deliverables
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_actor UUID := auth.uid();
  v_actor_role public.org_role;
  v_reason TEXT := nullif(btrim(coalesce(p_archive_reason, '')), '');
  v_row public.programme_deliverables;
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'UNAUTHENTICATED';
  END IF;

  SELECT * INTO v_row
  FROM public.programme_deliverables d
  WHERE d.id = p_deliverable_id
  FOR UPDATE;

  IF v_row.id IS NULL THEN
    RAISE EXCEPTION 'INVALID_DELIVERABLE_PROJECT';
  END IF;

  IF v_reason IS NULL THEN
    RAISE EXCEPTION 'EXCEPTION_REASON_REQUIRED';
  END IF;

  IF v_row.archived_at IS NOT NULL THEN
    RAISE EXCEPTION 'ALREADY_ARCHIVED';
  END IF;

  SELECT m.role INTO v_actor_role
  FROM public.organization_members m
  WHERE m.organization_id = v_row.org_id
    AND m.user_id = v_actor
  LIMIT 1;

  IF v_actor_role NOT IN ('owner', 'admin') THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;

  UPDATE public.programme_deliverables d
     SET archived_at = now(),
         archived_by = v_actor,
         archive_reason = v_reason,
         updated_at = now()
   WHERE d.id = p_deliverable_id
   RETURNING * INTO v_row;

  INSERT INTO public.programme_deliverable_events (
    org_id,
    lfa_project_id,
    deliverable_id,
    event_type,
    from_status,
    to_status,
    actor_id,
    event_reason
  ) VALUES (
    v_row.org_id,
    v_row.lfa_project_id,
    v_row.id,
    'ARCHIVED',
    v_row.lifecycle_status,
    v_row.lifecycle_status,
    v_actor,
    v_reason
  );

  RETURN v_row;
END;
$$;

ALTER TABLE public.programme_deliverables ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.programme_deliverable_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY programme_deliverables_member_select
ON public.programme_deliverables
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.organization_members m
    WHERE m.organization_id = programme_deliverables.org_id
      AND m.user_id = auth.uid()
  )
);

CREATE POLICY programme_deliverable_events_member_select
ON public.programme_deliverable_events
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.organization_members m
    WHERE m.organization_id = programme_deliverable_events.org_id
      AND m.user_id = auth.uid()
  )
);

-- Base table privileges are not assumed. This repository's default ACL for
-- new relations in the public schema grants only TRUNCATE/REFERENCES/TRIGGER
-- to anon/authenticated/service_role (see pg_default_acl) — SELECT is not
-- ambient. Without an explicit grant, the SELECT policies above would never
-- even be reached: Postgres checks table-level privilege before RLS.
GRANT SELECT ON TABLE public.programme_deliverables TO authenticated, service_role;
GRANT SELECT ON TABLE public.programme_deliverable_events TO authenticated, service_role;

REVOKE INSERT, UPDATE, DELETE ON TABLE public.programme_deliverables FROM authenticated, anon;
REVOKE INSERT, UPDATE, DELETE ON TABLE public.programme_deliverable_events FROM authenticated, anon;

REVOKE ALL ON FUNCTION public.create_programme_deliverable(UUID, UUID, TEXT, TEXT, TEXT, UUID, TEXT, UUID, DATE, BOOLEAN, DATE) FROM public;
REVOKE ALL ON FUNCTION public.create_programme_deliverable(UUID, UUID, TEXT, TEXT, TEXT, UUID, TEXT, UUID, DATE, BOOLEAN, DATE) FROM anon;
GRANT EXECUTE ON FUNCTION public.create_programme_deliverable(UUID, UUID, TEXT, TEXT, TEXT, UUID, TEXT, UUID, DATE, BOOLEAN, DATE) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.update_programme_deliverable_metadata(UUID, UUID, BOOLEAN, TEXT, TEXT, TEXT, BOOLEAN, UUID, BOOLEAN, TEXT, BOOLEAN, UUID, BOOLEAN, DATE, BOOLEAN, DATE, BOOLEAN) FROM public;
REVOKE ALL ON FUNCTION public.update_programme_deliverable_metadata(UUID, UUID, BOOLEAN, TEXT, TEXT, TEXT, BOOLEAN, UUID, BOOLEAN, TEXT, BOOLEAN, UUID, BOOLEAN, DATE, BOOLEAN, DATE, BOOLEAN) FROM anon;
GRANT EXECUTE ON FUNCTION public.update_programme_deliverable_metadata(UUID, UUID, BOOLEAN, TEXT, TEXT, TEXT, BOOLEAN, UUID, BOOLEAN, TEXT, BOOLEAN, UUID, BOOLEAN, DATE, BOOLEAN, DATE, BOOLEAN) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.transition_programme_deliverable(UUID, TEXT, TEXT, TIMESTAMPTZ) FROM public;
REVOKE ALL ON FUNCTION public.transition_programme_deliverable(UUID, TEXT, TEXT, TIMESTAMPTZ) FROM anon;
GRANT EXECUTE ON FUNCTION public.transition_programme_deliverable(UUID, TEXT, TEXT, TIMESTAMPTZ) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.archive_programme_deliverable(UUID, TEXT) FROM public;
REVOKE ALL ON FUNCTION public.archive_programme_deliverable(UUID, TEXT) FROM anon;
GRANT EXECUTE ON FUNCTION public.archive_programme_deliverable(UUID, TEXT) TO authenticated, service_role;
