import { useEffect, useState, useCallback } from 'react';
import { TeleconsultationDoctorCard } from './TeleconsultationDoctorCard';
import { EnterCodeDialog } from './EnterCodeDialog';
import { TeleconsultationPaymentDialog } from './TeleconsultationPaymentDialog';
import { VideoCall } from './VideoCall';
import { supabase } from '@/integrations/supabase/client';
import { useRealtimeSubscription } from '@/hooks/useRealtimeSubscription';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Video, RefreshCw, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';

interface OnlineDoctor {
  id: string;
  specialty: string;
  photo_url?: string | null;
  teleconsultation_price_per_minute?: number | null;
  teleconsultation_price_per_hour?: number | null;
  teleconsultation_enabled?: boolean | null;
  is_teleconsultation_free?: boolean;
  profile: {
    first_name: string;
    last_name: string;
  };
}

interface VideoSessionData {
  channelName: string;
  token: string;
  appId: string;
  uid: number;
  duration: number;
}

export function TeleconsultationView() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [onlineDoctors, setOnlineDoctors] = useState<OnlineDoctor[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Dialogs
  const [enterCodeOpen, setEnterCodeOpen] = useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [selectedDoctor, setSelectedDoctor] = useState<OnlineDoctor | null>(null);

  // Video call
  const [videoSession, setVideoSession] = useState<VideoSessionData | null>(null);
  const [isInCall, setIsInCall] = useState(false);

  const fetchOnlineDoctors = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('doctors')
        .select(`
          id,
          specialty,
          photo_url,
          teleconsultation_price_per_minute,
          teleconsultation_price_per_hour,
          teleconsultation_enabled,
          is_teleconsultation_free,
          profile:profiles(first_name, last_name)
        `)
        .eq('teleconsultation_enabled', true)
        .order('specialty');

      if (error) throw error;

      // Transform data to match expected structure - safely cast types
      const doctors: OnlineDoctor[] = (data || []).map((doc: any) => ({
        id: doc.id,
        specialty: doc.specialty,
        photo_url: doc.photo_url,
        teleconsultation_price_per_minute: doc.teleconsultation_price_per_minute,
        teleconsultation_price_per_hour: doc.teleconsultation_price_per_hour,
        teleconsultation_enabled: doc.teleconsultation_enabled,
        is_teleconsultation_free: doc.is_teleconsultation_free || false,
        profile: (doc.profile as { first_name: string; last_name: string }) || { first_name: 'Médecin', last_name: '' }
      }));

      setOnlineDoctors(doctors);
    } catch (error) {
      console.error('Error fetching online doctors:', error);
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: 'Impossible de charger les médecins en ligne.',
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchOnlineDoctors();
  }, [fetchOnlineDoctors]);

  // Real-time subscription for doctor status changes
  useRealtimeSubscription({
    table: 'doctors',
    onChange: (payload) => {
      console.log('[Teleconsultation] Doctor status changed:', payload);
      fetchOnlineDoctors();
    },
  });

  const handleEnterCode = (doctorId: string) => {
    setEnterCodeOpen(true);
  };

  const handleBookTeleconsultation = (doctor: OnlineDoctor) => {
    setSelectedDoctor(doctor);
    setPaymentDialogOpen(true);
  };

  const handleCodeValid = async (sessionData: { channelName: string; token: string; doctorId: string }) => {
    try {
      // Get Agora token and start video call
      const { data, error } = await supabase.functions.invoke('agora-token', {
        body: {
          channelName: sessionData.channelName,
          role: 'publisher'
        }
      });

      if (error) throw error;

      setVideoSession({
        channelName: sessionData.channelName,
        token: data.token,
        appId: data.appId,
        uid: data.uid,
        duration: 30, // Default duration
      });
      setIsInCall(true);
    } catch (error) {
      console.error('Error starting video call:', error);
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: 'Impossible de démarrer la vidéoconférence.',
      });
    }
  };

  const handleStartFreeSession = async (doctorId: string) => {
    try {
      // 1. Get patient ID if not already known
      const { data: patientData, error: patientError } = await supabase
        .from('patients')
        .select('id')
        .eq('profile_id', user?.id)
        .single();

      if (patientError || !patientData) {
        throw new Error("Profil patient non trouvé");
      }

      const channelName = `free-${doctorId}-${Date.now()}`;
      const accessCode = Math.random().toString(36).substring(2, 8).toUpperCase();

      // 2. Create session in DB so doctor can see and join
      const { error: sessionError } = await supabase
        .from('teleconsultation_sessions')
        .insert({
          doctor_id: doctorId,
          patient_id: patientData.id,
          channel_name: channelName,
          access_code: accessCode,
          status: 'pending' // 'pending' status is visible to doctors
        });

      if (sessionError) throw sessionError;

      // 3. Get Agora token
      const { data, error } = await supabase.functions.invoke('agora-token', {
        body: {
          channelName,
          role: 'publisher'
        }
      });

      if (error) throw error;

      setVideoSession({
        channelName,
        token: data.token,
        appId: data.appId,
        uid: data.uid,
        duration: 60, // 1 hour for free sessions
      });
      setIsInCall(true);

      toast({
        title: 'Session démarrée',
        description: `Vous êtes en consultation avec le code ${accessCode}.`,
      });
    } catch (error) {
      console.error('Error starting free session:', error);
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: 'Impossible de démarrer la session.',
      });
    }
  };

  const handleCallEnd = () => {
    setIsInCall(false);
    setVideoSession(null);
    toast({
      title: 'Appel terminé',
      description: 'La téléconsultation est terminée.',
    });
  };

  // If in a video call, show the video component
  if (isInCall && videoSession) {
    return (
      <VideoCall
        channelName={videoSession.channelName}
        token={videoSession.token}
        appId={videoSession.appId}
        uid={videoSession.uid}
        duration={videoSession.duration}
        onCallEnd={handleCallEnd}
      />
    );
  }

  return (
    <div className="h-full flex flex-col pt-4">
      {/* Header */}
      <div className="px-6 pb-6 border-b border-slate-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-primary/10">
              <Video className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="font-bold text-slate-900 text-lg">Médecins en ligne</h2>
              <p className="text-xs text-slate-500 font-medium">
                {onlineDoctors.length} médecin{onlineDoctors.length > 1 ? 's' : ''} disponible{onlineDoctors.length > 1 ? 's' : ''}
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10 rounded-xl hover:bg-slate-100"
            onClick={fetchOnlineDoctors}
            disabled={isLoading}
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
            ) : (
              <RefreshCw className="h-4 w-4 text-slate-400" />
            )}
          </Button>
        </div>
      </div>

      {/* Doctors List */}
      <ScrollArea className="flex-1 px-6">
        <div className="py-6 space-y-4 pb-24">
          {isLoading ? (
            <div className="text-center py-20 bg-slate-50/50 rounded-[2rem] border border-dashed border-slate-200">
              <div className="h-12 w-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin mx-auto mb-4" />
              <p className="text-slate-500 font-bold">Initialisation du tunnel sécurisé...</p>
            </div>
          ) : onlineDoctors.length === 0 ? (
            <div className="text-center py-20 bg-slate-50/50 rounded-[2rem] border border-dashed border-slate-200">
              <div className="h-20 w-20 bg-white rounded-[2rem] flex items-center justify-center mx-auto mb-6 shadow-xl shadow-slate-200/50 border border-slate-50">
                <Video className="h-10 w-10 text-slate-200" />
              </div>
              <p className="text-slate-900 font-black text-lg mb-2">Aucun médecin disponible</p>
              <p className="text-slate-500 text-sm max-w-xs mx-auto font-medium">
                Tous nos praticiens sont actuellement occupés. Veuillez réessayer dans quelques instants.
              </p>
            </div>
          ) : (
            <div className="grid gap-4">
              {onlineDoctors.map((doctor) => (
                <div key={doctor.id} className="hover-lift">
                  <TeleconsultationDoctorCard
                    doctor={doctor}
                    onEnterCode={handleEnterCode}
                    onBookTeleconsultation={handleBookTeleconsultation}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Dialogs */}
      <EnterCodeDialog
        open={enterCodeOpen}
        onClose={() => setEnterCodeOpen(false)}
        onCodeValid={handleCodeValid}
      />

      <TeleconsultationPaymentDialog
        open={paymentDialogOpen}
        onClose={() => {
          setPaymentDialogOpen(false);
          setSelectedDoctor(null);
        }}
        doctor={selectedDoctor}
        onStartFreeSession={handleStartFreeSession}
        onPaymentSuccess={async (channelName, accessCode) => {
          try {
            // Get Agora token for the newly paid session
            const { data, error } = await supabase.functions.invoke('agora-token', {
              body: {
                channelName: channelName,
                role: 'publisher'
              }
            });

            if (error) throw error;

            setVideoSession({
              channelName,
              token: data.token,
              appId: data.appId,
              uid: data.uid,
              duration: 30, // Get from session later if needed
            });
            setIsInCall(true);
            setPaymentDialogOpen(false);
          } catch (error) {
            console.error('Error starting video call after payment:', error);
            toast({
              variant: 'destructive',
              title: 'Erreur',
              description: 'Paiement validé, mais impossible de rejoindre la salle.',
            });
          }
        }}
      />
    </div>
  );
}
