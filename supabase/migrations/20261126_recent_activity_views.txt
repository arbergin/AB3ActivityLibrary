-- Run before deploying the new site. Safe to rerun.
BEGIN;
CREATE TABLE IF NOT EXISTS public.recent_activity_views (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  activity_id uuid NOT NULL REFERENCES public.activities(id) ON DELETE CASCADE,
  last_viewed_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, activity_id)
);
CREATE INDEX IF NOT EXISTS recent_activity_views_user_date_idx
  ON public.recent_activity_views (user_id, last_viewed_at DESC, activity_id);
ALTER TABLE public.recent_activity_views ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.recent_activity_views FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.recent_activity_views TO authenticated;
DROP POLICY IF EXISTS recent_views_select ON public.recent_activity_views;
DROP POLICY IF EXISTS recent_views_insert ON public.recent_activity_views;
DROP POLICY IF EXISTS recent_views_update ON public.recent_activity_views;
CREATE POLICY recent_views_select ON public.recent_activity_views FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));
CREATE POLICY recent_views_insert ON public.recent_activity_views FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()) AND EXISTS (SELECT 1 FROM public.activities a WHERE a.id = activity_id));
CREATE POLICY recent_views_update ON public.recent_activity_views FOR UPDATE TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()) AND EXISTS (SELECT 1 FROM public.activities a WHERE a.id = activity_id));

-- Invoker rights deliberately preserve the existing activity visibility policies.
CREATE OR REPLACE FUNCTION public.ab3_record_recent_activity(p_user_id uuid, p_activity_id uuid)
RETURNS void LANGUAGE sql SECURITY INVOKER SET search_path = '' AS $$
  INSERT INTO public.recent_activity_views AS r (user_id, activity_id, last_viewed_at)
  SELECT p_user_id, a.id, clock_timestamp() FROM public.activities a
  WHERE a.id = p_activity_id AND p_user_id = (SELECT auth.uid())
  ON CONFLICT (user_id, activity_id) DO UPDATE
  SET last_viewed_at = greatest(r.last_viewed_at, EXCLUDED.last_viewed_at);
$$;
-- Legacy storage contains order only, not actual timestamps. Give imported rows
-- synthetic historical timestamps so they never displace real new views.
CREATE OR REPLACE FUNCTION public.ab3_import_recent_activities(p_user_id uuid, p_activity_ids uuid[])
RETURNS void LANGUAGE sql SECURITY INVOKER SET search_path = '' AS $$
  INSERT INTO public.recent_activity_views (user_id, activity_id, last_viewed_at)
  SELECT p_user_id, a.id, timestamptz '2000-01-01 00:00:00+00' - min(x.ord) * interval '1 second'
  FROM unnest(p_activity_ids) WITH ORDINALITY AS x(id, ord)
  JOIN public.activities a ON a.id = x.id
  WHERE p_user_id = (SELECT auth.uid()) AND x.ord <= 5
  GROUP BY a.id
  ON CONFLICT (user_id, activity_id) DO NOTHING;
$$;
REVOKE ALL ON FUNCTION public.ab3_record_recent_activity(uuid, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.ab3_import_recent_activities(uuid, uuid[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ab3_record_recent_activity(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.ab3_import_recent_activities(uuid, uuid[]) TO authenticated;
COMMIT;
