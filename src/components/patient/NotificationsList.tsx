import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Bell, Calendar, CreditCard, AlertTriangle, Check, X } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';

interface Notification {
  id: string;
  type: 'appointment' | 'payment' | 'reminder' | 'urgent';
  title: string;
  message: string;
  created_at: string;
  is_read: boolean;
  data?: any;
}

interface NotificationsListProps {
  notifications: Notification[];
  onMarkAsRead?: (id: string) => void;
  onMarkAllAsRead?: () => void;
  onDismiss?: (id: string) => void;
}

export function NotificationsList({
  notifications,
  onMarkAsRead,
  onMarkAllAsRead,
  onDismiss,
}: NotificationsListProps) {
  const unreadCount = notifications.filter(n => !n.is_read).length;

  const getIcon = (type: Notification['type']) => {
    switch (type) {
      case 'appointment':
        return <Calendar className="h-4 w-4 text-primary" />;
      case 'payment':
        return <CreditCard className="h-4 w-4 text-green-600" />;
      case 'reminder':
        return <Bell className="h-4 w-4 text-amber-600" />;
      case 'urgent':
        return <AlertTriangle className="h-4 w-4 text-destructive" />;
      default:
        return <Bell className="h-4 w-4" />;
    }
  };

  const getTypeLabel = (type: Notification['type']) => {
    switch (type) {
      case 'appointment':
        return 'RDV';
      case 'payment':
        return 'Paiement';
      case 'reminder':
        return 'Rappel';
      case 'urgent':
        return 'Urgent';
      default:
        return 'Info';
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle className="text-lg">Notifications</CardTitle>
            {unreadCount > 0 && (
              <Badge variant="destructive" className="rounded-full">
                {unreadCount}
              </Badge>
            )}
          </div>
          {unreadCount > 0 && onMarkAllAsRead && (
            <Button variant="ghost" size="sm" onClick={onMarkAllAsRead}>
              Tout marquer comme lu
            </Button>
          )}
        </div>
        <CardDescription>Restez informé de vos activités</CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[400px]">
          {notifications.length === 0 ? (
            <div className="p-6 text-center text-muted-foreground">
              <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>Aucune notification</p>
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-4 hover:bg-muted/50 transition-colors ${
                    !notification.is_read ? 'bg-primary/5' : ''
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-1">{getIcon(notification.type)}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline" className="text-xs">
                          {getTypeLabel(notification.type)}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(notification.created_at), 'dd MMM à HH:mm', {
                            locale: fr,
                          })}
                        </span>
                        {!notification.is_read && (
                          <span className="w-2 h-2 rounded-full bg-primary" />
                        )}
                      </div>
                      <h4 className="font-medium text-sm">{notification.title}</h4>
                      <p className="text-sm text-muted-foreground">{notification.message}</p>
                    </div>
                    <div className="flex gap-1">
                      {!notification.is_read && onMarkAsRead && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => onMarkAsRead(notification.id)}
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                      )}
                      {onDismiss && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => onDismiss(notification.id)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
