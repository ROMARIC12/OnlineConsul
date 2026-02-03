import { useState, useRef, useEffect } from 'react';
import { Loader2, CreditCard, Smartphone, CheckCircle2, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { ChevronRight } from 'lucide-react';

interface MoneyFusionPaymentProps {
  amount: number;
  appointmentId: string;
  patientId: string;
  customerName: string;
  customerPhone: string;
  onSuccess?: (transactionRef: string) => void;
  onError?: (error: string) => void;
}

export function MoneyFusionPayment({
  amount,
  appointmentId,
  patientId,
  customerName,
  customerPhone,
  onSuccess,
  onError,
}: MoneyFusionPaymentProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [phone, setPhone] = useState(customerPhone || '');
  const formRef = useRef<HTMLFormElement>(null);
  const [formData, setFormData] = useState<{
    paymentUrl: string;
    totalPrice: number;
    article: string;
    numeroSend: string;
    nomclient: string;
    personal_Info: string;
    return_url: string;
    webhook_url: string;
  } | null>(null);
  const [showIframe, setShowIframe] = useState(false);
  const [isPaid, setIsPaid] = useState(false);

  // Listen for payment confirmation via realtime
  useEffect(() => {
    if (!formData || !showIframe) return;

    // The personal_Info field contains the payment info
    let paymentId = '';
    try {
      const info = JSON.parse(formData.personal_Info);
      paymentId = Array.isArray(info) ? info[0].paymentId : info.paymentId;
    } catch (e) {
      console.error('[MoneyFusion] Error parsing personal_Info:', e);
      return;
    }

    if (!paymentId) return;

    console.log(`[MoneyFusion] Subscribing to payment updates: ${paymentId}`);

    const channel = supabase
      .channel(`payment_status_${paymentId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'payments',
          filter: `id=eq.${paymentId}`
        },
        (payload) => {
          console.log('[MoneyFusion] Payment update received:', payload.new.status);
          if (payload.new.status === 'success') {
            setIsPaid(true);
            setShowIframe(false);
            toast({
              title: "Paiement confirmé",
              description: "Votre paiement a été validé avec succès.",
            });

            if (onSuccess) {
              onSuccess(payload.new.transaction_ref || payload.new.id);
            }
          } else if (payload.new.status === 'failed') {
            setShowIframe(false);
            toast({
              variant: 'destructive',
              title: "Paiement échoué",
              description: "Votre transaction n'a pas pu être validée.",
            });
            if (onError) onError('Paiement échoué');
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [formData, showIframe, onSuccess, toast]);

  const handlePayment = async () => {
    if (!phone) {
      toast({
        variant: 'destructive',
        title: 'Numéro requis',
        description: 'Veuillez entrer votre numéro de téléphone.',
      });
      return;
    }

    setIsLoading(true);

    try {
      console.log('[MoneyFusion] Initiating payment...', {
        amount,
        appointmentId,
        patientId,
        customerName,
        phone,
      });

      // Call edge function to initialize payment
      const { data, error } = await supabase.functions.invoke('moneyfusion-initialize', {
        body: {
          amount,
          appointmentId,
          patientId,
          customerName,
          customerPhone: phone,
        },
      });

      if (error) {
        console.error('[MoneyFusion] Edge function error:', error);
        throw new Error(error.message || 'Erreur lors de l\'initialisation du paiement');
      }

      if (!data?.success) {
        console.error('[MoneyFusion] Payment initialization failed:', data);
        throw new Error(data?.error || 'Erreur lors de l\'initialisation du paiement');
      }

      console.log('[MoneyFusion] Payment initialized:', data);

      // Store payment info for callback page
      sessionStorage.setItem('pendingPayment', JSON.stringify({
        paymentId: data.paymentId,
        appointmentId,
        amount,
        customerName,
      }));

      // Set form data and show iframe
      setFormData({
        paymentUrl: data.paymentUrl,
        ...data.formData,
      });

      setShowIframe(true);

      // Submit the form to the iframe target after state update
      setTimeout(() => {
        if (formRef.current) {
          console.log('[MoneyFusion] Submitting form to iframe...');
          formRef.current.submit();
        }
      }, 300);

    } catch (error: any) {
      console.error('[MoneyFusion] Payment error:', error);
      setIsLoading(false);

      toast({
        variant: 'destructive',
        title: 'Erreur de paiement',
        description: error.message || 'Une erreur est survenue lors du paiement.',
      });

      onError?.(error.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Hidden form for MoneyFusion POST submission */}
      {formData && (
        <form
          ref={formRef}
          method="POST"
          action={formData.paymentUrl}
          target="moneyfusion-iframe"
          style={{ display: 'none' }}
        >
          <input type="hidden" name="totalPrice" value={formData.totalPrice} />
          <input type="hidden" name="article" value={formData.article} />
          <input type="hidden" name="numeroSend" value={formData.numeroSend} />
          <input type="hidden" name="nomclient" value={formData.nomclient} />
          <input type="hidden" name="personal_Info" value={formData.personal_Info} />
          <input type="hidden" name="return_url" value={formData.return_url} />
          <input type="hidden" name="webhook_url" value={formData.webhook_url} />
        </form>
      )}

      {isPaid ? (
        <div className="py-16 text-center space-y-6 bg-gradient-to-b from-white to-green-50/30 rounded-[2.5rem] border border-green-100 shadow-xl p-8 animate-in fade-in zoom-in duration-700">
          <div className="relative mx-auto w-24 h-24">
            <div className="absolute inset-0 bg-green-500 blur-2xl opacity-20 animate-pulse" />
            <div className="relative bg-white w-24 h-24 rounded-3xl shadow-lg border border-green-100 flex items-center justify-center">
              <CheckCircle2 className="h-12 w-12 text-green-600" />
            </div>
          </div>
          <div>
            <h3 className="text-2xl font-black text-slate-900 tracking-tight">Paiement Réussi</h3>
            <p className="text-slate-500 mt-2 font-medium">Votre transaction a été validée avec succès.</p>
          </div>
        </div>
      ) : showIframe ? (
        <div className="fixed inset-0 !z-[200] !max-w-none !w-[100vw] !h-[100vh] !m-0 !rounded-none !translate-x-0 !translate-y-0 !left-0 !top-0 bg-white flex flex-col animate-in fade-in duration-500">
          <div className="bg-white p-3 border-b flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <CreditCard className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 tracking-tight flex items-center gap-2">
                  Paiement Sécurisé
                  <span className="bg-green-500 text-white text-[8px] h-4 px-1 rounded-sm flex items-center justify-center font-bold uppercase transition-all">Protégé</span>
                </h3>
                <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Transaction pour rdv medical</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 px-3 rounded-lg text-red-500 hover:bg-red-50 text-xs font-bold"
              onClick={() => setShowIframe(false)}
            >
              Quitter
            </Button>
          </div>
          <div className="flex-1 w-full h-full relative bg-slate-50">
            <iframe
              name="moneyfusion-iframe"
              className="w-full h-full border-none bg-white"
              title="Portail de paiement"
            />
          </div>
        </div>
      ) : (
        <div className="space-y-6 animate-in fade-in duration-500">
          <Button
            onClick={handlePayment}
            disabled={isLoading || !phone}
            className="w-full h-16 rounded-2xl bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20 transition-all text-lg font-bold group"
          >
            {isLoading ? (
              <Loader2 className="h-6 w-6 animate-spin text-white" />
            ) : (
              <>
                Payer Maintenant ({amount.toLocaleString()} FCFA)
                <ChevronRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </>
            )}
          </Button>

          <div className="flex items-center justify-center gap-2 text-[10px] text-slate-400 font-bold uppercase tracking-widest">
            <div className="w-1 h-1 bg-slate-300 rounded-full" />
            Paiement 100% Sécurisé via MoneyFusion
            <div className="w-1 h-1 bg-slate-300 rounded-full" />
          </div>
        </div>
      )}
    </div>
  );
}
