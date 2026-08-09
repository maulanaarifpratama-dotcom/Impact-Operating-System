-- Migration: 20260808060000_prevent_last_owner_demotion.sql
-- Description: Prevent demotion or deletion of the last remaining owner
-- in an organization. Ensures every org always has at least one owner.

-- Trigger function: fires BEFORE UPDATE or DELETE on organization_members.
-- Rejects any operation that would leave an organization with zero owners.
CREATE OR REPLACE FUNCTION public.check_owner_demotion()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  owner_count INTEGER;
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF OLD.role = 'owner' AND NEW.role != 'owner' THEN
      SELECT COUNT(*) INTO owner_count
      FROM public.organization_members
      WHERE organization_id = OLD.organization_id
        AND role = 'owner'
        AND id != OLD.id;

      IF owner_count = 0 THEN
        RAISE EXCEPTION 'Tidak dapat menurunkan hak akses pemilik terakhir. Organisasi harus memiliki setidaknya satu pemilik.'
          USING ERRCODE = 'check_violation';
      END IF;
    END IF;
  END IF;

  IF TG_OP = 'DELETE' THEN
    IF OLD.role = 'owner' THEN
      SELECT COUNT(*) INTO owner_count
      FROM public.organization_members
      WHERE organization_id = OLD.organization_id
        AND role = 'owner'
        AND id != OLD.id;

      IF owner_count = 0 THEN
        RAISE EXCEPTION 'Tidak dapat menghapus pemilik terakhir. Organisasi harus memiliki setidaknya satu pemilik.'
          USING ERRCODE = 'check_violation';
      END IF;
    END IF;
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.check_owner_demotion() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.check_owner_demotion() FROM anon;

GRANT EXECUTE ON FUNCTION public.check_owner_demotion()
TO authenticated, service_role;

DROP TRIGGER IF EXISTS trg_check_owner_demotion ON public.organization_members;
CREATE TRIGGER trg_check_owner_demotion
  BEFORE UPDATE OR DELETE ON public.organization_members
  FOR EACH ROW
  EXECUTE FUNCTION public.check_owner_demotion();
