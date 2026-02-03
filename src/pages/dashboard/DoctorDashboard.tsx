import { useEffect, useState, useCallback } from 'react';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { StatsCard } from '@/components/dashboard/StatsCard';
import { DoctorAgenda } from '@/components/doctor/DoctorAgenda';
import { DoctorStatsPanel } from '@/components/doctor/DoctorStatsPanel';
import { BlockSlotDialog } from '@/components/doctor/BlockSlotDialog';
import { ConsultationNotes } from '@/components/doctor/ConsultationNotes';
import { AvailabilitySettings } from '@/components/doctor/AvailabilitySettings';
import { PricingSettings } from '@/components/doctor/PricingSettings';
import { TeleconsultationSettings } from '@/components/doctor/TeleconsultationSettings';
import { WaitingQueue } from '@/components/secretary/WaitingQueue';
import { PatientFileDialog } from '@/components/doctor/PatientFileDialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useRealtimeSubscription } from '@/hooks/useRealtimeSubscription';
import { useToast } from '@/hooks/use-toast';
import { Calendar, Users, TrendingUp, Clock, AlertTriangle, CheckCircle, Bell, FileText, Lock, Settings, UserX, ChevronDown, Video } from 'lucide-react';
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface DoctorStats {
  todayAppointments: number;
  completedToday: number;
  monthlyRevenue: number;
  fillRate: number;
  pendingConfirmations: number;
}

interface TodayAppointment {
  id: string;
  appointment_time: string;
  appointment_date: string;
  status: string;
  is_first_visit: boolean;
  patient: {
    id: string;
    date_of_birth?: string | null;
    gender?: string | null;
    address?: string | null;
    emergency_contact?: string | null;
    profile: {
      first_name: string;
      last_name: string;
      phone: string | null;
    };
  };
  consultation_form?: {
    consultation_reason: string | null;
    allergies: string[] | null;
    chronic_conditions: string[] | null;
    current_treatments: string | null;
  } | null;
}

interface PatientFileData {
  patient: TodayAppointment['patient'];
  consultationForm?: TodayAppointment['consultation_form'];
  appointmentInfo?: {
    date: string;
    time: string;
    doctorName: string;
    isFirstVisit?: boolean;
  };
}

const PATIENTS_PER_PAGE = 5;

