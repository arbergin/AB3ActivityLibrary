"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import AppHeader from "@/components/AppHeader";
import ActivityCreator from "@/components/ActivityCreator";
import ProtectedPage from "@/components/ProtectedPage";
import { getStoredActivityById } from "@/lib/activityStorage";
import { getDropdownFields } from "@/lib/dropdownService";
import { getDropdownAllowedLabels } from "@/lib/dropdownHelpers";
import { supabase } from "@/lib/supabaseClient";
import { getSupabaseActivityById } from "@/lib/supabaseActivities";
import type { DropdownField } from "@/lib/dropdownTypes";
import type { Activity } from "@/types/activity";
import { canManageActivity } from "@/lib/activityPermissions";
import { getCurrentUserProfile, type UserProfile } from "@/lib/userProfile";
import ActivityDetailsEditor from "@/components/ActivityDetailsEditor";

type ActivityEditClientProps = {
  activityId: string;
};

type ActivitySource = "supabase" | "local" | undefined;

type MetadataFormValues = {
  activityName: string;
  fieldLocation: string;
  gamePhase: string;
  category: string;
  positionsInvolved: string;
  numberOfPlayers: string;
  activityDetails: string;
};

function isPitchEditableActivity(activity: Activity) {
  return Boolean(activity.creatorState);
}

function activityToMetadataForm(activity: Activity): MetadataFormValues {
  return {
    activityName: activity.activityName || "",
    fieldLocation: activity.fieldLocation || "",
    gamePhase: activity.gamePhase || "",
    category: activity.category || "",
    positionsInvolved: activity.positionsInvolved || "",
    numberOfPlayers:
      activity.numberOfPlayers === "" || activity.numberOfPlayers === undefined
        ? ""
        : String(activity.numberOfPlayers),
    activityDetails: activity.activityDetails || "",
  };
}

function getOptionalPlayerCount(value: string) {
  const trimmedValue = value.trim();

  if (!trimmedValue) {
    return "" as const;
  }

  return Number(trimmedValue);
}

function isValidOptionalNumberOfPlayers(value: string) {
  const trimmedValue = value.trim();

  if (!trimmedValue) {
    return true;
  }

  const numericValue = Number(trimmedValue);

  return Number.isInteger(numericValue) && numericValue > 0;
}

function getSelectOptions(
  dropdownFields: DropdownField[],
  dropdownKey: "fieldLocation" | "gamePhase" | "category",
  currentValue: string
) {
  const allowedLabels = getDropdownAllowedLabels(dropdownFields, dropdownKey);
  const trimmedCurrentValue = currentValue.trim();

  if (
    trimmedCurrentValue &&
    !allowedLabels.some((label) => label === trimmedCurrentValue)
  ) {
    return [trimmedCurrentValue, ...allowedLabels];
  }

  return allowedLabels;
}

function buildUpdatedActivity(
  activity: Activity,
  values: MetadataFormValues
): Activity {
  return {
    ...activity,
    activityName: values.activityName.trim(),
    fieldLocation: values.fieldLocation.trim(),
    gamePhase: values.gamePhase.trim(),
    category: values.category.trim(),
    positionsInvolved: values.positionsInvolved.trim(),
    numberOfPlayers: getOptionalPlayerCount(values.numberOfPlayers),
    activityDetails: values.activityDetails.trim(),
    updatedAt: new Date().toISOString(),
  };
}

