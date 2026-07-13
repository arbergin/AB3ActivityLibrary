import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import type { ActivityCreatorState } from "@/types/activity";
import {
  getActiveActivityCreatorFrame,
  getIOSCompatibleCreatorState,
} from "@/lib/activityCreatorFrames";

type IOSSyncActivityRequestBody = {
  activityName?: unknown;
  name?: unknown;
  activityDetails?: unknown;
  clientActivityId?: unknown;
  libraryActivityId?: unknown;
  schemaVersion?: unknown;
  sourcePlatform?: unknown;
  createdAt?: unknown;
  updatedAt?: unknown;
  lastSyncedAt?: unknown;
  creatorState?: unknown;
  previewDataUrl?: unknown;
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

function getPreviewDataUrl(value: unknown) {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmedValue = value.trim();

  if (!trimmedValue) {
    return undefined;
  }

  return trimmedValue;
}

function sanitizeFileNamePart(value: string) {
  return value
    .trim()
    .replace(/[^a-z0-9-_ ]/gi, "")
    .replace(/\s+/g, "_")
    .toLowerCase()
    .slice(0, 80);
}

function parseDataUrl(dataUrl: string) {
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);

  if (!match) {
    throw new Error("Preview image must be a valid base64 data URL.");
  }

  const rawContentType = match[1].toLowerCase();
  const base64Data = match[2];

  const contentType =
    rawContentType === "image/jpg" ? "image/jpeg" : rawContentType;

  if (contentType !== "image/jpeg" && contentType !== "image/png") {
    throw new Error("Preview image must be a JPEG or PNG data URL.");
  }

  return {
    contentType,
    buffer: Buffer.from(base64Data, "base64"),
  };
}

function getPreviewFileExtension(contentType: string) {
  if (contentType === "image/jpeg") {
    return "jpg";
  }

  return "png";
}

function createPreviewFilePath(
  activityName: string,
  clientActivityId: string,
  contentType: string
) {
  const safeActivityName = sanitizeFileNamePart(activityName) || "ios_activity";
  const safeClientId = sanitizeFileNamePart(clientActivityId) || "local";
  const timestamp = Date.now();
  const extension = getPreviewFileExtension(contentType);

  return `activities/${safeActivityName}_${safeClientId}_${timestamp}.${extension}`;
}

async function uploadPreviewDataUrl(
  previewDataUrl: string | undefined,
  activityName: string,
  clientActivityId: string
) {
  if (!previewDataUrl) {
    return undefined;
  }

  const { contentType, buffer } = parseDataUrl(previewDataUrl);
  const filePath = createPreviewFilePath(
    activityName,
    clientActivityId,
    contentType
  );

  const { error } = await supabaseAdmin.storage
    .from("activity-files")
    .upload(filePath, buffer, {
      contentType,
      upsert: false,
    });

  if (error) {
    throw new Error(error.message);
  }

  return {
    fileName:
      filePath.split("/").pop() ||
      (contentType === "image/jpeg"
        ? "ios_activity_preview.jpg"
        : "ios_activity_preview.png"),
    fileType: contentType,
    filePath,
    fileBucket: "activity-files",
  };
}

function isValidCreatorState(value: unknown): value is ActivityCreatorState {
  if (!isObjectRecord(value)) {
    return false;
  }

  const hasLegacyCanvas = Array.isArray(value.objects) && Array.isArray(value.lines);
  const hasFrames =
    value.schemaVersion === 3 &&
    Array.isArray(value.frames) &&
    value.frames.some(
      (frame) =>
        isObjectRecord(frame) &&
        Array.isArray(frame.objects) &&
        Array.isArray(frame.lines)
    );

  return hasLegacyCanvas || hasFrames;
}