export default function DoctorDashboard() {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [stats, setStats] = useState<DoctorStats>({
    todayAppointments: 0,
    completedToday: 0,
    monthlyRevenue: 0,
    fillRate: 0,
    pendingConfirmations: 0,
  });
  const [isOnline, setIsOnline] = useState(false);
  const [isFree, setIsFree] = useState(false);
  const [waitingSessions, setWaitingSessions] = useState<any[]>([]);
  const [todayPatients, setTodayPatients] = useState<TodayAppointment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [doctorId, setDoctorId] = useState<string | null>(null);

  // Patient file dialog
  const [selectedPatientData, setSelectedPatientData] = useState<PatientFileData | null>(null);
  const [patientDialogOpen, setPatientDialogOpen] = useState(false);

  // Pagination
  const [visiblePatients, setVisiblePatients] = useState(PATIENTS_PER_PAGE);

  // Block slot dialog
  const [blockSlotOpen, setBlockSlotOpen] = useState(false);
  const [blockSlotDate, setBlockSlotDate] = useState('');
  const [blockSlotTime, setBlockSlotTime] = useState('');

  // Consultation notes dialog
  const [notesDialogOpen, setNotesDialogOpen] = useState(false);
  const [selectedAppointmentId, setSelectedAppointmentId] = useState('');
  const [selectedPatientName, setSelectedPatientName] = useState('');

  const fetchDoctorData = useCallback(async () => {
    if (!user) return;

    try {
      // Get doctor ID
      const { data: doctorData } = await supabase
        .from('doctors')
        .select('id, is_online, is_teleconsultation_free')
        .eq('profile_id', user.id)
        .single();

      if (!doctorData) {
        setIsLoading(false);
        return;
      }

      setDoctorId(doctorData.id);
      setIsOnline(doctorData.is_online || false);
      setIsFree(doctorData.is_teleconsultation_free || false);
      const today = format(new Date(), 'yyyy-MM-dd');

      // Fetch upcoming appointments so new patient requests (future dates) are visible
      const { data: appointments } = await supabase
        .from('appointments')
        .select(`
          id,
          appointment_time,
          appointment_date,
          status,
          is_first_visit,
          patient:patients(
            id,
            date_of_birth,
            gender,
            address,
            emergency_contact,
            profile:profiles(first_name, last_name, phone)
          ),
          consultation_form:consultation_forms(
            consultation_reason,
            allergies,
            chronic_conditions,
            current_treatments
          )
        `)
        .eq('doctor_id', doctorData.id)
        .neq('status', 'cancelled')
        .gte('appointment_date', today)
        .order('appointment_date')
        .order('appointment_time')
        .limit(100);

      // Fetch doctor statistics
      const { data: statsData } = await supabase
        .from('doctor_statistics')
        .select('*')
        .eq('doctor_id', doctorData.id)
        .single();

      // Count pending confirmations
      const { count: pendingCount } = await supabase
        .from('appointments')
        .select('id', { count: 'exact', head: true })
        .eq('doctor_id', doctorData.id)
        .eq('status', 'pending')
        .gte('appointment_date', today);

      const todayCompleted = appointments?.filter(a => a.status === 'completed').length || 0;

      setTodayPatients(appointments || []);
      setStats({
        todayAppointments: appointments?.length || 0,
        completedToday: todayCompleted,
        monthlyRevenue: statsData?.monthly_revenue || 0,
        fillRate: statsData?.no_show_rate ? 100 - (statsData.no_show_rate * 100) : 100,
        pendingConfirmations: pendingCount || 0,
      });

      // Fetch waiting teleconsultation sessions
      console.log("Fetching teleconsultation sessions for doctor:", doctorData.id);
      const { data: sessions, error: sessionError } = await supabase
        .from('teleconsultation_sessions')
        .select(`
          *,
          patient:patients(
            profile:profiles(first_name, last_name)
          )
        `)
        .eq('doctor_id', doctorData.id)
        .in('status', ['paid', 'pending'])
        .order('created_at', { ascending: false });

      if (sessionError) {
        console.error("Error fetching sessions:", sessionError);
      } else {
        console.log("Waiting sessions found:", sessions?.length, sessions);
        setWaitingSessions(sessions || []);
      }

    } catch (error) {
      console.error('Error fetching doctor data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchDoctorData();
  }, [fetchDoctorData]);

  // Real-time subscription
  useRealtimeSubscription({
    table: 'appointments',
    filter: doctorId ? 'doctor_id' : undefined,
    filterValue: doctorId || undefined,
    onChange: (payload) => {
      console.log('[Doctor] Appointment update:', payload);
      fetchDoctorData();

      if (payload.eventType === 'INSERT') {
        toast({
          title: 'Nouveau RDV',
          description: 'Un nouveau rendez-vous a été pris.',
        });
      } else if (payload.eventType === 'UPDATE' && payload.new?.status === 'cancelled') {
        toast({
          variant: 'destructive',
          title: 'RDV Annulé',
          description: 'Un rendez-vous a été annulé.',
        });
      }
    },
  });

  useRealtimeSubscription({
    table: 'teleconsultation_sessions',
    filter: doctorId ? 'doctor_id' : undefined,
    filterValue: doctorId || undefined,
    onChange: () => {
      fetchDoctorData();
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
      case 'no_show':
        return <Badge variant="destructive">Absent</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const markAsCompleted = async (appointmentId: string) => {
    try {
      const { error } = await supabase
        .from('appointments')
        .update({ status: 'completed' })
        .eq('id', appointmentId);

      if (error) throw error;

      toast({
        title: 'Consultation terminée',
        description: 'Le statut a été mis à jour.',
      });
    } catch (error) {
      console.error('Error updating appointment:', error);
    }
  };

  const markAsNoShow = async (appointmentId: string) => {
    try {
      const { error } = await supabase
        .from('appointments')
        .update({ status: 'no_show' })
        .eq('id', appointmentId);

      if (error) throw error;

      toast({
        title: 'Patient absent',
        description: 'Le statut a été mis à jour.',
      });
    } catch (error) {
      console.error('Error updating appointment:', error);
    }
  };

  const openPatientFile = (appointment: TodayAppointment) => {
    setSelectedPatientData({
      patient: appointment.patient,
      consultationForm: appointment.consultation_form,
      appointmentInfo: {
        date: appointment.appointment_date,
        time: appointment.appointment_time.slice(0, 5),
        doctorName: `Dr. ${profile?.first_name || ''} ${profile?.last_name || ''}`,
        isFirstVisit: appointment.is_first_visit,
      },
    });
    setPatientDialogOpen(true);
  };

  const handleLoadMore = () => {
    setVisiblePatients(prev => prev + PATIENTS_PER_PAGE);
  };

  const openConsultationNotes = (appointment: TodayAppointment) => {
    setSelectedAppointmentId(appointment.id);
    setSelectedPatientName(`${appointment.patient?.profile?.first_name} ${appointment.patient?.profile?.last_name}`);
    setNotesDialogOpen(true);
  };

  const handleBlockSlot = (date: string, time: string) => {
    setBlockSlotDate(date);
    setBlockSlotTime(time);
    setBlockSlotOpen(true);
  };

  const toggleOnline = async (checked: boolean) => {
    setIsOnline(checked);
    if (doctorId) {
      const { error } = await supabase
        .from('doctors')
        .update({ is_online: checked })
        .eq('id', doctorId);

      if (error) {
        toast({ variant: "destructive", title: "Erreur", description: "Impossible de mettre à jour le statut" });
        setIsOnline(!checked);
      } else {
        toast({ title: "Statut mis à jour", description: checked ? "Vous êtes en ligne" : "Vous êtes hors ligne" });
      }
    }
  };

  const toggleFree = async (checked: boolean) => {
    setIsFree(checked);
    if (doctorId) {
      const { error } = await supabase
        .from('doctors')
        .update({ is_teleconsultation_free: checked })
        .eq('id', doctorId);

      if (error) {
        toast({ variant: "destructive", title: "Erreur", description: "Impossible de mettre à jour le mode" });
        setIsFree(!checked);
      } else {
        toast({ title: "Mode mis à jour", description: checked ? "Consultation gratuite activée" : "Consultation payante activée" });
      }
    }
  };

  return (
    <>
      <DashboardHeader title={`Bonjour Dr. ${profile?.last_name || ''} 👋`} />
      <div className="flex-1 overflow-auto p-4 md:p-6">
        <div className="flex items-center gap-6 mb-6 p-4 bg-background border rounded-lg shadow-sm">
          <div className="flex items-center gap-2">
            <Video className="h-5 w-5 text-primary" />
            <span className="font-semibold">Téléconsultation :</span>
          </div>
          <div className="flex items-center gap-2">
            <Switch id="online-mode" checked={isOnline} onCheckedChange={toggleOnline} />
            <Label htmlFor="online-mode" className="cursor-pointer">En ligne</Label>
          </div>
          <div className="h-4 w-px bg-border" />
          <div className="flex items-center gap-2">
            <Switch id="free-mode" checked={isFree} onCheckedChange={toggleFree} />
            <Label htmlFor="free-mode" className="cursor-pointer">Gratuit pour les patients</Label>
          </div>
        </div>
        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatsCard
            title="Patients du jour"
            value={isLoading ? '...' : stats.todayAppointments}
            description="Rendez-vous prévus"
            icon={Calendar}
          />
          <StatsCard
            title="Consultations"
            value={isLoading ? '...' : stats.completedToday}
            description="Terminées aujourd'hui"
            icon={CheckCircle}
          />
          <StatsCard
            title="Revenus du mois"
            value={isLoading ? '...' : `${stats.monthlyRevenue.toLocaleString()} FCFA`}
            description="Total facturation"
            icon={TrendingUp}
          />
          <StatsCard
            title="À confirmer"
            value={isLoading ? '...' : stats.pendingConfirmations}
            description="RDV en attente"
            icon={Bell}
          />
        </div>

        {/* Main Content */}
        <div className="mt-6 grid gap-6 lg:grid-cols-3">
          {/* Left Column - Patients List */}
          <div className="lg:col-span-2">
            <Tabs defaultValue="today">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="today">
                  Patients ({stats.todayAppointments})
                </TabsTrigger>
                <TabsTrigger value="agenda">
                  Agenda
                </TabsTrigger>
                <TabsTrigger value="settings">
                  <Settings className="h-4 w-4 mr-1" />
                  Paramètres
                </TabsTrigger>
              </TabsList>

              <TabsContent value="today" className="mt-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2">
                      <Clock className="h-5 w-5" />
                      {format(new Date(), 'EEEE d MMMM', { locale: fr })}
                    </CardTitle>
                    <CardDescription>
                      Liste des consultations prévues
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {isLoading ? (
                      <p className="text-muted-foreground py-4">Chargement...</p>
                    ) : todayPatients.length === 0 ? (
                      <div className="py-8 text-center">
                        <Calendar className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                        <p className="text-muted-foreground">Aucun rendez-vous prévu aujourd'hui</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {todayPatients.slice(0, visiblePatients).map((apt) => {
                          const patientName = `${apt.patient?.profile?.first_name || ''} ${apt.patient?.profile?.last_name || ''}`.trim();
                          const initials = `${apt.patient?.profile?.first_name?.[0] || ''}${apt.patient?.profile?.last_name?.[0] || ''}`;

                          return (
                            <div
                              key={apt.id}
                              className={`p-4 border rounded-lg transition-colors hover:bg-muted/50 ${apt.is_first_visit ? 'border-l-4 border-l-purple-500' : ''
                                } ${apt.status === 'completed' ? 'opacity-60 bg-green-50/50 dark:bg-green-950/20' : ''}`}
                            >
                              <div className="flex items-start justify-between gap-4">
                                <div className="flex items-start gap-3">
                                  {/* Avatar */}
                                  <Avatar className="h-12 w-12 border-2 border-background shadow">
                                    <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                                      {initials}
                                    </AvatarFallback>
                                  </Avatar>

                                  {/* Patient Info */}
                                  <div>
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <p className="font-semibold">{patientName}</p>
                                      {apt.is_first_visit && (
                                        <Badge variant="outline" className="text-purple-600 border-purple-300 text-xs">
                                          <AlertTriangle className="h-3 w-3 mr-1" />
                                          1ère visite
                                        </Badge>
                                      )}
                                    </div>

                                    <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                                      <span className="font-medium text-primary bg-primary/10 px-2 py-0.5 rounded">
                                        {apt.appointment_time.slice(0, 5)}
                                      </span>
                                      <span>•</span>
                                      <span>{format(new Date(apt.appointment_date), 'd MMM', { locale: fr })}</span>
                                    </div>

                                    {apt.consultation_form?.consultation_reason && (
                                      <p className="text-sm text-muted-foreground mt-1 line-clamp-1">
                                        Motif : {apt.consultation_form.consultation_reason}
                                      </p>
                                    )}

                                    {/* Medical Indicators */}
                                    <div className="flex gap-2 mt-2">
                                      {apt.consultation_form?.allergies && apt.consultation_form.allergies.length > 0 && (
                                        <Badge variant="destructive" className="text-xs">
                                          <AlertTriangle className="h-3 w-3 mr-1" />
                                          Allergies ({apt.consultation_form.allergies.length})
                                        </Badge>
                                      )}
                                      {apt.consultation_form?.chronic_conditions && apt.consultation_form.chronic_conditions.length > 0 && (
                                        <Badge variant="secondary" className="text-xs">
                                          Antécédents
                                        </Badge>
                                      )}
                                    </div>
                                  </div>
                                </div>

                                {/* Status & Actions */}
                                <div className="flex flex-col items-end gap-2">
                                  {getStatusBadge(apt.status)}

                                  <div className="flex gap-1 flex-wrap justify-end">
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => openPatientFile(apt)}
                                    >
                                      Voir fiche
                                    </Button>

                                    {apt.status === 'confirmed' && (
                                      <>
                                        <Button
                                          variant="default"
                                          size="sm"
                                          onClick={() => markAsCompleted(apt.id)}
                                          className="gap-1 bg-green-600 hover:bg-green-700"
                                        >
                                          <CheckCircle className="h-4 w-4" />
                                          RDV terminé
                                        </Button>
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          onClick={() => openConsultationNotes(apt)}
                                          className="gap-1"
                                        >
                                          <FileText className="h-4 w-4" />
                                          Notes
                                        </Button>
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          className="text-destructive hover:bg-destructive hover:text-destructive-foreground"
                                          onClick={() => markAsNoShow(apt.id)}
                                        >
                                          <UserX className="h-4 w-4 mr-1" />
                                          Absent
                                        </Button>
                                      </>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}

                        {/* Load More Button */}
                        {todayPatients.length > visiblePatients && (
                          <Button
                            variant="outline"
                            className="w-full mt-4"
                            onClick={handleLoadMore}
                          >
                            <ChevronDown className="h-4 w-4 mr-2" />
                            Voir plus ({todayPatients.length - visiblePatients} restants)
                          </Button>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="agenda" className="mt-4">
                {doctorId && (
                  <DoctorAgenda
                    doctorId={doctorId}
                    onAppointmentClick={(apt) => {
                      // Open consultation notes for confirmed appointments
                      if (apt.status === 'confirmed') {
                        setSelectedAppointmentId(apt.id);
                        setSelectedPatientName(`${apt.patient?.profile?.first_name} ${apt.patient?.profile?.last_name}`);
                        setNotesDialogOpen(true);
                      }
                    }}
                    onBlockSlot={handleBlockSlot}
                  />
                )}
              </TabsContent>

              <TabsContent value="settings" className="mt-4 space-y-6">
                {doctorId && (
                  <>
                    <TeleconsultationSettings doctorId={doctorId} />
                    <AvailabilitySettings doctorId={doctorId} />
                    <PricingSettings doctorId={doctorId} />
                  </>
                )}
              </TabsContent>
            </Tabs>
          </div>

          {/* Right Column - Stats & Queue */}
          <div className="space-y-6">
            {doctorId && (
              <>
                {/* Waiting Patients for Teleconsultation */}
                <Card className="border-primary/50 shadow-md">
                  <CardHeader className="bg-primary/5 pb-3">
                    <CardTitle className="text-sm font-bold flex items-center gap-2">
                      <Video className="h-4 w-4 text-primary" />
                      Patients en attente (Vidéo)
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-4">
                    {waitingSessions.length === 0 ? (
                      <p className="text-center text-sm text-muted-foreground py-4">Aucun patient en attente</p>
                    ) : (
                      <div className="space-y-3">
                        {waitingSessions.map((session) => (
                          <div key={session.id} className="flex items-center justify-between p-2 border rounded-md hover:bg-slate-50 transition-colors">
                            <div className="flex flex-col">
                              <span className="text-sm font-medium">
                                {session.patient?.profile?.first_name} {session.patient?.profile?.last_name}
                              </span>
                              <span className="text-[10px] text-muted-foreground">Code: {session.access_code}</span>
                            </div>
                            <Button size="sm" variant="default" className="h-8 gap-1" asChild>
                              <a href={`/dashboard/teleconsultation?channel=${session.channel_name}&role=doctor`}>
                                Rejoindre
                              </a>
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                <DoctorStatsPanel doctorId={doctorId} />
                <WaitingQueue filterByDoctor={doctorId} showActions={false} />
              </>
            )}
          </div>
        </div>
      </div>

      {/* Patient File Dialog */}
      <PatientFileDialog
        open={patientDialogOpen}
        onOpenChange={setPatientDialogOpen}
        patient={selectedPatientData?.patient ? {
          id: selectedPatientData.patient.id,
          date_of_birth: selectedPatientData.patient.date_of_birth || undefined,
          gender: selectedPatientData.patient.gender || undefined,
          address: selectedPatientData.patient.address || undefined,
          emergency_contact: selectedPatientData.patient.emergency_contact || undefined,
          profile: selectedPatientData.patient.profile,
        } : null}
        consultationForm={selectedPatientData?.consultationForm}
        appointmentInfo={selectedPatientData?.appointmentInfo}
      />

      {/* Block Slot Dialog */}
      {doctorId && (
        <BlockSlotDialog
          open={blockSlotOpen}
          onOpenChange={setBlockSlotOpen}
          doctorId={doctorId}
          initialDate={blockSlotDate}
          initialTime={blockSlotTime}
          onSuccess={fetchDoctorData}
        />
      )}

      {/* Consultation Notes Dialog */}
      <ConsultationNotes
        open={notesDialogOpen}
        onOpenChange={setNotesDialogOpen}
        appointmentId={selectedAppointmentId}
        patientName={selectedPatientName}
        onSuccess={fetchDoctorData}
      />
    </>
  );
}
