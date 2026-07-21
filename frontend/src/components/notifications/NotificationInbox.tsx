import { useNavigate } from 'react-router-dom';
import { useNotificationMutations, useNotificationsQuery, useNotificationsUnreadCountQuery } from '../../hooks/useApiQueries';
import type { NotificationRecord } from './notificationTypes';
import { Badge, Button, Popover, PopoverContent, PopoverTrigger } from '../ui';
import { Bell, Check, Clock } from '../ui/icons';

const relativeTime = (value: string) => {
  const then = new Date(value).getTime();
  if (Number.isNaN(then)) return '';
  const diffMinutes = Math.round((Date.now() - then) / 60000);
  if (diffMinutes < 1) return 'just now';
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${Math.round(diffHours / 24)}d ago`;
};

function NotificationRow({ notification, onOpen, onSnooze, busy }: { notification: NotificationRecord; onOpen: (notification: NotificationRecord) => void; onSnooze: (id: number) => void; busy: boolean }) {
  return (
    <li className={notification.read ? 'rounded-lg px-3 py-2.5' : 'rounded-lg bg-brand-soft/40 px-3 py-2.5'}>
      <button type="button" onClick={() => onOpen(notification)} className="flex w-full flex-col gap-0.5 text-left">
        <span className="flex items-center gap-1.5 text-sm font-medium text-fg">
          {!notification.read && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-brand" aria-hidden />}
          {notification.title}
        </span>
        {notification.body && <span className="truncate text-xs text-fg-muted">{notification.body}</span>}
        <span className="text-[11px] text-fg-subtle">{relativeTime(notification.createdDate)}</span>
      </button>
      {!notification.read && (
        <div className="mt-1.5 flex justify-end">
          <Button size="sm" variant="ghost" disabled={busy} onClick={() => onSnooze(notification.id)}>
            <Clock className="h-3.5 w-3.5" aria-hidden />
            Snooze 1h
          </Button>
        </div>
      )}
    </li>
  );
}

export function NotificationInbox() {
  const navigate = useNavigate();
  const unreadCountQuery = useNotificationsUnreadCountQuery();
  const notificationsQuery = useNotificationsQuery(false);
  const { markRead, snooze } = useNotificationMutations();

  const unreadCount = unreadCountQuery.data?.data?.count ?? 0;
  const notifications = Array.isArray(notificationsQuery.data?.data) ? notificationsQuery.data.data : [];
  const busy = markRead.isPending || snooze.isPending;

  const openNotification = (notification: NotificationRecord) => {
    if (!notification.read) markRead.mutate(notification.id);
    if (notification.link) navigate(notification.link);
  };

  const snoozeOneHour = (id: number) => {
    const scheduledFor = new Date(Date.now() + 60 * 60000);
    const pad = (n: number) => String(n).padStart(2, '0');
    const local = `${scheduledFor.getFullYear()}-${pad(scheduledFor.getMonth() + 1)}-${pad(scheduledFor.getDate())}T${pad(scheduledFor.getHours())}:${pad(scheduledFor.getMinutes())}:00`;
    snooze.mutate({ id, scheduledFor: local });
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" iconOnly aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : 'Notifications'} className="relative">
          <Bell className="h-4 w-4" aria-hidden />
          {unreadCount > 0 && (
            <Badge variant="critical" className="absolute -top-1 -right-1 h-4 min-w-4 justify-center px-1 text-[10px]">
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80" aria-label="Notifications">
        <div className="flex items-center justify-between gap-2 pb-2">
          <p className="text-sm font-semibold text-fg">Notifications</p>
          {unreadCount > 0 && <Badge variant="brand">{unreadCount} unread</Badge>}
        </div>
        {notifications.length === 0 ? (
          <p className="py-4 text-center text-sm text-fg-muted">
            <Check className="mx-auto mb-1 h-4 w-4" aria-hidden />
            You're all caught up.
          </p>
        ) : (
          <ul className="flex max-h-96 flex-col gap-1 overflow-y-auto">
            {notifications.map((notification) => (
              <NotificationRow key={notification.id} notification={notification} onOpen={openNotification} onSnooze={snoozeOneHour} busy={busy} />
            ))}
          </ul>
        )}
      </PopoverContent>
    </Popover>
  );
}
