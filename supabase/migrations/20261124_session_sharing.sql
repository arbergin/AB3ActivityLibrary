-- Run after standalone_sessions and session_tactics. No changes to activity visibility policies.
-- Shared reads use narrowly scoped RPCs; existing planning table policies remain in place.
BEGIN;
-- The original planning schema/policies are not bundled with this repository.
-- Fail closed rather than silently deploying sharing on tables without RLS.
DO $$
DECLARE missing text;
BEGIN
 SELECT string_agg(c.relname, ', ') INTO missing FROM pg_catalog.pg_class c JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace
 WHERE n.nspname='public' AND c.relname IN ('planning_teams','planning_weeks','planning_practices','planning_practice_activities','planning_notes','activities','profiles') AND NOT c.relrowsecurity;
 IF missing IS NOT NULL THEN RAISE EXCEPTION 'Enable and verify existing row-level security before applying session sharing: %', missing; END IF;
END; $$;
ALTER TABLE public.planning_teams ADD COLUMN IF NOT EXISTS session_visibility text NOT NULL DEFAULT 'private';
ALTER TABLE public.planning_teams DROP CONSTRAINT IF EXISTS planning_session_visibility_check;
ALTER TABLE public.planning_teams ADD CONSTRAINT planning_session_visibility_check CHECK (session_visibility IN ('private','club','everyone') AND (kind = 'session' OR session_visibility = 'private'));
CREATE INDEX IF NOT EXISTS planning_session_visibility_idx ON public.planning_teams(kind, is_active, session_visibility);

