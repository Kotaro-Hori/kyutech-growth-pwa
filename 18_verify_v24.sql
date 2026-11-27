-- Run in Supabase SQL Editor (read only): review trigger, existing grants, audit.
SELECT tgname, tgenabled FROM pg_trigger
WHERE tgrelid='public.training_logs'::regclass AND NOT tgisinternal
ORDER BY tgname;
SELECT table_name, policyname, cmd FROM (
 SELECT tablename AS table_name, policyname, cmd FROM pg_policies
 WHERE schemaname='public' AND tablename IN ('training_logs','coaching_advice')
) q ORDER BY table_name,policyname;
SELECT e.occurred_at, a.display_name, e.action, e.table_name,
       e.record_id, e.before_data, e.after_data, e.reason
FROM internal_audit.audit_events e
LEFT JOIN public.accounts a ON a.account_id=e.actor_account_id
WHERE e.table_name IN ('training_logs','measurement_values')
ORDER BY e.occurred_at DESC LIMIT 30;