async function updateSupabaseActivityMetadata(
  activityId: string,
  values: MetadataFormValues
) {
  const trimmedActivityName = values.activityName.trim();
  const trimmedFieldLocation = values.fieldLocation.trim();
  const trimmedGamePhase = values.gamePhase.trim();
  const trimmedCategory = values.category.trim();
  const trimmedPositionsInvolved = values.positionsInvolved.trim();
  const trimmedActivityDetails = values.activityDetails.trim();
  const playerCountForDatabase = values.numberOfPlayers.trim()
    ? Number(values.numberOfPlayers)
    : null;
  const updatedAt = new Date().toISOString();

  // Main app tables have been using snake_case Supabase columns.
  const snakeCasePayload = {
    activity_name: trimmedActivityName,
    field_location: trimmedFieldLocation,
    game_phase: trimmedGamePhase,
    category: trimmedCategory,
    positions_involved: trimmedPositionsInvolved,
    number_of_players: playerCountForDatabase,
    activity_details: trimmedActivityDetails,
    updated_at: updatedAt,
  };

  const { error: snakeCaseError } = await supabase
    .from("activities")
    .update(snakeCasePayload)
    .eq("id", activityId);

  if (snakeCaseError) {
    // Fallback for any older/local table shape that was created with camelCase fields.
    const camelCasePayload = {
      activityName: trimmedActivityName,
      fieldLocation: trimmedFieldLocation,
      gamePhase: trimmedGamePhase,
      category: trimmedCategory,
      positionsInvolved: trimmedPositionsInvolved,
      numberOfPlayers: values.numberOfPlayers.trim()
        ? Number(values.numberOfPlayers)
        : "",
      activityDetails: trimmedActivityDetails,
      updatedAt,
    };

    const { error: camelCaseError } = await supabase
      .from("activities")
      .update(camelCasePayload)
      .eq("id", activityId);

    if (camelCaseError) {
      throw camelCaseError;
    }
  }

  return getSupabaseActivityById(activityId);
}

function updateLocalActivityMetadata(updatedActivity: Activity) {
  if (typeof window === "undefined") {
    return false;
  }

  for (const key of Object.keys(window.localStorage)) {
    const rawValue = window.localStorage.getItem(key);

    if (!rawValue || !rawValue.includes(updatedActivity.id)) {
      continue;
    }

    try {
      const parsedValue = JSON.parse(rawValue);

      if (Array.isArray(parsedValue)) {
        let wasUpdated = false;
        const nextValue = parsedValue.map((item) => {
          if (item?.id !== updatedActivity.id) {
            return item;
          }

          wasUpdated = true;
          return { ...item, ...updatedActivity };
        });

        if (wasUpdated) {
          window.localStorage.setItem(key, JSON.stringify(nextValue));
          return true;
        }
      }

      if (Array.isArray(parsedValue?.activities)) {
        let wasUpdated = false;
        const nextActivities = parsedValue.activities.map((item: Activity) => {
          if (item?.id !== updatedActivity.id) {
            return item;
          }

          wasUpdated = true;
          return { ...item, ...updatedActivity };
        });

        if (wasUpdated) {
          window.localStorage.setItem(
            key,
            JSON.stringify({ ...parsedValue, activities: nextActivities })
          );
          return true;
        }
      }
    } catch {
      // Ignore localStorage values that are not JSON used by the activity library.
    }
  }

  return false;
}

