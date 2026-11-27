-- Run after migration 15. Read-only inspection.
SELECT p.proname AS function_name,
       pg_get_function_identity_arguments(p.oid) AS arguments
FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
WHERE n.nspname='public' AND p.proname IN
  ('record_measurement_batch','record_new_measurement','correct_measurement_value')
ORDER BY p.proname;

SELECT tablename, policyname, cmd FROM pg_policies
WHERE schemaname='public' AND tablename IN ('training_logs','measurement_sessions','measurement_values')
ORDER BY tablename,policyname;

-- After testing in the app, check the last 30 measurement audits:
SELECT a.display_name AS actor, e.action, e.record_id,
       e.before_data->>'value' AS old_value,
       e.after_data->>'value' AS new_value,
       e.reason, e.occurred_at
FROM internal_audit.audit_events e
LEFT JOIN public.accounts a ON a.account_id=e.actor_account_id
WHERE e.table_name='measurement_values'
ORDER BY e.occurred_at DESC LIMIT 30;
