"use client";

import Link from "next/link";
import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import PlannerActivityPicker from "@/components/PlannerActivityPicker";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import {
  assignActivityToPlanningRow,
  clearActivityFromPlanningRow,
  createPlanningActivitySlot,
  createPlanningNote,
  createPlanningPractice,
  createPlanningWeek,
  deletePlanningNote,
  deletePlanningPractice,
  deletePlanningPracticeActivity,
  deletePlanningWeek,
  getPlanningNotes,
  getPlanningPracticeActivities,
  getPlanningPractices,
  getPlanningTeamById,
  getPlanningWeeks,
  renamePlanningPractice,
  renamePlanningWeek,
  reorderPlanningPracticeActivities,
  reorderPlanningPractices,
  updatePlanningNote,
  updatePlanningPracticeKeyFocus,
  updatePlanningWeekObjectives,
  type PlanningNote,
  type PlanningPractice,
  type PlanningPracticeActivity,
  type PlanningTeam,
  type PlanningWeek,
} from "@/lib/teamPlanning";
import { getSupabaseActivities } from "@/lib/supabaseActivities";
import type { Activity } from "@/types/activity";

type SelectedRow =
  | { type: "week"; id: string }
  | { type: "practice"; id: string }
  | { type: "activity"; id: string }
  | null;

type TeamPlannerProps = {
  teamId: string;
};

type PlannerDragData =
  | { type: "practice"; id: string; weekId: string; label: string }
  | { type: "activity"; id: string; practiceId: string; label: string };

type PlannerDropData =
  | { type: "practice-drop"; weekId: string; index: number }
  | { type: "activity-drop"; practiceId: string; index: number };

function PlannerDragHandle({
  data,
  disabled,
  label,
}: {
  data: PlannerDragData;
  disabled: boolean;
  label: string;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: `${data.type}:${data.id}`,
      data,
      disabled,
    });

  return (
    <button
      ref={setNodeRef}
      type="button"
      {...listeners}
      {...attributes}
      onClick={(event) => event.stopPropagation()}
      style={{ transform: CSS.Translate.toString(transform) }}
      disabled={disabled}
      className={`flex h-7 w-7 shrink-0 touch-none items-center justify-center rounded-md border border-slate-300 bg-white text-sm font-bold text-slate-500 hover:bg-slate-50 hover:text-[#0d2140] disabled:cursor-not-allowed disabled:opacity-40 ${
        isDragging ? "opacity-30" : ""
      }`}
      aria-label={label}
      title={label}
    >
      ⋮⋮
    </button>
  );
}

function PlannerDropZone({
  id,
  data,
  disabled,
}: {
  id: string;
  data: PlannerDropData;
  disabled: boolean;
}) {
  const { isOver, setNodeRef } = useDroppable({ id, data, disabled });

  return (
    <div
      ref={setNodeRef}
      className={`transition-all ${
        isOver
          ? "my-1 h-8 rounded-md border-2 border-dashed border-[#0d2140] bg-[#e8eef7]"
          : "h-2"
      }`}
      aria-hidden="true"
    />
  );
}


