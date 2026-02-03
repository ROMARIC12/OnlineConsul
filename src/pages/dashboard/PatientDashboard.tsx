import { useEffect, useState, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { PatientMobileHeader } from '@/components/patient/PatientMobileHeader';
import { MobileBottomNav } from '@/components/patient/MobileBottomNav';
import { AppointmentTabs } from '@/components/patient/AppointmentTabs';
import { EmptyAppointmentsState } from '@/components/patient/EmptyAppointmentsState';
import { FullBookingFlow } from '@/components/patient/FullBookingFlow';
import { NotificationsSheet } from '@/components/patient/NotificationsSheet';
import { AppointmentCard } from '@/components/patient/AppointmentCard';
import { PaymentHistory } from '@/components/patient/PaymentHistory';
import { WaitingQueueCard } from '@/components/patient/WaitingQueueCard';
import { AccessibilitySettings } from '@/components/patient/AccessibilitySettings';
import { TeleconsultationView } from '@/components/teleconsultation/TeleconsultationView';
import { useSidebar } from '@/components/ui/sidebar';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useRealtimeSubscription } from '@/hooks/useRealtimeSubscription';
import { useNotifications } from '@/hooks/useNotifications';
import { useToast } from '@/hooks/use-toast';
import { Calendar, CreditCard, Bell, Clock, FileText, Settings } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface PatientStats {
  upcomingAppointments: number;
  pastAppointments: number;
  pendingPayments: number;
  healthReminders: number;
}

interface Appointment {
  id: string;
  appointment_date: string;
  appointment_time: string;
  status: string;
  is_first_visit?: boolean;
  doctor: {
    id: string;
    specialty: string;
    profile: {
      first_name: string;
      last_name: string;
    };
  };
  clinic: {
    name: string;
    address: string;
  } | null;
}

