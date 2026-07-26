-- Migration: 20260727020000_plan_entitlements.sql
-- Description: Make the pricing tiers real. Until now every account had every
-- feature regardless of plan — has_product_access() existed in the database but
-- no policy called it, so the Dasar tier was functionally identical to
-- Institusi and there was no reason for anyone to pay.
--
-- WHY A BINARY GATE RATHER THAN PER-PRODUCT KEYS
--
-- ProductKey has four values and would need roughly a dozen to name every
-- module. But the rule the pricing page actually expresses is binary: the Dasar
-- modules are free, everything else needs a paid plan. Institusi differs by
-- white label, API, SSO and dedicated infrastructure — none of which are
-- in-app features to gate. Expanding an enum to express a yes/no question adds
-- surface without adding capability, so this uses has_paid_plan(). ProductKey
-- stays available for the day add-ons are sold separately.
--
-- WHY ONLY INSERT
--
-- An organisation that lapses keeps access to what it already produced. It
-- simply cannot create more. Gating SELECT would hold a programme's own LFA,
-- beneficiary records and impact data hostage over a lapsed invoice, which is
-- not a position to put an NGO in.
--
-- WHY ONLY FIVE TABLES
--
-- These are the entry points. Every downstream table — lfa_entries, wbs_tasks,
-- budget_items, the MEAL and SROI tables, gw_lfa_documents, gw_proposals —
-- hangs off one of them by foreign key, so blocking creation at the root blocks
-- the branch. Gating each of the thirty-odd child tables would be more code and
-- more places to get wrong for the same effect.

-- ---------------------------------------------------------------------------
-- 1. Every organisation must have a subscription row
--
-- Nothing created one: not the signup flow, not ensureDefaultOrg, no trigger.
-- Without a row, has_paid_plan() cannot distinguish "free tier" from "unknown",
-- and the gate below would lock out organisations that never had the chance to
-- be on a plan at all.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.create_default_subscription()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.subscriptions (organization_id, plan, status)
  VALUES (NEW.id, 'free', 'active')
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_org_default_subscription ON public.organizations;
CREATE TRIGGER trg_org_default_subscription
  AFTER INSERT ON public.organizations
  FOR EACH ROW EXECUTE FUNCTION public.create_default_subscription();

-- Backfill the organisations that predate the trigger.
INSERT INTO public.subscriptions (organization_id, plan, status)
SELECT o.id, 'free', 'active'
FROM public.organizations o
WHERE NOT EXISTS (
  SELECT 1 FROM public.subscriptions s WHERE s.organization_id = o.id
);

-- ---------------------------------------------------------------------------
-- 2. The entitlement test
--
-- SECURITY DEFINER because subscriptions is readable only by org members and
-- admins; a policy on another table must be able to ask the question without
-- the caller needing rights over the subscription row itself.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.has_paid_plan(_org_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.subscriptions
    WHERE organization_id = _org_id
      AND plan <> 'free'
      AND status IN ('active', 'trialing')
  );
$$;

-- ---------------------------------------------------------------------------
-- 3. Gate creation on the five paid entry points
--
-- Each policy keeps the membership and ownership conditions it already had and
-- adds the plan test. Left alone: readiness_scores, resource_access_platforms,
-- donors, donations, donor_followups, ads_briefs and ads_generations — those
-- are the Dasar tier and stay free.
-- ---------------------------------------------------------------------------

-- Grantwriter
DROP POLICY IF EXISTS "gw_projects_member_insert" ON public.gw_projects;
CREATE POLICY "gw_projects_member_insert" ON public.gw_projects
  FOR INSERT WITH CHECK (
    auth.uid() = created_by
    AND public.is_org_member(organization_id, auth.uid())
    AND public.has_paid_plan(organization_id)
  );

-- LFA Builder, and with it WBS, Budget, MEAL, SROI and E-ROI
DROP POLICY IF EXISTS "lfa_projects_member_insert" ON public.lfa_projects;
CREATE POLICY "lfa_projects_member_insert" ON public.lfa_projects
  FOR INSERT WITH CHECK (
    public.is_org_member(org_id, auth.uid())
    AND public.has_paid_plan(org_id)
  );

-- Impact Library
DROP POLICY IF EXISTS "lib_docs_member_insert" ON public.library_documents;
CREATE POLICY "lib_docs_member_insert" ON public.library_documents
  FOR INSERT WITH CHECK (
    auth.uid() = uploaded_by
    AND public.is_org_member(organization_id, auth.uid())
    AND public.has_paid_plan(organization_id)
  );

-- Grant Pipeline
DROP POLICY IF EXISTS "gf_searches_owner_insert" ON public.grantfinder_searches;
CREATE POLICY "gf_searches_owner_insert" ON public.grantfinder_searches
  FOR INSERT WITH CHECK (
    auth.uid() = user_id
    AND public.is_org_member(organization_id, auth.uid())
    AND public.has_paid_plan(organization_id)
  );

-- Beneficiary Registry.
--
-- beneficiaries_all is FOR ALL, so a plan test in its WITH CHECK would gate
-- UPDATE as well and a lapsed organisation could not correct a typo in its own
-- records. Split so reads and edits stay open to members while creation is
-- gated.
DROP POLICY IF EXISTS "beneficiaries_all"    ON public.beneficiaries;
DROP POLICY IF EXISTS "beneficiaries_select" ON public.beneficiaries;
DROP POLICY IF EXISTS "beneficiaries_update" ON public.beneficiaries;
DROP POLICY IF EXISTS "beneficiaries_delete" ON public.beneficiaries;
DROP POLICY IF EXISTS "beneficiaries_insert" ON public.beneficiaries;

CREATE POLICY "beneficiaries_select" ON public.beneficiaries
  FOR SELECT USING (public.is_org_member(org_id, auth.uid()));

CREATE POLICY "beneficiaries_update" ON public.beneficiaries
  FOR UPDATE
  USING (public.is_org_member(org_id, auth.uid()))
  WITH CHECK (public.is_org_member(org_id, auth.uid()));

CREATE POLICY "beneficiaries_delete" ON public.beneficiaries
  FOR DELETE USING (public.get_org_role(org_id, auth.uid()) IN ('owner', 'admin'));

CREATE POLICY "beneficiaries_insert" ON public.beneficiaries
  FOR INSERT WITH CHECK (
    public.is_org_member(org_id, auth.uid())
    AND public.has_paid_plan(org_id)
  );
