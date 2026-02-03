import { useState, useEffect, useCallback } from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { ListPlus, Clock, Bell, User, Phone, Check, X, Calendar } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useRealtimeSubscription } from '@/hooks/useRealtimeSubscription';
import { useToast } from '@/hooks/use-toast';

interface WaitingListEntry {
  id: string;
  preferred_date: string | null;
  preferred_time_start: string | null;
  preferred_time_end: string | null;
  is_notified: boolean;
  created_at: string;
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

interface Doctor {
  id: string;
  specialty: string;
  profile: {
    first_name: string;
    last_name: string;
  };
}

interface Patient {
  id: string;
  profile: {
    first_name: string;
    last_name: string;
    phone: string | null;
  };
}

export function WaitingListPanel() {
  const { toast } = useToast();
  const [entries, setEntries] = useState<WaitingListEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  
  // Form state
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedDoctor, setSelectedDoctor] = useState('');
  const [selectedPatient, setSelectedPatient] = useState('');
  const [preferredDate, setPreferredDate] = useState('');
  const [preferredTimeStart, setPreferredTimeStart] = useState('');
  const [preferredTimeEnd, setPreferredTimeEnd] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  const fetchWaitingList = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('appointment_waiting_list')
        .select(`
          id,
          preferred_date,
          preferred_time_start,
          preferred_time_end,
          is_notified,
          created_at,
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
        .order('created_at', { ascending: false });

      if (error) throw error;
      setEntries(data || []);
    } catch (error) {
      console.error('Error fetching waiting list:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchDoctorsAndPatients = async () => {
    const [doctorsRes, patientsRes] = await Promise.all([
      supabase.from('doctors').select(`
        id,
        specialty,
        profile:profiles(first_name, last_name)
      `).eq('is_verified', true),
      supabase.from('patients').select(`
        id,
        profile:profiles(first_name, last_name, phone)
      `).limit(100),
    ]);

    setDoctors(doctorsRes.data || []);
    setPatients(patientsRes.data || []);
  };

  useEffect(() => {
    fetchWaitingList();
    fetchDoctorsAndPatients();
  }, [fetchWaitingList]);

  // Real-time updates
  useRealtimeSubscription({
    table: 'appointments',
    onChange: (payload) => {
      // When an appointment is cancelled, check waiting list
      if (payload.eventType === 'UPDATE' && payload.new?.status === 'cancelled') {
        checkAndNotifyWaitingPatients(payload.new.doctor_id, payload.new.appointment_date);
      }
    },
  });

  const checkAndNotifyWaitingPatients = async (doctorId: string, date: string) => {
    // Find waiting list entries for this doctor and date
    const matchingEntries = entries.filter(
      e => e.doctor.id === doctorId && 
           (!e.preferred_date || e.preferred_date === date)
    );

    if (matchingEntries.length > 0) {
      toast({
        title: 'Créneau libéré',
        description: `${matchingEntries.length} patient(s) en liste d'attente pour ce médecin.`,
      });
    }
  };

  const addToWaitingList = async () => {
    if (!selectedDoctor || !selectedPatient) {
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: 'Veuillez sélectionner un médecin et un patient.',
      });
      return;
    }

    setIsAdding(true);
    try {
      const { error } = await supabase
        .from('appointment_waiting_list')
        .insert({
          patient_id: selectedPatient,
          doctor_id: selectedDoctor,
          preferred_date: preferredDate || null,
          preferred_time_start: preferredTimeStart || null,
          preferred_time_end: preferredTimeEnd || null,
        });

      if (error) throw error;

      toast({
        title: 'Patient ajouté',
        description: 'Le patient a été ajouté à la liste d\'attente.',
      });

      setAddDialogOpen(false);
      resetForm();
      fetchWaitingList();
    } catch (error) {
      console.error('Error adding to waiting list:', error);
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: 'Impossible d\'ajouter le patient.',
      });
    } finally {
      setIsAdding(false);
    }
  };

  const removeFromWaitingList = async (id: string) => {
    try {
      const { error } = await supabase
        .from('appointment_waiting_list')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Supprimé',
        description: 'Le patient a été retiré de la liste d\'attente.',
      });

      fetchWaitingList();
    } catch (error) {
      console.error('Error removing from waiting list:', error);
    }
  };

  const notifyPatient = async (entry: WaitingListEntry) => {
    try {
      // Create notification for patient
      const { data: patient } = await supabase
        .from('patients')
        .select('profile_id')
        .eq('id', entry.patient.id)
        .single();

      if (patient) {
        await supabase.from('notifications').insert({
          user_id: patient.profile_id,
          type: 'appointment',
          title: 'Créneau disponible !',
          message: `Un créneau s'est libéré chez Dr. ${entry.doctor.profile?.first_name} ${entry.doctor.profile?.last_name}. Réservez vite !`,
          data: { doctor_id: entry.doctor.id, action: 'slot_available' },
        });
      }

      // Mark as notified
      await supabase
        .from('appointment_waiting_list')
        .update({ is_notified: true })
        .eq('id', entry.id);

      toast({
        title: 'Notification envoyée',
        description: 'Le patient a été notifié du créneau disponible.',
      });

      fetchWaitingList();
    } catch (error) {
      console.error('Error notifying patient:', error);
    }
  };

  const resetForm = () => {
    setSelectedDoctor('');
    setSelectedPatient('');
    setPreferredDate('');
    setPreferredTimeStart('');
    setPreferredTimeEnd('');
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ListPlus className="h-5 w-5 text-primary" />
            <CardTitle>Liste d'attente</CardTitle>
            {entries.length > 0 && (
              <Badge variant="secondary">{entries.length}</Badge>
            )}
          </div>
          <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1">
                <ListPlus className="h-4 w-4" />
                Ajouter
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Ajouter à la liste d'attente</DialogTitle>
                <DialogDescription>
                  Inscrivez un patient en attente d'un créneau
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4 mt-4">
                <div>
                  <Label>Patient</Label>
                  <Select value={selectedPatient} onValueChange={setSelectedPatient}>
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner un patient" />
                    </SelectTrigger>
                    <SelectContent>
                      {patients.map((pat) => (
                        <SelectItem key={pat.id} value={pat.id}>
                          {pat.profile?.first_name} {pat.profile?.last_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Médecin souhaité</Label>
                  <Select value={selectedDoctor} onValueChange={setSelectedDoctor}>
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner un médecin" />
                    </SelectTrigger>
                    <SelectContent>
                      {doctors.map((doc) => (
                        <SelectItem key={doc.id} value={doc.id}>
                          Dr. {doc.profile?.first_name} {doc.profile?.last_name} - {doc.specialty}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Date préférée (optionnel)</Label>
                  <Input
                    type="date"
                    value={preferredDate}
                    onChange={(e) => setPreferredDate(e.target.value)}
                    min={format(new Date(), 'yyyy-MM-dd')}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Heure début</Label>
                    <Input
                      type="time"
                      value={preferredTimeStart}
                      onChange={(e) => setPreferredTimeStart(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>Heure fin</Label>
                    <Input
                      type="time"
                      value={preferredTimeEnd}
                      onChange={(e) => setPreferredTimeEnd(e.target.value)}
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <Button variant="outline" onClick={() => setAddDialogOpen(false)}>
                    Annuler
                  </Button>
                  <Button onClick={addToWaitingList} disabled={isAdding}>
                    {isAdding ? 'Ajout...' : 'Ajouter'}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
        <CardDescription>
          Patients en attente d'un créneau disponible
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[350px]">
          {isLoading ? (
            <div className="p-4 text-center text-muted-foreground">
              Chargement...
            </div>
          ) : entries.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground">
              <ListPlus className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>Aucun patient en attente</p>
            </div>
          ) : (
            <div className="divide-y">
              {entries.map((entry) => (
                <div
                  key={entry.id}
                  className={`p-4 hover:bg-muted/50 transition-colors ${
                    entry.is_notified ? 'bg-green-50 dark:bg-green-950/20' : ''
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <p className="font-medium">
                          {entry.patient?.profile?.first_name} {entry.patient?.profile?.last_name}
                        </p>
                        {entry.is_notified && (
                          <Badge variant="outline" className="text-green-600 border-green-300">
                            <Bell className="h-3 w-3 mr-1" />
                            Notifié
                          </Badge>
                        )}
                      </div>
                      
                      <p className="text-sm text-muted-foreground">
                        Pour Dr. {entry.doctor?.profile?.first_name} {entry.doctor?.profile?.last_name}
                        <span className="text-xs ml-1">({entry.doctor?.specialty})</span>
                      </p>

                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        {entry.preferred_date && (
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {format(new Date(entry.preferred_date), 'd MMM', { locale: fr })}
                          </span>
                        )}
                        {entry.preferred_time_start && entry.preferred_time_end && (
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {entry.preferred_time_start.slice(0, 5)} - {entry.preferred_time_end.slice(0, 5)}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex gap-1">
                      {entry.patient?.profile?.phone && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          asChild
                        >
                          <a href={`tel:${entry.patient.profile.phone}`}>
                            <Phone className="h-4 w-4" />
                          </a>
                        </Button>
                      )}
                      {!entry.is_notified && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-primary"
                          onClick={() => notifyPatient(entry)}
                          title="Notifier le patient"
                        >
                          <Bell className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive"
                        onClick={() => removeFromWaitingList(entry.id)}
                        title="Retirer de la liste"
                      >
                        <X className="h-4 w-4" />
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
  );
}
