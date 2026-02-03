import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';

type TableName = 'appointments' | 'patients' | 'doctors' | 'payments' | 'health_reminders' | 'urgent_requests' | 'profiles' | 'consultation_forms' | 'notifications' | 'doctor_availability' | 'teleconsultation_sessions';

interface UseRealtimeSubscriptionOptions {
  table: TableName;
  filter?: string;
  filterValue?: string;
  onInsert?: (payload: any) => void;
  onUpdate?: (payload: any) => void;
  onDelete?: (payload: any) => void;
  onChange?: (payload: any) => void;
}

export function useRealtimeSubscription({
  table,
  filter,
  filterValue,
  onInsert,
  onUpdate,
  onDelete,
  onChange,
}: UseRealtimeSubscriptionOptions) {
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    const channelName = `${table}-${filter || 'all'}-${filterValue || 'all'}-${Date.now()}`;

    let channel = supabase.channel(channelName);

    const subscriptionConfig: any = {
      event: '*',
      schema: 'public',
      table,
    };

    if (filter && filterValue) {
      subscriptionConfig.filter = `${filter}=eq.${filterValue}`;
    }

    channel = channel.on(
      'postgres_changes',
      subscriptionConfig,
      (payload: RealtimePostgresChangesPayload<any>) => {
        console.log(`[Realtime ${table}]`, payload.eventType, payload);

        onChange?.(payload);

        switch (payload.eventType) {
          case 'INSERT':
            onInsert?.(payload.new);
            break;
          case 'UPDATE':
            onUpdate?.(payload.new);
            break;
          case 'DELETE':
            onDelete?.(payload.old);
            break;
        }
      }
    );

    channel.subscribe((status) => {
      console.log(`[Realtime ${table}] Subscription status:`, status);
    });

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [table, filter, filterValue, onInsert, onUpdate, onDelete, onChange]);

  return channelRef.current;
}

// Hook for multiple table subscriptions
export function useMultipleRealtimeSubscriptions(
  subscriptions: UseRealtimeSubscriptionOptions[]
) {
  useEffect(() => {
    const channels: RealtimeChannel[] = [];

    subscriptions.forEach((sub, index) => {
      const channelName = `${sub.table}-multi-${index}-${Date.now()}`;

      let channel = supabase.channel(channelName);

      const subscriptionConfig: any = {
        event: '*',
        schema: 'public',
        table: sub.table,
      };

      if (sub.filter && sub.filterValue) {
        subscriptionConfig.filter = `${sub.filter}=eq.${sub.filterValue}`;
      }

      channel = channel.on(
        'postgres_changes',
        subscriptionConfig,
        (payload: RealtimePostgresChangesPayload<any>) => {
          sub.onChange?.(payload);

          switch (payload.eventType) {
            case 'INSERT':
              sub.onInsert?.(payload.new);
              break;
            case 'UPDATE':
              sub.onUpdate?.(payload.new);
              break;
            case 'DELETE':
              sub.onDelete?.(payload.old);
              break;
          }
        }
      );

      channel.subscribe();
      channels.push(channel);
    });

    return () => {
      channels.forEach(channel => {
        supabase.removeChannel(channel);
      });
    };
  }, [subscriptions]);
}
