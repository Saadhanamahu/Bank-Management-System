// src/pages/notifications/Notifications.jsx

import { Bell, CheckCheck } from 'lucide-react';
import { useNotifications } from '../../context/NotificationContext';
import { timeAgo } from '../../utils/formatters';
import { Card, EmptyState, Button } from '../../components/ui';
import { THEME } from '../../config/constants';

export const Notifications = () => {
  const { notifications, unreadCount, markAllRead } = useNotifications();

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Bell className="w-5 h-5" />
            Notifications
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up!'}
          </p>
        </div>
        {unreadCount > 0 && (
          <Button size="sm" variant="secondary" onClick={markAllRead}>
            <CheckCheck className="w-4 h-4" />
            Mark all read
          </Button>
        )}
      </div>

      <Card>
        {notifications.length === 0 ? (
          <EmptyState icon={Bell} message="No unread notifications." />
        ) : (
          <div className="divide-y divide-gray-50">
            {notifications.map(n => (
              <div key={n.id} className={`flex items-start gap-3 py-4 ${!n.isRead ? `${THEME.primaryLight} -mx-5 px-5` : ''}`}>
                <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${!n.isRead ? THEME.primary : 'bg-gray-200'}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-800 font-medium capitalize">{n.type?.replace(/_/g, ' ')}</p>
                  <p className="text-sm text-gray-600 mt-0.5">{n.message}</p>
                  {n.relatedTxnId && (
                    <p className="text-xs text-gray-400 mt-1 font-mono">TXN: {n.relatedTxnId.slice(0, 16)}…</p>
                  )}
                </div>
                <span className="text-xs text-gray-400 flex-shrink-0">{timeAgo(n.createdAt)}</span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};
