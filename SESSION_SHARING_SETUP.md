# AB3 Activity Library — v11 Session Sharing

## Deployment

1. Back up the database. Test the migration in a non-production Supabase project if available.
2. Run `supabase/migrations/20261124_session_sharing.sql` in the Supabase SQL Editor after the earlier club and session migrations. It runs in a transaction and checks that existing relevant tables have row-level security enabled.
3. Replace the website files with this full source package; retain local `.env.local`, `.git`, and `node_modules`.
4. Deploy. The new copy route uses the existing server-only `SUPABASE_SERVICE_ROLE_KEY` and `NEXT_PUBLIC_SUPABASE_URL` environment variables. Do not put the service role key in a `NEXT_PUBLIC_` variable.

## Behavior

- Existing and new sessions default to Private. Change visibility using Create Session or Edit Details.
- My Sessions shows only the owner's sessions; archived sessions remain owner-only. Club Sessions shows other coaches' club-shared sessions in your current club. All Sessions shows other coaches' Everyone-shared sessions. Own shared sessions remain in My Sessions.
- Club membership is evaluated using current profile assignments. A user without a club cannot save a session as My Club. Existing admin club-assignment server routes remain supported; the migration additionally prevents direct client changes to club assignments and privileged roles.
- A shared session is read-only; its activities and notes are shown within the session. Activity diagrams and animation frames are viewable there. Original activity visibility is not changed.
- A session owner may share their own private activities. Linking another person's activity does not override that person's sharing preferences. If an activity is unavailable to the viewer, the session displays an unavailable activity placeholder and copy fails rather than silently omitting content.
- Copy Session creates a new private session with independent private activity records in the recipient's Activity Library, independent copies of stored preview files, and preserved activity ordering and note placement. Copies can be edited separately. Copying an archived session requires restoring it first. The session name is suffixed with ` - Copy`.
- Copies use additional database and storage space. Removing a session does not remove its copied library activities, just as removing a normal session does not remove its library activities.

## Security verification before production

The migration does not broaden the normal Activity Library read policies. Shared reads are performed through authenticated, session-scoped RPCs; the copy transaction is service-role only. Existing planning table policies are preserved and restrictive owner guards are added to session rows. The database schema and live policies are not supplied with the repository, so verify the migration against the deployed schema and existing policies. Confirm older broad activity SELECT policies were removed as noted in `CLUB_VISIBILITY_SETUP.md`. The website already uses public storage URLs for activity preview files; the migration does not convert the existing activity-files bucket to private storage. A file URL previously obtained can remain usable if the bucket is public. Do not treat this update as revocable access to already viewed/copied content or as a private-storage migration.

Test with A (Club 1), B (Club 1), C (Club 2), and a signed-out browser:

- A creates a private session with an owned private activity; B and C cannot list or open it by URL.
- A changes it to My Club; B can list, open and view the private activity inside the session; C cannot access it. The private activity must not appear in B's regular Activity Library search.
- A changes it to Everyone; B and C can open it; a signed-out client cannot use the session RPCs.
- B cannot change A's session details, planning records, visibility, archive state or delete the session, even via direct API calls.
- B copies the session; the copy is private, activity records and preview file paths are distinct, and notes retain placement. A can then archive/delete the original or change its visibility without affecting the copy.
- A archives the original: it disappears from shared tabs and direct shared reads fail; A can restore it. Test permanent deletion only on an archived test session.
- Confirm Team Planning create/edit/reorder/delete still works normally. Confirm club admin assignment still works and direct client club reassignment is rejected.
