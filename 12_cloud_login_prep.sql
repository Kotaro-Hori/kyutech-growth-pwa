-- KYUTECH GROWTH / STEP 12 / Browser login read-only profile
-- Development project with fictional users only.
-- No user can update accounts or team memberships through these grants.
BEGIN;
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_memberships ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS kg_account_self_select ON public.accounts;
CREATE POLICY kg_account_self_select
ON public.accounts FOR SELECT TO authenticated
USING (account_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS kg_membership_self_select ON public.team_memberships;
CREATE POLICY kg_membership_self_select
ON public.team_memberships FOR SELECT TO authenticated
USING (account_id = (SELECT auth.uid()));

-- Only the columns required for the login verification screen.
GRANT SELECT (account_id, display_name, status)
ON public.accounts TO authenticated;
GRANT SELECT (account_id, team_id, role, left_at)
ON public.team_memberships TO authenticated;
REVOKE ALL ON public.accounts, public.team_memberships FROM anon;
COMMIT;

-- Verify policies and ordinary login data via real browser session, not admin SQL Editor.
SELECT tablename, policyname, cmd FROM pg_policies
WHERE schemaname='public' AND tablename IN ('accounts','team_memberships')
ORDER BY tablename, policyname;
