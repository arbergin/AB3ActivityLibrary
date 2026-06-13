export type ActivityCreatorObject = {
  id: string;
  type:
    | "team1"
    | "team2"
    | "cone"
    | "ball"
    | "mannequin"
    | "miniGoal"
    | "fullGoal";
  x: number;
  y: number;
  label?: string;
  playerName?: string;
  rotation: number;
  fillColor?: string;
  size?: number;
};

export type ActivityCreatorLine = {
  id: string;
  points: { x: number; y: number }[];
  dashed: boolean;
  arrow: boolean;
  color: string;
};

export type ActivityCreatorState = {
  selectedPitchBackground: string;
  objects: ActivityCreatorObject[];
  lines: ActivityCreatorLine[];
  settings: {
    team1Color: string;
    team2Color: string;
    coneColor: string;
    lineColor: string;
    playerDefaultSize: number;
    coneDefaultSize: number;
    mannequinDefaultSize: number;
    ballDefaultSize: number;
    playerDisplayMode: string;
  };
};

export type Activity = {
  id: string;
  activityName: string;
  fieldLocation: string;
  gamePhase: string;
  category: string;
  positionsInvolved: string;
  numberOfPlayers: number | "";
  activityDetails: string;
  createdBy: string;
  hidden: boolean;
  activitySource?: "import" | "create";
  creatorState?: ActivityCreatorState;
  fileName?: string;
  fileType?: string;
  previewDataUrl?: string;
  createdAt?: string;
  updatedAt?: string;
};
