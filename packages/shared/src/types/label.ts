export const LABEL_COLORS = [
  'slate',
  'gray',
  'red',
  'orange',
  'amber',
  'yellow',
  'green',
  'emerald',
  'teal',
  'cyan',
  'blue',
  'indigo',
  'violet',
  'purple',
  'pink',
  'rose',
] as const;

export type LabelColor = (typeof LABEL_COLORS)[number];

export interface LabelItem {
  id: string;
  projectId: string;
  name: string;
  normalizedName: string;
  color: LabelColor | string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
  taskCount?: number;
}

export interface CreateLabelPayload {
  name: string;
  color?: LabelColor | string;
  description?: string | null;
}

export interface UpdateLabelPayload {
  name?: string;
  color?: LabelColor | string;
  description?: string | null;
}

export interface TaskLabelAssignmentPayload {
  labelId: string;
}

export interface TaskLabelItem {
  id: string;
  taskId: string;
  labelId: string;
  label: LabelItem;
}
