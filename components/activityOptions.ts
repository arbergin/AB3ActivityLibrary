export const fieldLocationOptions = [
  "First Third",
  "Middle Third",
  "Final Third",
] as const;

export const gamePhaseOptions = [
  "Attacking",
  "Attacking to Defending Transition",
  "Defending",
  "Defending to Attacking Transition",
  "Set Pieces",
] as const;

export const categoryOptions = [
  "Ball Mastery",
  "Game-Realistic Positional Activity",
  "Passing Activation",
  "Rondo",
  "Shooting",
  "Small-Sided Games",
] as const;

export type FieldLocationOption = (typeof fieldLocationOptions)[number];
export type GamePhaseOption = (typeof gamePhaseOptions)[number];
export type CategoryOption = (typeof categoryOptions)[number];

export type ActivityDropdownKey = "field_location" | "game_phase" | "category";

export type ActivityDropdownLabel =
  | "Field Location"
  | "Game Phase"
  | "Category";

export const activityDropdownLabels: Record<ActivityDropdownKey, ActivityDropdownLabel> = {
  field_location: "Field Location",
  game_phase: "Game Phase",
  category: "Category",
};

export const activityDropdownKeys: ActivityDropdownKey[] = [
  "field_location",
  "game_phase",
  "category",
];

export const defaultActivityDropdownOptions: Record<ActivityDropdownKey, string[]> = {
  field_location: [...fieldLocationOptions],
  game_phase: [...gamePhaseOptions],
  category: [...categoryOptions],
};

export function getDefaultActivityDropdownOptions(key: ActivityDropdownKey) {
  return defaultActivityDropdownOptions[key] ?? [];
}
