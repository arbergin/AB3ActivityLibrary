import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import type { ActivityCreatorState } from "@/types/activity";

type IOSPullActivityUpdatesRequestBody = {
  libraryActivityId?: unknown;
  lastSyncedAt?: unknown;
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
      error: "You must be logged in to check Library activity updates.",
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

function buildCreatedByValue(user: NonNullable<RequestingUserResult["user"]>) {
  return (
    user.email ||
    (typeof user.user_metadata?.name === "string"
      ? user.user_metadata.name.trim()
      : "iOS Sync User")
  );
}

function isValidCreatorState(value: unknown): value is ActivityCreatorState {
  if (!isObjectRecord(value)) {
    return false;
  }

  return Array.isArray(value.objects) && Array.isArray(value.lines);
}

function getCreatorStateSchemaVersion(creatorState: ActivityCreatorState) {
  const creatorStateRecord = creatorState as Record<string, unknown>;

  if (
    typeof creatorStateRecord.schemaVersion === "number" &&
    Number.isFinite(creatorStateRecord.schemaVersion)
  ) {
    return creatorStateRecord.schemaVersion;
  }

  return 2;
}

function getCreatorStateClientActivityId(creatorState: ActivityCreatorState) {
  const creatorStateRecord = creatorState as Record<string, unknown>;

  if (typeof creatorStateRecord.clientActivityId === "string") {
    return creatorStateRecord.clientActivityId;
  }

  return undefined;
}

function getCreatorStateSourcePlatform(creatorState: ActivityCreatorState) {
  const creatorStateRecord = creatorState as Record<string, unknown>;

  if (typeof creatorStateRecord.sourcePlatform === "string") {
    return creatorStateRecord.sourcePlatform;
  }

  return "web";
}

function hasServerUpdate({
  serverUpdatedAt,
  clientLastSyncedAt,
}: {
  serverUpdatedAt?: string | null;
  clientLastSyncedAt?: string;
}) {
  if (!serverUpdatedAt) {
    return false;
  }

  if (!clientLastSyncedAt) {
    return true;
  }

  const serverUpdatedTime = new Date(serverUpdatedAt).getTime();
  const clientLastSyncedTime = new Date(clientLastSyncedAt).getTime();

  if (Number.isNaN(serverUpdatedTime) || Number.isNaN(clientLastSyncedTime)) {
    return true;
  }

  return serverUpdatedTime > clientLastSyncedTime + 2000;
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

    const body = (await request.json()) as IOSPullActivityUpdatesRequestBody;
    const libraryActivityId = getStringValue(body.libraryActivityId);
    const lastSyncedAt = getOptionalIsoDate(body.lastSyncedAt);

    if (!libraryActivityId) {
      return NextResponse.json(
        { error: "libraryActivityId is required." },
        { status: 400 }
      );
    }

    const createdBy = buildCreatedByValue(userCheck.user);

    const { data: existingActivity, error: existingActivityError } =
      await supabaseAdmin
        .from("activities")
        .select(
          "id, activity_name, activity_details, created_by, created_at, updated_at, creator_state"
        )
        .eq("id", libraryActivityId)
        .eq("created_by", createdBy)
        .maybeSingle();

    if (existingActivityError) {
      console.error("iOS pull activity lookup failed.", {
        message: existingActivityError.message,
        details: existingActivityError.details,
        hint: existingActivityError.hint,
        code: existingActivityError.code,
      });

      return NextResponse.json(
        {
          error: "The Library activity could not be checked for updates.",
          details: existingActivityError.message,
        },
        { status: 500 }
      );
    }

    if (!existingActivity) {
      return NextResponse.json(
        {
          error:
            "This activity was not found in the AB3 Activity Library for the signed-in user.",
        },
        { status: 404 }
      );
    }

    const creatorState = existingActivity.creator_state;

    if (!isValidCreatorState(creatorState)) {
      return NextResponse.json(
        {
          error:
            "The Library activity does not have an editable creator state that can be downloaded to iOS.",
        },
        { status: 400 }
      );
    }

    const serverUpdatedAt = existingActivity.updated_at;
    const updateAvailable = hasServerUpdate({
      serverUpdatedAt,
      clientLastSyncedAt: lastSyncedAt,
    });

    if (!updateAvailable) {
      return NextResponse.json({
        ok: true,
        hasUpdate: false,
        message: "The local iOS activity is already up to date.",
        serverUpdatedAt,
        activity: null,
      });
    }

    const schemaVersion = getCreatorStateSchemaVersion(creatorState);
    const clientActivityId = getCreatorStateClientActivityId(creatorState);

    return NextResponse.json({
      ok: true,
      hasUpdate: true,
      message: "A newer Library version is available.",
      serverUpdatedAt,
      activity: {
        schemaVersion,
        clientActivityId: clientActivityId || "",
        libraryActivityId: existingActivity.id,
        name: existingActivity.activity_name,
        folderName: "Default",
        activityDetails: existingActivity.activity_details || "",
        sourcePlatform: "web",
        createdAt: existingActivity.created_at,
        updatedAt: existingActivity.updated_at,
        lastSyncedAt: existingActivity.updated_at,
        previewDataUrl: null,
        creatorState: {
          ...creatorState,
          schemaVersion,
          sourcePlatform: getCreatorStateSourcePlatform(creatorState),
          clientActivityId: clientActivityId || undefined,
          libraryActivityId: existingActivity.id,
          lastSyncedAt: existingActivity.updated_at,
        },
      },
    });
  } catch (error) {
    console.error("iOS pull activity updates route failed.", error);

    return NextResponse.json(
      { error: "Unexpected server error while checking Library updates." },
      { status: 500 }
    );
  }
}
