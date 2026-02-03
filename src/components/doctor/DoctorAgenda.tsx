import { useState, useEffect, useCallback } from 'react';
import { format, startOfWeek, endOfWeek, addDays, isSameDay } from 'date-fns';
import { fr } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Plus, Lock, Unlock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useRealtimeSubscription } from '@/hooks/useRealtimeSubscription';

interface Appointment {
  id: string;
  appointment_time: string;
  appointment_date: string;
  status: string;
  is_first_visit?: boolean;
  patient?: {
    profile?: {
      first_name: string;
      last_name: string;
    };
  };
}

interface DoctorAgendaProps {
  doctorId: string;
  onAppointmentClick?: (appointment: Appointment) => void;
  onBlockSlot?: (date: string, time: string) => void;
}

export function DoctorAgenda({ doctorId, onAppointmentClick, onBlockSlot }: DoctorAgendaProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<'day' | 'week'>('day');
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchAppointments = useCallback(async () => {
    setIsLoading(true);
    let startDate: string;
    let endDate: string;

    if (view === 'day') {
      startDate = format(currentDate, 'yyyy-MM-dd');
      endDate = startDate;
    } else {
      const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
      const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });
      startDate = format(weekStart, 'yyyy-MM-dd');
      endDate = format(weekEnd, 'yyyy-MM-dd');
    }

    const { data } = await supabase
      .from('appointments')
      .select(`
        id,
        appointment_time,
        appointment_date,
        status,
        is_first_visit,
        patient:patients(
          profile:profiles(first_name, last_name)
        )
      `)
      .eq('doctor_id', doctorId)
      .gte('appointment_date', startDate)
      .lte('appointment_date', endDate)
      .order('appointment_date')
      .order('appointment_time');

    setAppointments(data || []);
    setIsLoading(false);
  }, [doctorId, currentDate, view]);

  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  // Real-time updates
  useRealtimeSubscription({
    table: 'appointments',
    filter: 'doctor_id',
    filterValue: doctorId,
    onChange: fetchAppointments,
  });

  const navigatePrev = () => {
    setCurrentDate(prev => addDays(prev, view === 'day' ? -1 : -7));
  };

  const navigateNext = () => {
    setCurrentDate(prev => addDays(prev, view === 'day' ? 1 : 7));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'bg-primary';
      case 'completed':
        return 'bg-green-500';
      case 'pending':
        return 'bg-amber-500';
      case 'cancelled':
        return 'bg-destructive';
      case 'no_show':
        return 'bg-gray-500';
      default:
        return 'bg-muted';
    }
  };

  // Generate time slots from 8:00 to 18:00
  const timeSlots = Array.from({ length: 20 }, (_, i) => {
    const hour = Math.floor(i / 2) + 8;
    const minute = (i % 2) * 30;
    return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
  });

  const getAppointmentsForSlot = (date: Date, time: string) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return appointments.filter(
      a => a.appointment_date === dateStr && a.appointment_time.startsWith(time)
    );
  };

  const renderDayView = () => (
    <div className="space-y-1">
      {timeSlots.map((time) => {
        const slotAppointments = getAppointmentsForSlot(currentDate, time);
        return (
          <div key={time} className="flex items-stretch min-h-[60px] border-b last:border-b-0">
            <div className="w-16 flex-shrink-0 text-sm text-muted-foreground py-2 pr-2 text-right">
              {time}
            </div>
            <div className="flex-1 py-1 pl-2">
              {slotAppointments.length > 0 ? (
                slotAppointments.map((apt) => (
                  <div
                    key={apt.id}
                    className={`p-2 rounded-lg mb-1 cursor-pointer hover:opacity-80 transition-opacity ${getStatusColor(apt.status)} text-white`}
                    onClick={() => onAppointmentClick?.(apt)}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm">
                        {apt.patient?.profile?.first_name} {apt.patient?.profile?.last_name}
                      </span>
                      {apt.is_first_visit && (
                        <Badge variant="secondary" className="text-xs bg-white/20">
                          1ère visite
                        </Badge>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div
                  className="h-full min-h-[40px] border border-dashed rounded-lg flex items-center justify-center text-muted-foreground text-xs cursor-pointer hover:bg-muted/50"
                  onClick={() => onBlockSlot?.(format(currentDate, 'yyyy-MM-dd'), time)}
                >
                  Disponible
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );

  const renderWeekView = () => {
    const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
    const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

    return (
      <div className="overflow-x-auto">
        <div className="min-w-[800px]">
          {/* Header with days */}
          <div className="flex border-b">
            <div className="w-16 flex-shrink-0" />
            {days.map((day) => (
              <div
                key={day.toISOString()}
                className={`flex-1 p-2 text-center text-sm font-medium ${
                  isSameDay(day, new Date()) ? 'bg-primary/10 text-primary' : ''
                }`}
              >
                <div>{format(day, 'EEE', { locale: fr })}</div>
                <div className="text-lg">{format(day, 'd')}</div>
              </div>
            ))}
          </div>

          {/* Time slots */}
          {timeSlots.filter((_, i) => i % 2 === 0).map((time) => (
            <div key={time} className="flex border-b min-h-[50px]">
              <div className="w-16 flex-shrink-0 text-xs text-muted-foreground py-1 pr-2 text-right">
                {time}
              </div>
              {days.map((day) => {
                const slotAppointments = getAppointmentsForSlot(day, time);
                return (
                  <div key={day.toISOString()} className="flex-1 border-l p-0.5">
                    {slotAppointments.map((apt) => (
                      <div
                        key={apt.id}
                        className={`text-xs p-1 rounded truncate cursor-pointer ${getStatusColor(apt.status)} text-white`}
                        onClick={() => onAppointmentClick?.(apt)}
                        title={`${apt.patient?.profile?.first_name} ${apt.patient?.profile?.last_name}`}
                      >
                        {apt.patient?.profile?.last_name}
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5" />
            Mon Agenda
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={goToToday}>
              Aujourd'hui
            </Button>
            <div className="flex border rounded-md">
              <Button
                variant={view === 'day' ? 'default' : 'ghost'}
                size="sm"
                className="rounded-r-none"
                onClick={() => setView('day')}
              >
                Jour
              </Button>
              <Button
                variant={view === 'week' ? 'default' : 'ghost'}
                size="sm"
                className="rounded-l-none"
                onClick={() => setView('week')}
              >
                Semaine
              </Button>
            </div>
          </div>
        </div>
        
        {/* Navigation */}
        <div className="flex items-center justify-between mt-2">
          <Button variant="ghost" size="icon" onClick={navigatePrev}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="font-medium">
            {view === 'day'
              ? format(currentDate, 'EEEE d MMMM yyyy', { locale: fr })
              : `${format(startOfWeek(currentDate, { weekStartsOn: 1 }), 'd MMM', { locale: fr })} - ${format(endOfWeek(currentDate, { weekStartsOn: 1 }), 'd MMM yyyy', { locale: fr })}`
            }
          </span>
          <Button variant="ghost" size="icon" onClick={navigateNext}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-2 max-h-[600px] overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center py-8 text-muted-foreground">
            Chargement...
          </div>
        ) : view === 'day' ? (
          renderDayView()
        ) : (
          renderWeekView()
        )}
      </CardContent>
    </Card>
  );
}
