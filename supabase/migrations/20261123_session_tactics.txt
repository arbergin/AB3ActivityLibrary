-- Run after 20261123_standalone_sessions.sql, before deploying v4.
ALTER TABLE public.planning_teams
  ADD COLUMN IF NOT EXISTS session_details jsonb;
-- Existing sessions can be edited without any backfill. Team records remain unchanged.
