export const PROJECT_STATUS_VALUES = ['PLANNING', 'ACTIVE', 'AT_RISK', 'ON_HOLD', 'DONE', 'ARCHIVED'] as const;
export type ProjectStatus = (typeof PROJECT_STATUS_VALUES)[number];

export const MILESTONE_STATUS_VALUES = ['PENDING', 'DONE'] as const;
export type MilestoneStatus = (typeof MILESTONE_STATUS_VALUES)[number];

export interface ProjectRecord {
  id: number;
  name: string;
  description?: string;
  status: ProjectStatus;
  startDate?: string;
  targetDate?: string;
  area?: string;
  goal?: string;
  ownerUserId?: number;
  createdDate?: string;
}

export interface MilestoneRecord {
  id: number;
  projectId: number;
  title: string;
  targetDate?: string;
  completedDate?: string;
  status: MilestoneStatus;
}

export interface ProjectOverviewRecord {
  project: ProjectRecord;
  totalTasks: number;
  completedTasks: number;
  activeTasks: number;
  overdueTasks: number;
  progressPercent: number;
  estimatedHours: number;
  actualHours: number;
  milestones: MilestoneRecord[];
  completedMilestones: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  riskReason: string;
}

export interface CreateProjectPayload {
  name: string;
  description?: string;
  status?: ProjectStatus;
  startDate?: string;
  targetDate?: string;
  area?: string;
  goal?: string;
}

export interface CreateMilestonePayload {
  title: string;
  targetDate?: string;
}

export interface UpdateMilestonePayload {
  title: string;
  targetDate?: string;
  status?: MilestoneStatus;
}
