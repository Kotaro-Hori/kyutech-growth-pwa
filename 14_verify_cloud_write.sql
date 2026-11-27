-- KYUTECH GROWTH Ver.2.2 / verification (read only)
SELECT p.proname AS function_name,
       n.nspname AS schema_name,
       pg_get_function_arguments(p.oid) AS arguments
FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
WHERE n.nspname='public' AND p.proname='record_new_measurement';

SELECT tablename, policyname, cmd, roles
FROM pg_policies
WHERE schemaname='public'
  AND tablename IN ('short_term_goals','training_logs','measurement_sessions','measurement_values')
ORDER BY tablename, policyname;

-- Inspect results after actually saving from the website:
SELECT p.player_name, s.measured_on, i.item_name, v.value
FROM public.measurement_values v
JOIN public.measurement_sessions s ON s.session_id=v.session_id
JOIN public.players p ON p.player_id=s.player_id
JOIN public.measurement_items i ON i.item_id=v.item_id
WHERE p.player_name IN ('テスト選手','テスト選手B')
ORDER BY s.created_at DESC LIMIT 20;

SELECT a.display_name, e.action, e.table_name, e.reason, e.occurred_at
FROM internal_audit.audit_events e
LEFT JOIN public.accounts a ON a.account_id=e.actor_account_id
WHERE e.table_name='measurement_values'
ORDER BY e.occurred_at DESC LIMIT 20;
