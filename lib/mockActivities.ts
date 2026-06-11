import type { Activity } from "@/types/activity";

export const mockActivities: Activity[] = [
  {
    id: "activity-1",
    activityName: "3v2 to Counter",
    fieldLocation: "Final Third",
    gamePhase: "Attacking",
    category: "Small-Sided Games",
    positionsInvolved: "9, 10, Wingers",
    numberOfPlayers: 8,
    activityDetails:
      "Attack quickly with a 3v2 advantage, then transition immediately when possession is lost. Focus on decision-making, spacing, and recovery runs.",
    createdBy: "Coach User",
    hidden: false,
  },
  {
    id: "activity-2",
    activityName: "Middle Third Rondo",
    fieldLocation: "Middle Third",
    gamePhase: "Attacking",
    category: "Rondo",
    positionsInvolved: "6, 8, 10",
    numberOfPlayers: 7,
    activityDetails:
      "Possession activity focused on scanning, support angles, body shape, and playing through pressure in the middle third.",
    createdBy: "Coach User",
    hidden: false,
  },
  {
    id: "activity-3",
    activityName: "Build Out Passing Activation",
    fieldLocation: "First Third",
    gamePhase: "Attacking",
    category: "Passing Activation",
    positionsInvolved: "GK, CBs, 6, FBs",
    numberOfPlayers: 10,
    activityDetails:
      "Pattern-based activation for building out from the back with emphasis on spacing, timing, and third-player options.",
    createdBy: "Coach User",
    hidden: true,
  },
];