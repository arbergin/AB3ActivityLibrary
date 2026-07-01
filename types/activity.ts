export type ActivityCreatorObjectType =
  | "team1"
  | "team2"
  | "cone"
  | "ball"
  | "mannequin"
  | "miniGoal"
  | "fullGoal"
  | "textBox";

export type ActivityCreatorLinePoint = {
  x: number;
  y: number;
};

export type ActivityCreatorColorObject = {
  red: number;
  green: number;
  blue: number;
  opacity: number;
};

export type ActivityCreatorObject = {
  id: string;
  type: ActivityCreatorObjectType;
  x: number;
  y: number;

  /**
   * Current web creator fields.
   * Keep these so existing web-created activities continue to work.
   */
  label?: string;
  playerName?: string;
  rotation: number;
  fillColor?: string;
  size?: number;

  /**
   * Shared/iOS v2 fields.
   * These allow the web app to understand iOS-created activities.
   */
  textColor?: ActivityCreatorColorObject | string;
  number?: string;
  name?: string;
  nameFontSize?: number;
  playerShape?: "circle" | "triangle" | "square" | "diamond";
  textContent?: string;
  fontSize?: number;
  rotationDegrees?: number;
};

export type ActivityCreatorLine = {
  id: string;
  points: ActivityCreatorLinePoint[];

  /**
   * Current web creator fields.
   */
  dashed?: boolean;
  arrow?: boolean;

  /**
   * Shared/iOS v2 fields.
   */
  isDashed?: boolean;
  isArrow?: boolean;

  color: string | ActivityCreatorColorObject;
};

export type ActivityCreatorSettingsV1 = {
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

export type ActivityCreatorPitchStateV2 = {
  background: "pitchGreen" | "pitchWhite" | "greenBlank" | "whiteBlank";
  zoom: number;
  offsetX: number;
  offsetY: number;
  rotationDegrees: number;
};

export type ActivityCreatorSettingsV2 = {
  playerDisplayMode: string;

  team1DefaultColor: ActivityCreatorColorObject;
  team2DefaultColor: ActivityCreatorColorObject;
  team1DefaultShape: "circle" | "triangle" | "square" | "diamond";
  team2DefaultShape: "circle" | "triangle" | "square" | "diamond";

  playerTextDefaultColor: ActivityCreatorColorObject;
  coneDefaultColor: ActivityCreatorColorObject;

  playerDefaultSize: number;
  coneDefaultSize: number;
  logoSize: number;
};

export type ActivityCreatorStateV1 = {
  selectedPitchBackground: "pitchGreen" | "pitchWhite" | "greenBlank" | "whiteBlank";
  objects: ActivityCreatorObject[];
  lines: ActivityCreatorLine[];
  settings: ActivityCreatorSettingsV1;
};

export type ActivityCreatorStateV2 = {
  schemaVersion: 2;
  sourcePlatform: "ios" | "web";
  clientActivityId?: string;
  pitch: ActivityCreatorPitchStateV2;
  settings: ActivityCreatorSettingsV2;
  objects: ActivityCreatorObject[];
  lines: ActivityCreatorLine[];
};

export type ActivityCreatorState =
  | ActivityCreatorStateV1
  | ActivityCreatorStateV2;

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
}