import { useEffect, useState, useCallback } from 'react';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { StatsCard } from '@/components/dashboard/StatsCard';
import { WaitingQueue } from '@/components/secretary/WaitingQueue';
import { UrgentRequestsPanel } from '@/components/secretary/UrgentRequestsPanel';
import { InsuranceVerificationPanel } from '@/components/secretary/InsuranceVerificationPanel';
import { RescheduleDialog } from '@/components/secretary/RescheduleDialog';
import { WaitingListPanel } from '@/components/secretary/WaitingListPanel';
import { supabase } from '@/integrations/supabase/client';
import { useRealtimeSubscription } from '@/hooks/useRealtimeSubscription';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { Calendar, Users, AlertCircle, Clock, CheckCircle, Phone, Plus, X, Check, RefreshCcw, UserX, ListPlus } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface SecretaryStats {
  todayAppointments: number;
  waitingQueue: number;
  urgentRequests: number;
  unconfirmedAppointments: number;
  completedToday: number;
}

interface AppointmentWithDetails {
  id: string;
  appointment_time: string;
  appointment_date: string;
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

export default function SecretaryDashboard() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [clinicId, setClinicId] = useState<string | null>(null);
  const [stats, setStats] = useState<SecretaryStats>({
    todayAppointments: 0,
    waitingQueue: 0,
    urgentRequests: 0,
    unconfirmedAppointments: 0,
    completedToday: 0,
  });
  const [todayAppointments, setTodayAppointments] = useState<AppointmentWithDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Create appointment dialog
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedDoctor, setSelectedDoctor] = useState('');
  const [selectedPatient, setSelectedPatient] = useState('');
  const [appointmentDate, setAppointmentDate] = useState('');
  const [appointmentTime, setAppointmentTime] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  
  // Reschedule dialog state
  const [rescheduleDialogOpen, setRescheduleDialogOpen] = useState(false);
  const [rescheduleData, setRescheduleData] = useState<{
    appointmentId: string;
    currentDate: string;
    currentTime: string;
    doctorId: string;
    patientName: string;
  } | null>(null);

  // Fetch secretary's clinic
  useEffect(() => {
    const fetchClinicId = async () => {
      if (!user) return;
      
      const { data } = await supabase
        .from('clinic_secretaries')
        .select('clinic_id')
        .eq('secretary_id', user.id)
        .eq('is_active', true)
        .single();
      
      if (data) {
        setClinicId(data.clinic_id);
      }
    };
    
    fetchClinicId();
  }, [user]);

  const fetchSecretaryData = useCallback(async () => {
    try {
      const today = format(new Date(), 'yyyy-MM-dd');

      // Build query for appointments
      let appointmentsQuery = supabase
        .from('appointments')
        .select(`
          id,
          appointment_time,
          appointment_date,
          status,
          is_first_visit,
          clinic_id,
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
        .gte('appointment_date', today)
        .neq('status', 'cancelled')
        .order('appointment_date')
        .order('appointment_time')
        .limit(200);

      // Filter by clinic if secretary has one assigned
      if (clinicId) {
        appointmentsQuery = appointmentsQuery.eq('clinic_id', clinicId);
      }

      const { data: appointments } = await appointmentsQuery;

      // Fetch urgent requests (filtered by clinic)
      let urgentQuery = supabase
        .from('urgent_requests')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'pending');
      
      if (clinicId) {
        urgentQuery = urgentQuery.eq('clinic_id', clinicId);
      }
      
      const { count: urgentCount } = await urgentQuery;

      // Count unconfirmed (filtered by clinic)
      let unconfirmedQuery = supabase
        .from('appointments')
        .select('id', { count: 'exact', head: true })
        .gte('appointment_date', today)
        .eq('status', 'pending');
      
      if (clinicId) {
        unconfirmedQuery = unconfirmedQuery.eq('clinic_id', clinicId);
      }
      
      const { count: unconfirmed } = await unconfirmedQuery;

      const waitingCount = appointments?.filter(a => a.status === 'confirmed').length || 0;
      const completedCount = appointments?.filter(a => a.status === 'completed').length || 0;

      setTodayAppointments(appointments || []);
      setStats({
        todayAppointments: appointments?.length || 0,
        waitingQueue: waitingCount,
        urgentRequests: urgentCount || 0,
        unconfirmedAppointments: unconfirmed || 0,
        completedToday: completedCount,
      });
    } catch (error) {
      console.error('Error fetching secretary data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [clinicId]);

  // Fetch doctors and patients for create dialog
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
    fetchSecretaryData();
    fetchDoctorsAndPatients();
  }, [fetchSecretaryData]);

  // Real-time subscriptions
  useRealtimeSubscription({
    table: 'appointments',
    onChange: (payload) => {
      console.log('[Secretary] Appointment update:', payload);
      fetchSecretaryData();
      
      if (payload.eventType === 'INSERT') {
        toast({
          title: 'Nouveau RDV',
          description: 'Un nouveau rendez-vous a été créé.',
        });
      }
    },
  });

  useRealtimeSubscription({
    table: 'urgent_requests',
    filter: clinicId ? 'clinic_id' : undefined,
    filterValue: clinicId || undefined,
    onChange: (payload) => {
      console.log('[Secretary] Urgent request update:', payload);
      fetchSecretaryData();
      
      if (payload.eventType === 'INSERT') {
        toast({
          variant: 'destructive',
          title: '🚨 Nouvelle urgence',
          description: 'Une demande urgente a été soumise.',
        });
      }
    },
  });

  // Listen for notifications
  useRealtimeSubscription({
    table: 'notifications',
    filter: user ? 'user_id' : undefined,
    filterValue: user?.id,
    onInsert: (payload) => {
      console.log('[Secretary] New notification:', payload);
      if (payload.type === 'new_appointment') {
        toast({
          title: payload.title || 'Nouveau RDV',
          description: payload.message || 'Une nouvelle demande de rendez-vous.',
        });
        // Refresh data
        fetchSecretaryData();
      }
    },
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'confirmed':
        return <Badge variant="default">Confirmé</Badge>;
      case 'completed':
        return <Badge className="bg-green-500">Terminé</Badge>;
      case 'pending':
        return <Badge variant="secondary">En attente</Badge>;
      case 'cancelled':
        return <Badge variant="destructive">Annulé</Badge>;
      case 'no_show':
        return <Badge variant="outline">Absent</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const updateAppointmentStatus = async (appointmentId: string, newStatus: 'confirmed' | 'cancelled' | 'completed' | 'pending' | 'no_show') => {
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
        description: `Le rendez-vous a été ${newStatus === 'confirmed' ? 'confirmé' : newStatus === 'cancelled' ? 'annulé' : 'mis à jour'}.`,
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

  const createAppointment = async () => {
    if (!selectedDoctor || !selectedPatient || !appointmentDate || !appointmentTime) {
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: 'Veuillez remplir tous les champs.',
      });
      return;
    }

    setIsCreating(true);
    try {
      const { error } = await supabase
        .from('appointments')
        .insert({
          doctor_id: selectedDoctor,
          patient_id: selectedPatient,
          appointment_date: appointmentDate,
          appointment_time: appointmentTime + ':00',
          status: 'pending',
        });

      if (error) throw error;

      toast({
        title: 'RDV créé',
        description: 'Le rendez-vous a été créé avec succès.',
      });

      setCreateDialogOpen(false);
      setSelectedDoctor('');
      setSelectedPatient('');
      setAppointmentDate('');
      setAppointmentTime('');
    } catch (error: any) {
      console.error('Error creating appointment:', error);
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: error.message || 'Impossible de créer le rendez-vous.',
      });
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <>
      <DashboardHeader title="Accueil Secrétariat" />
      <div className="flex-1 overflow-auto p-4 md:p-6">
        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          <StatsCard
            title="RDV du jour"
            value={isLoading ? '...' : stats.todayAppointments}
            description="Total prévu"
            icon={Calendar}
          />
          <StatsCard
            title="File d'attente"
            value={isLoading ? '...' : stats.waitingQueue}
            description="Patients confirmés"
            icon={Users}
          />
          <StatsCard
            title="À confirmer"
            value={isLoading ? '...' : stats.unconfirmedAppointments}
            description="En attente"
            icon={Clock}
          />
          <StatsCard
            title="Urgences"
            value={isLoading ? '...' : stats.urgentRequests}
            description="À traiter"
            icon={AlertCircle}
          />
          <StatsCard
            title="Terminés"
            value={isLoading ? '...' : stats.completedToday}
            description="Aujourd'hui"
            icon={CheckCircle}
          />
        </div>

        {/* Quick Actions */}
        <div className="mt-6 flex flex-wrap gap-3">
          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button size="lg" className="gap-2">
                <Plus className="h-5 w-5" />
                Créer un RDV
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Créer un rendez-vous</DialogTitle>
                <DialogDescription>
                  Planifiez un nouveau rendez-vous pour un patient
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4 mt-4">
                <div>
                  <Label>Médecin</Label>
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

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Date</Label>
                    <Input
                      type="date"
                      value={appointmentDate}
                      onChange={(e) => setAppointmentDate(e.target.value)}
                      min={format(new Date(), 'yyyy-MM-dd')}
                    />
                  </div>
                  <div>
                    <Label>Heure</Label>
                    <Input
                      type="time"
                      value={appointmentTime}
                      onChange={(e) => setAppointmentTime(e.target.value)}
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                    Annuler
                  </Button>
                  <Button onClick={createAppointment} disabled={isCreating}>
                    {isCreating ? 'Création...' : 'Créer le RDV'}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Main Content */}
        <div className="mt-6 grid gap-6 lg:grid-cols-3">
          {/* Left Column - Appointments List */}
          <div className="lg:col-span-2">
            <Tabs defaultValue="all">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="all">
                  Tous ({stats.todayAppointments})
                </TabsTrigger>
                <TabsTrigger value="pending">
                  À confirmer ({stats.unconfirmedAppointments})
                </TabsTrigger>
                <TabsTrigger value="insurance">
                  Assurances
                </TabsTrigger>
              </TabsList>

              <TabsContent value="all" className="mt-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2">
                      <Calendar className="h-5 w-5" />
                      Rendez-vous du jour
                    </CardTitle>
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
                      ) : todayAppointments.length === 0 ? (
                        <div className="p-4 text-center text-muted-foreground">
                          Aucun rendez-vous aujourd'hui
                        </div>
                      ) : (
                        <div className="divide-y">
                          {todayAppointments.map((apt) => (
                            <div
                              key={apt.id}
                              className={`p-4 hover:bg-muted/50 transition-colors ${
                                apt.status === 'cancelled' ? 'opacity-50' : ''
                              } ${apt.is_first_visit ? 'border-l-4 border-l-amber-500' : ''}`}
                            >
                              <div className="flex items-start justify-between gap-4">
                                <div className="flex items-start gap-3">
                                  {/* Time */}
                                  <div className="text-sm font-bold bg-primary/10 text-primary px-2 py-1 rounded">
                                    {apt.appointment_time.slice(0, 5)}
                                  </div>
                                  
                                  {/* Info */}
                                  <div>
                                    <p className="font-medium">
                                      {apt.patient?.profile?.first_name} {apt.patient?.profile?.last_name}
                                    </p>
                                    <p className="text-sm text-muted-foreground">
                                      Dr. {apt.doctor?.profile?.first_name} {apt.doctor?.profile?.last_name}
                                    </p>
                                    {apt.patient?.profile?.phone && (
                                      <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                                        <Phone className="h-3 w-3" />
                                        {apt.patient.profile.phone}
                                      </p>
                                    )}
                                  </div>
                                </div>

                                {/* Status & Actions */}
                                <div className="flex flex-col items-end gap-2">
                                  {getStatusBadge(apt.status)}
                                  
                                  {apt.status !== 'cancelled' && apt.status !== 'completed' && (
                                    <div className="flex gap-1">
                                      {apt.status === 'pending' && (
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="h-8 w-8 text-green-600"
                                          title="Confirmer"
                                          onClick={() => updateAppointmentStatus(apt.id, 'confirmed')}
                                        >
                                          <Check className="h-4 w-4" />
                                        </Button>
                                      )}
                                      {apt.status === 'confirmed' && (
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="h-8 w-8 text-amber-600"
                                          title="Marquer absent"
                                          onClick={() => updateAppointmentStatus(apt.id, 'no_show')}
                                        >
                                          <UserX className="h-4 w-4" />
                                        </Button>
                                      )}
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 text-blue-600"
                                        title="Reporter"
                                        onClick={() => {
                                          setRescheduleData({
                                            appointmentId: apt.id,
                                            currentDate: apt.appointment_date,
                                            currentTime: apt.appointment_time,
                                            doctorId: apt.doctor.id,
                                            patientName: `${apt.patient?.profile?.first_name} ${apt.patient?.profile?.last_name}`,
                                          });
                                          setRescheduleDialogOpen(true);
                                        }}
                                      >
                                        <RefreshCcw className="h-4 w-4" />
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 text-destructive"
                                        title="Annuler"
                                        onClick={() => updateAppointmentStatus(apt.id, 'cancelled')}
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
              </TabsContent>

              <TabsContent value="pending" className="mt-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle>RDV à confirmer</CardTitle>
                    <CardDescription>
                      Ces rendez-vous attendent une confirmation
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-0">
                    <ScrollArea className="h-[500px]">
                      {todayAppointments.filter(a => a.status === 'pending').length === 0 ? (
                        <div className="p-4 text-center text-green-600">
                          <CheckCircle className="h-8 w-8 mx-auto mb-2" />
                          <p>Tous les RDV sont confirmés !</p>
                        </div>
                      ) : (
                        <div className="divide-y">
                          {todayAppointments
                            .filter(a => a.status === 'pending')
                            .map((apt) => (
                              <div key={apt.id} className="p-4 bg-amber-50">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-3">
                                    <span className="font-medium bg-amber-100 px-2 py-1 rounded">
                                      {apt.appointment_time.slice(0, 5)}
                                    </span>
                                    <div>
                                      <p className="font-medium">
                                        {apt.patient?.profile?.first_name} {apt.patient?.profile?.last_name}
                                      </p>
                                      <p className="text-sm text-muted-foreground">
                                        Dr. {apt.doctor?.profile?.last_name}
                                      </p>
                                    </div>
                                  </div>
                                  <div className="flex gap-2">
                                    {apt.patient?.profile?.phone && (
                                      <Button variant="outline" size="sm" asChild>
                                        <a href={`tel:${apt.patient.profile.phone}`}>
                                          <Phone className="h-4 w-4 mr-1" />
                                          Appeler
                                        </a>
                                      </Button>
                                    )}
                                    <Button
                                      size="sm"
                                      onClick={() => updateAppointmentStatus(apt.id, 'confirmed')}
                                    >
                                      <Check className="h-4 w-4 mr-1" />
                                      Confirmer
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
              </TabsContent>

              <TabsContent value="insurance" className="mt-4">
                <InsuranceVerificationPanel />
              </TabsContent>
            </Tabs>
          </div>

          {/* Right Column - Queue, Urgents & Waiting List */}
          <div className="space-y-6">
            <UrgentRequestsPanel />
            <WaitingQueue showActions={true} />
            <WaitingListPanel />
          </div>
        </div>
      </div>

      {/* Reschedule Dialog */}
      {rescheduleData && (
        <RescheduleDialog
          open={rescheduleDialogOpen}
          onOpenChange={setRescheduleDialogOpen}
          appointmentId={rescheduleData.appointmentId}
          currentDate={rescheduleData.currentDate}
          currentTime={rescheduleData.currentTime}
          doctorId={rescheduleData.doctorId}
          patientName={rescheduleData.patientName}
          onSuccess={fetchSecretaryData}
        />
      )}
    </>
  );
}
