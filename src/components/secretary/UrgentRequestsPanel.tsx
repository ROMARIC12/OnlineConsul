import { useState, useEffect, useCallback } from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { AlertTriangle, Phone, Clock, Check, X, User, UserPlus, Stethoscope } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useRealtimeSubscription } from '@/hooks/useRealtimeSubscription';
import { useToast } from '@/hooks/use-toast';

interface UrgentRequest {
  id: string;
  status: string;
  notes: string | null;
  created_at: string;
  patient: {
    id: string;
    profile: {
      first_name: string;
      last_name: string;
      phone: string | null;
    };
  };
  doctor?: {
    id: string;
    profile: {
      first_name: string;
      last_name: string;
    };
  } | null;
}

interface AvailableDoctor {
  id: string;
  specialty: string;
  profile: {
    first_name: string;
    last_name: string;
  };
  appointmentsToday: number;
}

export function UrgentRequestsPanel() {
  const { toast } = useToast();
  const [requests, setRequests] = useState<UrgentRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Assignment dialog state
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<UrgentRequest | null>(null);
  const [availableDoctors, setAvailableDoctors] = useState<AvailableDoctor[]>([]);
  const [selectedDoctor, setSelectedDoctor] = useState('');
  const [isAssigning, setIsAssigning] = useState(false);

  const fetchRequests = useCallback(async () => {
    setIsLoading(true);
    const { data } = await supabase
      .from('urgent_requests')
      .select(`
        id,
        status,
        notes,
        created_at,
        patient:patients(
          id,
          profile:profiles(first_name, last_name, phone)
        ),
        doctor:doctors(
          id,
          profile:profiles(first_name, last_name)
        )
      `)
      .in('status', ['pending', 'called'])
      .order('created_at', { ascending: false });

    setRequests(data || []);
    setIsLoading(false);
  }, []);

  const fetchAvailableDoctors = async () => {
    const today = format(new Date(), 'yyyy-MM-dd');
    const currentDayOfWeek = new Date().getDay();
    
    // Get doctors who work today
    const { data: doctorsWithAvailability } = await supabase
      .from('doctor_availability')
      .select(`
        doctor_id,
        doctor:doctors(
          id,
          specialty,
          is_verified,
          profile:profiles(first_name, last_name)
        )
      `)
      .eq('day_of_week', currentDayOfWeek)
      .eq('is_active', true);

    if (!doctorsWithAvailability) {
      setAvailableDoctors([]);
      return;
    }

    // Get appointment counts for each doctor today
    const doctorIds = doctorsWithAvailability.map(d => d.doctor_id);
    const { data: appointments } = await supabase
      .from('appointments')
      .select('doctor_id')
      .in('doctor_id', doctorIds)
      .eq('appointment_date', today)
      .in('status', ['confirmed', 'pending']);

    // Count appointments per doctor
    const appointmentCounts: Record<string, number> = {};
    appointments?.forEach(apt => {
      appointmentCounts[apt.doctor_id] = (appointmentCounts[apt.doctor_id] || 0) + 1;
    });

    // Build available doctors list
    const available: AvailableDoctor[] = doctorsWithAvailability
      .filter(d => d.doctor?.is_verified)
      .map(d => ({
        id: d.doctor!.id,
        specialty: d.doctor!.specialty,
        profile: {
          first_name: d.doctor!.profile?.first_name || '',
          last_name: d.doctor!.profile?.last_name || '',
        },
        appointmentsToday: appointmentCounts[d.doctor!.id] || 0,
      }))
      .sort((a, b) => a.appointmentsToday - b.appointmentsToday); // Less busy doctors first

    setAvailableDoctors(available);
  };

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  // Real-time updates
  useRealtimeSubscription({
    table: 'urgent_requests',
    onChange: fetchRequests,
  });

  const updateStatus = async (requestId: string, newStatus: 'pending' | 'called' | 'resolved') => {
    try {
      const updateData: Record<string, any> = { status: newStatus };
      
      if (newStatus === 'called') {
        const { data: userData } = await supabase.auth.getUser();
        updateData.called_by = userData.user?.id;
      }
      if (newStatus === 'resolved') {
        updateData.resolved_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('urgent_requests')
        .update(updateData)
        .eq('id', requestId);

      if (error) throw error;

      toast({
        title: 'Demande mise à jour',
        description: newStatus === 'called' ? 'Patient contacté.' : 'Demande résolue.',
      });

      fetchRequests();
    } catch (error) {
      console.error('Error updating urgent request:', error);
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: 'Impossible de mettre à jour la demande.',
      });
    }
  };

  const openAssignDialog = (request: UrgentRequest) => {
    setSelectedRequest(request);
    setSelectedDoctor('');
    fetchAvailableDoctors();
    setAssignDialogOpen(true);
  };

  const assignToDoctor = async () => {
    if (!selectedRequest || !selectedDoctor) return;

    setIsAssigning(true);
    try {
      // Update the urgent request with the assigned doctor
      const { error: updateError } = await supabase
        .from('urgent_requests')
        .update({ 
          doctor_id: selectedDoctor,
          status: 'called',
        })
        .eq('id', selectedRequest.id);

      if (updateError) throw updateError;

      // Notify the doctor
      const { data: doctor } = await supabase
        .from('doctors')
        .select('profile_id')
        .eq('id', selectedDoctor)
        .single();

      if (doctor) {
        await supabase.from('notifications').insert({
          user_id: doctor.profile_id,
          type: 'urgent',
          title: '🚨 Urgence assignée',
          message: `Une demande urgente de ${selectedRequest.patient?.profile?.first_name} ${selectedRequest.patient?.profile?.last_name} vous a été assignée.`,
          data: { 
            urgent_request_id: selectedRequest.id, 
            patient_id: selectedRequest.patient.id,
            action: 'urgent_assigned',
          },
        });
      }

      toast({
        title: 'Médecin assigné',
        description: 'Le médecin a été notifié de l\'urgence.',
      });

      setAssignDialogOpen(false);
      fetchRequests();
    } catch (error) {
      console.error('Error assigning doctor:', error);
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: 'Impossible d\'assigner le médecin.',
      });
    } finally {
      setIsAssigning(false);
    }
  };

  const getTimeSince = (dateStr: string) => {
    const minutes = Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000);
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h`;
    return `${Math.floor(hours / 24)}j`;
  };

  return (
    <>
      <Card className="border-destructive/20">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            <CardTitle className="text-destructive">Demandes urgentes</CardTitle>
            {requests.length > 0 && (
              <Badge variant="destructive">{requests.length}</Badge>
            )}
          </div>
          <CardDescription>À traiter en priorité</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[300px]">
            {isLoading ? (
              <div className="p-4 text-center text-muted-foreground">
                Chargement...
              </div>
            ) : requests.length === 0 ? (
              <div className="p-4 text-center text-green-600">
                <Check className="h-8 w-8 mx-auto mb-2" />
                <p>Aucune demande urgente</p>
              </div>
            ) : (
              <div className="divide-y">
                {requests.map((request) => (
                  <div
                    key={request.id}
                    className={`p-4 ${
                      request.status === 'pending' 
                        ? 'bg-destructive/5 border-l-4 border-l-destructive' 
                        : 'bg-amber-50 dark:bg-amber-950/20 border-l-4 border-l-amber-500'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <p className="font-medium">
                            {request.patient?.profile?.first_name} {request.patient?.profile?.last_name}
                          </p>
                        </div>
                        
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          <span>il y a {getTimeSince(request.created_at)}</span>
                          <Badge variant={request.status === 'pending' ? 'destructive' : 'secondary'}>
                            {request.status === 'pending' ? 'En attente' : 'Contacté'}
                          </Badge>
                        </div>

                        {request.notes && (
                          <p className="text-sm mt-2 p-2 bg-white dark:bg-gray-800 rounded border">
                            {request.notes}
                          </p>
                        )}

                        {request.doctor && (
                          <p className="text-xs text-primary mt-1 flex items-center gap-1">
                            <Stethoscope className="h-3 w-3" />
                            Assigné à Dr. {request.doctor.profile?.first_name} {request.doctor.profile?.last_name}
                          </p>
                        )}
                      </div>

                      <div className="flex flex-col gap-2">
                        {request.patient?.profile?.phone && (
                          <Button
                            variant="outline"
                            size="sm"
                            asChild
                          >
                            <a href={`tel:${request.patient.profile.phone}`}>
                              <Phone className="h-4 w-4 mr-1" />
                              Appeler
                            </a>
                          </Button>
                        )}
                        
                        {!request.doctor && (
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => openAssignDialog(request)}
                            className="gap-1"
                          >
                            <UserPlus className="h-4 w-4" />
                            Assigner
                          </Button>
                        )}
                        
                        {request.status === 'pending' && (
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => updateStatus(request.id, 'called')}
                          >
                            <Check className="h-4 w-4 mr-1" />
                            Contacté
                          </Button>
                        )}
                        
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-green-600"
                          onClick={() => updateStatus(request.id, 'resolved')}
                        >
                          <Check className="h-4 w-4 mr-1" />
                          Résolu
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Assign Doctor Dialog */}
      <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5" />
              Assigner à un médecin
            </DialogTitle>
            <DialogDescription>
              Sélectionnez un médecin disponible pour prendre en charge cette urgence
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            {selectedRequest && (
              <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                <p className="font-medium">
                  Patient : {selectedRequest.patient?.profile?.first_name} {selectedRequest.patient?.profile?.last_name}
                </p>
                {selectedRequest.notes && (
                  <p className="text-sm text-muted-foreground mt-1">
                    {selectedRequest.notes}
                  </p>
                )}
              </div>
            )}

            <div>
              <Label>Médecins disponibles aujourd'hui</Label>
              {availableDoctors.length === 0 ? (
                <p className="text-muted-foreground text-sm mt-2">
                  Aucun médecin disponible actuellement
                </p>
              ) : (
                <Select value={selectedDoctor} onValueChange={setSelectedDoctor}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Sélectionner un médecin" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableDoctors.map((doc) => (
                      <SelectItem key={doc.id} value={doc.id}>
                        <div className="flex items-center justify-between w-full">
                          <span>
                            Dr. {doc.profile.first_name} {doc.profile.last_name}
                          </span>
                          <span className="text-xs text-muted-foreground ml-2">
                            {doc.specialty} • {doc.appointmentsToday} RDV
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              <p className="text-xs text-muted-foreground mt-1">
                Les médecins sont triés par charge de travail (moins occupés en premier)
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setAssignDialogOpen(false)}>
                Annuler
              </Button>
              <Button 
                onClick={assignToDoctor} 
                disabled={!selectedDoctor || isAssigning}
              >
                {isAssigning ? 'Attribution...' : 'Assigner'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
