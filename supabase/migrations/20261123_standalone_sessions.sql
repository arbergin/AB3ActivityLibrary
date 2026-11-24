-- Run once in Supabase SQL Editor before deploying Sessions.
-- Existing planning teams remain teams. Standalone sessions share the
-- existing weeks/practices/activity rows/notes infrastructure without a team.
ALTER TABLE public.planning_teams
  ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'team';

ALTER TABLE public.planning_teams
  DROP CONSTRAINT IF EXISTS planning_teams_kind_check;
ALTER TABLE public.planning_teams
  ADD CONSTRAINT planning_teams_kind_check CHECK (kind IN ('team', 'session'));

CREATE INDEX IF NOT EXISTS planning_teams_user_kind_active_idx
  ON public.planning_teams (user_id, kind, is_active);
