import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useRealtimeSubscription } from './useRealtimeSubscription';

interface QueueInfo {
  position: number;
  estimatedWaitTime: number; // in minutes
  totalInQueue: number;
  isLoading: boolean;
}

interface UseQueuePositionOptions {
  appointmentId: string;
  doctorId: string;
  appointmentDate: string;
  appointmentTime: string;
}

// Average consultation time per type (in minutes)
const AVG_CONSULTATION_TIME = 20;

export function useQueuePosition({
  appointmentId,
  doctorId,
  appointmentDate,
  appointmentTime,
}: UseQueuePositionOptions): QueueInfo {
  const [queueInfo, setQueueInfo] = useState<QueueInfo>({
    position: 0,
    estimatedWaitTime: 0,
    totalInQueue: 0,
    isLoading: true,
  });

  const calculatePosition = useCallback(async () => {
    try {
      // Get all appointments for this doctor on this date that are before this appointment
      const { data: appointments, error } = await supabase
        .from('appointments')
        .select('id, appointment_time, status')
        .eq('doctor_id', doctorId)
        .eq('appointment_date', appointmentDate)
        .in('status', ['confirmed', 'pending'])
        .order('appointment_time');

      if (error) throw error;

      const allAppointments = appointments || [];
      
      // Find position (count appointments before this one)
      const position = allAppointments.filter(
        apt => apt.appointment_time < appointmentTime && apt.status !== 'cancelled'
      ).length + 1;

      // Calculate estimated wait time based on position
      const estimatedWaitTime = Math.max(0, (position - 1) * AVG_CONSULTATION_TIME);

      setQueueInfo({
        position,
        estimatedWaitTime,
        totalInQueue: allAppointments.length,
        isLoading: false,
      });
    } catch (error) {
      console.error('Error calculating queue position:', error);
      setQueueInfo(prev => ({ ...prev, isLoading: false }));
    }
  }, [doctorId, appointmentDate, appointmentTime]);

  // Initial calculation
  useEffect(() => {
    calculatePosition();
  }, [calculatePosition]);

  // Real-time updates when appointments change
  useRealtimeSubscription({
    table: 'appointments',
    filter: 'doctor_id',
    filterValue: doctorId,
    onChange: () => {
      console.log('[Queue] Recalculating position after update');
      calculatePosition();
    },
  });

  return queueInfo;
}

// Hook to get queue position from the database function
export function useQueuePositionFromDB(appointmentId: string | null) {
  const [position, setPosition] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchPosition = async () => {
      if (!appointmentId) {
        setIsLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .rpc('get_queue_position', { p_appointment_id: appointmentId });

        if (error) throw error;
        setPosition(data);
      } catch (error) {
        console.error('Error fetching queue position:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPosition();
  }, [appointmentId]);

  return { position, isLoading };
}
