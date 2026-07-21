export interface NotificationRecord {
  id: number;
  title: string;
  body?: string;
  link?: string;
  read: boolean;
  createdDate: string;
}
