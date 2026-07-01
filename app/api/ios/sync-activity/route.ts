import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import type { ActivityCreatorState } from "@/types/activity";

type IOSSyncActivityRequestBody = {
  activityName?: unknown;
  name?: unknown;
  activityDetails?: unknown;
  clientActivityId?: unknown;
  schemaVersion?: unknown;
  sourcePlatform?: unknown;
  createdAt?: unknown;
  updatedAt?: unknown;
  creatorState?: unknown;
};

type RequestingUserResult = {
  user: {
    email?: string | null;
    user_metadata?: Record<string, unknown>;
  } | null;
  error: string | null;
  status: number;
};

function getBearerToken(request: NextRequest) {
  const authorizationHeader = request.headers.get("authorization");

  if (!authorizationHeader?.startsWith("Bearer ")) {
    return undefined;
  }

  return authorizationHeader.replace("Bearer ", "").trim();
}

function isDevSyncBypassEnabled() {
  return process.env.IOS_SYNC_DEV_BYPASS === "true";
}

async function getRequestingUser(
  request: NextRequest
): Promise<RequestingUserResult> {
  if (isDevSyncBypassEnabled()) {
    return {
      user: {
        email: process.env.IOS_SYNC_DEV_USER_EMAIL || "dev-ios-sync@ab3.local",
        user_metadata: {
          name: "iOS Sync Dev Test User",
        },
      },
      error: null,
      status: 200,
    };
  }

  const accessToken = getBearerToken(request);

  if (!accessToken) {
    return {
      user: null,
      error: "Missing authorization token.",
      status: 401,
    };
  }

  const {
    data: { user },
    error: userError,
  } = await supabaseAdmin.auth.getUser(accessToken);

  if (userError || !user) {
    return {
      user: null,
      error: "You must be logged in to sync an activity.",
      status: 401,
    };
  }

  return {
    user,
    error: null,
    status: 200,
  };
}

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getStringValue(value: unknown, fallback = "") {
  return typeof value === "string" ? value.trim() : fallback;
}

function getOptionalIsoDate(value: unknown) {
  if (typeof value !== "string") {
    return undefined;
  }

  const parsedDate = new Date(value);

  if (Number.isNaN(parsedDate.getTime())) {
    return undefined;
  }

  return parsedDate.toISOString();
}

function isValidCreatorState(value: unknown): value is ActivityCreatorState {
  if (!isObjectRecord(value)) {
    return false;
  }

  return Array.isArray(value.objects) && Array.isArray(value.lines);
}

function countPlayersFromCreatorState(creatorState: ActivityCreatorState) {
  const objects = Array.isArray(creatorState.objects)
    ? creatorState.objects
    : [];

  return objects.filter(
    (object) => object.type === "team1" || object.type === "team2"
  ).length;
}

function getPayloadCreatorState(body: IOSSyncActivityRequestBody) {
  if (isValidCreatorState(body.creatorState)) {
    return body.creatorState;
  }

  return undefined;
}

export async function POST(request: NextRequest) {
  try {
    const userCheck = await getRequestingUser(request);

    if (!userCheck.user) {
      return NextResponse.json(
        { error: userCheck.error },
        { status: userCheck.status }
      );
    }

    const body = (await request.json()) as IOSSyncActivityRequestBody;

    const activityName =
      getStringValue(body.activityName) || getStringValue(body.name);

    if (!activityName) {
      return NextResponse.json(
        { error: "Activity name is required." },
        { status: 400 }
      );
    }

    const creatorState = getPayloadCreatorState(body);

    if (!creatorState) {
      return NextResponse.json(
        {
          error:
            "A valid creatorState is required. It must include objects and lines arrays.",
        },
        { status: 400 }
      );
    }

    const clientActivityId = getStringValue(body.clientActivityId);
    const sourcePlatform = getStringValue(body.sourcePlatform, "ios");
    const schemaVersion =
      typeof body.schemaVersion === "number" &&
      Number.isFinite(body.schemaVersion)
        ? body.schemaVersion
        : 2;

    const createdAt = getOptionalIsoDate(body.createdAt);
    const updatedAt = getOptionalIsoDate(body.updatedAt);
    const nowIso = new Date().toISOString();

    const numberOfPlayers = countPlayersFromCreatorState(creatorState);

    const creatorStateWithSyncMetadata = {
      ...creatorState,
      schemaVersion:
        "schemaVersion" in creatorState
          ? creatorState.schemaVersion
          : schemaVersion,
      sourcePlatform,
      clientActivityId:
        clientActivityId ||
        ("clientActivityId" in creatorState &&
        typeof creatorState.clientActivityId === "string"
          ? creatorState.clientActivityId
          : undefined),
    };

    const insertValue = {
      activity_name: activityName,
      field_location: null,
      game_phase: null,
      category: null,
      positions_involved: null,
      number_of_players: numberOfPlayers || null,
      activity_details: getStringValue(body.activityDetails) || null,

      created_by:
        userCheck.user.email ||
        getStringValue(userCheck.user.user_metadata?.name, "iOS Sync User"),
      hidden: false,

      activity_source: "create",
      creator_state: creatorStateWithSyncMetadata,

      file_name: null,
      file_type: null,
      file_path: null,
      file_bucket: "activity-files",

      created_at: createdAt || nowIso,
      updated_at: updatedAt || nowIso,
    };

    const { data, error } = await supabaseAdmin
      .from("activities")
      .insert(insertValue)
      .select("*")
      .single();

    if (error) {
      console.error("iOS sync activity insert failed.", {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
      });

      return NextResponse.json(
        {
          error: "The activity could not be synced to the Library.",
          details: error.message,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      devBypassUsed: isDevSyncBypassEnabled(),
      activity: {
        id: data.id,
        activityName: data.activity_name,
        clientActivityId:
          clientActivityId ||
          ("clientActivityId" in creatorStateWithSyncMetadata
            ? creatorStateWithSyncMetadata.clientActivityId
            : undefined),
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      },
    });
  } catch (error) {
    console.error("iOS sync activity route failed.", error);

    return NextResponse.json(
      { error: "Unexpected server error while syncing the iOS activity." },
      { status: 500 }
    );
  }
}