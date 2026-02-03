import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Clock, Users, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { supabase } from '@/integrations/supabase/client';
import { useRealtimeSubscription } from '@/hooks/useRealtimeSubscription';

interface Appointment {
  id: string;
  appointment_date: string;
  appointment_time: string;
  status: string;
  doctor: {
    id: string;
    specialty: string;
    profile?: {
      first_name: string;
      last_name: string;
    } | null;
  };
}

interface WaitingQueueCardProps {
  appointment: Appointment;
  onPositionChange?: (newPosition: number) => void;
}

const AVG_CONSULTATION_TIME = 20; // minutes

export function WaitingQueueCard({ appointment, onPositionChange }: WaitingQueueCardProps) {
  const [position, setPosition] = useState<number>(0);
  const [totalInQueue, setTotalInQueue] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  const calculatePosition = async () => {
    setIsLoading(true);
    try {
      // Fetch all appointments for this doctor on this date
      const { data: appointments, error } = await supabase
        .from('appointments')
        .select('id, appointment_time, status')
        .eq('doctor_id', appointment.doctor.id)
        .eq('appointment_date', appointment.appointment_date)
        .in('status', ['confirmed', 'pending'])
        .order('appointment_time');

      if (error) throw error;

      const validAppointments = appointments || [];
      
      // Calculate position
      const myPosition = validAppointments.filter(
        apt => apt.appointment_time <= appointment.appointment_time
      ).length;

      setPosition(myPosition);
      setTotalInQueue(validAppointments.length);
      setLastUpdate(new Date());
      onPositionChange?.(myPosition);
    } catch (error) {
      console.error('Error calculating queue position:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Initial fetch
  useEffect(() => {
    calculatePosition();
  }, [appointment.id]);

  // Real-time subscription
  useRealtimeSubscription({
    table: 'appointments',
    filter: 'doctor_id',
    filterValue: appointment.doctor.id,
    onChange: () => {
      console.log('[WaitingQueue] Position recalculated due to change');
      calculatePosition();
    },
  });

  const estimatedWaitTime = Math.max(0, (position - 1) * AVG_CONSULTATION_TIME);
  const progressPercent = totalInQueue > 0 ? ((totalInQueue - position + 1) / totalInQueue) * 100 : 0;
  const isToday = appointment.appointment_date === format(new Date(), 'yyyy-MM-dd');
  const doctorName = appointment.doctor.profile
    ? `Dr. ${appointment.doctor.profile.first_name} ${appointment.doctor.profile.last_name}`
    : 'Médecin';

  return (
    <Card className={`border-2 ${isToday ? 'border-primary' : 'border-border'}`}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            File d'attente
            {isToday && <Badge className="ml-2">Aujourd'hui</Badge>}
          </CardTitle>
          <Button
            variant="ghost"
            size="icon"
            onClick={calculatePosition}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Position Display */}
        <div className="text-center py-4 bg-primary/5 rounded-lg">
          <div className="text-5xl font-bold text-primary">
            {isLoading ? '...' : `#${position}`}
          </div>
          <p className="text-muted-foreground mt-1">
            sur {totalInQueue} patient{totalInQueue > 1 ? 's' : ''}
          </p>
        </div>

        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Progression</span>
            <span className="font-medium">{Math.round(progressPercent)}%</span>
          </div>
          <Progress value={progressPercent} className="h-2" />
        </div>

        {/* Estimated Wait Time */}
        <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-muted-foreground" />
            <span className="text-sm">Temps d'attente estimé</span>
          </div>
          <span className="font-bold text-lg">
            ~{estimatedWaitTime} min
          </span>
        </div>

        {/* Details Collapsible */}
        <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" className="w-full" size="sm">
              {isExpanded ? (
                <>
                  <ChevronUp className="h-4 w-4 mr-2" />
                  Masquer les détails
                </>
              ) : (
                <>
                  <ChevronDown className="h-4 w-4 mr-2" />
                  Voir les détails
                </>
              )}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-2 space-y-2">
            <div className="text-sm space-y-1 p-3 bg-muted/50 rounded-lg">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Date :</span>
                <span className="font-medium">
                  {format(new Date(appointment.appointment_date), 'EEEE d MMMM', { locale: fr })}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Heure prévue :</span>
                <span className="font-medium">{appointment.appointment_time.slice(0, 5)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Médecin :</span>
                <span className="font-medium">
                  {doctorName}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Dernière MàJ :</span>
                <span className="text-xs">
                  {format(lastUpdate, 'HH:mm:ss', { locale: fr })}
                </span>
              </div>
            </div>
            <p className="text-xs text-muted-foreground text-center">
              La position se met à jour automatiquement en temps réel
            </p>
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  );
}
