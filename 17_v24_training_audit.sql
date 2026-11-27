-- KYUTECH GROWTH Ver.2.4: automatic training log edit audit.
-- Run on kyutech-growth-dev AFTER v2.3; no existing rows are deleted.
-- Browser roles have no access to internal_audit tables.
BEGIN;
CREATE OR REPLACE FUNCTION private.audit_training_log_update()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_team_id uuid;
BEGIN
  IF ROW(OLD.player_id,OLD.short_goal_id,OLD.practiced_on,OLD.activity_type,
         OLD.training_name,OLD.repetitions,OLD.load_value,OLD.load_unit,
         OLD.sets,OLD.focus_text,OLD.success_text,OLD.failure_text,OLD.next_action_text)
     IS NOT DISTINCT FROM
     ROW(NEW.player_id,NEW.short_goal_id,NEW.practiced_on,NEW.activity_type,
         NEW.training_name,NEW.repetitions,NEW.load_value,NEW.load_unit,
         NEW.sets,NEW.focus_text,NEW.success_text,NEW.failure_text,NEW.next_action_text)
  THEN RETURN NEW; END IF;
  -- Only record browser-authenticated updates. Internal maintenance is outside this pilot.
  IF auth.uid() IS NULL THEN RETURN NEW; END IF;
  SELECT ptm.team_id INTO v_team_id
  FROM public.player_team_memberships ptm
  JOIN public.team_memberships tm ON tm.team_id=ptm.team_id
  WHERE ptm.player_id=NEW.player_id AND ptm.left_at IS NULL
    AND tm.account_id=auth.uid() AND tm.left_at IS NULL
  LIMIT 1;
  IF v_team_id IS NULL THEN RAISE EXCEPTION '更新者の有効なチーム所属を確認できません'; END IF;
  INSERT INTO internal_audit.audit_events
    (actor_account_id,action,table_name,record_id,before_data,after_data,reason,team_id)
  VALUES (auth.uid(),'UPDATE','training_logs',NEW.log_id::text,
    jsonb_build_object('short_goal_id',OLD.short_goal_id,'practiced_on',OLD.practiced_on,
      'activity_type',OLD.activity_type,'training_name',OLD.training_name,
      'focus_text',OLD.focus_text,'success_text',OLD.success_text,
      'failure_text',OLD.failure_text,'next_action_text',OLD.next_action_text),
    jsonb_build_object('short_goal_id',NEW.short_goal_id,'practiced_on',NEW.practiced_on,
      'activity_type',NEW.activity_type,'training_name',NEW.training_name,
      'focus_text',NEW.focus_text,'success_text',NEW.success_text,
      'failure_text',NEW.failure_text,'next_action_text',NEW.next_action_text),
    '選手本人による練習記録の編集（Ver.2.4）',v_team_id);
  RETURN NEW;
END; $$;
REVOKE ALL ON FUNCTION private.audit_training_log_update() FROM PUBLIC,anon,authenticated;
DROP TRIGGER IF EXISTS trg_kg_training_log_audit_v24 ON public.training_logs;
CREATE TRIGGER trg_kg_training_log_audit_v24
AFTER UPDATE ON public.training_logs
FOR EACH ROW EXECUTE FUNCTION private.audit_training_log_update();
-- Existing per-player RLS and existing grants stay in force.
COMMIT;
