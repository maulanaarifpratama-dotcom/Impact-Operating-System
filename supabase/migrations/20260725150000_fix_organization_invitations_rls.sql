-- Migration: 20260725150000_fix_organization_invitations_rls.sql
-- Description: Drop permissive public SELECT policy invitations_read_by_token on organization_invitations.
-- Public token validation is served exclusively via SECURITY DEFINER RPC get_organization_invite_by_token(_token).

DROP POLICY IF EXISTS "invitations_read_by_token" ON public.organization_invitations;
