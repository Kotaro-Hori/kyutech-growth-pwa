-- KYUTECH GROWTH v2.3: batch measurement with per-item audit / fictional data only
-- Run on kyutech-growth-dev AFTER v2.2 SQL 13. Safe to run again; no seed data.
BEGIN;
CREATE OR REPLACE FUNCTION public.record_measurement_batch(
  p_player_id uuid, p_measured_on date, p_category text,
  p_items jsonb, p_reason text
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_team_id uuid;
  v_session_id uuid;
  v_count integer;
  v_actual integer;
  v_entry record;
BEGIN
  IF v_actor IS NULL THEN RAISE EXCEPTION 'ログインが必要です'; END IF;
  IF p_player_id IS NULL OR p_measured_on IS NULL OR p_category NOT IN ('performance','inbody') OR p_category IS NULL THEN
    RAISE EXCEPTION '対象選手・日付・区分を確認してください';
  END IF;
  IF p_measured_on < DATE '2000-01-01' OR p_measured_on > CURRENT_DATE + 1 THEN
    RAISE EXCEPTION '測定日を確認してください';
  END IF;
  IF p_reason IS NULL OR char_length(btrim(p_reason)) < 5 OR char_length(p_reason) > 500 THEN
    RAISE EXCEPTION '登録理由は5〜500文字で入力してください';
  END IF;
  IF p_items IS NULL OR jsonb_typeof(p_items) IS DISTINCT FROM 'array' THEN
    RAISE EXCEPTION '測定項目は配列で入力してください';
  END IF;
  v_count := jsonb_array_length(p_items);
  IF v_count < 1 OR v_count > 30 THEN
    RAISE EXCEPTION '測定項目は1〜30個にしてください';
  END IF;
  -- Verify identity / active membership on DB, not client role.
  SELECT ptm.team_id INTO v_team_id
  FROM public.player_team_memberships ptm
  JOIN public.team_memberships tm ON tm.team_id=ptm.team_id
  JOIN public.accounts a ON a.account_id=tm.account_id
  WHERE ptm.player_id=p_player_id AND ptm.left_at IS NULL
    AND tm.account_id=v_actor AND tm.left_at IS NULL
    AND tm.role IN ('director','staff') AND a.status='active'
  ORDER BY ptm.team_id LIMIT 1;
  IF v_team_id IS NULL THEN RAISE EXCEPTION 'この選手への登録権限がありません'; END IF;
  -- Validate each JSON entry: exact item_id + JSON numeric value (not text).
  IF EXISTS (
    SELECT 1 FROM jsonb_array_elements(p_items) AS j(x)
    WHERE jsonb_typeof(j.x) IS DISTINCT FROM 'object'
       OR jsonb_typeof(j.x->'item_id') IS DISTINCT FROM 'string'
       OR jsonb_typeof(j.x->'value') IS DISTINCT FROM 'number'
       OR length(coalesce(j.x->>'item_id','')) = 0
       OR (j.x->>'value')::numeric <= 0
       OR (j.x->>'value')::numeric > 100000
  ) THEN RAISE EXCEPTION '測定項目または測定値が不正です'; END IF;
  IF EXISTS (
    SELECT 1 FROM (
      SELECT j.x->>'item_id' AS item_id, count(*) AS n
      FROM jsonb_array_elements(p_items) AS j(x) GROUP BY j.x->>'item_id'
    ) d WHERE d.n > 1
  ) THEN RAISE EXCEPTION '同じ測定項目を2回指定できません'; END IF;
  SELECT count(*) INTO v_actual
  FROM jsonb_array_elements(p_items) AS j(x)
  JOIN public.measurement_items mi ON mi.item_id=j.x->>'item_id'
  WHERE mi.category=p_category;
  IF v_actual <> v_count THEN RAISE EXCEPTION '測定区分に合わない項目があります'; END IF;
  INSERT INTO public.measurement_sessions(player_id,category,measured_on,recorded_by)
  VALUES(p_player_id,p_category,p_measured_on,v_actor)
  RETURNING session_id INTO v_session_id;
  FOR v_entry IN SELECT j.x->>'item_id' AS item_id,
                          (j.x->>'value')::numeric AS value
                 FROM jsonb_array_elements(p_items) AS j(x)
  LOOP
    INSERT INTO public.measurement_values(session_id,item_id,value)
      VALUES (v_session_id,v_entry.item_id,v_entry.value);
    INSERT INTO internal_audit.audit_events
      (actor_account_id,action,table_name,record_id,before_data,after_data,reason,team_id)
    VALUES(v_actor,'INSERT','measurement_values',
      v_session_id::text || ':' || v_entry.item_id,NULL,
      jsonb_build_object('player_id',p_player_id,'session_id',v_session_id,
                         'item_id',v_entry.item_id,'measured_on',p_measured_on,
                         'value',v_entry.value),btrim(p_reason),v_team_id);
  END LOOP;
  RETURN v_session_id;
END; $$;
REVOKE ALL ON FUNCTION public.record_measurement_batch(uuid,date,text,jsonb,text)
  FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.record_measurement_batch(uuid,date,text,jsonb,text)
  TO authenticated;
-- Correction RPC already created/tested in the previous version. Do not replace it.
-- Browser users still cannot directly INSERT/UPDATE measurement rows.
REVOKE INSERT, UPDATE, DELETE ON public.measurement_sessions,public.measurement_values
  FROM authenticated,anon;
COMMIT;
