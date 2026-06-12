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
  fileName?: string;
  fileType?: string;
  previewDataUrl?: string;
  createdAt?: string;
  updatedAt?: string;
};