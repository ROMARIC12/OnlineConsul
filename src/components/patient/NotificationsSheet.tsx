import { X, Flag, MoreVertical, Calendar, CreditCard, AlertTriangle, Bell, Users, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

interface Notification {
  id: string;
  type: 'appointment' | 'payment' | 'urgent' | 'queue_update' | 'reminder';
  title: string;
  message?: string;
  created_at: string;
  is_read: boolean;
}

interface NotificationsSheetProps {
  open: boolean;
  onClose: () => void;
  notifications: Notification[];
  onMarkAsRead: (id: string) => void;
  onMarkAllAsRead: () => void;
}

const getNotificationIcon = (type: Notification['type']) => {
  switch (type) {
    case 'appointment':
      return <Calendar className="h-5 w-5 text-[hsl(210,50%,50%)]" />;
    case 'payment':
      return <CreditCard className="h-5 w-5 text-[hsl(120,50%,45%)]" />;
    case 'urgent':
      return <AlertTriangle className="h-5 w-5 text-destructive" />;
    case 'queue_update':
      return <Users className="h-5 w-5 text-[hsl(45,80%,50%)]" />;
    case 'reminder':
      return <Bell className="h-5 w-5 text-[hsl(280,50%,55%)]" />;
    default:
      return <Info className="h-5 w-5 text-muted-foreground" />;
  }
};

export function NotificationsSheet({
  open,
  onClose,
  notifications,
  onMarkAsRead,
  onMarkAllAsRead,
}: NotificationsSheetProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between h-14 px-4 border-b">
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-5 w-5" />
        </Button>
        <h1 className="font-semibold">Notifications</h1>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon">
            <Flag className="h-5 w-5 text-[hsl(45,70%,50%)]" />
          </Button>
          <Button variant="ghost" size="icon">
            <MoreVertical className="h-5 w-5" />
          </Button>
        </div>
      </header>

      <ScrollArea className="flex-1">
        {notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-6">
            <Bell className="h-16 w-16 text-muted-foreground/30 mb-4" />
            <p className="text-muted-foreground">Aucune notification</p>
          </div>
        ) : (
          <div className="divide-y">
            {notifications.map((notification) => (
              <button
                key={notification.id}
                onClick={() => !notification.is_read && onMarkAsRead(notification.id)}
                className={`w-full flex gap-4 p-4 text-left transition-colors hover:bg-muted/50 ${
                  !notification.is_read ? 'bg-primary/5' : ''
                }`}
              >
                <div className="flex-shrink-0 mt-0.5">
                  {getNotificationIcon(notification.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className={`text-sm ${!notification.is_read ? 'font-medium' : ''}`}>
                      {notification.title}
                    </p>
                    {!notification.is_read && (
                      <div className="h-2 w-2 rounded-full bg-primary flex-shrink-0 mt-1.5" />
                    )}
                  </div>
                  {notification.message && (
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                      {notification.message}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">
                    {formatDistanceToNow(new Date(notification.created_at), {
                      addSuffix: true,
                      locale: fr,
                    })}
                  </p>
                </div>
              </button>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
