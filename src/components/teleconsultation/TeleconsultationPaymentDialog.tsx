import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Video, Phone, CreditCard, Loader2, Clock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { ExternalLink, CheckCircle2, Star, ChevronRight, Smartphone } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface TeleconsultationPaymentDialogProps {
  open: boolean;
  onClose: () => void;
  doctor: {
    id: string;
    specialty: string;
    photo_url?: string | null;
    teleconsultation_price_per_minute?: number | null;
    teleconsultation_price_per_hour?: number | null;
    is_teleconsultation_free?: boolean;
    profile: {
      first_name: string;
      last_name: string;
    };
  } | null;
  onStartFreeSession: (doctorId: string) => void;
  onPaymentSuccess?: (channelName: string, accessCode: string) => void;
}

const DURATION_OPTIONS = [
  { value: '15', label: '15 minutes' },
  { value: '30', label: '30 minutes' },
  { value: '45', label: '45 minutes' },
  { value: '60', label: '1 heure' },
];

export function TeleconsultationPaymentDialog({
  open,
  onClose,
  doctor,
  onStartFreeSession,
  onPaymentSuccess
}: TeleconsultationPaymentDialogProps) {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [duration, setDuration] = useState('30');
  const [phone, setPhone] = useState(profile?.phone || '');
  const [isProcessing, setIsProcessing] = useState(false);

  // In-app payment state
  const [paymentUrl, setPaymentUrl] = useState<string | null>(null);
  const [showIframe, setShowIframe] = useState(false);
  const [isPaid, setIsPaid] = useState(false);
  const [sessionData, setSessionData] = useState<{ id: string; channel_name: string; access_code?: string } | null>(null);

  const pricePerMinute = doctor?.teleconsultation_price_per_minute || 100;
  const totalPrice = parseInt(duration) * pricePerMinute;
  const fullName = doctor ? `Dr. ${doctor.profile.first_name} ${doctor.profile.last_name}` : '';
  const initials = doctor ? `${doctor.profile.first_name[0]}${doctor.profile.last_name[0]}` : '';

  // Listen for payment confirmation via realtime
  useEffect(() => {
    if (!sessionData?.id || !open) return;

    console.log(`[Payment] Subscribing to session updates: ${sessionData.id}`);

    const channel = supabase
      .channel(`session_payment_${sessionData.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'teleconsultation_sessions',
          filter: `id=eq.${sessionData.id}`
        },
        (payload) => {
          console.log('[Payment] Session update received:', payload.new.status);
          if (payload.new.status === 'paid') {
            setIsPaid(true);
            setShowIframe(false);

            // Capture the access code from the database update
            setSessionData(prev => prev ? ({
              ...prev,
              access_code: payload.new.access_code
            }) : null);

            toast({
              title: "Paiement confirmé",
              description: "Votre consultation est prête à démarrer.",
            });

            // Auto close after success? Or let user click join
            setTimeout(() => {
              if (onPaymentSuccess) {
                onPaymentSuccess(payload.new.channel_name, payload.new.access_code);
              }
            }, 3000);
          } else if (payload.new.status === 'cancelled' || payload.new.status === 'failed') {
            setShowIframe(false);
            toast({
              variant: 'destructive',
              title: "Paiement non finalisé",
              description: "La transaction a été annulée ou a échoué.",
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionData?.id, open, onPaymentSuccess, toast]);

  const handlePayment = async () => {
    if (!phone.trim()) {
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: 'Veuillez entrer votre numéro de téléphone.',
      });
      return;
    }

    setIsProcessing(true);

    try {
      // Create teleconsultation session and initiate payment
      const { data, error } = await supabase.functions.invoke('teleconsultation-initialize', {
        body: {
          doctorId: doctor.id,
          duration: parseInt(duration),
          amount: totalPrice,
          customerPhone: phone,
          customerName: `${profile?.first_name} ${profile?.last_name}`,
        }
      });

      if (error) throw error;

      if (data?.paymentUrl) {
        setSessionData({
          id: data.sessionId,
          channel_name: data.channelName,
          // access_code: data.accessCode // REMOVED: for security, wait for realtime
        });
        setPaymentUrl(data.paymentUrl);
        setShowIframe(true);
      } else {
        throw new Error('URL de paiement non reçue');
      }
    } catch (error) {
      console.error('Error initiating payment:', error);
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: 'Impossible d\'initier le paiement. Réessayez.',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFreeSession = () => {
    onStartFreeSession(doctor.id);
    onClose();
  };

  if (!doctor) return null;

  return (
    <Dialog open={open} onOpenChange={(val) => !val && onClose()}>
      <DialogContent className={cn(
        "transition-all duration-300 ease-in-out p-0 border-none overflow-hidden !shadow-none",
        showIframe || isPaid
          ? "fixed inset-0 !max-w-none !w-[100vw] !h-[100vh] !m-0 !rounded-none !translate-x-0 !translate-y-0 !left-0 !top-0 z-[200] flex flex-col bg-white"
          : "sm:max-w-md rounded-[2rem] shadow-xl"
      )}>
        {/* Animated Header with Gradient - More compact for full screen */}
        <div className={cn(
          "relative overflow-hidden transition-all duration-500",
          isPaid ? "bg-gradient-to-r from-green-500 to-emerald-600 p-8" :
            showIframe ? "bg-white p-3 border-b flex items-center justify-between" :
              "bg-white p-6 border-b"
        )}>
          {isPaid && (
            <div className="absolute top-0 right-0 p-4 opacity-10">
              <CheckCircle2 className="h-24 w-24 text-white" />
            </div>
          )}

          {showIframe ? (
            <>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <CreditCard className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 tracking-tight flex items-center gap-2">
                    Paiement Sécurisé
                    <Badge className="bg-green-500 hover:bg-green-500 text-[8px] h-4 px-1 rounded-sm border-none uppercase">Protégé</Badge>
                  </h3>
                  <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">En cours sur MoneyFusion...</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 px-3 rounded-lg text-red-500 hover:bg-red-50 text-xs font-bold"
                onClick={() => setShowIframe(false)}
              >
                Annuler
              </Button>
            </>
          ) : (
            <div className="relative z-10 w-full">
              <DialogHeader>
                <DialogTitle className={cn(
                  "flex items-center gap-3 text-xl font-bold tracking-tight",
                  isPaid ? "text-white" : "text-slate-900"
                )}>
                  {isPaid ? (
                    <div className="bg-white/20 p-2 rounded-xl backdrop-blur-md">
                      <CheckCircle2 className="h-6 w-6 text-white" />
                    </div>
                  ) : (
                    <div className="p-2 rounded-xl bg-primary/10">
                      <Video className="h-6 w-6 text-primary" />
                    </div>
                  )}
                  {isPaid
                    ? 'Consultation Confirmée'
                    : doctor.is_teleconsultation_free
                      ? 'Rejoindre la Vidéo'
                      : 'Commander la Consultation'}
                </DialogTitle>
                <DialogDescription className={cn(
                  "mt-2 text-sm font-medium",
                  isPaid ? "text-white/80" : "text-slate-500"
                )}>
                  {isPaid
                    ? 'Votre session est prête à démarrer immédiatement.'
                    : doctor.is_teleconsultation_free
                      ? 'Accès gratuit offert par le praticien.'
                      : 'Sélectionnez la durée de votre échange avec le spécialiste.'
                  }
                </DialogDescription>
              </DialogHeader>
            </div>
          )}
        </div>

        <div className={cn(
          "flex-1 overflow-y-auto scrollbar-hide",
          showIframe ? "p-0 h-full flex flex-col bg-slate-50" : "p-6 bg-white"
        )}>
          {isPaid ? (
            <div className="flex flex-col items-center justify-center h-full text-center space-y-8 animate-in fade-in zoom-in duration-500 bg-white p-6">
              <div className="relative">
                <div className="absolute inset-0 bg-green-500 blur-2xl opacity-20 animate-pulse" />
                <div className="bg-white p-8 rounded-[2.5rem] border border-green-100 shadow-2xl relative">
                  <p className="text-xs text-green-600 font-bold uppercase tracking-[0.2em] mb-4">Code d'Accès Unique</p>
                  <div className="flex gap-2 justify-center">
                    {(sessionData?.access_code || '      ').split('').map((char, i) => (
                      <div key={i} className="w-10 h-14 bg-slate-50 rounded-xl flex items-center justify-center text-3xl font-mono font-black text-slate-800 shadow-inner border border-slate-100">
                        {char === ' ' ? '' : char}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-4 max-w-[280px]">
                <p className="text-slate-600 text-sm leading-relaxed">
                  Gardez ce code précieusement. Vous allez être redirigé vers la salle d'attente.
                </p>
                <div className="flex items-center justify-center gap-2 text-green-600 font-semibold animate-pulse">
                  <div className="w-2 h-2 bg-green-500 rounded-full" />
                  Redirection en cours...
                </div>
              </div>

              <Button
                className="w-full h-14 rounded-2xl bg-green-600 hover:bg-green-700 shadow-lg shadow-green-200 text-lg font-bold group"
                onClick={() => onPaymentSuccess?.(sessionData!.channel_name, sessionData!.access_code)}
              >
                Rejoindre Maintenant
                <ChevronRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
              </Button>
            </div>
          ) : showIframe ? (
            <div className="flex-1 w-full h-full relative bg-white">
              <iframe
                src={paymentUrl!}
                className="w-full h-full border-none"
                title="MoneyFusion Payment"
              />
            </div>
          ) : (
            <div className="space-y-6">
              {/* Premium Doctor Card */}
              <div className="relative group">
                <div className="absolute -inset-1 bg-gradient-to-r from-primary/20 to-blue-500/20 rounded-3xl blur opacity-25 group-hover:opacity-100 transition duration-1000" />
                <Card className="relative bg-white border-slate-100 rounded-3xl overflow-hidden shadow-sm">
                  <CardContent className="p-4 flex items-center gap-4">
                    <div className="relative">
                      <Avatar className="h-16 w-16 rounded-2xl shadow-md border-2 border-white">
                        <AvatarImage src={doctor.photo_url || undefined} />
                        <AvatarFallback className="bg-primary/10 text-primary text-xl font-bold">
                          {initials}
                        </AvatarFallback>
                      </Avatar>
                      <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 border-2 border-white rounded-full shadow-sm" />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900 leading-tight">{fullName}</h4>
                      <p className="text-sm text-slate-500 font-medium">{doctor.specialty}</p>
                      <div className="flex items-center gap-1.5 mt-1 text-slate-400">
                        <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                        <span className="text-[11px] font-bold">PRATICIEN VÉRIFIÉ</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {!doctor.is_teleconsultation_free && (
                <div className="space-y-6">
                  {/* Duration Selection - Modernized */}
                  <div className="space-y-3">
                    <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Durée Prévue</Label>
                    <div className="grid grid-cols-2 gap-3">
                      {DURATION_OPTIONS.map(option => (
                        <div
                          key={option.value}
                          onClick={() => setDuration(option.value)}
                          className={cn(
                            "cursor-pointer p-3 rounded-2xl border-2 transition-all flex items-center justify-between",
                            duration === option.value
                              ? "border-primary bg-primary/5 shadow-md shadow-primary/5"
                              : "border-slate-100 bg-white hover:border-slate-200"
                          )}
                        >
                          <div className="flex items-center gap-2">
                            <Clock className={cn("h-4 w-4", duration === option.value ? "text-primary" : "text-slate-400")} />
                            <span className={cn("text-sm font-bold", duration === option.value ? "text-slate-900" : "text-slate-600")}>
                              {option.label.split(' ')[0]} min
                            </span>
                          </div>
                          {duration === option.value && (
                            <div className="w-2 h-2 bg-primary rounded-full" />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Action Buttons - Premium styling */}
              <div className="flex flex-col gap-3 pt-2">
                {doctor.is_teleconsultation_free ? (
                  <Button
                    className="w-full h-14 rounded-2xl bg-gradient-to-r from-green-600 to-emerald-600 hover:shadow-lg hover:shadow-green-100 transition-all text-lg font-bold group"
                    onClick={handleFreeSession}
                  >
                    Démarrer Gratuitement
                    <Video className="ml-2 h-5 w-5 group-hover:scale-110 transition-transform" />
                  </Button>
                ) : (
                  <Button
                    className="w-full h-14 rounded-2xl bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20 transition-all text-lg font-bold disabled:opacity-70 group"
                    onClick={handlePayment}
                    disabled={isProcessing}
                  >
                    {isProcessing ? (
                      <Loader2 className="h-6 w-6 animate-spin" />
                    ) : (
                      <>
                        Confirmer et Payer ({totalPrice.toLocaleString()} FCFA)
                        <CreditCard className="ml-2 h-5 w-5 group-hover:-rotate-12 transition-transform" />
                      </>
                    )}
                  </Button>
                )}
                <Button
                  variant="ghost"
                  className="w-full h-12 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 font-medium"
                  onClick={onClose}
                  disabled={isProcessing}
                >
                  Annuler la demande
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
