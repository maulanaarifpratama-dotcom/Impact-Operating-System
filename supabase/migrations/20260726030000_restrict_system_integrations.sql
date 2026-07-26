-- Migration: 20260726030000_restrict_system_integrations.sql
-- Description: Stop system_integrations from being writable by everyone.
--
-- The table was created through the dashboard, not a migration, and carried
-- "system_integrations_all_policy" = ALL USING (true) WITH CHECK (true) —
-- read *and write* for any caller.
--
-- It has no organization_id: it is a single platform-level config row per
-- provider (id, provider, status, account_email, drive_id, metadata,
-- created_at, updated_at). The damage from open writes is that anyone could
-- overwrite drive_id and redirect where NGO evidence documents are uploaded, or
-- flip status and break the integration outright.
--
-- Access paths, both preserved:
--   * Settings.tsx:153 reads it with the user's own client -> needs SELECT.
--     It only reads; there is no write path in the frontend.
--   * onedrive-upload/index.ts:72 reads it via ctx.supabaseAdmin, which uses the
--     service role and bypasses RLS entirely -> unaffected by any policy here.

DROP POLICY IF EXISTS "system_integrations_all_policy"  ON public.system_integrations;
DROP POLICY IF EXISTS "system_integrations_read_policy" ON public.system_integrations;
DROP POLICY IF EXISTS "system_integrations_read"        ON public.system_integrations;
DROP POLICY IF EXISTS "system_integrations_admin_write" ON public.system_integrations;

-- Signed-in users may see integration status; anonymous callers may not.
CREATE POLICY "system_integrations_read" ON public.system_integrations
  FOR SELECT
  TO authenticated
  USING (true);

-- Only admins may change it. The edge function writes as service role and is
-- not subject to this.
CREATE POLICY "system_integrations_admin_write" ON public.system_integrations
  FOR ALL
  TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));
