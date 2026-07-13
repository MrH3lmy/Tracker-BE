import type { TaskStatus } from '../../validation/taskStatus';

export interface BoardColumnRecord {
  id: number;
  name: string;
  status?: TaskStatus;
  position: number;
}