function countPlayersFromCreatorState(creatorState: ActivityCreatorState) {
  const objects = getActiveActivityCreatorFrame(creatorState)?.objects ?? [];

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

function buildCreatedByValue(user: NonNullable<RequestingUserResult["user"]>) {
  return (
    user.email || getStringValue(user.user_metadata?.name, "iOS Sync User")
  );
}

function getCreatorStateClientActivityId(creatorState: ActivityCreatorState) {
  if (
    "clientActivityId" in creatorState &&
    typeof creatorState.clientActivityId === "string"
  ) {
    return creatorState.clientActivityId;
  }

  return undefined;
}

function hasSyncConflict({
  existingUpdatedAt,
  clientLastSyncedAt,
}: {
  existingUpdatedAt?: string | null;
  clientLastSyncedAt?: string;
}) {
  if (!existingUpdatedAt || !clientLastSyncedAt) {
    return false;
  }

  const existingUpdatedTime = new Date(existingUpdatedAt).getTime();
  const clientLastSyncedTime = new Date(clientLastSyncedAt).getTime();

  if (
    Number.isNaN(existingUpdatedTime) ||
    Number.isNaN(clientLastSyncedTime)
  ) {
    return false;
  }

  // Give a small buffer for clock/rounding differences between the iOS device,
  // Supabase, and the web app. Anything meaningfully newer on the server is a conflict.
  return existingUpdatedTime > clientLastSyncedTime + 2000;
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
            "A valid creatorState is required. It must include objects and lines arrays, or a schema-version-3 frames array.",
        },
        { status: 400 }
      );
    }

    const incomingLibraryActivityId = getStringValue(body.libraryActivityId);
    const clientActivityId = getStringValue(body.clientActivityId);
    const sourcePlatform = getStringValue(body.sourcePlatform, "ios");

    const schemaVersion =
      typeof body.schemaVersion === "number" &&
      Number.isFinite(body.schemaVersion)
        ? body.schemaVersion
        : 2;

    const createdAt = getOptionalIsoDate(body.createdAt);
    const updatedAt = getOptionalIsoDate(body.updatedAt);
    const lastSyncedAt = getOptionalIsoDate(body.lastSyncedAt);
    const nowIso = new Date().toISOString();

    const createdBy = buildCreatedByValue(userCheck.user);
    const numberOfPlayers = countPlayersFromCreatorState(creatorState);
    const previewDataUrl = getPreviewDataUrl(body.previewDataUrl);

    const creatorStateWithSyncMetadata = {
      ...getIOSCompatibleCreatorState(creatorState),
      schemaVersion:
        "schemaVersion" in creatorState
          ? creatorState.schemaVersion
          : schemaVersion,
      sourcePlatform,
      clientActivityId:
        clientActivityId || getCreatorStateClientActivityId(creatorState),
      libraryActivityId: incomingLibraryActivityId || undefined,
      lastSyncedAt: lastSyncedAt || undefined,
    };

    if (incomingLibraryActivityId) {
      const { data: existingActivity, error: existingActivityError } =
        await supabaseAdmin
          .from("activities")
          .select("id, activity_name, created_by, updated_at")
          .eq("id", incomingLibraryActivityId)
          .eq("created_by", createdBy)
          .maybeSingle();

      if (existingActivityError) {
        console.error("iOS sync activity lookup failed.", {
          message: existingActivityError.message,
          details: existingActivityError.details,
          hint: existingActivityError.hint,
          code: existingActivityError.code,
        });

        return NextResponse.json(
          {
            error: "The existing Library activity could not be checked.",
            details: existingActivityError.message,
          },
          { status: 500 }
        );
      }

      if (existingActivity) {
        if (
          hasSyncConflict({
            existingUpdatedAt: existingActivity.updated_at,
            clientLastSyncedAt: lastSyncedAt,
          })
        ) {
          return NextResponse.json(
            {
              error:
                "This activity changed in the AB3 Activity Library after your last iOS sync. The iOS version was not uploaded so it would not overwrite newer Library changes.",
              code: "SYNC_CONFLICT",
              activity: {
                id: existingActivity.id,
                activityName: existingActivity.activity_name,
                updatedAt: existingActivity.updated_at,
              },
              serverUpdatedAt: existingActivity.updated_at,
              clientLastSyncedAt: lastSyncedAt,
            },
            { status: 409 }
          );
        }

        let uploadedPreview:
          | Awaited<ReturnType<typeof uploadPreviewDataUrl>>
          | undefined;

        try {
          uploadedPreview = await uploadPreviewDataUrl(
            previewDataUrl,
            activityName,
            clientActivityId || getCreatorStateClientActivityId(creatorState) || "ios"
          );
        } catch (previewError) {
          const message =
            previewError instanceof Error
              ? previewError.message
              : "The preview image could not be uploaded.";

          return NextResponse.json(
            {
              error: "The preview image could not be uploaded.",
              details: message,
            },
            { status: 400 }
          );
        }

        const updateValue = {
          activity_name: activityName,
          number_of_players: numberOfPlayers || null,
          activity_details: getStringValue(body.activityDetails) || null,

          activity_source: "create",
          creator_state: {
            ...creatorStateWithSyncMetadata,
            libraryActivityId: incomingLibraryActivityId || undefined,
          },

          ...(uploadedPreview
            ? {
                file_name: uploadedPreview.fileName,
                file_type: uploadedPreview.fileType,
                file_path: uploadedPreview.filePath,
                file_bucket: uploadedPreview.fileBucket,
              }
            : {}),

          updated_at: updatedAt || nowIso,
        };

        const { data: updatedActivity, error: updateError } =
          await supabaseAdmin
            .from("activities")
            .update(updateValue)
            .eq("id", incomingLibraryActivityId)
            .eq("created_by", createdBy)
            .select("*")
            .single();

        if (updateError) {
          console.error("iOS sync activity update failed.", {
            message: updateError.message,
            details: updateError.details,
            hint: updateError.hint,
            code: updateError.code,
          });

          return NextResponse.json(
            {
              error: "The activity could not be updated in the Library.",
              details: updateError.message,
            },
            { status: 500 }
          );
        }

        return NextResponse.json({
          ok: true,
          action: "updated",
          devBypassUsed: isDevSyncBypassEnabled(),
          activity: {
            id: updatedActivity.id,
            activityName: updatedActivity.activity_name,
            clientActivityId:
              clientActivityId || getCreatorStateClientActivityId(creatorState),
            createdAt: updatedActivity.created_at,
            updatedAt: updatedActivity.updated_at,
          },
        });
      }
    }

    let uploadedPreview:
      | Awaited<ReturnType<typeof uploadPreviewDataUrl>>
      | undefined;

    try {
      uploadedPreview = await uploadPreviewDataUrl(
        previewDataUrl,
        activityName,
        clientActivityId || getCreatorStateClientActivityId(creatorState) || "ios"
      );
    } catch (previewError) {
      const message =
        previewError instanceof Error
          ? previewError.message
          : "The preview image could not be uploaded.";

      return NextResponse.json(
        {
          error: "The preview image could not be uploaded.",
          details: message,
        },
        { status: 400 }
      );
    }

    const insertValue = {
      activity_name: activityName,
      field_location: null,
      game_phase: null,
      category: null,
      positions_involved: null,
      number_of_players: numberOfPlayers || null,
      activity_details: getStringValue(body.activityDetails) || null,

      created_by: createdBy,
      hidden: false,
      visibility: "private",
      club_id: null,

      activity_source: "create",
      creator_state: creatorStateWithSyncMetadata,

      file_name: uploadedPreview?.fileName || null,
      file_type: uploadedPreview?.fileType || null,
      file_path: uploadedPreview?.filePath || null,
      file_bucket: uploadedPreview?.fileBucket || "activity-files",

      created_at: createdAt || nowIso,
      updated_at: updatedAt || nowIso,
    };

    const { data: insertedActivity, error: insertError } = await supabaseAdmin
      .from("activities")
      .insert({
        ...insertValue,
        creator_state: {
          ...creatorStateWithSyncMetadata,
          libraryActivityId: undefined,
        },
      })
      .select("*")
      .single();

    if (insertError) {
      console.error("iOS sync activity insert failed.", {
        message: insertError.message,
        details: insertError.details,
        hint: insertError.hint,
        code: insertError.code,
      });

      return NextResponse.json(
        {
          error: "The activity could not be synced to the Library.",
          details: insertError.message,
        },
        { status: 500 }
      );
    }

    const finalCreatorState = {
      ...creatorStateWithSyncMetadata,
      libraryActivityId: insertedActivity.id,
    };

    const { data: finalizedActivity, error: finalizeError } =
      await supabaseAdmin
        .from("activities")
        .update({
          creator_state: finalCreatorState,
        })
        .eq("id", insertedActivity.id)
        .select("*")
        .single();

    if (finalizeError) {
      console.error("iOS sync activity finalize failed.", {
        message: finalizeError.message,
        details: finalizeError.details,
        hint: finalizeError.hint,
        code: finalizeError.code,
      });

      return NextResponse.json(
        {
          error:
            "The activity was created, but its sync metadata could not be finalized.",
          details: finalizeError.message,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      action: "created",
      devBypassUsed: isDevSyncBypassEnabled(),
      activity: {
        id: finalizedActivity.id,
        activityName: finalizedActivity.activity_name,
        clientActivityId:
          clientActivityId || getCreatorStateClientActivityId(creatorState),
        createdAt: finalizedActivity.created_at,
        updatedAt: finalizedActivity.updated_at,
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
