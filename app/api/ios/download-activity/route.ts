import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getIOSCompatibleCreatorState } from "@/lib/activityCreatorFrames";
import type { ActivityCreatorState } from "@/types/activity";

type RequestBody = { libraryActivityId?: unknown };
type RequestUser = { id: string; email: string; clubId: string | null; role: string };

type ActivityRow = {
  id: string;
  activity_name: string | null;
  activity_details: string | null;
  created_by: string | null;
  club_id: string | null;
  visibility: string | null;
  hidden: boolean | null;
  created_at: string | null;
  updated_at: string | null;
  creator_state: ActivityCreatorState | null;
};

function token(request: NextRequest) {
  const value = request.headers.get("authorization");
  return value?.startsWith("Bearer ") ? value.slice(7).trim() : undefined;
}

function normalized(value: string | null | undefined) {
  return String(value ?? "").trim().toLowerCase();
}

async function requestUser(request: NextRequest): Promise<RequestUser | null> {
  const accessToken = token(request);
  if (!accessToken) return null;

  const { data: { user }, error } = await supabaseAdmin.auth.getUser(accessToken);
  if (error || !user) return null;

  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("club_id, role, email")
    .eq("id", user.id)
    .maybeSingle();

  return {
    id: user.id,
    email: user.email || profile?.email || "",
    clubId: profile?.club_id || null,
    role: profile?.role || "user",
  };
}

function isOwner(row: ActivityRow, user: RequestUser) {
  const owner = normalized(row.created_by);

  return Boolean(
    owner &&
      (owner === normalized(user.email) ||
        owner === normalized(user.id))
  );
}

function canView(row: ActivityRow, user: RequestUser) {
  if (user.role === "admin" || isOwner(row, user)) return true;
  if (row.visibility === "everyone") return true;
  return row.visibility === "club" && Boolean(user.clubId && row.club_id === user.clubId);
}

function validCreatorState(value: unknown): value is ActivityCreatorState {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const record = value as Record<string, unknown>;
  return (Array.isArray(record.objects) && Array.isArray(record.lines)) || Array.isArray(record.frames);
}

function schemaVersion(state: ActivityCreatorState) {
  const value = (state as Record<string, unknown>).schemaVersion;
  return typeof value === "number" && Number.isFinite(value) ? value : 2;
}

function clientActivityId(state: ActivityCreatorState) {
  const value = (state as Record<string, unknown>).clientActivityId;
  return typeof value === "string" ? value : "";
}

export async function POST(request: NextRequest) {
  try {
    const user = await requestUser(request);
    if (!user) {
      return NextResponse.json(
        { error: "You must be logged in to download an AB3 Library activity." },
        { status: 401 }
      );
    }

    const body = (await request.json()) as RequestBody;
    const libraryActivityId = typeof body.libraryActivityId === "string"
      ? body.libraryActivityId.trim()
      : "";

    if (!libraryActivityId) {
      return NextResponse.json({ error: "libraryActivityId is required." }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from("activities")
      .select(
        "id, activity_name, activity_details, created_by, club_id, visibility, hidden, created_at, updated_at, creator_state"
      )
      .eq("id", libraryActivityId)
      .maybeSingle();

    if (error) throw error;
    if (!data) return NextResponse.json({ error: "The activity could not be found." }, { status: 404 });

    const row = data as ActivityRow;
    if (!canView(row, user) || (row.hidden && !isOwner(row, user))) {
      return NextResponse.json({ error: "You do not have access to this activity." }, { status: 403 });
    }

    if (!validCreatorState(row.creator_state)) {
      return NextResponse.json(
        { error: "This activity does not have an editable creator state that can be downloaded to iOS." },
        { status: 400 }
      );
    }

    const state = row.creator_state;
    const owner = isOwner(row, user);
    const version = schemaVersion(state);
    const clientId = clientActivityId(state);

    return NextResponse.json({
      ok: true,
      isCreator: owner,
      canEditOriginal: owner,
      activity: {
        schemaVersion: version,
        clientActivityId: clientId,
        libraryActivityId: row.id,
        name: row.activity_name || "Untitled Activity",
        folderName: "Default",
        activityDetails: row.activity_details || "",
        sourcePlatform: "web",
        createdAt: row.created_at || new Date().toISOString(),
        updatedAt: row.updated_at || row.created_at || new Date().toISOString(),
        lastSyncedAt: row.updated_at,
        previewDataUrl: null,
        creatorState: {
          ...getIOSCompatibleCreatorState(state),
          schemaVersion: version,
          sourcePlatform: "web",
          clientActivityId: clientId || undefined,
        },
      },
    });
  } catch (error) {
    console.error("iOS Library activity download failed.", error);
    return NextResponse.json({ error: "The activity could not be downloaded." }, { status: 500 });
  }
}
