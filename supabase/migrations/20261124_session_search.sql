-- Apply after 20261124_session_sharing.sql. Search returns only authorized session metadata.
BEGIN;
CREATE OR REPLACE FUNCTION public.ab3_search_sessions(p_search text)
RETURNS SETOF public.planning_teams
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
 WITH term AS (SELECT lower(btrim(coalesce(p_search,''))) AS q),
 permitted AS MATERIALIZED (
   SELECT t.* FROM public.planning_teams t
   WHERE t.kind='session' AND public.ab3_session_can_read(t.id,auth.uid())
 )
 SELECT t.* FROM permitted t CROSS JOIN term
 LEFT JOIN public.profiles owner ON owner.id=t.user_id
 WHERE term.q='' OR
 strpos(lower(concat_ws(' ',t.name,t.session_details->>'objective',t.session_details->>'gamePhase',
   (SELECT string_agg(v,' ') FROM jsonb_array_elements_text(CASE WHEN jsonb_typeof(t.session_details->'principles')='array' THEN t.session_details->'principles' ELSE '[]'::jsonb END) AS x(v)),
   (SELECT string_agg(v,' ') FROM jsonb_array_elements_text(CASE WHEN jsonb_typeof(t.session_details->'subprinciples')='array' THEN t.session_details->'subprinciples' ELSE '[]'::jsonb END) AS x(v)),owner.name)),term.q)>0
 OR EXISTS (
   SELECT 1 FROM public.planning_weeks w
   JOIN public.planning_practices p ON p.week_id=w.id
   JOIN public.planning_practice_activities r ON r.practice_id=p.id
   JOIN public.activities a ON a.id=r.activity_id
   WHERE w.team_id=t.id AND public.ab3_session_activity_allowed(a.id,t.id,auth.uid())
     AND strpos(lower(concat_ws(' ',a.activity_name,a.activity_details)),term.q)>0
 ) OR EXISTS (
   SELECT 1 FROM public.planning_weeks w
   JOIN public.planning_practices p ON p.week_id=w.id
   JOIN public.planning_notes n ON n.practice_id=p.id
   WHERE w.team_id=t.id AND strpos(lower(coalesce(n.note_text,'')),term.q)>0
 )
 ORDER BY t.updated_at DESC;
$$;
REVOKE ALL ON FUNCTION public.ab3_search_sessions(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.ab3_search_sessions(text) TO authenticated;
NOTIFY pgrst, 'reload schema';
COMMIT;
