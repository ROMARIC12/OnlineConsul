import { useState, useEffect, useCallback } from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Users, Clock, RefreshCw, Check, X, Phone } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { useRealtimeSubscription } from '@/hooks/useRealtimeSubscription';
import { useToast } from '@/hooks/use-toast';

interface QueuePatient {
  id: string;
  appointment_time: string;
  status: string;
  is_first_visit?: boolean;
  patient: {
    id: string;
    profile: {
      first_name: string;
      last_name: string;
      phone: string | null;
    };
  };
  doctor: {
    id: string;
    specialty: string;
    profile: {
      first_name: string;
      last_name: string;
    };
  };
}

interface WaitingQueueProps {
  filterByDoctor?: string;
  showActions?: boolean;
  onPatientSelect?: (patient: QueuePatient) => void;
}

export function WaitingQueue({ filterByDoctor, showActions = true, onPatientSelect }: WaitingQueueProps) {
  const { toast } = useToast();
  const [queue, setQueue] = useState<QueuePatient[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchQueue = useCallback(async () => {
    setIsLoading(true);
    const today = format(new Date(), 'yyyy-MM-dd');

    let query = supabase
      .from('appointments')
      .select(`
        id,
        appointment_time,
        status,
        is_first_visit,
        patient:patients(
          id,
          profile:profiles(first_name, last_name, phone)
        ),
        doctor:doctors(
          id,
          specialty,
          profile:profiles(first_name, last_name)
        )
      `)
      .eq('appointment_date', today)
      .in('status', ['confirmed', 'pending'])
      .order('appointment_time');

    if (filterByDoctor) {
      query = query.eq('doctor_id', filterByDoctor);
    }

    const { data } = await query;
    setQueue(data || []);
    setIsLoading(false);
  }, [filterByDoctor]);

  useEffect(() => {
    fetchQueue();
  }, [fetchQueue]);

  // Real-time updates
  useRealtimeSubscription({
    table: 'appointments',
    onChange: fetchQueue,
  });

  const updateStatus = async (appointmentId: string, newStatus: 'confirmed' | 'cancelled' | 'completed' | 'pending' | 'no_show') => {
    try {
      const updateData: Record<string, any> = { status: newStatus };
      
      if (newStatus === 'confirmed') {
        updateData.confirmed_at = new Date().toISOString();
      }
      if (newStatus === 'cancelled') {
        updateData.cancelled_at = new Date().toISOString();
        updateData.cancellation_reason = 'Annulé par le secrétariat';
      }

      const { error } = await supabase
        .from('appointments')
        .update(updateData)
        .eq('id', appointmentId);

      if (error) throw error;

      toast({
        title: 'Statut mis à jour',
        description: `Le rendez-vous a été ${newStatus === 'confirmed' ? 'confirmé' : 'annulé'}.`,
      });
    } catch (error) {
      console.error('Error updating status:', error);
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: 'Impossible de mettre à jour le statut.',
      });
    }
  };

  const getPositionInQueue = (index: number) => index + 1;

  const estimateWaitTime = (index: number) => {
    // Assuming 20 minutes average per consultation
    return index * 20;
  };

  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            <CardTitle>File d'attente</CardTitle>
            <Badge variant="secondary">{queue.length}</Badge>
          </div>
          <Button variant="ghost" size="icon" onClick={fetchQueue}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
        <CardDescription>
          {format(new Date(), 'EEEE d MMMM yyyy', { locale: fr })}
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[500px]">
          {isLoading ? (
            <div className="p-4 text-center text-muted-foreground">
              Chargement...
            </div>
          ) : queue.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground">
              <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>Aucun patient en attente</p>
            </div>
          ) : (
            <div className="divide-y">
              {queue.map((patient, index) => (
                <div
                  key={patient.id}
                  className={`p-4 hover:bg-muted/50 transition-colors ${
                    patient.is_first_visit ? 'border-l-4 border-l-amber-500' : ''
                  }`}
                  onClick={() => onPatientSelect?.(patient)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-3">
                      {/* Queue position */}
                      <div className="flex flex-col items-center">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">
                          {getPositionInQueue(index)}
                        </div>
                      </div>

                      {/* Patient info */}
                      <div>
                        <p className="font-medium">
                          {patient.patient?.profile?.first_name} {patient.patient?.profile?.last_name}
                        </p>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          <span>{patient.appointment_time.slice(0, 5)}</span>
                          {patient.is_first_visit && (
                            <Badge variant="outline" className="text-xs text-amber-600 border-amber-300">
                              1ère visite
                            </Badge>
                          )}
                        </div>
                        {!filterByDoctor && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Dr. {patient.doctor?.profile?.first_name} {patient.doctor?.profile?.last_name}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground">
                          ~{estimateWaitTime(index)} min d'attente
                        </p>
                      </div>
                    </div>

                    {/* Status and Actions */}
                    <div className="flex flex-col items-end gap-2">
                      <Badge variant={patient.status === 'confirmed' ? 'default' : 'secondary'}>
                        {patient.status === 'confirmed' ? 'Confirmé' : 'En attente'}
                      </Badge>

                      {showActions && (
                        <div className="flex gap-1">
                          {patient.patient?.profile?.phone && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              asChild
                            >
                              <a href={`tel:${patient.patient.profile.phone}`}>
                                <Phone className="h-4 w-4" />
                              </a>
                            </Button>
                          )}
                          {patient.status === 'pending' && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-green-600"
                              onClick={(e) => {
                                e.stopPropagation();
                                updateStatus(patient.id, 'confirmed');
                              }}
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive"
                            onClick={(e) => {
                              e.stopPropagation();
                              updateStatus(patient.id, 'cancelled');
                            }}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
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
