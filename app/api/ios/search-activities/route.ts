import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import type { ActivityCreatorState } from "@/types/activity";

const ACTIVITY_FILES_BUCKET = "activity-files";

type SearchBody = {
  activityName?: unknown;
  fieldLocation?: unknown;
  gamePhase?: unknown;
  category?: unknown;
  positionsInvolved?: unknown;
  numberOfPlayers?: unknown;
  activityDetails?: unknown;
  myActivitiesOnly?: unknown;
  sortValue?: unknown;
};

type RequestUser = {
  id: string;
  email: string;
  clubId: string | null;
  role: string;
};

type ActivityRow = {
  id: string;
  activity_name: string | null;
  activity_details: string | null;
  field_location: string | null;
  game_phase: string | null;
  category: string | null;
  positions_involved: string | null;
  number_of_players: number | null;
  created_by: string | null;
  club_id: string | null;
  visibility: string | null;
  hidden: boolean | null;
  created_at: string | null;
  updated_at: string | null;
  file_path: string | null;
  creator_state: ActivityCreatorState | null;
};

function bearerToken(request: NextRequest) {
  const header = request.headers.get("authorization");
  return header?.startsWith("Bearer ") ? header.slice(7).trim() : undefined;
}

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalized(value: string | null | undefined) {
  return String(value ?? "").trim().toLowerCase();
}

function contains(value: string | null | undefined, search: string) {
  return normalized(value).includes(normalized(search));
}

function isValidCreatorState(value: unknown): value is ActivityCreatorState {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const record = value as Record<string, unknown>;
  const legacy = Array.isArray(record.objects) && Array.isArray(record.lines);
  const frames = Array.isArray(record.frames) && record.frames.length > 0;
  return legacy || frames;
}

async function getRequestUser(request: NextRequest): Promise<RequestUser | null> {
  const token = bearerToken(request);
  if (!token) return null;

  const {
    data: { user },
    error,
  } = await supabaseAdmin.auth.getUser(token);

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

  const visibility = row.visibility || "private";
  if (visibility === "everyone") return true;
  if (visibility === "club") {
    return Boolean(user.clubId && row.club_id && user.clubId === row.club_id);
  }
  return false;
}

function parseNumberFilter(value: string) {
  const trimmed = value.replace(/\s+/g, "");
  if (!trimmed) return (_number: number | null) => true;

  const exact = Number(trimmed);
  if (Number.isFinite(exact)) return (number: number | null) => number === exact;

  const range = trimmed.match(/^(\d+)-(\d+)$/);
  if (range) {
    const low = Number(range[1]);
    const high = Number(range[2]);
    return (number: number | null) => number !== null && number >= low && number <= high;
  }

  const plus = trimmed.match(/^(\d+)\+$/);
  if (plus) {
    const low = Number(plus[1]);
    return (number: number | null) => number !== null && number >= low;
  }

  const less = trimmed.match(/^<(\d+)$/);
  if (less) {
    const high = Number(less[1]);
    return (number: number | null) => number !== null && number < high;
  }

  const greater = trimmed.match(/^>(\d+)$/);
  if (greater) {
    const low = Number(greater[1]);
    return (number: number | null) => number !== null && number > low;
  }

  return (_number: number | null) => false;
}

function sortRows(rows: ActivityRow[], sortValue: string) {
  return [...rows].sort((a, b) => {
    switch (sortValue) {
      case "activityNameDesc":
        return (b.activity_name || "").localeCompare(a.activity_name || "", undefined, { sensitivity: "base" });
      case "newestFirst":
        return Date.parse(b.created_at || "") - Date.parse(a.created_at || "");
      case "oldestFirst":
        return Date.parse(a.created_at || "") - Date.parse(b.created_at || "");
      case "recentlyUpdated":
        return Date.parse(b.updated_at || "") - Date.parse(a.updated_at || "");
      case "oldestUpdated":
        return Date.parse(a.updated_at || "") - Date.parse(b.updated_at || "");
      case "playersLowToHigh":
        return (a.number_of_players ?? Number.MAX_SAFE_INTEGER) - (b.number_of_players ?? Number.MAX_SAFE_INTEGER);
      case "playersHighToLow":
        return (b.number_of_players ?? -1) - (a.number_of_players ?? -1);
      case "activityNameAsc":
      default:
        return (a.activity_name || "").localeCompare(b.activity_name || "", undefined, { sensitivity: "base" });
    }
  });
}