function MetadataOnlyEditor({
  activity,
  activitySource,
}: {
  activity: Activity;
  activitySource: ActivitySource;
}) {
  const router = useRouter();
  const [formValues, setFormValues] = useState<MetadataFormValues>(() =>
    activityToMetadataForm(activity)
  );
  const [dropdownFields, setDropdownFields] = useState<DropdownField[]>([]);
  const [isLoadingDropdowns, setIsLoadingDropdowns] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDetailsExpanded, setIsDetailsExpanded] = useState(false);
  const [formMessage, setFormMessage] = useState("");
  const [formError, setFormError] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadDropdowns() {
      try {
        setIsLoadingDropdowns(true);
        const fields = await getDropdownFields();

        if (!isMounted) {
          return;
        }

        setDropdownFields(fields);
      } catch (error) {
        console.error("Unable to load dropdown options.", error);

        if (isMounted) {
          setFormMessage(
            "Dropdown options could not be loaded. You can still edit text metadata."
          );
        }
      } finally {
        if (isMounted) {
          setIsLoadingDropdowns(false);
        }
      }
    }

    loadDropdowns();

    return () => {
      isMounted = false;
    };
  }, []);

  const fieldLocationOptions = useMemo(
    () => getSelectOptions(dropdownFields, "fieldLocation", formValues.fieldLocation),
    [dropdownFields, formValues.fieldLocation]
  );

  const gamePhaseOptions = useMemo(
    () => getSelectOptions(dropdownFields, "gamePhase", formValues.gamePhase),
    [dropdownFields, formValues.gamePhase]
  );

  const categoryOptions = useMemo(
    () => getSelectOptions(dropdownFields, "category", formValues.category),
    [dropdownFields, formValues.category]
  );

  function updateField(fieldName: keyof MetadataFormValues, value: string) {
    setFormValues((currentValues) => ({
      ...currentValues,
      [fieldName]: value,
    }));
  }

  async function handleSaveMetadata() {
    setFormMessage("");
    setFormError("");

    if (!formValues.activityName.trim()) {
      setFormError("Activity Name is required.");
      return;
    }

    if (!isValidOptionalNumberOfPlayers(formValues.numberOfPlayers)) {
      setFormError(
        "Number of Players must be blank or a whole number greater than 0."
      );
      return;
    }

    setIsSaving(true);

    try {
      if (activitySource === "supabase") {
        const updatedActivity = await updateSupabaseActivityMetadata(
          activity.id,
          formValues
        );

        if (!updatedActivity) {
          throw new Error("The activity was saved but could not be reloaded.");
        }
      } else {
        const updatedActivity = buildUpdatedActivity(activity, formValues);
        const wasUpdated = updateLocalActivityMetadata(updatedActivity);

        if (!wasUpdated) {
          throw new Error(
            "This local activity could not be updated. Supabase activities support metadata editing."
          );
        }
      }

      setFormMessage("Metadata saved.");
      router.push(`/activity/${activity.id}`);
      router.refresh();
    } catch (error) {
      console.error("Metadata save failed.", error);
      setFormError("Metadata could not be saved. Check the console for details.");
    } finally {
      setIsSaving(false);
    }
  }

  function renderActivityDetailsSection() {
    return (
      <div className="grid gap-2">
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm font-semibold text-slate-700">
            Activity Details
          </span>

          <button
            type="button"
            onClick={() =>
              setIsDetailsExpanded((currentValue) => !currentValue)
            }
            disabled={isSaving}
            className="rounded-md border border-slate-300 px-3 py-1 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isDetailsExpanded ? "Collapse" : "Expand"}
          </button>
        </div>

        <ActivityDetailsEditor
          value={formValues.activityDetails}
          onChange={(value) => updateField("activityDetails", value)}
          disabled={isSaving}
          expanded={isDetailsExpanded}
          rows={8}
          placeholder="Describe setup, rules, coaching points, progressions, or constraints."
        />

        {isDetailsExpanded && (
          <div className="text-xs text-slate-500">
            Expanded for easier editing. Click Collapse when you are done.
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_0.9fr]">
      <section className="rounded-xl bg-white p-6 shadow-sm">
        <h3 className="text-xl font-bold">Edit Metadata</h3>
        <p className="mt-2 text-sm text-slate-600">
          This imported PNG/PDF can keep its original preview file while you
          update the searchable metadata.
        </p>

        {isDetailsExpanded && (
          <div className="mt-6">{renderActivityDetailsSection()}</div>
        )}

        <div className="mt-6 grid gap-5">
          <label className="grid gap-2">
            <span className="text-sm font-semibold text-slate-700">
              Activity Name <span className="text-red-600">*</span>
            </span>
            <input
              type="text"
              value={formValues.activityName}
              onChange={(event) => updateField("activityName", event.target.value)}
              className="rounded-lg border border-slate-300 px-3 py-2"
            />
          </label>

          {/* Metadata dropdown layout: Field Location and Game Phase share the first row; Category is forced onto the next row. */}
          <div className="grid gap-5 md:grid-cols-2">
            <label className="grid gap-2">
                <span className="text-sm font-semibold text-slate-700">
                  Field Location
                </span>
                <select
                  value={formValues.fieldLocation}
                  onChange={(event) =>
                    updateField("fieldLocation", event.target.value)
                  }
                  disabled={isLoadingDropdowns}
                  className="rounded-lg border border-slate-300 px-3 py-2 disabled:bg-slate-100"
                >
                  <option value="">No selection</option>
                  {fieldLocationOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>

              <label className="grid gap-2">
                <span className="text-sm font-semibold text-slate-700">
                  Game Phase
                </span>
                <select
                  value={formValues.gamePhase}
                  onChange={(event) =>
                    updateField("gamePhase", event.target.value)
                  }
                  disabled={isLoadingDropdowns}
                  className="rounded-lg border border-slate-300 px-3 py-2 disabled:bg-slate-100"
                >
                  <option value="">No selection</option>
                  {gamePhaseOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
            </label>

            <label className="grid gap-2 md:col-span-2">
              <span className="text-sm font-semibold text-slate-700">
                Category
              </span>
              <select
                value={formValues.category}
                onChange={(event) => updateField("category", event.target.value)}
                disabled={isLoadingDropdowns}
                className="rounded-lg border border-slate-300 px-3 py-2 disabled:bg-slate-100"
              >
                <option value="">No selection</option>
                {categoryOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="grid gap-5 md:grid-cols-[1fr_0.45fr]">
            <label className="grid gap-2">
              <span className="text-sm font-semibold text-slate-700">
                Positions Involved
              </span>
              <input
                type="text"
                value={formValues.positionsInvolved}
                onChange={(event) =>
                  updateField("positionsInvolved", event.target.value)
                }
                className="rounded-lg border border-slate-300 px-3 py-2"
              />
            </label>

            <label className="grid gap-2">
              <span className="text-sm font-semibold text-slate-700">
                Number of Players
              </span>
              <input
                type="number"
                min="1"
                step="1"
                value={formValues.numberOfPlayers}
                onChange={(event) =>
                  updateField("numberOfPlayers", event.target.value)
                }
                className="rounded-lg border border-slate-300 px-3 py-2"
              />
            </label>
          </div>

          {!isDetailsExpanded && renderActivityDetailsSection()}
        </div>

        {formError && (
          <div className="mt-5 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {formError}
          </div>
        )}

        {formMessage && (
          <div className="mt-5 rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-700">
            {formMessage}
          </div>
        )}

        <div className="mt-6 flex flex-wrap justify-end gap-3">
          <Link
            href={`/activity/${activity.id}`}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 font-semibold text-slate-700"
          >
            Cancel
          </Link>

          <button
            type="button"
            onClick={handleSaveMetadata}
            disabled={isSaving}
            className="rounded-lg bg-[#0d2140] px-4 py-2 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSaving ? "Saving..." : "Save Metadata"}
          </button>
        </div>
      </section>

      <section className="rounded-xl bg-white p-6 shadow-sm">
        <h3 className="text-xl font-bold">Current Preview</h3>

        <div className="mt-6 flex min-h-[420px] items-center justify-center rounded-lg border border-slate-200 bg-slate-50 p-4 text-center text-slate-500">
          {activity.previewDataUrl && activity.fileType === "application/pdf" ? (
            <iframe
              src={activity.previewDataUrl}
              title={`${activity.activityName} PDF preview`}
              className="h-[520px] w-full rounded-lg border border-slate-200"
            />
          ) : activity.previewDataUrl ? (
            <img
              src={activity.previewDataUrl}
              alt={`${activity.activityName} preview`}
              className="max-h-[520px] w-full rounded-lg object-contain"
            />
          ) : (
            <div>
              <div className="font-semibold">Preview unavailable</div>
              {activity.fileName && (
                <div className="mt-2 text-sm">Imported file: {activity.fileName}</div>
              )}
            </div>
          )}
        </div>

        <div className="mt-5 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
          <div className="font-semibold text-slate-800">Import type</div>
          <div className="mt-1">
            Imported PNG/PDF activities can have metadata edited here, but the
            pitch objects are not editable because the import does not include
            Activity Creator object state.
          </div>
        </div>
      </section>
    </div>
  );
}

export default function ActivityEditClient({
  activityId,
}: ActivityEditClientProps) {
  const [activity, setActivity] = useState<Activity | undefined>(undefined);
  const [activitySource, setActivitySource] = useState<ActivitySource>(undefined);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [currentProfile, setCurrentProfile] = useState<UserProfile | null>(null);
  const [hasLoadedProfile, setHasLoadedProfile] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function loadCurrentProfile() {
      try {
        const profile = await getCurrentUserProfile();
        if (isMounted) {
          setCurrentProfile(profile ?? null);
        }
      } catch (error) {
        console.error("Unable to load current user permissions.", error);
        if (isMounted) {
          setCurrentProfile(null);
        }
      } finally {
        if (isMounted) {
          setHasLoadedProfile(true);
        }
      }
    }

    loadCurrentProfile();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function loadActivity() {
      setHasLoaded(false);
      setActivitySource(undefined);

      try {
        const supabaseActivity = await getSupabaseActivityById(activityId);

        if (!isMounted) {
          return;
        }

        if (supabaseActivity) {
          setActivity(supabaseActivity);
          setActivitySource("supabase");
          setHasLoaded(true);
          return;
        }
      } catch (error) {
        console.error("Unable to load editable activity from Supabase.", error);
      }

      const storedActivity = getStoredActivityById(activityId);

      if (!isMounted) {
        return;
      }

      setActivity(storedActivity);
      setActivitySource(storedActivity ? "local" : undefined);
      setHasLoaded(true);
    }

    loadActivity();

    return () => {
      isMounted = false;
    };
  }, [activityId]);

  const canEditCurrentActivity =
    activitySource !== "supabase" || canManageActivity(activity, currentProfile);

  if (!hasLoaded || !hasLoadedProfile) {
    return (
      <ProtectedPage>
        <main className="min-h-screen bg-slate-100 text-slate-900">
          <AppHeader />

          <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
            <div className="rounded-xl bg-white p-6 shadow-sm">
              Loading activity editor...
            </div>
          </section>
        </main>
      </ProtectedPage>
    );
  }

  if (!activity) {
    return (
      <ProtectedPage>
        <main className="min-h-screen bg-slate-100 text-slate-900">
          <AppHeader />

          <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
            <div className="rounded-xl bg-white p-6 shadow-sm">
              <h2 className="text-2xl font-bold">Activity not found</h2>
              <p className="mt-2 text-slate-600">
                This activity could not be found.
              </p>

              <Link
                href="/search"
                className="mt-6 inline-block rounded-lg bg-[#0d2140] px-4 py-2 font-semibold text-white"
              >
                Back to Search
              </Link>
            </div>
          </section>
        </main>
      </ProtectedPage>
    );
  }

  if (!canEditCurrentActivity) {
    return (
      <ProtectedPage>
        <main className="min-h-screen bg-slate-100 text-slate-900">
          <AppHeader />

          <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
            <div className="rounded-xl bg-white p-6 shadow-sm">
              <h2 className="text-2xl font-bold">View-only activity</h2>
              <p className="mt-2 text-slate-600">
                Only the activity creator or an administrator can edit this activity.
              </p>

              <Link
                href={`/activity/${activity.id}`}
                className="mt-6 inline-block rounded-lg bg-[#0d2140] px-4 py-2 font-semibold text-white"
              >
                Back to Activity
              </Link>
            </div>
          </section>
        </main>
      </ProtectedPage>
    );
  }

  if (!isPitchEditableActivity(activity)) {
    return (
      <ProtectedPage>
        <main className="min-h-screen bg-slate-100 text-slate-900">
          <AppHeader />

          <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
            <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold">Edit Metadata</h2>
                <p className="mt-2 text-slate-600">
                  Update the searchable details for this imported PNG/PDF.
                </p>
              </div>

              <Link
                href={`/activity/${activity.id}`}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 font-semibold text-slate-700"
              >
                Back to Activity
              </Link>
            </div>

            <MetadataOnlyEditor
              activity={activity}
              activitySource={activitySource}
            />
          </section>
        </main>
      </ProtectedPage>
    );
  }

  return (
    <ProtectedPage>
      <main className="min-h-screen bg-slate-100 text-slate-900">
        <AppHeader />

        <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold">Edit Activity</h2>
              <p className="mt-2 text-slate-600">
                Adjust the saved pitch icons, lines, tabs, animation sequence, colors, and metadata.
              </p>
            </div>

            <Link
              href={`/activity/${activity.id}`}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 font-semibold text-slate-700"
            >
              Back to Activity
            </Link>
          </div>

          <ActivityCreator initialActivity={activity} />
        </section>
      </main>
    </ProtectedPage>
  );
}