export default function PatientDashboard() {
  const { user, profile } = useAuth();
  const { toggleSidebar } = useSidebar();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { notifications: realtimeNotifications, markAsRead, markAllAsRead, unreadCount } = useNotifications();

  const [stats, setStats] = useState<PatientStats>({
    upcomingAppointments: 0,
    pastAppointments: 0,
    pendingPayments: 0,
    healthReminders: 0,
  });
  const [upcomingAppointments, setUpcomingAppointments] = useState<Appointment[]>([]);
  const [pastAppointments, setPastAppointments] = useState<Appointment[]>([]);
  const [reminders, setReminders] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [patientId, setPatientId] = useState<string | null>(null);

  // UI State
  const [activeBottomTab, setActiveBottomTab] = useState('home');
  const [activeAppointmentTab, setActiveAppointmentTab] = useState<'rdv' | 'teleconsultation'>('rdv');
  const [showBookingSearch, setShowBookingSearch] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showAccessibility, setShowAccessibility] = useState(false);
  const [onlineDoctorsCount, setOnlineDoctorsCount] = useState(0);

  // Get the next appointment for queue display
  const nextAppointment = upcomingAppointments.find(
    apt => apt.status === 'confirmed' || apt.status === 'pending'
  );

  const fetchPatientData = useCallback(async () => {
    if (!user) return;

    try {
      // Get patient ID
      const { data: patientData } = await supabase
        .from('patients')
        .select('id')
        .eq('profile_id', user.id)
        .single();

      if (!patientData) {
        setIsLoading(false);
        return;
      }

      setPatientId(patientData.id);
      const today = format(new Date(), 'yyyy-MM-dd');

      // Fetch upcoming appointments
      const { data: upcoming } = await supabase
        .from('appointments')
        .select(`
          id,
          appointment_date,
          appointment_time,
          status,
          is_first_visit,
          doctor:doctors(
            id,
            specialty,
            profile:profiles(first_name, last_name)
          ),
          clinic:clinics(name, address)
        `)
        .eq('patient_id', patientData.id)
        .gte('appointment_date', today)
        .neq('status', 'cancelled')
        .order('appointment_date')
        .order('appointment_time')
        .limit(10);

      // Fetch past appointments
      const { data: past } = await supabase
        .from('appointments')
        .select(`
          id,
          appointment_date,
          appointment_time,
          status,
          doctor:doctors(
            id,
            specialty,
            profile:profiles(first_name, last_name)
          ),
          clinic:clinics(name, address)
        `)
        .eq('patient_id', patientData.id)
        .lt('appointment_date', today)
        .order('appointment_date', { ascending: false })
        .limit(10);

      // Count pending payments
      const { count: pendingPayments } = await supabase
        .from('payments')
        .select('id', { count: 'exact', head: true })
        .eq('patient_id', patientData.id)
        .eq('status', 'pending');

      // Fetch health reminders
      const { data: healthReminders } = await supabase
        .from('health_reminders')
        .select('*')
        .eq('patient_id', patientData.id)
        .eq('is_sent', false)
        .gte('scheduled_date', today)
        .order('scheduled_date')
        .limit(5);

      setUpcomingAppointments(upcoming as Appointment[] || []);
      setPastAppointments(past as Appointment[] || []);
      setReminders(healthReminders || []);
      setStats({
        upcomingAppointments: upcoming?.length || 0,
        pastAppointments: past?.length || 0,
        pendingPayments: pendingPayments || 0,
        healthReminders: healthReminders?.length || 0,
      });

    } catch (error) {
      console.error('Error fetching patient data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab && ['home', 'explore', 'documents', 'settings'].includes(tab)) {
      setActiveBottomTab(tab);
      if (tab === 'settings') {
        setShowAccessibility(true);
      }
    }

    const booking = searchParams.get('booking');
    if (booking === 'open') {
      setShowBookingSearch(true);
    }
  }, [searchParams]);

  useEffect(() => {
    fetchPatientData();

    // Fetch online doctors count
    const fetchOnlineDoctors = async () => {
      const { count } = await supabase
        .from('doctors')
        .select('id', { count: 'exact', head: true })
        .eq('teleconsultation_enabled', true);
      setOnlineDoctorsCount(count || 0);
    };
    fetchOnlineDoctors();
  }, [fetchPatientData]);

  // Real-time subscription for appointments
  useRealtimeSubscription({
    table: 'appointments',
    filter: patientId ? 'patient_id' : undefined,
    filterValue: patientId || undefined,
    onChange: () => {
      console.log('[Patient] Appointment update received');
      fetchPatientData();
      toast({
        title: 'Mise à jour',
        description: 'Vos rendez-vous ont été mis à jour.',
      });
    },
  });

  // Cancel appointment
  const handleCancelAppointment = async (appointmentId: string) => {
    try {
      const { error } = await supabase
        .from('appointments')
        .update({
          status: 'cancelled',
          cancelled_at: new Date().toISOString(),
          cancellation_reason: 'Annulé par le patient',
        })
        .eq('id', appointmentId);

      if (error) throw error;

      toast({
        title: 'Rendez-vous annulé',
        description: 'Votre rendez-vous a été annulé avec succès.',
      });

      fetchPatientData();
    } catch (error) {
      console.error('Error cancelling appointment:', error);
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: 'Impossible d\'annuler le rendez-vous.',
      });
    }
  };

  // Calculate queue position for upcoming appointments
  const calculateQueuePosition = (appointment: Appointment): number => {
    const sameDay = upcomingAppointments.filter(
      a => a.appointment_date === appointment.appointment_date &&
        a.doctor.id === appointment.doctor.id &&
        a.appointment_time <= appointment.appointment_time &&
        a.status !== 'cancelled' &&
        a.status !== 'completed'
    );
    return sameDay.length;
  };

  // Transform realtime notifications
  const displayNotifications = realtimeNotifications.map(n => ({
    id: n.id,
    type: n.type as 'appointment' | 'payment' | 'reminder' | 'urgent' | 'queue_update',
    title: n.title,
    message: n.message || '',
    created_at: n.created_at,
    is_read: n.is_read,
  }));

  // Handle bottom nav tab change
  const handleBottomTabChange = (tab: string) => {
    setActiveBottomTab(tab);
    if (tab === 'settings') {
      setShowAccessibility(true);
    }
  };

  // Render content based on active bottom tab
  const renderContent = () => {
    if (activeBottomTab === 'documents') {
      return (
        <div className="p-4">
          <h2 className="text-lg font-semibold mb-4">Mes Documents</h2>
          <Tabs defaultValue="payments">
            <TabsList className="w-full">
              <TabsTrigger value="payments" className="flex-1">Paiements</TabsTrigger>
              <TabsTrigger value="prescriptions" className="flex-1">Ordonnances</TabsTrigger>
            </TabsList>
            <TabsContent value="payments" className="mt-4">
              <PaymentHistory />
            </TabsContent>
            <TabsContent value="prescriptions" className="mt-4">
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p>Aucune ordonnance</p>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      );
    }

    // Default: Home tab with primary dashboard
    return (
      <div className="flex-1 flex flex-col gap-8 pb-32">
        {/* Premium Hero Section */}
        <section className="relative px-6 py-10 overflow-hidden rounded-b-[3rem] bg-gradient-to-br from-slate-900 via-slate-800 to-primary/20 text-white shadow-2xl">
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/20 blur-[100px] rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="relative z-10 space-y-4">
            <h2 className="text-3xl md:text-4xl font-black tracking-tight leading-tight">
              Bonjour, <span className="text-primary italic">{profile?.first_name}</span> 👋
            </h2>
            <p className="text-slate-300 max-w-md font-medium">
              Votre santé est notre priorité. Retrouvez ici le suivi de vos consultations et vos rappels.
            </p>
            <div className="flex gap-4 pt-2">
              <Button
                onClick={() => setShowBookingSearch(true)}
                className="rounded-full bg-white text-slate-900 hover:bg-slate-100 h-11 px-8 font-bold shadow-lg"
              >
                Prendre RDV
              </Button>
            </div>
          </div>
        </section>

        {/* Stats Grid */}
        <section className="px-6 grid grid-cols-2 lg:grid-cols-4 gap-4 -mt-12 group">
          {[
            { label: 'RDV à venir', value: stats.upcomingAppointments, icon: Calendar, color: 'text-primary bg-primary/10' },
            { label: 'Payements', value: stats.pendingPayments, icon: CreditCard, color: 'text-amber-500 bg-amber-500/10' },
            { label: 'Rappels', value: stats.healthReminders, icon: Bell, color: 'text-emerald-500 bg-emerald-500/10' },
            { label: 'Consultations', value: stats.pastAppointments, icon: Clock, color: 'text-slate-500 bg-slate-500/10' },
          ].map((stat, i) => (
            <Card key={i} className="premium-card group-hover:opacity-80 hover:!opacity-100 transition-all border-none shadow-xl hover:-translate-y-2">
              <CardContent className="p-6 flex flex-col items-center text-center gap-3">
                <div className={`p-3 rounded-2xl ${stat.color}`}>
                  <stat.icon className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-3xl font-black text-slate-900">{stat.value}</p>
                  <p className="text-[10px] uppercase tracking-widest font-bold text-slate-400">{stat.label}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </section>

        {/* Appointment Tabs */}
        <section className="px-6">
          <AppointmentTabs
            activeTab={activeAppointmentTab}
            onTabChange={setActiveAppointmentTab}
            onlineDoctorsCount={onlineDoctorsCount}
          />

          <ScrollArea className="flex-1">
            {activeAppointmentTab === 'rdv' ? (
              <div className="pb-20">
                {isLoading ? (
                  <div className="p-4 text-center text-muted-foreground">Chargement...</div>
                ) : upcomingAppointments.length === 0 ? (
                  <EmptyAppointmentsState onBookAppointment={() => setShowBookingSearch(true)} />
                ) : (
                  <div className="p-4 space-y-4">
                    {/* Queue Card for next appointment */}
                    {nextAppointment && (
                      <WaitingQueueCard appointment={nextAppointment as any} />
                    )}

                    {/* Upcoming Appointments */}
                    <div className="space-y-3">
                      <h3 className="font-medium text-sm text-muted-foreground">Prochains rendez-vous</h3>
                      {upcomingAppointments.map((apt) => (
                        <AppointmentCard
                          key={apt.id}
                          appointment={apt}
                          showActions={true}
                          onCancel={handleCancelAppointment}
                          queuePosition={calculateQueuePosition(apt)}
                          estimatedWaitTime={(calculateQueuePosition(apt) - 1) * 20}
                        />
                      ))}
                    </div>

                    {/* Past Appointments */}
                    {pastAppointments.length > 0 && (
                      <div className="space-y-3 pt-4">
                        <h3 className="font-medium text-sm text-muted-foreground">Consultations passées</h3>
                        {pastAppointments.slice(0, 3).map((apt) => (
                          <AppointmentCard
                            key={apt.id}
                            appointment={apt}
                            showActions={false}
                          />
                        ))}
                      </div>
                    )}

                    {/* Health Reminders */}
                    {reminders.length > 0 && (
                      <Card className="mt-4 premium-card border-none bg-emerald-50 shadow-inner">
                        <CardHeader className="pb-2">
                          <CardTitle className="flex items-center gap-2 text-base font-bold text-emerald-900">
                            <Bell className="h-4 w-4" />
                            Rappels de santé
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-3">
                            {reminders.map((reminder) => (
                              <div
                                key={reminder.id}
                                className="flex items-center justify-between p-4 bg-white/80 rounded-[1.25rem] border border-emerald-100 shadow-sm"
                              >
                                <div className="flex items-center gap-3">
                                  <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                                  <div>
                                    <p className="font-bold text-slate-900 text-sm">{reminder.reminder_type}</p>
                                    {reminder.message && (
                                      <p className="text-xs text-slate-500 font-medium">{reminder.message}</p>
                                    )}
                                  </div>
                                </div>
                                <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-none px-3 py-1 font-bold">
                                  {format(new Date(reminder.scheduled_date), 'd MMM', { locale: fr })}
                                </Badge>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                )}
              </div>
            ) : (
              // Teleconsultation Tab
              <div className="pb-20 h-full px-4">
                <TeleconsultationView />
              </div>
            )}
          </ScrollArea>
        </section>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Mobile Header */}
      <PatientMobileHeader
        title="Mes RDV"
        unreadCount={unreadCount}
        onMenuClick={toggleSidebar}
        onNotificationsClick={() => setShowNotifications(true)}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {renderContent()}
      </div>

      {/* Mobile Bottom Navigation */}
      <MobileBottomNav
        activeTab={activeBottomTab}
        onTabChange={handleBottomTabChange}
        onPlusClick={() => setShowBookingSearch(true)}
      />

      {/* Full Booking Flow */}
      <FullBookingFlow
        open={showBookingSearch}
        onClose={() => {
          setShowBookingSearch(false);
          // Clear booking search param if present
          if (searchParams.get('booking')) {
            const nextParams = new URLSearchParams(searchParams);
            nextParams.delete('booking');
            setSearchParams(nextParams);
          }
        }}
        onSuccess={fetchPatientData}
      />

      {/* Notifications Sheet */}
      <NotificationsSheet
        open={showNotifications}
        onClose={() => setShowNotifications(false)}
        notifications={displayNotifications}
        onMarkAsRead={markAsRead}
        onMarkAllAsRead={markAllAsRead}
      />

      {/* Accessibility Dialog */}
      <Dialog open={showAccessibility} onOpenChange={setShowAccessibility}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <AccessibilitySettings />
        </DialogContent>
      </Dialog>
    </div>
  );
}