export default function TeamPlanner({ teamId }: TeamPlannerProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [team, setTeam] = useState<PlanningTeam | null>(null);
  const [weeks, setWeeks] = useState<PlanningWeek[]>([]);
  const [practices, setPractices] = useState<PlanningPractice[]>([]);
  const [activityRows, setActivityRows] = useState<PlanningPracticeActivity[]>(
    []
  );
  const [notes, setNotes] = useState<PlanningNote[]>([]);
  const [libraryActivities, setLibraryActivities] = useState<Activity[]>([]);
  const [selectedRow, setSelectedRow] = useState<SelectedRow>(null);
  const [editingRow, setEditingRow] = useState<SelectedRow>(null);
  const [editingValue, setEditingValue] = useState("");
  const [editingObjectiveWeekId, setEditingObjectiveWeekId] = useState<string | null>(null);
  const [objectiveValue, setObjectiveValue] = useState("");
  const [editingKeyFocusPracticeId, setEditingKeyFocusPracticeId] = useState<string | null>(null);
  const [keyFocusValue, setKeyFocusValue] = useState("");
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [noteValue, setNoteValue] = useState("");
  const [searchingRowId, setSearchingRowId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [collapsedWeekIds, setCollapsedWeekIds] = useState<Set<string>>(
    () => new Set()
  );
  const [collapsedPracticeIds, setCollapsedPracticeIds] = useState<Set<string>>(
    () => new Set()
  );
  const [activeDrag, setActiveDrag] = useState<PlannerDragData | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 180, tolerance: 8 },
    })
  );

  const activitiesById = useMemo(() => {
    return new Map(
      libraryActivities.map((activity) => [activity.id, activity] as const)
    );
  }, [libraryActivities]);

  const practicesByWeek = useMemo(() => {
    const map = new Map<string, PlanningPractice[]>();

    for (const practice of practices) {
      const current = map.get(practice.weekId) ?? [];
      current.push(practice);
      map.set(practice.weekId, current);
    }

    for (const current of map.values()) {
      current.sort((a, b) => a.sortOrder - b.sortOrder);
    }

    return map;
  }, [practices]);

  const activitiesByPractice = useMemo(() => {
    const map = new Map<string, PlanningPracticeActivity[]>();

    for (const row of activityRows) {
      const current = map.get(row.practiceId) ?? [];
      current.push(row);
      map.set(row.practiceId, current);
    }

    for (const current of map.values()) {
      current.sort((a, b) => a.sortOrder - b.sortOrder);
    }

    return map;
  }, [activityRows]);

  const notesByPractice = useMemo(() => {
    const map = new Map<string, PlanningNote[]>();

    for (const note of notes) {
      const current = map.get(note.practiceId) ?? [];
      current.push(note);
      map.set(note.practiceId, current);
    }

    return map;
  }, [notes]);

  const loadPlan = useCallback(async () => {
    setIsLoading(true);

    try {
      const loadedTeam = await getPlanningTeamById(teamId);

      if (!loadedTeam) {
        setTeam(null);
        setWeeks([]);
        setPractices([]);
        setActivityRows([]);
        setLibraryActivities([]);
        setMessage("This team could not be found.");
        return;
      }

      const [loadedWeeks, loadedLibraryActivities] = await Promise.all([
        getPlanningWeeks(teamId),
        getSupabaseActivities(),
      ]);

      const loadedPractices = await getPlanningPractices(
        loadedWeeks.map((week) => week.id)
      );
      const practiceIds = loadedPractices.map((practice) => practice.id);
      const [loadedActivityRows, loadedNotes] = await Promise.all([
        getPlanningPracticeActivities(practiceIds),
        getPlanningNotes(practiceIds),
      ]);

      setTeam(loadedTeam);
      setWeeks(loadedWeeks);
      setPractices(loadedPractices);
      setActivityRows(loadedActivityRows);
      setNotes(loadedNotes);
      setLibraryActivities(loadedLibraryActivities);
      setMessage("");
    } catch (error) {
      console.error("Unable to load team plan.", error);
      setMessage("The team plan could not be loaded.");
    } finally {
      setIsLoading(false);
    }
  }, [teamId]);

  useEffect(() => {
    loadPlan();
  }, [loadPlan]);

  useEffect(() => {
    const returnedActivityId = searchParams.get("attachActivityId");
    const returnedRowId = searchParams.get("planningActivityRowId");
    const returnedPracticeId = searchParams.get("planningPracticeId");

    if (
      !returnedActivityId ||
      (!returnedRowId && !returnedPracticeId)
    ) {
      return;
    }

    const activityId = returnedActivityId;
    const rowId = returnedRowId;
    const practiceId = returnedPracticeId;
    let cancelled = false;

    async function attachReturnedActivity() {
      setIsSaving(true);
      setMessage("");

      try {
        let updatedRow;

        if (rowId) {
          updatedRow = await assignActivityToPlanningRow(
            rowId,
            activityId
          );
        } else {
          const createdRow = await createPlanningActivitySlot(
            practiceId as string
          );

          updatedRow = await assignActivityToPlanningRow(
            createdRow.id,
            activityId
          );
        }

        if (cancelled) return;

        setActivityRows((current) =>
          current.map((row) => (row.id === updatedRow.id ? updatedRow : row))
        );

        const latestActivities = await getSupabaseActivities();

        if (cancelled) return;

        setLibraryActivities(latestActivities);
        setSelectedRow({ type: "activity", id: updatedRow.id });
        setMessage("New activity created and added to the practice.");

        router.replace(`/team-planning/${teamId}`, { scroll: false });
      } catch (error) {
        console.error("Unable to attach created activity to practice.", error);

        if (!cancelled) {
          setMessage(
            "The activity was created, but it could not be attached to this practice."
          );
          router.replace(`/team-planning/${teamId}`, { scroll: false });
        }
      } finally {
        if (!cancelled) {
          setIsSaving(false);
        }
      }
    }

    attachReturnedActivity();

    return () => {
      cancelled = true;
    };
  }, [router, searchParams, teamId]);

  function beginEdit(row: Exclude<SelectedRow, null>, currentValue: string) {
    if (row.type === "activity") return;

    setEditingRow(row);
    setEditingValue(currentValue);
  }

  function cancelEdit() {
    setEditingRow(null);
    setEditingValue("");
  }

  async function saveEdit() {
    if (!editingRow || editingRow.type === "activity" || !editingValue.trim()) {
      return;
    }

    setIsSaving(true);
    setMessage("");

    try {
      if (editingRow.type === "week") {
        const updated = await renamePlanningWeek(editingRow.id, editingValue);
        setWeeks((current) =>
          current.map((week) => (week.id === updated.id ? updated : week))
        );
      } else {
        const updated = await renamePlanningPractice(
          editingRow.id,
          editingValue
        );
        setPractices((current) =>
          current.map((practice) =>
            practice.id === updated.id ? updated : practice
          )
        );
      }

      cancelEdit();
    } catch (error) {
      console.error("Unable to rename planning row.", error);
      setMessage(
        error instanceof Error ? error.message : "The name could not be saved."
      );
    } finally {
      setIsSaving(false);
    }
  }

  function beginObjectiveEdit(week: PlanningWeek) {
    setEditingObjectiveWeekId(week.id);
    setObjectiveValue(week.objectives);
    setEditingKeyFocusPracticeId(null);
  }

  function beginKeyFocusEdit(practice: PlanningPractice) {
    setEditingKeyFocusPracticeId(practice.id);
    setKeyFocusValue(practice.keyFocus);
    setEditingObjectiveWeekId(null);
  }

  async function saveWeekObjectives(weekId: string) {
    if (isSaving) return;

    setIsSaving(true);
    setMessage("");

    try {
      const updated = await updatePlanningWeekObjectives(
        weekId,
        objectiveValue
      );

      setWeeks((current) =>
        current.map((week) => (week.id === updated.id ? updated : week))
      );
      setEditingObjectiveWeekId(null);
      setObjectiveValue("");
    } catch (error) {
      console.error("Unable to save week objectives.", error);
      setMessage("The week objectives could not be saved.");
    } finally {
      setIsSaving(false);
    }
  }

  async function savePracticeKeyFocus(practiceId: string) {
    if (isSaving) return;

    setIsSaving(true);
    setMessage("");

    try {
      const updated = await updatePlanningPracticeKeyFocus(
        practiceId,
        keyFocusValue
      );

      setPractices((current) =>
        current.map((practice) =>
          practice.id === updated.id ? updated : practice
        )
      );
      setEditingKeyFocusPracticeId(null);
      setKeyFocusValue("");
    } catch (error) {
      console.error("Unable to save practice key focus.", error);
      setMessage("The practice key focus could not be saved.");
    } finally {
      setIsSaving(false);
    }
  }

  function getNotePlacementForSelection() {
    if (!selectedRow) {
      return null;
    }

    if (selectedRow.type === "activity") {
      const activityRow = activityRows.find((row) => row.id === selectedRow.id);

      if (!activityRow) return null;

      return {
        practiceId: activityRow.practiceId,
        afterActivityRowId: activityRow.id,
        noteScope: "activity" as const,
        weekId: null,
      };
    }

    if (selectedRow.type === "practice") {
      const practiceActivities =
        activitiesByPractice.get(selectedRow.id) ?? [];
      const lastActivity =
        practiceActivities[practiceActivities.length - 1] ?? null;

      return {
        practiceId: selectedRow.id,
        afterActivityRowId: lastActivity?.id ?? null,
        noteScope: "practice" as const,
        weekId: null,
      };
    }

    const weekPractices = practicesByWeek.get(selectedRow.id) ?? [];
    const lastPractice = weekPractices[weekPractices.length - 1];

    if (!lastPractice) {
      return null;
    }

    const practiceActivities =
      activitiesByPractice.get(lastPractice.id) ?? [];
    const lastActivity =
      practiceActivities[practiceActivities.length - 1] ?? null;

    return {
      practiceId: lastPractice.id,
      afterActivityRowId: lastActivity?.id ?? null,
      noteScope: "week" as const,
      weekId: selectedRow.id,
    };
  }

  async function handleAddNote() {
    if (isSaving) return;

    const placement = getNotePlacementForSelection();

    if (!placement) {
      setMessage(
        selectedRow?.type === "week"
          ? "Create a practice in this week before adding a note."
          : "Select a week, practice, or activity before adding a note."
      );
      return;
    }

    setIsSaving(true);
    setMessage("");

    try {
      const note = await createPlanningNote(
        placement.practiceId,
        placement.afterActivityRowId,
        placement.noteScope,
        placement.weekId
      );

      setNotes((current) => [...current, note]);
      setEditingNoteId(note.id);
      setNoteValue("");
    } catch (error) {
      console.error("Unable to add planning note.", error);
      setMessage("The note could not be added.");
    } finally {
      setIsSaving(false);
    }
  }

  async function saveNote(noteId: string) {
    if (isSaving) return;

    setIsSaving(true);
    setMessage("");

    try {
      const updated = await updatePlanningNote(noteId, noteValue);

      setNotes((current) =>
        current.map((note) => (note.id === updated.id ? updated : note))
      );
      setEditingNoteId(null);
      setNoteValue("");
    } catch (error) {
      console.error("Unable to save planning note.", error);
      setMessage("The note could not be saved.");
    } finally {
      setIsSaving(false);
    }
  }

  async function removeNote(noteId: string) {
    if (!window.confirm("Delete this note?")) {
      return;
    }

    setIsSaving(true);
    setMessage("");

    try {
      await deletePlanningNote(noteId);
      setNotes((current) => current.filter((note) => note.id !== noteId));

      if (editingNoteId === noteId) {
        setEditingNoteId(null);
        setNoteValue("");
      }
    } catch (error) {
      console.error("Unable to delete planning note.", error);
      setMessage("The note could not be deleted.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleCreateWeek() {
    if (isSaving) return;

    setIsSaving(true);
    setMessage("");

    try {
      const week = await createPlanningWeek(teamId, `Week ${weeks.length + 1}`);
      setWeeks((current) => [...current, week]);
      setSelectedRow({ type: "week", id: week.id });
      beginEdit({ type: "week", id: week.id }, week.name);
    } catch (error) {
      console.error("Unable to create week.", error);
      setMessage("The week could not be created.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleCreatePractice() {
    if (!selectedRow || selectedRow.type !== "week" || isSaving) return;

    setIsSaving(true);
    setMessage("");

    try {
      const existing = practicesByWeek.get(selectedRow.id) ?? [];
      const practice = await createPlanningPractice(
        selectedRow.id,
        `Practice ${existing.length + 1}`
      );
      setPractices((current) => [...current, practice]);
      setSelectedRow({ type: "practice", id: practice.id });
      beginEdit({ type: "practice", id: practice.id }, practice.name);
    } catch (error) {
      console.error("Unable to create practice.", error);
      setMessage("The practice could not be created.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleCreateActivity() {
    if (!selectedRow || selectedRow.type !== "practice" || isSaving) return;

    setIsSaving(true);
    setMessage("");

    try {
      const practiceId = selectedRow.id;
      const row = await createPlanningActivitySlot(practiceId);
      setActivityRows((current) => [...current, row]);

      // Keep the practice selected after adding an activity row so the
      // Create Activity button remains enabled and the user can add
      // multiple activities to the same practice without reselecting it.
      setSelectedRow({ type: "practice", id: practiceId });
    } catch (error) {
      console.error("Unable to create activity row.", error);
      setMessage("The activity row could not be created.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleSelectLibraryActivity(activity: Activity) {
    if (!searchingRowId || isSaving) return;

    setIsSaving(true);
    setMessage("");

    try {
      const updatedRow = await assignActivityToPlanningRow(
        searchingRowId,
        activity.id
      );

      setActivityRows((current) =>
        current.map((row) => (row.id === updatedRow.id ? updatedRow : row))
      );
      setSelectedRow({ type: "activity", id: updatedRow.id });
      setSearchingRowId(null);
      setMessage(`"${activity.activityName}" added to the practice.`);
    } catch (error) {
      console.error("Unable to add activity to practice.", error);
      setMessage("The activity could not be added to the practice.");
    } finally {
      setIsSaving(false);
    }
  }

  function handleCreateNewActivity(row: PlanningPracticeActivity) {
    const query = new URLSearchParams({
      planningTeamId: teamId,
      planningActivityRowId: row.id,
    });

    router.push(`/create?${query.toString()}`);
  }

  async function handleClearAttachedActivity(row: PlanningPracticeActivity) {
    if (!row.activityId || isSaving) return;

    setIsSaving(true);
    setMessage("");

    try {
      const updatedRow = await clearActivityFromPlanningRow(row.id);
      setActivityRows((current) =>
        current.map((item) => (item.id === updatedRow.id ? updatedRow : item))
      );
      setMessage("Activity removed from this planning row.");
    } catch (error) {
      console.error("Unable to clear activity from planning row.", error);
      setMessage("The activity could not be removed from the planning row.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleSearchAnotherActivity(practiceId: string) {
    if (isSaving) return;

    setIsSaving(true);
    setMessage("");

    try {
      const row = await createPlanningActivitySlot(practiceId);
      setActivityRows((current) => [...current, row]);
      setSelectedRow({ type: "practice", id: practiceId });
      setSearchingRowId(row.id);
    } catch (error) {
      console.error("Unable to create another activity row.", error);
      setMessage("Another activity row could not be created.");
    } finally {
      setIsSaving(false);
    }
  }

  function handleCreateAnotherActivity(practiceId: string) {
    if (isSaving) return;

    setMessage("");
    setSelectedRow({ type: "practice", id: practiceId });

    // Do not create an empty planning row yet.
    // The row will only be created after the new activity is actually saved.
    const query = new URLSearchParams({
      planningTeamId: teamId,
      planningPracticeId: practiceId,
    });

    router.push(`/create?${query.toString()}`);
  }

  async function handleDeleteWeek(week: PlanningWeek) {
    if (
      !window.confirm(
        `Delete "${week.name}" and all practices and planning rows under it?`
      )
    ) {
      return;
    }

    setIsSaving(true);
    setMessage("");

    try {
      await deletePlanningWeek(week.id);

      const practiceIdsToRemove = new Set(
        practices
          .filter((practice) => practice.weekId === week.id)
          .map((practice) => practice.id)
      );

      setWeeks((current) => current.filter((item) => item.id !== week.id));
      setPractices((current) =>
        current.filter((practice) => practice.weekId !== week.id)
      );
      setActivityRows((current) =>
        current.filter((row) => !practiceIdsToRemove.has(row.practiceId))
      );
      setSelectedRow(null);
      cancelEdit();
    } catch (error) {
      console.error("Unable to delete week.", error);
      setMessage("The week could not be deleted.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDeletePractice(practice: PlanningPractice) {
    if (
      !window.confirm(
        `Delete "${practice.name}" and all activity planning rows under it?`
      )
    ) {
      return;
    }

    setIsSaving(true);
    setMessage("");

    try {
      await deletePlanningPractice(practice.id);
      setPractices((current) =>
        current.filter((item) => item.id !== practice.id)
      );
      setActivityRows((current) =>
        current.filter((row) => row.practiceId !== practice.id)
      );
      setSelectedRow(null);
      cancelEdit();
    } catch (error) {
      console.error("Unable to delete practice.", error);
      setMessage("The practice could not be deleted.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDeleteActivityRow(row: PlanningPracticeActivity) {
    if (!window.confirm("Remove this activity row from the practice?")) {
      return;
    }

    setIsSaving(true);
    setMessage("");

    try {
      await deletePlanningPracticeActivity(row.id);
      setActivityRows((current) =>
        current.filter((item) => item.id !== row.id)
      );
      setSelectedRow(null);
    } catch (error) {
      console.error("Unable to delete activity row.", error);
      setMessage("The activity row could not be removed.");
    } finally {
      setIsSaving(false);
    }
  }

  function toggleWeekCollapsed(weekId: string) {
    setCollapsedWeekIds((current) => {
      const next = new Set(current);

      if (next.has(weekId)) {
        next.delete(weekId);
      } else {
        next.add(weekId);
      }

      return next;
    });
  }

  function togglePracticeCollapsed(practiceId: string) {
    setCollapsedPracticeIds((current) => {
      const next = new Set(current);

      if (next.has(practiceId)) {
        next.delete(practiceId);
      } else {
        next.add(practiceId);
      }

      return next;
    });
  }

  function handleDragStart(event: DragStartEvent) {
    const data = event.active.data.current as PlannerDragData | undefined;
    setActiveDrag(data ?? null);
  }

  function resetDragState() {
    setActiveDrag(null);
  }

  async function handleDragEnd(event: DragEndEvent) {
    const dragData = event.active.data.current as PlannerDragData | undefined;
    const dropData = event.over?.data.current as PlannerDropData | undefined;
    resetDragState();

    if (!dragData || !dropData || isSaving) return;

    if (dragData.type === "practice" && dropData.type === "practice-drop") {
      const sourceWeekPractices = practicesByWeek.get(dragData.weekId) ?? [];
      const sourceIndex = sourceWeekPractices.findIndex(
        (practice) => practice.id === dragData.id
      );

      if (sourceIndex < 0) return;

      const sourceWeekNotes = notes.filter(
        (note) => note.noteScope === "week" && note.weekId === dragData.weekId
      );

      if (
        dragData.weekId !== dropData.weekId &&
        sourceWeekPractices.length === 1 &&
        sourceWeekNotes.length > 0
      ) {
        setMessage(
          "This week has a week note. Keep at least one practice in the week so the note remains anchored."
        );
        return;
      }

      const previousPractices = practices;
      const sourceWithoutDragged = sourceWeekPractices.filter(
        (practice) => practice.id !== dragData.id
      );
      const destinationOriginal =
        dragData.weekId === dropData.weekId
          ? sourceWithoutDragged
          : practicesByWeek.get(dropData.weekId) ?? [];
      const requestedDestinationIndex =
        dragData.weekId === dropData.weekId && sourceIndex < dropData.index
          ? dropData.index - 1
          : dropData.index;
      const destinationIndex = Math.max(
        0,
        Math.min(requestedDestinationIndex, destinationOriginal.length)
      );
      const draggedPractice = sourceWeekPractices[sourceIndex];
      const destinationNext = [...destinationOriginal];
      destinationNext.splice(destinationIndex, 0, {
        ...draggedPractice,
        weekId: dropData.weekId,
      });

      const nextByWeek = new Map<string, PlanningPractice[]>();
      nextByWeek.set(dragData.weekId, sourceWithoutDragged);
      nextByWeek.set(dropData.weekId, destinationNext);

      const affectedWeekIds = new Set([dragData.weekId, dropData.weekId]);
      const nextPractices = practices.map((practice) => {
        if (!affectedWeekIds.has(practice.weekId) && practice.id !== dragData.id) {
          return practice;
        }

        for (const [weekId, ordered] of nextByWeek) {
          const index = ordered.findIndex((item) => item.id === practice.id);
          if (index >= 0) {
            return { ...practice, weekId, sortOrder: index };
          }
        }

        return practice;
      });

      const updates = Array.from(nextByWeek.entries()).flatMap(
        ([weekId, ordered]) =>
          ordered.map((practice, index) => ({
            id: practice.id,
            weekId,
            sortOrder: index,
          }))
      );

      setPractices(nextPractices);
      setIsSaving(true);
      setMessage("");

      try {
        await reorderPlanningPractices(updates);
        setMessage(`"${dragData.label}" moved successfully.`);
      } catch (error) {
        console.error("Unable to move practice.", error);
        setPractices(previousPractices);
        setMessage("The practice could not be moved.");
      } finally {
        setIsSaving(false);
      }

      return;
    }

    if (dragData.type === "activity" && dropData.type === "activity-drop") {
      const sourceActivities = activitiesByPractice.get(dragData.practiceId) ?? [];
      const sourceIndex = sourceActivities.findIndex((row) => row.id === dragData.id);
      if (sourceIndex < 0) return;

      const previousRows = activityRows;
      const previousNotes = notes;
      const sourceWithoutDragged = sourceActivities.filter(
        (row) => row.id !== dragData.id
      );
      const destinationOriginal =
        dragData.practiceId === dropData.practiceId
          ? sourceWithoutDragged
          : activitiesByPractice.get(dropData.practiceId) ?? [];
      const requestedDestinationIndex =
        dragData.practiceId === dropData.practiceId &&
        sourceIndex < dropData.index
          ? dropData.index - 1
          : dropData.index;
      const destinationIndex = Math.max(
        0,
        Math.min(requestedDestinationIndex, destinationOriginal.length)
      );
      const draggedRow = sourceActivities[sourceIndex];
      const destinationNext = [...destinationOriginal];
      destinationNext.splice(destinationIndex, 0, {
        ...draggedRow,
        practiceId: dropData.practiceId,
      });

      const nextByPractice = new Map<string, PlanningPracticeActivity[]>();
      nextByPractice.set(dragData.practiceId, sourceWithoutDragged);
      nextByPractice.set(dropData.practiceId, destinationNext);

      const affectedPracticeIds = new Set([
        dragData.practiceId,
        dropData.practiceId,
      ]);
      const nextRows = activityRows.map((row) => {
        if (
          !affectedPracticeIds.has(row.practiceId) &&
          row.id !== dragData.id
        ) {
          return row;
        }

        for (const [practiceId, ordered] of nextByPractice) {
          const index = ordered.findIndex((item) => item.id === row.id);
          if (index >= 0) {
            return { ...row, practiceId, sortOrder: index };
          }
        }

        return row;
      });

      const updates = Array.from(nextByPractice.entries()).flatMap(
        ([practiceId, ordered]) =>
          ordered.map((row, index) => ({
            id: row.id,
            practiceId,
            sortOrder: index,
          }))
      );

      setActivityRows(nextRows);
      if (dragData.practiceId !== dropData.practiceId) {
        setNotes((current) =>
          current.map((note) =>
            note.noteScope === "activity" &&
            note.afterActivityRowId === dragData.id
              ? { ...note, practiceId: dropData.practiceId }
              : note
          )
        );
      }
      setIsSaving(true);
      setMessage("");

      try {
        await reorderPlanningPracticeActivities(updates);
        setMessage(`"${dragData.label}" moved successfully.`);
      } catch (error) {
        console.error("Unable to move activity.", error);
        setActivityRows(previousRows);
        setNotes(previousNotes);
        setMessage("The activity could not be moved.");
      } finally {
        setIsSaving(false);
      }
    }
  }

  function rowIsSelected(
    type: "week" | "practice" | "activity",
    id: string
  ) {
    return selectedRow?.type === type && selectedRow.id === id;
  }

  if (isLoading) {
    return (
      <section className="rounded-xl bg-white p-6 shadow-sm">
        <div className="text-sm text-slate-500">Loading team plan...</div>
      </section>
    );
  }

  if (!team) {
    return (
      <section className="rounded-xl bg-white p-6 shadow-sm">
        <div className="text-sm text-red-700">
          {message || "This team could not be found."}
        </div>
        <Link
          href="/team-planning"
          className="mt-4 inline-flex rounded-lg bg-[#0d2140] px-4 py-2 text-sm font-semibold text-white"
        >
          Back to Team Planning
        </Link>
      </section>
    );
  }

  const canCreatePractice = selectedRow?.type === "week";
  const canCreateActivity = selectedRow?.type === "practice";

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragCancel={resetDragState}
      onDragEnd={handleDragEnd}
    >
      <div className="grid gap-6">
        <section className="rounded-xl bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                Team
              </div>
              <h1 className="mt-1 text-3xl font-bold text-slate-900">
                {team.name}
              </h1>
            </div>

            <Link
              href="/team-planning"
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Back to Teams
            </Link>
          </div>

          <div className="mt-5 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={handleCreateWeek}
              disabled={isSaving}
              className="rounded-lg bg-[#0d2140] px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              + Create Week
            </button>

            <button
              type="button"
              onClick={handleCreatePractice}
              disabled={!canCreatePractice || isSaving}
              className="rounded-lg border border-[#0d2140] bg-white px-4 py-2 text-sm font-semibold text-[#0d2140] disabled:cursor-not-allowed disabled:opacity-40"
            >
              + Create Practice
            </button>

            <button
              type="button"
              onClick={handleCreateActivity}
              disabled={!canCreateActivity || isSaving}
              className="rounded-lg border border-[#0d2140] bg-white px-4 py-2 text-sm font-semibold text-[#0d2140] disabled:cursor-not-allowed disabled:opacity-40"
            >
              + Create Activity
            </button>

            <button
              type="button"
              onClick={handleAddNote}
              disabled={!selectedRow || isSaving}
              className="rounded-lg border border-[#0d2140] bg-white px-4 py-2 text-sm font-semibold text-[#0d2140] disabled:cursor-not-allowed disabled:opacity-40"
            >
              + Add Note
            </button>
          </div>

          <p className="mt-3 text-sm text-slate-500">
            Select a week to create a practice. Select a practice to create an
            activity row.
          </p>

          {message && (
            <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
              {message}
            </div>
          )}
        </section>

        <section className="rounded-xl bg-white p-4 shadow-sm sm:p-6">
          {weeks.length === 0 ? (
            <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-10 text-center text-sm text-slate-500">
              No weeks yet. Click Create Week to start building the plan.
            </div>
          ) : (
            <div className="grid gap-3">
              {weeks.map((week) => {
                const weekPractices = practicesByWeek.get(week.id) ?? [];

                return (
                  <div key={week.id} className="grid gap-2">
                    <div
                      onClick={() =>
                        setSelectedRow({ type: "week", id: week.id })
                      }
                      onDoubleClick={() =>
                        beginEdit({ type: "week", id: week.id }, week.name)
                      }
                      className={`flex cursor-pointer items-center justify-between gap-3 rounded-lg border px-4 py-3 transition ${
                        rowIsSelected("week", week.id)
                          ? "border-[#0d2140] bg-[#e8eef7]"
                          : "border-slate-200 bg-slate-100 hover:bg-slate-50"
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        {editingRow?.type === "week" &&
                        editingRow.id === week.id ? (
                          <div
                            className="flex max-w-xl gap-2"
                            onClick={(event) => event.stopPropagation()}
                          >
                            <input
                              autoFocus
                              type="text"
                              value={editingValue}
                              onChange={(event) =>
                                setEditingValue(event.target.value)
                              }
                              onKeyDown={(event) => {
                                if (event.key === "Enter") {
                                  event.preventDefault();
                                  saveEdit();
                                }

                                if (event.key === "Escape") {
                                  cancelEdit();
                                }
                              }}
                              className="min-w-0 flex-1 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                            />
                            <button
                              type="button"
                              onClick={saveEdit}
                              disabled={isSaving || !editingValue.trim()}
                              className="rounded-md bg-[#0d2140] px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
                            >
                              Save
                            </button>
                            <button
                              type="button"
                              onClick={cancelEdit}
                              className="rounded-md border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <div className="flex min-w-0 flex-wrap items-center gap-x-5 gap-y-2">
                            <div className="flex min-w-0 items-center gap-2">
                              <button
                                type="button"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  toggleWeekCollapsed(week.id);
                                }}
                                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-slate-300 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50"
                                aria-label={
                                  collapsedWeekIds.has(week.id)
                                    ? `Expand ${week.name}`
                                    : `Collapse ${week.name}`
                                }
                                title={
                                  collapsedWeekIds.has(week.id)
                                    ? "Expand Week"
                                    : "Collapse Week"
                                }
                              >
                                {collapsedWeekIds.has(week.id) ? "▸" : "▾"}
                              </button>

                              <div className="truncate text-base font-bold text-slate-900">
                                {week.name}
                              </div>
                            </div>

                            {editingObjectiveWeekId === week.id ? (
                              <div
                                className="flex min-w-[280px] flex-1 items-center gap-2"
                                onClick={(event) => event.stopPropagation()}
                                onDoubleClick={(event) => event.stopPropagation()}
                              >
                                <input
                                  autoFocus
                                  type="text"
                                  value={objectiveValue}
                                  onChange={(event) =>
                                    setObjectiveValue(event.target.value)
                                  }
                                  onKeyDown={(event) => {
                                    if (event.key === "Enter") {
                                      event.preventDefault();
                                      saveWeekObjectives(week.id);
                                    }

                                    if (event.key === "Escape") {
                                      setEditingObjectiveWeekId(null);
                                      setObjectiveValue("");
                                    }
                                  }}
                                  placeholder="Enter week objectives"
                                  className="min-w-0 flex-1 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-normal"
                                />
                                <button
                                  type="button"
                                  onClick={() => saveWeekObjectives(week.id)}
                                  disabled={isSaving}
                                  className="rounded-md bg-[#0d2140] px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
                                >
                                  Save
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingObjectiveWeekId(null);
                                    setObjectiveValue("");
                                  }}
                                  className="rounded-md border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700"
                                >
                                  Cancel
                                </button>
                              </div>
                            ) : week.objectives ? (
                              <div
                                className="flex min-w-0 flex-wrap items-center gap-2"
                                onClick={(event) => event.stopPropagation()}
                                onDoubleClick={(event) => event.stopPropagation()}
                              >
                                <button
                                  type="button"
                                  onClick={() => beginObjectiveEdit(week)}
                                  className="flex min-w-0 items-center gap-2 text-left text-sm font-medium text-slate-600 hover:text-[#0d2140]"
                                >
                                  <span className="truncate">
                                    Objective: {week.objectives}
                                  </span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => {
                                    setObjectiveValue("");
                                    setEditingObjectiveWeekId(week.id);
                                  }}
                                  className="rounded-md border border-slate-300 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-50"
                                >
                                  Edit Objective
                                </button>

                                <button
                                  type="button"
                                  onClick={async () => {
                                    if (isSaving) return;

                                    setIsSaving(true);
                                    setMessage("");

                                    try {
                                      const updated =
                                        await updatePlanningWeekObjectives(
                                          week.id,
                                          ""
                                        );

                                      setWeeks((current) =>
                                        current.map((item) =>
                                          item.id === updated.id ? updated : item
                                        )
                                      );
                                    } catch (error) {
                                      console.error(
                                        "Unable to clear week objectives.",
                                        error
                                      );
                                      setMessage(
                                        "The week objectives could not be cleared."
                                      );
                                    } finally {
                                      setIsSaving(false);
                                    }
                                  }}
                                  disabled={isSaving}
                                  className="rounded-md border border-amber-300 bg-white px-2.5 py-1 text-[11px] font-semibold text-amber-700 hover:bg-amber-50 disabled:opacity-50"
                                >
                                  Clear Objective
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  beginObjectiveEdit(week);
                                }}
                                className="flex min-w-0 items-center gap-2 text-left text-sm font-medium text-slate-600 hover:text-[#0d2140]"
                              >
                                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-slate-300 bg-white text-lg font-semibold leading-none text-[#0d2140]">
                                  +
                                </span>
                                <span className="text-slate-500">Objectives</span>
                              </button>
                            )}
                          </div>
                        )}
                      </div>

                      {!(
                        editingRow?.type === "week" && editingRow.id === week.id
                      ) && (
                        <div className="flex shrink-0 gap-2">
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              beginEdit(
                                { type: "week", id: week.id },
                                week.name
                              );
                            }}
                            className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              handleDeleteWeek(week);
                            }}
                            className="rounded-md border border-red-300 bg-white px-3 py-1.5 text-xs font-semibold text-red-700"
                          >
                            Delete
                          </button>
                        </div>
                      )}
                    </div>

                    {!collapsedWeekIds.has(week.id) && (
                      <>
                        <div className="ml-5 grid gap-2 border-l-2 border-slate-200 pl-4 sm:ml-8 sm:pl-5">
                      {weekPractices.map((practice, practiceIndex) => {
                        const practiceActivities =
                          activitiesByPractice.get(practice.id) ?? [];

                        return (
                          <Fragment key={practice.id}>
                            <PlannerDropZone
                              id={`practice-drop:${week.id}:${practiceIndex}`}
                              data={{
                                type: "practice-drop",
                                weekId: week.id,
                                index: practiceIndex,
                              }}
                              disabled={isSaving || activeDrag?.type === "activity"}
                            />
                            <div className="grid gap-2">
                            <div
                              onClick={() =>
                                setSelectedRow({
                                  type: "practice",
                                  id: practice.id,
                                })
                              }
                              onDoubleClick={() =>
                                beginEdit(
                                  { type: "practice", id: practice.id },
                                  practice.name
                                )
                              }
                              className={`flex cursor-pointer items-center justify-between gap-3 rounded-lg border px-4 py-3 transition ${
                                rowIsSelected("practice", practice.id)
                                  ? "border-[#0d2140] bg-blue-50"
                                  : "border-slate-200 bg-white hover:bg-slate-50"
                              }`}
                            >
                              <div className="min-w-0 flex-1">
                                {editingRow?.type === "practice" &&
                                editingRow.id === practice.id ? (
                                  <div
                                    className="flex max-w-xl gap-2"
                                    onClick={(event) => event.stopPropagation()}
                                  >
                                    <input
                                      autoFocus
                                      type="text"
                                      value={editingValue}
                                      onChange={(event) =>
                                        setEditingValue(event.target.value)
                                      }
                                      onKeyDown={(event) => {
                                        if (event.key === "Enter") {
                                          event.preventDefault();
                                          saveEdit();
                                        }

                                        if (event.key === "Escape") {
                                          cancelEdit();
                                        }
                                      }}
                                      className="min-w-0 flex-1 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                                    />
                                    <button
                                      type="button"
                                      onClick={saveEdit}
                                      disabled={isSaving || !editingValue.trim()}
                                      className="rounded-md bg-[#0d2140] px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
                                    >
                                      Save
                                    </button>
                                    <button
                                      type="button"
                                      onClick={cancelEdit}
                                      className="rounded-md border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700"
                                    >
                                      Cancel
                                    </button>
                                  </div>
                                ) : (
                                  <div className="flex min-w-0 flex-wrap items-center gap-x-5 gap-y-2">
                                    <div className="flex min-w-0 items-center gap-2">
                                      <PlannerDragHandle
                                        data={{
                                          type: "practice",
                                          id: practice.id,
                                          weekId: practice.weekId,
                                          label: practice.name,
                                        }}
                                        disabled={isSaving || editingRow?.id === practice.id}
                                        label={`Move ${practice.name}`}
                                      />
                                      <button
                                        type="button"
                                        onClick={(event) => {
                                          event.stopPropagation();
                                          togglePracticeCollapsed(practice.id);
                                        }}
                                        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-slate-300 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50"
                                        aria-label={
                                          collapsedPracticeIds.has(practice.id)
                                            ? `Expand ${practice.name}`
                                            : `Collapse ${practice.name}`
                                        }
                                        title={
                                          collapsedPracticeIds.has(practice.id)
                                            ? "Expand Practice"
                                            : "Collapse Practice"
                                        }
                                      >
                                        {collapsedPracticeIds.has(practice.id)
                                          ? "▸"
                                          : "▾"}
                                      </button>

                                      <div className="truncate text-sm font-semibold text-slate-900">
                                        {practice.name}
                                      </div>
                                    </div>

                                    {editingKeyFocusPracticeId === practice.id ? (
                                      <div
                                        className="flex min-w-[280px] flex-1 items-center gap-2"
                                        onClick={(event) => event.stopPropagation()}
                                        onDoubleClick={(event) => event.stopPropagation()}
                                      >
                                        <input
                                          autoFocus
                                          type="text"
                                          value={keyFocusValue}
                                          onChange={(event) =>
                                            setKeyFocusValue(event.target.value)
                                          }
                                          onKeyDown={(event) => {
                                            if (event.key === "Enter") {
                                              event.preventDefault();
                                              savePracticeKeyFocus(practice.id);
                                            }

                                            if (event.key === "Escape") {
                                              setEditingKeyFocusPracticeId(null);
                                              setKeyFocusValue("");
                                            }
                                          }}
                                          placeholder="Enter practice key focus"
                                          className="min-w-0 flex-1 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-normal"
                                        />
                                        <button
                                          type="button"
                                          onClick={() =>
                                            savePracticeKeyFocus(practice.id)
                                          }
                                          disabled={isSaving}
                                          className="rounded-md bg-[#0d2140] px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
                                        >
                                          Save
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setEditingKeyFocusPracticeId(null);
                                            setKeyFocusValue("");
                                          }}
                                          className="rounded-md border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700"
                                        >
                                          Cancel
                                        </button>
                                      </div>
                                    ) : practice.keyFocus ? (
                                      <div
                                        className="flex min-w-0 flex-wrap items-center gap-2"
                                        onClick={(event) => event.stopPropagation()}
                                        onDoubleClick={(event) => event.stopPropagation()}
                                      >
                                        <button
                                          type="button"
                                          onClick={() => beginKeyFocusEdit(practice)}
                                          className="flex min-w-0 items-center gap-2 text-left text-sm font-medium text-slate-600 hover:text-[#0d2140]"
                                        >
                                          <span className="truncate">
                                            Key Focus: {practice.keyFocus}
                                          </span>
                                        </button>

                                        <button
                                          type="button"
                                          onClick={() => {
                                            setKeyFocusValue(practice.keyFocus);
                                            setEditingKeyFocusPracticeId(
                                              practice.id
                                            );
                                          }}
                                          className="rounded-md border border-slate-300 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-50"
                                        >
                                          Edit Key Focus
                                        </button>

                                        <button
                                          type="button"
                                          onClick={async () => {
                                            if (isSaving) return;

                                            setIsSaving(true);
                                            setMessage("");

                                            try {
                                              const updated =
                                                await updatePlanningPracticeKeyFocus(
                                                  practice.id,
                                                  ""
                                                );

                                              setPractices((current) =>
                                                current.map((item) =>
                                                  item.id === updated.id
                                                    ? updated
                                                    : item
                                                )
                                              );
                                            } catch (error) {
                                              console.error(
                                                "Unable to clear practice key focus.",
                                                error
                                              );
                                              setMessage(
                                                "The practice key focus could not be cleared."
                                              );
                                            } finally {
                                              setIsSaving(false);
                                            }
                                          }}
                                          disabled={isSaving}
                                          className="rounded-md border border-amber-300 bg-white px-2.5 py-1 text-[11px] font-semibold text-amber-700 hover:bg-amber-50 disabled:opacity-50"
                                        >
                                          Clear Key Focus
                                        </button>
                                      </div>
                                    ) : (
                                      <button
                                        type="button"
                                        onClick={(event) => {
                                          event.stopPropagation();
                                          beginKeyFocusEdit(practice);
                                        }}
                                        className="flex min-w-0 items-center gap-2 text-left text-sm font-medium text-slate-600 hover:text-[#0d2140]"
                                      >
                                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-slate-300 bg-white text-lg font-semibold leading-none text-[#0d2140]">
                                          +
                                        </span>
                                        <span className="text-slate-500">
                                          Key Focus
                                        </span>
                                      </button>
                                    )}
                                  </div>
                                )}
                              </div>

                              {!(
                                editingRow?.type === "practice" &&
                                editingRow.id === practice.id
                              ) && (
                                <div className="flex shrink-0 gap-2">
                                  <button
                                    type="button"
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      beginEdit(
                                        {
                                          type: "practice",
                                          id: practice.id,
                                        },
                                        practice.name
                                      );
                                    }}
                                    className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700"
                                  >
                                    Edit
                                  </button>
                                  <button
                                    type="button"
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      handleDeletePractice(practice);
                                    }}
                                    className="rounded-md border border-red-300 bg-white px-3 py-1.5 text-xs font-semibold text-red-700"
                                  >
                                    Delete
                                  </button>
                                </div>
                              )}
                            </div>

                            {!collapsedPracticeIds.has(practice.id) && (
                              <>
                                <div className="ml-5 grid gap-2 border-l-2 border-dashed border-slate-200 pl-4 sm:ml-8 sm:pl-5">
                              {practiceActivities.map((row, activityIndex) => {
                                const activity = row.activityId
                                  ? activitiesById.get(row.activityId)
                                  : undefined;

                                return (
                                  <Fragment key={row.id}>
                                    <PlannerDropZone
                                      id={`activity-drop:${practice.id}:${activityIndex}`}
                                      data={{
                                        type: "activity-drop",
                                        practiceId: practice.id,
                                        index: activityIndex,
                                      }}
                                      disabled={isSaving || activeDrag?.type === "practice"}
                                    />
                                    <div className="grid gap-2">
                                    <div
                                      onClick={() =>
                                        setSelectedRow({
                                          type: "activity",
                                          id: row.id,
                                        })
                                      }
                                      className={`cursor-pointer rounded-lg border p-3 transition ${
                                        rowIsSelected("activity", row.id)
                                          ? "border-[#0d2140] bg-slate-100"
                                          : "border-slate-200 bg-white hover:bg-slate-50"
                                      }`}
                                    >
                                    <div className="mb-2 flex items-center gap-2">
                                      <PlannerDragHandle
                                        data={{
                                          type: "activity",
                                          id: row.id,
                                          practiceId: row.practiceId,
                                          label: activity?.activityName ?? "Add Activity",
                                        }}
                                        disabled={isSaving}
                                        label={`Move ${activity?.activityName ?? "activity row"}`}
                                      />
                                      <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                                        Drag to move
                                      </span>
                                    </div>
                                    {activity ? (
                                      <div className="grid gap-3 sm:grid-cols-[150px_minmax(0,1fr)_auto] sm:items-center">
                                        <div className="flex h-28 items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
                                          {activity.previewDataUrl &&
                                          activity.fileType ===
                                            "application/pdf" ? (
                                            <iframe
                                              src={activity.previewDataUrl}
                                              title={`${activity.activityName} preview`}
                                              className="h-full w-full"
                                            />
                                          ) : activity.previewDataUrl ? (
                                            <img
                                              src={activity.previewDataUrl}
                                              alt={`${activity.activityName} preview`}
                                              className="h-full w-full object-contain"
                                            />
                                          ) : (
                                            <span className="px-2 text-center text-xs text-slate-500">
                                              Preview unavailable
                                            </span>
                                          )}
                                        </div>

                                        <div className="min-w-0">
                                          <div className="truncate text-sm font-bold text-slate-900">
                                            {activity.activityName}
                                          </div>
                                          <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-500">
                                            <span>
                                              {activity.fieldLocation ||
                                                "No location"}
                                            </span>
                                            <span>
                                              {activity.gamePhase || "No phase"}
                                            </span>
                                            <span>
                                              {activity.category ||
                                                "No category"}
                                            </span>
                                          </div>
                                        </div>

                                        <div className="flex flex-wrap gap-2 sm:justify-end">
                                          <Link
                                            href={`/activity/${activity.id}`}
                                            onClick={(event) =>
                                              event.stopPropagation()
                                            }
                                            className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700"
                                          >
                                            Open
                                          </Link>
                                          <button
                                            type="button"
                                            onClick={(event) => {
                                              event.stopPropagation();
                                              setSearchingRowId(row.id);
                                            }}
                                            className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700"
                                          >
                                            Replace
                                          </button>
                                          <button
                                            type="button"
                                            onClick={(event) => {
                                              event.stopPropagation();
                                              handleClearAttachedActivity(row);
                                            }}
                                            className="rounded-md border border-amber-300 bg-white px-3 py-1.5 text-xs font-semibold text-amber-700"
                                          >
                                            Clear
                                          </button>
                                          <button
                                            type="button"
                                            onClick={(event) => {
                                              event.stopPropagation();
                                              handleDeleteActivityRow(row);
                                            }}
                                            className="rounded-md border border-red-300 bg-white px-3 py-1.5 text-xs font-semibold text-red-700"
                                          >
                                            Remove Row
                                          </button>
                                        </div>
                                      </div>
                                    ) : (
                                      <div className="flex flex-wrap items-center justify-between gap-3">
                                        <div className="min-w-0">
                                          <div className="text-sm font-semibold text-slate-800">
                                            Add Activity
                                          </div>
                                          <div className="mt-1 text-xs text-slate-500">
                                            Search the library or create a new
                                            activity.
                                          </div>
                                        </div>

                                        <div className="flex shrink-0 flex-wrap items-center gap-2">
                                          <button
                                            type="button"
                                            onClick={(event) => {
                                              event.stopPropagation();
                                              setSearchingRowId(row.id);
                                            }}
                                            className="rounded-md border border-[#0d2140] bg-white px-3 py-1.5 text-xs font-semibold text-[#0d2140] hover:bg-slate-50"
                                          >
                                            🔍 Search
                                          </button>
                                          <button
                                            type="button"
                                            onClick={(event) => {
                                              event.stopPropagation();
                                              handleCreateNewActivity(row);
                                            }}
                                            className="rounded-md bg-[#0d2140] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#17345f]"
                                          >
                                            + Create
                                          </button>
                                          <button
                                            type="button"
                                            onClick={(event) => {
                                              event.stopPropagation();
                                              handleDeleteActivityRow(row);
                                            }}
                                            className="rounded-md border border-red-300 bg-white px-3 py-1.5 text-xs font-semibold text-red-700"
                                          >
                                            Remove
                                          </button>
                                        </div>
                                      </div>
                                    )}
                                  </div>

                                  {(notesByPractice.get(practice.id) ?? [])
                                    .filter(
                                      (note) =>
                                        note.noteScope === "activity" &&
                                        note.afterActivityRowId === row.id &&
                                        practiceActivities[
                                          practiceActivities.length - 1
                                        ]?.id !== row.id
                                    )
                                    .map((note) => (
                                      <div
                                        key={note.id}
                                        className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3"
                                      >
                                        {editingNoteId === note.id ? (
                                          <div className="grid gap-2">
                                            <textarea
                                              autoFocus
                                              value={noteValue}
                                              onChange={(event) =>
                                                setNoteValue(event.target.value)
                                              }
                                              placeholder="Enter note"
                                              rows={3}
                                              className="w-full rounded-md border border-amber-300 bg-white px-3 py-2 text-sm text-slate-800"
                                            />

                                            <div className="flex justify-end gap-2">
                                              <button
                                                type="button"
                                                onClick={() =>
                                                  saveNote(note.id)
                                                }
                                                disabled={isSaving}
                                                className="rounded-md bg-[#0d2140] px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
                                              >
                                                Save Note
                                              </button>
                                              <button
                                                type="button"
                                                onClick={() => {
                                                  setEditingNoteId(null);
                                                  setNoteValue("");
                                                }}
                                                className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700"
                                              >
                                                Cancel
                                              </button>
                                            </div>
                                          </div>
                                        ) : (
                                          <div className="flex flex-wrap items-start justify-between gap-3">
                                            <div className="min-w-0 flex-1">
                                              <div className="text-xs font-bold uppercase tracking-wide text-amber-700">
                                                Note
                                              </div>
                                              <div className="mt-1 whitespace-pre-wrap text-sm text-slate-700">
                                                {note.noteText || "Empty note"}
                                              </div>
                                            </div>

                                            <div className="flex shrink-0 gap-2">
                                              <button
                                                type="button"
                                                onClick={() => {
                                                  setEditingNoteId(note.id);
                                                  setNoteValue(note.noteText);
                                                }}
                                                className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700"
                                              >
                                                Edit Note
                                              </button>
                                              <button
                                                type="button"
                                                onClick={() =>
                                                  removeNote(note.id)
                                                }
                                                className="rounded-md border border-red-300 bg-white px-3 py-1.5 text-xs font-semibold text-red-700"
                                              >
                                                Delete Note
                                              </button>
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    ))}
                                    </div>
                                  </Fragment>
                                );
                              })}

                              <PlannerDropZone
                                id={`activity-drop:${practice.id}:${practiceActivities.length}`}
                                data={{
                                  type: "activity-drop",
                                  practiceId: practice.id,
                                  index: practiceActivities.length,
                                }}
                                disabled={isSaving || activeDrag?.type === "practice"}
                              />

                              {(notesByPractice.get(practice.id) ?? []).map(
                                (note) => {
                                  const noteAnchorIndex = note.afterActivityRowId
                                    ? practiceActivities.findIndex(
                                        (activityRow) =>
                                          activityRow.id ===
                                          note.afterActivityRowId
                                      )
                                    : practiceActivities.length - 1;

                                  const shouldRenderAtEnd =
                                    note.noteScope === "activity" &&
                                    noteAnchorIndex ===
                                      practiceActivities.length - 1;

                                  if (!shouldRenderAtEnd) {
                                    return null;
                                  }

                                  return (
                                    <div
                                      key={note.id}
                                      className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3"
                                    >
                                      {editingNoteId === note.id ? (
                                        <div className="grid gap-2">
                                          <textarea
                                            autoFocus
                                            value={noteValue}
                                            onChange={(event) =>
                                              setNoteValue(event.target.value)
                                            }
                                            placeholder="Enter note"
                                            rows={3}
                                            className="w-full rounded-md border border-amber-300 bg-white px-3 py-2 text-sm text-slate-800"
                                          />

                                          <div className="flex justify-end gap-2">
                                            <button
                                              type="button"
                                              onClick={() => saveNote(note.id)}
                                              disabled={isSaving}
                                              className="rounded-md bg-[#0d2140] px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
                                            >
                                              Save Note
                                            </button>

                                            <button
                                              type="button"
                                              onClick={() => {
                                                setEditingNoteId(null);
                                                setNoteValue("");
                                              }}
                                              className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700"
                                            >
                                              Cancel
                                            </button>
                                          </div>
                                        </div>
                                      ) : (
                                        <div className="flex flex-wrap items-start justify-between gap-3">
                                          <div className="min-w-0 flex-1">
                                            <div className="text-xs font-bold uppercase tracking-wide text-amber-700">
                                              Note
                                            </div>
                                            <div className="mt-1 whitespace-pre-wrap text-sm text-slate-700">
                                              {note.noteText || "Empty note"}
                                            </div>
                                          </div>

                                          <div className="flex shrink-0 gap-2">
                                            <button
                                              type="button"
                                              onClick={() => {
                                                setEditingNoteId(note.id);
                                                setNoteValue(note.noteText);
                                              }}
                                              className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700"
                                            >
                                              Edit Note
                                            </button>

                                            <button
                                              type="button"
                                              onClick={() =>
                                                removeNote(note.id)
                                              }
                                              className="rounded-md border border-red-300 bg-white px-3 py-1.5 text-xs font-semibold text-red-700"
                                            >
                                              Delete Note
                                            </button>
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  );
                                }
                              )}

                              {practiceActivities.length > 0 && (
                                <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-3">
                                  <div>
                                    <div className="text-sm font-semibold text-slate-800">
                                      Add Another Activity
                                    </div>
                                    <div className="mt-1 text-xs text-slate-500">
                                      Search the library or create another new activity for this practice.
                                    </div>
                                  </div>

                                  <div className="flex flex-wrap gap-2">
                                    <button
                                      type="button"
                                      onClick={() =>
                                        handleSearchAnotherActivity(practice.id)
                                      }
                                      disabled={isSaving}
                                      className="rounded-md border border-[#0d2140] bg-white px-3 py-1.5 text-xs font-semibold text-[#0d2140] hover:bg-slate-50 disabled:opacity-50"
                                    >
                                      🔍 Search
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() =>
                                        handleCreateAnotherActivity(practice.id)
                                      }
                                      disabled={isSaving}
                                      className="rounded-md bg-[#0d2140] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#17345f] disabled:opacity-50"
                                    >
                                      + Create
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>

                            {(notesByPractice.get(practice.id) ?? [])
                              .filter(
                                (note) => note.noteScope === "practice"
                              )
                              .map((note) => (
                                <div
                                  key={note.id}
                                  className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3"
                                >
                                  {editingNoteId === note.id ? (
                                    <div className="grid gap-2">
                                      <div className="text-xs font-bold uppercase tracking-wide text-amber-700">
                                        Practice Note
                                      </div>

                                      <textarea
                                        autoFocus
                                        value={noteValue}
                                        onChange={(event) =>
                                          setNoteValue(event.target.value)
                                        }
                                        placeholder="Enter note"
                                        rows={3}
                                        className="w-full rounded-md border border-amber-300 bg-white px-3 py-2 text-sm text-slate-800"
                                      />

                                      <div className="flex justify-end gap-2">
                                        <button
                                          type="button"
                                          onClick={() => saveNote(note.id)}
                                          disabled={isSaving}
                                          className="rounded-md bg-[#0d2140] px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
                                        >
                                          Save Note
                                        </button>

                                        <button
                                          type="button"
                                          onClick={() => {
                                            setEditingNoteId(null);
                                            setNoteValue("");
                                          }}
                                          className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700"
                                        >
                                          Cancel
                                        </button>
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="flex flex-wrap items-start justify-between gap-3">
                                      <div className="min-w-0 flex-1">
                                        <div className="text-xs font-bold uppercase tracking-wide text-amber-700">
                                          Practice Note
                                        </div>

                                        <div className="mt-1 whitespace-pre-wrap text-sm text-slate-700">
                                          {note.noteText || "Empty note"}
                                        </div>
                                      </div>

                                      <div className="flex shrink-0 gap-2">
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setEditingNoteId(note.id);
                                            setNoteValue(note.noteText);
                                          }}
                                          className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700"
                                        >
                                          Edit Note
                                        </button>

                                        <button
                                          type="button"
                                          onClick={() => removeNote(note.id)}
                                          className="rounded-md border border-red-300 bg-white px-3 py-1.5 text-xs font-semibold text-red-700"
                                        >
                                          Delete Note
                                        </button>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              ))}
                              </>
                            )}
                            </div>
                          </Fragment>
                        );
                      })}
                      <PlannerDropZone
                        id={`practice-drop:${week.id}:${weekPractices.length}`}
                        data={{
                          type: "practice-drop",
                          weekId: week.id,
                          index: weekPractices.length,
                        }}
                        disabled={isSaving || activeDrag?.type === "activity"}
                      />
                    </div>

                    {(notesByPractice.get(
                      weekPractices[weekPractices.length - 1]?.id ?? ""
                    ) ?? [])
                      .filter(
                        (note) =>
                          note.noteScope === "week" && note.weekId === week.id
                      )
                      .map((note) => (
                        <div
                          key={note.id}
                          className="ml-0 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3"
                        >
                          {editingNoteId === note.id ? (
                            <div className="grid gap-2">
                              <textarea
                                autoFocus
                                value={noteValue}
                                onChange={(event) =>
                                  setNoteValue(event.target.value)
                                }
                                placeholder="Enter note"
                                rows={3}
                                className="w-full rounded-md border border-amber-300 bg-white px-3 py-2 text-sm text-slate-800"
                              />
                              <div className="flex justify-end gap-2">
                                <button
                                  type="button"
                                  onClick={() => saveNote(note.id)}
                                  disabled={isSaving}
                                  className="rounded-md bg-[#0d2140] px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
                                >
                                  Save Note
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingNoteId(null);
                                    setNoteValue("");
                                  }}
                                  className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex flex-wrap items-start justify-between gap-3">
                              <div className="min-w-0 flex-1">
                                <div className="text-xs font-bold uppercase tracking-wide text-amber-700">
                                  Week Note
                                </div>
                                <div className="mt-1 whitespace-pre-wrap text-sm text-slate-700">
                                  {note.noteText || "Empty note"}
                                </div>
                              </div>
                              <div className="flex shrink-0 gap-2">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingNoteId(note.id);
                                    setNoteValue(note.noteText);
                                  }}
                                  className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700"
                                >
                                  Edit Note
                                </button>
                                <button
                                  type="button"
                                  onClick={() => removeNote(note.id)}
                                  className="rounded-md border border-red-300 bg-white px-3 py-1.5 text-xs font-semibold text-red-700"
                                >
                                  Delete Note
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>

      {searchingRowId && (
        <PlannerActivityPicker
          activities={libraryActivities}
          onSelect={handleSelectLibraryActivity}
          onClose={() => setSearchingRowId(null)}
        />
      )}

      <DragOverlay>
        {activeDrag ? (
          <div className="max-w-sm rounded-lg border border-[#0d2140] bg-white px-4 py-3 text-sm font-semibold text-slate-900 shadow-xl">
            {activeDrag.label}
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
