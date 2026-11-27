-- KYUTECH GROWTH Ver.2.2 / development project / fictional data only
-- Run once AFTER the previous goal and training RLS SQL (04, 06).
-- Safe to re-run: CREATE OR REPLACE FUNCTION; no existing measurement values changed.
-- This function atomically creates a measurement session, numeric value, and audit event.
BEGIN;

CREATE OR REPLACE FUNCTION public.record_new_measurement(
  p_player_id uuid,
  p_item_id text,
  p_value numeric,
  p_measured_on date,
  p_reason text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_team_id uuid;
  v_category text;
  v_session_id uuid;
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'ログインが必要です';
  END IF;

  IF p_player_id IS NULL OR p_item_id IS NULL OR p_measured_on IS NULL
     OR p_value IS NULL OR p_reason IS NULL THEN
    RAISE EXCEPTION '入力項目に不足があります';
  END IF;
  IF p_measured_on < DATE '2000-01-01'
     OR p_measured_on > CURRENT_DATE + 1 THEN
    RAISE EXCEPTION '測定日を確認してください';
  END IF;
  IF p_value <= 0 OR p_value > 100000 THEN
    RAISE EXCEPTION '測定値は0より大きく100000以下で入力してください';
  END IF;
  IF char_length(btrim(p_reason)) < 5 OR char_length(p_reason) > 500 THEN
    RAISE EXCEPTION '登録理由は5〜500文字で入力してください';
  END IF;

  -- Never trust a user-supplied team_id or role: derive them from auth.uid().
  SELECT ptm.team_id
    INTO v_team_id
  FROM public.player_team_memberships ptm
  JOIN public.team_memberships tm
    ON tm.team_id = ptm.team_id
  JOIN public.accounts actor
    ON actor.account_id = tm.account_id
  WHERE ptm.player_id = p_player_id
    AND ptm.left_at IS NULL
    AND tm.account_id = v_actor
    AND tm.role IN ('director', 'staff')
    AND tm.left_at IS NULL
    AND actor.status = 'active'
  ORDER BY ptm.team_id
  LIMIT 1;

  IF v_team_id IS NULL THEN
    RAISE EXCEPTION 'この選手の測定記録を登録する権限がありません';
  END IF;

  SELECT category INTO v_category
  FROM public.measurement_items
  WHERE item_id = p_item_id
    AND category IN ('performance', 'inbody');

  IF v_category IS NULL THEN
    RAISE EXCEPTION '測定項目が見つかりません';
  END IF;

  INSERT INTO public.measurement_sessions
    (player_id, category, measured_on, recorded_by)
  VALUES (p_player_id, v_category, p_measured_on, v_actor)
  RETURNING session_id INTO v_session_id;

  INSERT INTO public.measurement_values
    (session_id, item_id, value)
  VALUES (v_session_id, p_item_id, p_value);

  INSERT INTO internal_audit.audit_events
    (actor_account_id, action, table_name, record_id,
     before_data, after_data, reason, team_id)
  VALUES
    (v_actor, 'INSERT', 'measurement_values',
     v_session_id::text || ':' || p_item_id,
     NULL,
     jsonb_build_object('player_id', p_player_id,
                        'session_id', v_session_id,
                        'item_id', p_item_id,
                        'measured_on', p_measured_on,
                        'value', p_value),
     btrim(p_reason), v_team_id);

  RETURN v_session_id;
END;
$$;

-- This browser RPC is callable only by a logged-in user, and still checks staff role.
REVOKE ALL ON FUNCTION public.record_new_measurement(uuid,text,numeric,date,text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_new_measurement(uuid,text,numeric,date,text)
  TO authenticated;

-- Deny direct writes even when a user can read the measurement data.
REVOKE INSERT, UPDATE, DELETE ON public.measurement_sessions,
  public.measurement_values FROM anon, authenticated;

COMMIT;
