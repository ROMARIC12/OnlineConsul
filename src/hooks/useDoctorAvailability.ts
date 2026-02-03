import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useRealtimeSubscription } from './useRealtimeSubscription';

interface AvailabilitySlot {
  id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_active: boolean;
  max_appointments?: number;
}

export function useDoctorAvailability(doctorId: string | null) {
  const [availability, setAvailability] = useState<AvailabilitySlot[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchAvailability = useCallback(async () => {
    if (!doctorId) {
      setAvailability([]);
      setIsLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('doctor_availability')
        .select('*')
        .eq('doctor_id', doctorId)
        .eq('is_active', true)
        .order('day_of_week');

      if (error) throw error;

      setAvailability(data || []);
    } catch (error) {
      console.error('Error fetching doctor availability:', error);
      setAvailability([]);
    } finally {
      setIsLoading(false);
    }
  }, [doctorId]);

  // Initial fetch
  useEffect(() => {
    fetchAvailability();
  }, [fetchAvailability]);

  // Real-time updates for availability changes
  useRealtimeSubscription({
    table: 'doctor_availability',
    filter: doctorId ? 'doctor_id' : undefined,
    filterValue: doctorId || undefined,
    onChange: (payload) => {
      console.log('[useDoctorAvailability] Availability updated:', payload);
      fetchAvailability(); // Refetch to get the latest state
    },
  });

  const isDayAvailable = useCallback((dayOfWeek: number) => {
    return availability.some(slot => slot.day_of_week === dayOfWeek && slot.is_active);
  }, [availability]);

  const getSlotForDay = useCallback((dayOfWeek: number) => {
    return availability.find(slot => slot.day_of_week === dayOfWeek && slot.is_active);
  }, [availability]);

  return {
    availability,
    isLoading,
    isDayAvailable,
    getSlotForDay,
    refetch: fetchAvailability,
  };
}
