import { useState, useEffect } from "react";
import { DoctorCard } from "@/components/teleconsultation/DoctorCard";
import { PaymentModal } from "@/components/teleconsultation/PaymentModal";
import { VideoCall } from "@/components/teleconsultation/VideoCall";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Loader2, Users, Calendar, Video as VideoIcon } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

export default function Teleconsultation() {
    const [view, setView] = useState<'list' | 'video'>('list');
    const [doctors, setDoctors] = useState<any[]>([]);
    const [pendingSessions, setPendingSessions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedDoctor, setSelectedDoctor] = useState<any>(null);
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const [isCodeModalOpen, setIsCodeModalOpen] = useState(false);
    const [accessCode, setAccessCode] = useState("");
    const [channelName, setChannelName] = useState("");

    const [agoraToken, setAgoraToken] = useState<string | null>(null);
    const [agoraUid, setAgoraUid] = useState<number | string | undefined>(undefined);
    const [agoraAppId, setAgoraAppId] = useState<string>("1b30ee5f491f4a7aaf65292e5a857d53");

    const { profile, user, role } = useAuth();
    const [searchParams] = useSearchParams();

    useEffect(() => {
        const channelParam = searchParams.get("channel");
        const roleParam = searchParams.get("role");

        if (channelParam && roleParam === "doctor") {
            const initDoctorCall = async () => {
                try {
                    setChannelName(channelParam);
                    setSelectedDoctor({ id: 'current-doctor', first_name: 'Médecin', last_name: '' });

                    // Fetch token for the channel from URL
                    await fetchAgoraToken(channelParam);

                    setView('video');
                } catch (err) {
                    console.error("Error initializing doctor call from link:", err);
                    toast.error("Lien de consultation invalide ou expiré");
                }
            };
            initDoctorCall();
        }
    }, [searchParams]);

    useEffect(() => {
        if (role === 'patient') {
            fetchDoctors();

            const channel = supabase
                .channel('public:doctors')
                .on('postgres_changes', { event: '*', schema: 'public', table: 'doctors' }, (payload) => {
                    fetchDoctors();
                })
                .subscribe();

            return () => {
                supabase.removeChannel(channel);
            };
        } else if (role === 'doctor') {
            fetchPendingSessions();

            const channel = supabase
                .channel('public:teleconsultation_sessions')
                .on('postgres_changes', { event: '*', schema: 'public', table: 'teleconsultation_sessions' }, (payload) => {
                    fetchPendingSessions();
                    if (payload.eventType === 'INSERT') {
                        toast.success("Un nouveau patient vient de rejoindre la salle d'attente.");
                    }
                })
                .subscribe();

            return () => {
                supabase.removeChannel(channel);
            };
        }
    }, [profile, role]);

    const fetchPendingSessions = async () => {
        if (!user) return;
        try {
            setLoading(true);
            const { data: doctorData } = await supabase
                .from('doctors')
                .select('id')
                .eq('profile_id', user.id)
                .single();

            if (!doctorData) return;

            const { data, error } = await supabase
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

            if (error) throw error;
            setPendingSessions(data || []);
        } catch (error) {
            console.error("Error fetching sessions:", error);
            toast.error("Erreur lors du chargement des patients en attente");
        } finally {
            setLoading(false);
        }
    };

    const fetchDoctors = async () => {
        try {
            const { data, error } = await supabase
                .from('doctors')
                .select(`
                    *,
                    profiles:profile_id (
                        first_name,
                        last_name
                    )
                `);

            if (error) throw error;

            const formattedDoctors = data.map(doc => ({
                ...doc,
                first_name: doc.profiles?.first_name || "",
                last_name: doc.profiles?.last_name || "",
            }));

            setDoctors(formattedDoctors);
        } catch (error) {
            console.error("Error fetching doctors:", error);
            toast.error("Erreur lors du chargement des médecins");
        } finally {
            setLoading(false);
        }
    };

    const handleStartConsultation = (doctorId: string) => {
        const doctor = doctors.find(d => d.id === doctorId);
        if (doctor) {
            setSelectedDoctor(doctor);
            startVideoSession(doctor);
        }
    };

    const handlePay = (doctor: any) => {
        setSelectedDoctor(doctor);
        setIsPaymentModalOpen(true);
    };

    const handlePaymentSuccess = (code: string) => {
        toast.success(`Paiement réussi ! Votre code d'accès est : ${code}`, {
            duration: 10000,
        });
    };

    const handleEnterCode = (doctorId: string) => {
        const doctor = doctors.find(d => d.id === doctorId);
        setSelectedDoctor(doctor);
        setAccessCode("");
        setIsCodeModalOpen(true);
    };

    const verifyCodeAndStart = async () => {
        if (accessCode.length < 4) {
            toast.error("Code invalide");
            return;
        }

        try {
            const thirtyMinsAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();

            const { data: session, error } = await supabase
                .from('teleconsultation_sessions')
                .select('*')
                .eq('access_code', accessCode.toUpperCase())
                .eq('doctor_id', selectedDoctor.id)
                .gte('created_at', thirtyMinsAgo)
                .single();

            if (error || !session) {
                toast.error("Code invalide ou expiré (valable 30 min)");
                return;
            }

            // Fetch Agora token before joining
            await fetchAgoraToken(session.channel_name);
            setIsCodeModalOpen(false);
            startVideoSession(selectedDoctor, session.channel_name);
        } catch (err) {
            console.error("Error verifying code:", err);
            toast.error("Erreur de vérification");
        }
    };

    const startVideoSession = async (doctor: any, existingChannel?: string) => {
        try {
            let channel = existingChannel;

            if (!channel) {
                const { data: patientData, error: patientError } = await supabase
                    .from('patients')
                    .select('id')
                    .eq('profile_id', user?.id)
                    .single();

                if (patientError || !patientData) {
                    throw new Error("Patient profile not found");
                }

                channel = `consultation-${doctor.id}-${Date.now()}`;
                const code = Math.random().toString(36).substring(2, 8).toUpperCase();

                const { error } = await supabase
                    .from('teleconsultation_sessions')
                    .insert({
                        doctor_id: doctor.id,
                        patient_id: patientData.id,
                        channel_name: channel,
                        access_code: code,
                        status: 'pending'
                    });

                if (error) throw error;
            }

            // Fetch Agora token before joining
            await fetchAgoraToken(channel);

            setChannelName(channel);
            setView('video');
            toast.success("Démarrage de la salle de consultation...");
        } catch (err) {
            console.error("Error starting session:", err);
            toast.error("Erreur lors du démarrage de la consultation");
        }
    };

    const handleJoinSession = async (session: any) => {
        // Fetch Agora token before joining
        await fetchAgoraToken(session.channel_name);

        setChannelName(session.channel_name);

        setSelectedDoctor({
            id: session.doctor_id,
            first_name: session.patient?.profile?.first_name || 'Patient',
            last_name: session.patient?.profile?.last_name || ''
        });

        setView('video');
        toast.success("Rejoint la salle de consultation...");
    };

    const fetchAgoraToken = async (channel: string) => {
        try {
            console.log(`[VideoCall] Fetching token for channel: ${channel}`);

            // Explicitly get the session to ensure we have a token
            const { data: { session } } = await supabase.auth.getSession();

            console.log(`[VideoCall] Session present: ${!!session}, Local User ID: ${user?.id}`);

            if (!session) {
                console.error("[VideoCall] No active session found");
                toast.error("Votre session a expiré. Veuillez vous reconnecter.");
                throw new Error("No active session");
            }

            const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/agora-token`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
                    'Authorization': `Bearer ${session.access_token}`
                },
                body: JSON.stringify({
                    channelName: channel,
                    role: 'publisher'
                })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || `HTTP ${response.status}`);
            }

            const data = await response.json();

            setAgoraToken(data.token);
            setAgoraAppId(data.appId || "1b30ee5f491f4a7aaf65292e5a857d53");
            setAgoraUid(data.uid);
            return data;
        } catch (error: any) {
            console.error("Error fetching Agora token:", error);
            const status = error.status || error.message;
            toast.error(`Erreur d'initialisation de la vidéo (${status}). Vérifiez vos Secrets Agora sur Supabase.`);
            throw error;
        }
    };

    if (view === 'video' && selectedDoctor) {
        return (
            <VideoCall
                appId={agoraAppId}
                channelName={channelName}
                token={agoraToken}
                uid={agoraUid}
                onCallEnd={() => setView('list')}
            />
        );
    }

    return (
        <div className="container mx-auto p-6 space-y-6">
            <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                    <h1 className="text-3xl font-bold tracking-tight">Téléconsultation</h1>
                    <span className="bg-green-100 text-green-700 text-xs font-bold px-2 py-1 rounded uppercase">Sécurisé P2P</span>
                </div>
                <p className="text-muted-foreground">
                    Consultez nos médecins en ligne directement depuis votre domicile via une connexion sécurisée.
                </p>
            </div>

            {loading ? (
                <div className="flex justify-center py-10">
                    <Loader2 className="h-10 w-10 animate-spin text-primary" />
                </div>
            ) : role === 'doctor' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {pendingSessions.map((session) => (
                        <div key={session.id} className="bg-white border rounded-lg p-6 shadow-sm flex flex-col gap-4">
                            <div className="flex justify-between items-start">
                                <div className="flex flex-col">
                                    <span className="font-bold text-lg">
                                        {session.patient?.profile?.first_name} {session.patient?.profile?.last_name}
                                    </span>
                                    <span className="text-sm text-muted-foreground flex items-center gap-1">
                                        <Calendar className="h-4 w-4" />
                                        Inscrit le {new Date(session.created_at).toLocaleTimeString()}
                                    </span>
                                </div>
                                <div className="bg-primary/10 text-primary px-2 py-1 rounded text-xs font-bold uppercase">
                                    {session.status}
                                </div>
                            </div>
                            <div className="bg-slate-50 p-3 rounded text-sm font-mono text-center border">
                                Code: {session.access_code}
                            </div>
                            <Button className="w-full gap-2" onClick={() => handleJoinSession(session)}>
                                <VideoIcon className="h-4 w-4" />
                                Rejoindre la consultation
                            </Button>
                        </div>
                    ))}
                    {pendingSessions.length === 0 && (
                        <div className="col-span-full text-center py-10 text-muted-foreground bg-slate-50 border border-dashed rounded-lg">
                            <Users className="h-10 w-10 mx-auto mb-2 opacity-20" />
                            Aucun patient en attente pour le moment.
                        </div>
                    )}
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {doctors.map((doctor) => (
                        <DoctorCard
                            key={doctor.id}
                            doctor={doctor}
                            onStart={handleStartConsultation}
                            onPay={handlePay}
                            onEnterCode={handleEnterCode}
                        />
                    ))}
                    {doctors.length === 0 && (
                        <div className="col-span-full text-center py-10 text-muted-foreground">
                            Aucun médecin disponible pour le moment.
                        </div>
                    )}
                </div>
            )}

            {selectedDoctor && (
                <PaymentModal
                    isOpen={isPaymentModalOpen}
                    onClose={() => setIsPaymentModalOpen(false)}
                    onPaymentSuccess={handlePaymentSuccess}
                    amount={selectedDoctor.teleconsultation_price_per_minute || 5000}
                    doctorName={`${selectedDoctor.first_name} ${selectedDoctor.last_name}`}
                    doctorId={selectedDoctor.id}
                />
            )}

            <Dialog open={isCodeModalOpen} onOpenChange={setIsCodeModalOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Entrer le code d'accès</DialogTitle>
                        <DialogDescription>
                            Entrez le code reçu après votre paiement pour accéder à la consultation.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                        <Input
                            value={accessCode}
                            onChange={(e) => setAccessCode(e.target.value)}
                            placeholder="Ex: AB12CD"
                            className="text-center text-lg tracking-widest uppercase"
                        />
                    </div>
                    <DialogFooter>
                        <Button onClick={verifyCodeAndStart}>Valider</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
