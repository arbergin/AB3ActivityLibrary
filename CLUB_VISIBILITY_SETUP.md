# Club and Activity Visibility Setup

## 1. Run the Supabase migration

Open Supabase SQL Editor and run:

`supabase/migrations/20260711_add_clubs_and_activity_visibility.sql`

This creates `clubs`, adds `profiles.club_id`, adds `activities.visibility` and `activities.club_id`, migrates existing activities to `private`, and adds the new RLS policies.

## 2. Review older activity policies

In Supabase, open Database > Policies > activities. Remove or tighten any older broad SELECT policy such as `using (true)`. PostgreSQL combines permissive policies with OR, so an old broad policy can override the new visibility restrictions.

## 3. Deploy the updated application

The updated Admin page can add clubs and assign users. Activity save/import/edit now requires Private, My Club, or Everyone. iOS uploads default to Private.

## 4. Test with three accounts

- User A in Club 1
- User B in Club 1
- User C in Club 2

Confirm Private is owner-only, My Club is visible to A and B but not C, and Everyone is visible to all signed-in users.