function optionsFrom(rows: ActivityRow[]) {
  const unique = (values: Array<string | null>) =>
    [...new Set(values.map((value) => value?.trim()).filter((value): value is string => Boolean(value)))].sort(
      (a, b) => a.localeCompare(b, undefined, { sensitivity: "base" })
    );

  return {
    fieldLocationOptions: unique(rows.map((row) => row.field_location)),
    gamePhaseOptions: unique(rows.map((row) => row.game_phase)),
    categoryOptions: unique(rows.map((row) => row.category)),
  };
}

async function accessibleRows(request: NextRequest) {
  const user = await getRequestUser(request);
  if (!user) {
    return { user: null, rows: [] as ActivityRow[], error: "You must be logged in to search the AB3 Activity Library." };
  }

  const { data, error } = await supabaseAdmin
    .from("activities")
    .select(
      "id, activity_name, activity_details, field_location, game_phase, category, positions_involved, number_of_players, created_by, club_id, visibility, hidden, created_at, updated_at, file_path, creator_state"
    );

  if (error) {
    throw error;
  }

  const rows = ((data || []) as ActivityRow[]).filter(
    (row) => canView(row, user) && isValidCreatorState(row.creator_state) && (!row.hidden || isOwner(row, user))
  );

  return { user, rows, error: null };
}

export async function GET(request: NextRequest) {
  try {
    const { user, rows, error } = await accessibleRows(request);
    if (!user) return NextResponse.json({ error }, { status: 401 });
    return NextResponse.json(optionsFrom(rows));
  } catch (error) {
    console.error("iOS Library search options failed.", error);
    return NextResponse.json({ error: "The Library search options could not be loaded." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { user, rows, error } = await accessibleRows(request);
    if (!user) return NextResponse.json({ error }, { status: 401 });

    const body = (await request.json()) as SearchBody;
    const activityName = text(body.activityName);
    const fieldLocation = text(body.fieldLocation);
    const gamePhase = text(body.gamePhase);
    const category = text(body.category);
    const positionsInvolved = text(body.positionsInvolved);
    const numberOfPlayers = text(body.numberOfPlayers);
    const activityDetails = text(body.activityDetails);
    const myActivitiesOnly = body.myActivitiesOnly === true;
    const sortValue = text(body.sortValue) || "activityNameAsc";
    const numberMatches = parseNumberFilter(numberOfPlayers);

    const filtered = rows.filter((row) => {
      if (myActivitiesOnly && !isOwner(row, user)) return false;
      if (activityName && !contains(row.activity_name, activityName)) return false;
      if (fieldLocation && normalized(row.field_location) !== normalized(fieldLocation)) return false;
      if (gamePhase && normalized(row.game_phase) !== normalized(gamePhase)) return false;
      if (category && normalized(row.category) !== normalized(category)) return false;
      if (positionsInvolved && !contains(row.positions_involved, positionsInvolved)) return false;
      if (activityDetails && !contains(row.activity_details, activityDetails)) return false;
      if (numberOfPlayers && !numberMatches(row.number_of_players)) return false;
      return true;
    });

    const results = sortRows(filtered, sortValue).slice(0, 200).map((row) => {
      const owner = isOwner(row, user);
      const previewURL = row.file_path
        ? supabaseAdmin.storage.from(ACTIVITY_FILES_BUCKET).getPublicUrl(row.file_path).data.publicUrl
        : null;

      return {
        id: row.id,
        activityName: row.activity_name || "Untitled Activity",
        activityDetails: row.activity_details || "",
        fieldLocation: row.field_location || "",
        gamePhase: row.game_phase || "",
        category: row.category || "",
        positionsInvolved: row.positions_involved || "",
        numberOfPlayers: row.number_of_players,
        createdBy: row.created_by || "AB3 Coach",
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        previewURL,
        isCreator: owner,
        canEditOriginal: owner,
      };
    });

    return NextResponse.json({ ok: true, results, options: optionsFrom(rows) });
  } catch (error) {
    console.error("iOS Library search failed.", error);
    return NextResponse.json({ error: "The AB3 Activity Library search failed." }, { status: 500 });
  }
}
