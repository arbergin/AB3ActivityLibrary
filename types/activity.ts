export type Activity = {
  id: string;
  activityName: string;
  fieldLocation: "" | "First Third" | "Middle Third" | "Final Third";
  gamePhase:
    | ""
    | "Attacking"
    | "Attacking to Defending Transition"
    | "Defending"
    | "Defending to Attacking Transition"
    | "Set Pieces";
  category:
    | ""
    | "Ball Mastery"
    | "Game-Realistic Positional Activity"
    | "Passing Activation"
    | "Rondo"
    | "Shooting"
    | "Small-Sided Games";
  positionsInvolved: string;
  numberOfPlayers: number | "";
  activityDetails: string;
  createdBy: string;
  hidden: boolean;
  fileName?: string;
  fileType?: string;
  previewDataUrl?: string;
  createdAt?: string;
  updatedAt?: string;
};