-- Membership is evaluated at read time, so a club reassignment immediately changes access.
CREATE OR REPLACE FUNCTION public.ab3_session_can_read(p_id uuid, p_actor uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
 SELECT p_actor IS NOT NULL AND EXISTS (
 SELECT 1 FROM public.planning_teams t WHERE t.id=p_id AND t.kind='session' AND (
 t.user_id=p_actor OR (t.is_active AND (t.session_visibility='everyone' OR (t.session_visibility='club' AND EXISTS (
 SELECT 1 FROM public.profiles owner JOIN public.profiles viewer ON viewer.club_id=owner.club_id
 WHERE owner.id=t.user_id AND viewer.id=p_actor AND owner.club_id IS NOT NULL))))));
$$;
REVOKE ALL ON FUNCTION public.ab3_session_can_read(uuid,uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.ab3_session_can_read(uuid,uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.ab3_validate_session_visibility() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
 IF NEW.kind='session' AND NEW.session_visibility='club' AND NOT EXISTS (SELECT 1 FROM public.profiles WHERE id=NEW.user_id AND club_id IS NOT NULL) THEN
   RAISE EXCEPTION 'You must be assigned to a club to share a session with My Club.';
 END IF;
 RETURN NEW;
END; $$;
REVOKE ALL ON FUNCTION public.ab3_validate_session_visibility() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS ab3_validate_session_visibility ON public.planning_teams;
CREATE TRIGGER ab3_validate_session_visibility BEFORE INSERT OR UPDATE OF session_visibility, user_id, kind ON public.planning_teams FOR EACH ROW EXECUTE FUNCTION public.ab3_validate_session_visibility();

-- Existing club management uses service-role routes. Guard membership against
-- direct client writes even when a table-level UPDATE grant overrides a column revoke.
CREATE OR REPLACE FUNCTION public.ab3_protect_club_membership() RETURNS trigger
LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
 IF auth.role() IN ('authenticated','anon') THEN
   IF TG_OP='INSERT' THEN
     IF NEW.club_id IS NOT NULL OR COALESCE(NEW.role::text,'user') <> 'user' THEN RAISE EXCEPTION 'Club assignments and elevated roles must be managed by an administrator.'; END IF;
   ELSIF NEW.club_id IS DISTINCT FROM OLD.club_id OR NEW.role IS DISTINCT FROM OLD.role THEN
     RAISE EXCEPTION 'Club assignments and roles must be managed by an administrator.';
   END IF;
 END IF;
 RETURN NEW;
END; $$;
REVOKE ALL ON FUNCTION public.ab3_protect_club_membership() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS ab3_protect_club_membership ON public.profiles;
CREATE TRIGGER ab3_protect_club_membership BEFORE INSERT OR UPDATE OF club_id, role ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.ab3_protect_club_membership();

-- Restrictive safeguards on direct table access, in addition to existing owner policies.
-- Team rows pass these guards unchanged; shared readers never gain direct write access.
CREATE OR REPLACE FUNCTION public.ab3_planning_session_owner_guard(p_table text, p_id uuid)
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
DECLARE t public.planning_teams%ROWTYPE;
BEGIN
 IF p_id IS NULL THEN RETURN false; END IF;
 IF p_table='team' THEN SELECT * INTO t FROM public.planning_teams WHERE id=p_id;
 ELSIF p_table='week' THEN SELECT pt.* INTO t FROM public.planning_weeks w JOIN public.planning_teams pt ON pt.id=w.team_id WHERE w.id=p_id;
 ELSIF p_table='practice' THEN SELECT pt.* INTO t FROM public.planning_practices p JOIN public.planning_weeks w ON w.id=p.week_id JOIN public.planning_teams pt ON pt.id=w.team_id WHERE p.id=p_id;
 ELSIF p_table='activity_row' THEN SELECT pt.* INTO t FROM public.planning_practice_activities a JOIN public.planning_practices p ON p.id=a.practice_id JOIN public.planning_weeks w ON w.id=p.week_id JOIN public.planning_teams pt ON pt.id=w.team_id WHERE a.id=p_id;
 ELSE RETURN false;
 END IF;
 RETURN COALESCE(t.kind='team' OR (t.kind='session' AND t.user_id=auth.uid()),false);
END; $$;
REVOKE ALL ON FUNCTION public.ab3_planning_session_owner_guard(text,uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.ab3_planning_session_owner_guard(text,uuid) TO authenticated, anon;
DROP POLICY IF EXISTS ab3_session_owner_guard ON public.planning_teams;
CREATE POLICY ab3_session_owner_guard ON public.planning_teams AS RESTRICTIVE FOR ALL TO authenticated, anon USING (kind='team' OR user_id=auth.uid()) WITH CHECK (kind='team' OR user_id=auth.uid());
DROP POLICY IF EXISTS ab3_session_owner_guard ON public.planning_weeks;
CREATE POLICY ab3_session_owner_guard ON public.planning_weeks AS RESTRICTIVE FOR ALL TO authenticated, anon USING (public.ab3_planning_session_owner_guard('team',team_id)) WITH CHECK (public.ab3_planning_session_owner_guard('team',team_id));
DROP POLICY IF EXISTS ab3_session_owner_guard ON public.planning_practices;
CREATE POLICY ab3_session_owner_guard ON public.planning_practices AS RESTRICTIVE FOR ALL TO authenticated, anon USING (public.ab3_planning_session_owner_guard('week',week_id)) WITH CHECK (public.ab3_planning_session_owner_guard('week',week_id));
DROP POLICY IF EXISTS ab3_session_owner_guard ON public.planning_practice_activities;
CREATE POLICY ab3_session_owner_guard ON public.planning_practice_activities AS RESTRICTIVE FOR ALL TO authenticated, anon USING (public.ab3_planning_session_owner_guard('practice',practice_id)) WITH CHECK (public.ab3_planning_session_owner_guard('practice',practice_id));
DROP POLICY IF EXISTS ab3_session_owner_guard ON public.planning_notes;
CREATE POLICY ab3_session_owner_guard ON public.planning_notes AS RESTRICTIVE FOR ALL TO authenticated, anon USING (public.ab3_planning_session_owner_guard('practice',practice_id)) WITH CHECK (public.ab3_planning_session_owner_guard('practice',practice_id) AND (week_id IS NULL OR public.ab3_planning_session_owner_guard('week',week_id)) AND (after_activity_row_id IS NULL OR public.ab3_planning_session_owner_guard('activity_row',after_activity_row_id)));

-- Return only session metadata, not unrelated team or profile information.
CREATE OR REPLACE FUNCTION public.ab3_list_sessions()
RETURNS SETOF public.planning_teams LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
 SELECT t.* FROM public.planning_teams t WHERE t.kind='session' AND public.ab3_session_can_read(t.id,auth.uid()) ORDER BY t.updated_at DESC;
$$;
REVOKE ALL ON FUNCTION public.ab3_list_sessions() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.ab3_list_sessions() TO authenticated;

-- A session owner may share their own private activities. Referencing someone else's
-- activity never grants new rights to that third party's content.
CREATE OR REPLACE FUNCTION public.ab3_session_activity_allowed(p_activity uuid, p_session uuid, p_actor uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
 SELECT public.ab3_session_can_read(p_session,p_actor) AND EXISTS (
 SELECT 1 FROM public.activities a JOIN public.planning_teams t ON t.id=p_session
 JOIN auth.users owner ON owner.id=t.user_id JOIN auth.users viewer ON viewer.id=p_actor
 WHERE a.id=p_activity AND (
 lower(a.created_by)=lower(owner.email) OR a.created_by=owner.id::text
 OR lower(a.created_by)=lower(viewer.email) OR a.created_by=viewer.id::text
 OR a.visibility='everyone' OR (a.visibility='club' AND a.club_id=(SELECT club_id FROM public.profiles WHERE id=p_actor))));
$$;
REVOKE ALL ON FUNCTION public.ab3_session_activity_allowed(uuid,uuid,uuid) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.ab3_session_bundle_for(p_id uuid,p_actor uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
DECLARE result jsonb;
BEGIN
 IF NOT public.ab3_session_can_read(p_id,p_actor) THEN RAISE EXCEPTION 'Session not found or access denied.' USING ERRCODE='42501'; END IF;
 WITH w AS (SELECT * FROM public.planning_weeks WHERE team_id=p_id),
 p AS (SELECT q.* FROM public.planning_practices q JOIN w ON w.id=q.week_id),
 r AS (SELECT q.* FROM public.planning_practice_activities q JOIN p ON p.id=q.practice_id),
 n AS (SELECT q.* FROM public.planning_notes q JOIN p ON p.id=q.practice_id),
 a AS (SELECT q.* FROM public.activities q WHERE q.id IN (SELECT activity_id FROM r) AND public.ab3_session_activity_allowed(q.id,p_id,p_actor))
 SELECT jsonb_build_object(
 'team',(SELECT to_jsonb(t) FROM public.planning_teams t WHERE t.id=p_id),
 'weeks',COALESCE((SELECT jsonb_agg(to_jsonb(w) ORDER BY sort_order,created_at) FROM w),'[]'::jsonb),
 'practices',COALESCE((SELECT jsonb_agg(to_jsonb(p) ORDER BY sort_order,created_at) FROM p),'[]'::jsonb),
 'activityRows',COALESCE((SELECT jsonb_agg(to_jsonb(r) ORDER BY sort_order,created_at) FROM r),'[]'::jsonb),
 'notes',COALESCE((SELECT jsonb_agg(to_jsonb(n) ORDER BY sort_order,created_at) FROM n),'[]'::jsonb),
 'activities',COALESCE((SELECT jsonb_agg(to_jsonb(a)) FROM a),'[]'::jsonb)) INTO result;
 RETURN result;
END; $$;
REVOKE ALL ON FUNCTION public.ab3_session_bundle_for(uuid,uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.ab3_session_bundle_for(uuid,uuid) TO service_role;
CREATE OR REPLACE FUNCTION public.ab3_session_bundle(p_id uuid)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$ SELECT public.ab3_session_bundle_for(p_id,auth.uid()); $$;
REVOKE ALL ON FUNCTION public.ab3_session_bundle(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.ab3_session_bundle(uuid) TO authenticated;

-- Service-only atomic copy. The API verifies the caller and duplicates files first.
-- Each old ID is mapped to a new ID so notes retain their activity placement.
CREATE OR REPLACE FUNCTION public.ab3_copy_session(p_id uuid,p_actor uuid,p_files jsonb)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE b jsonb; source jsonb; new_session uuid; new_id uuid; old_id uuid; v_email text; item jsonb; old_file text; new_file text;
 week_map jsonb:='{}'; practice_map jsonb:='{}'; row_map jsonb:='{}'; activity_map jsonb:='{}';
BEGIN
 b:=public.ab3_session_bundle_for(p_id,p_actor); source:=b->'team';
 IF NOT (source->>'is_active')::boolean THEN RAISE EXCEPTION 'Restore the archived session before copying.'; END IF;
 SELECT email INTO v_email FROM auth.users WHERE id=p_actor;
 IF v_email IS NULL THEN RAISE EXCEPTION 'Account email is required.'; END IF;
 IF EXISTS (SELECT 1 FROM jsonb_array_elements(b->'activityRows') r WHERE r->>'activity_id' IS NOT NULL AND NOT EXISTS (SELECT 1 FROM jsonb_array_elements(b->'activities') a WHERE a->>'id'=r->>'activity_id')) THEN
   RAISE EXCEPTION 'A linked activity is unavailable to you. Ask the session owner to share or replace it before copying.';
 END IF;
 INSERT INTO public.planning_teams(user_id,name,kind,is_active,session_details,session_visibility)
 VALUES(p_actor,left(source->>'name',143)||' - Copy','session',true,CASE WHEN jsonb_typeof(source->'session_details')='object' THEN (source->'session_details')-'visibility' ELSE '{}'::jsonb END,'private') RETURNING id INTO new_session;
 FOR item IN SELECT * FROM jsonb_array_elements(b->'activities') LOOP
   old_id:=(item->>'id')::uuid; old_file:=item->>'file_path'; new_file:=NULL;
   IF old_file IS NOT NULL AND old_file<>'' THEN
     IF (p_files->(old_id::text))->>'source' IS DISTINCT FROM old_file OR COALESCE((p_files->(old_id::text))->>'path','')='' THEN RAISE EXCEPTION 'Activity changed while copying. Please retry.'; END IF;
     new_file:=(p_files->(old_id::text))->>'path';
   END IF;
   INSERT INTO public.activities(activity_name,field_location,game_phase,category,positions_involved,number_of_players,activity_details,created_by,hidden,visibility,club_id,activity_source,creator_state,file_name,file_type,file_path,file_bucket)
   SELECT a.activity_name,a.field_location,a.game_phase,a.category,a.positions_involved,a.number_of_players,a.activity_details,v_email,false,'private',NULL,a.activity_source,a.creator_state,a.file_name,a.file_type,new_file,'activity-files'
   FROM jsonb_populate_record(NULL::public.activities,item) a RETURNING id INTO new_id;
   activity_map:=activity_map||jsonb_build_object(old_id::text,new_id);
 END LOOP;
 FOR item IN SELECT * FROM jsonb_array_elements(b->'weeks') LOOP
   INSERT INTO public.planning_weeks(team_id,name,objectives,sort_order) SELECT new_session,w.name,w.objectives,w.sort_order FROM jsonb_populate_record(NULL::public.planning_weeks,item) w RETURNING id INTO new_id;
   week_map:=week_map||jsonb_build_object(item->>'id',new_id);
 END LOOP;
 FOR item IN SELECT * FROM jsonb_array_elements(b->'practices') LOOP
   INSERT INTO public.planning_practices(week_id,name,key_focus,practice_date,sort_order) SELECT (week_map->>p.week_id::text)::uuid,p.name,p.key_focus,p.practice_date,p.sort_order FROM jsonb_populate_record(NULL::public.planning_practices,item) p RETURNING id INTO new_id;
   practice_map:=practice_map||jsonb_build_object(item->>'id',new_id);
 END LOOP;
 FOR item IN SELECT * FROM jsonb_array_elements(b->'activityRows') LOOP
   INSERT INTO public.planning_practice_activities(practice_id,activity_id,sort_order) SELECT (practice_map->>r.practice_id::text)::uuid,(activity_map->>r.activity_id::text)::uuid,r.sort_order FROM jsonb_populate_record(NULL::public.planning_practice_activities,item) r RETURNING id INTO new_id;
   row_map:=row_map||jsonb_build_object(item->>'id',new_id);
 END LOOP;
 FOR item IN SELECT * FROM jsonb_array_elements(b->'notes') LOOP
   INSERT INTO public.planning_notes(practice_id,week_id,after_activity_row_id,note_scope,note_text,note_date,sort_order) SELECT (practice_map->>n.practice_id::text)::uuid,(week_map->>n.week_id::text)::uuid,(row_map->>n.after_activity_row_id::text)::uuid,n.note_scope,n.note_text,n.note_date,n.sort_order FROM jsonb_populate_record(NULL::public.planning_notes,item) n;
 END LOOP;
 RETURN new_session;
END; $$;
REVOKE ALL ON FUNCTION public.ab3_copy_session(uuid,uuid,jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.ab3_copy_session(uuid,uuid,jsonb) TO service_role;
COMMIT;
