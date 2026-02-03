import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { RealtimeChannel } from '@supabase/supabase-js';

export interface Notification {
  id: string;
  user_id: string;
  type: 'appointment' | 'payment' | 'reminder' | 'urgent' | 'system' | 'queue_update';
  title: string;
  message: string | null;
  data: Record<string, any>;
  is_read: boolean;
  created_at: string;
}

export function useNotifications() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const fetchNotifications = useCallback(async () => {
    if (!user) {
      setNotifications([]);
      setUnreadCount(0);
      setIsLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      const typedData = (data || []) as Notification[];
      setNotifications(typedData);
      setUnreadCount(typedData.filter((n) => !n.is_read).length);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  // Fetch on mount and when user changes
  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Real-time subscription
  useEffect(() => {
    if (!user) return;

    const channelName = `notifications-${user.id}-${Date.now()}`;
    
    const channel: RealtimeChannel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          console.log('[Notifications] Realtime update:', payload.eventType);
          
          if (payload.eventType === 'INSERT') {
            const newNotification = payload.new as Notification;
            setNotifications((prev) => [newNotification, ...prev]);
            setUnreadCount((prev) => prev + 1);
            
            // Browser notification if permission granted
            if (Notification.permission === 'granted') {
              new Notification(newNotification.title, {
                body: newNotification.message || '',
                icon: '/favicon.ico',
              });
            }
          } else if (payload.eventType === 'UPDATE') {
            const updated = payload.new as Notification;
            setNotifications((prev) =>
              prev.map((n) => (n.id === updated.id ? updated : n))
            );
            // Recalculate unread count
            setNotifications((prev) => {
              setUnreadCount(prev.filter((n) => !n.is_read).length);
              return prev;
            });
          } else if (payload.eventType === 'DELETE') {
            const deleted = payload.old as { id: string };
            setNotifications((prev) => prev.filter((n) => n.id !== deleted.id));
            setUnreadCount((prev) => Math.max(0, prev - 1));
          }
        }
      )
      .subscribe((status) => {
        console.log('[Notifications] Subscription status:', status);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  // Mark a single notification as read
  const markAsRead = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId);

      if (error) throw error;

      setNotifications((prev) =>
        prev.map((n) => (n.id === notificationId ? { ...n, is_read: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  // Mark all notifications as read
  const markAllAsRead = async () => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', user.id)
        .eq('is_read', false);

      if (error) throw error;

      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  // Request browser notification permission
  const requestPermission = async () => {
    if ('Notification' in window && Notification.permission === 'default') {
      await Notification.requestPermission();
    }
  };

  return {
    notifications,
    unreadCount,
    isLoading,
    markAsRead,
    markAllAsRead,
    requestPermission,
    refetch: fetchNotifications,
  };
}
