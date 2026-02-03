import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { Loader2, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useEffect } from "react";
import { CreditCard, CheckCircle2, ChevronRight, Video } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface PaymentModalProps {
    isOpen: boolean;
    onClose: () => void;
    onPaymentSuccess: (code: string) => void;
    amount: number;
    doctorName: string;
    doctorId: string;
}

export function PaymentModal({ isOpen, onClose, onPaymentSuccess, amount, doctorName, doctorId }: PaymentModalProps) {
    const [phone, setPhone] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const { user } = useAuth();

    const [paymentUrl, setPaymentUrl] = useState<string | null>(null);
    const [showIframe, setShowIframe] = useState(false);
    const [isPaid, setIsPaid] = useState(false);
    const [sessionData, setSessionData] = useState<{ id: string; channel_name: string; access_code?: string } | null>(null);

    // Listen for payment confirmation via realtime
    useEffect(() => {
        if (!sessionData?.id || !isOpen) return;

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
                    if (payload.new.status === 'paid') {
                        setIsPaid(true);
                        setShowIframe(false);

                        setSessionData(prev => prev ? ({
                            ...prev,
                            access_code: payload.new.access_code
                        }) : null);

                        toast.success("Paiement confirmé !");

                        setTimeout(() => {
                            if (onPaymentSuccess) {
                                onPaymentSuccess(payload.new.access_code);
                            }
                        }, 3000);
                    } else if (payload.new.status === 'cancelled' || payload.new.status === 'failed') {
                        setShowIframe(false);
                        toast.error("Le paiement a été annulé ou a échoué.");
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [sessionData?.id, isOpen, onPaymentSuccess]);

    const handlePayment = async () => {
        setIsLoading(true);

        try {
            const { data, error } = await supabase.functions.invoke('teleconsultation-initialize', {
                body: {
                    doctorId: doctorId,
                    amount: amount,
                    duration: 30, // Default duration if not specified
                    customerPhone: phone,
                    customerName: user?.email || "Patient",
                }
            });

            if (error) throw error;

            if (data?.paymentUrl) {
                setSessionData({
                    id: data.sessionId,
                    channel_name: data.channelName,
                });
                setPaymentUrl(data.paymentUrl);
                setShowIframe(true);
            } else {
                throw new Error('URL de paiement non reçue');
            }
        } catch (error) {
            console.error("Payment error:", error);
            toast.error("Erreur lors de l'initiation du paiement");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={(val) => !val && onClose()}>
            <DialogContent className={cn(
                "transition-all duration-300 ease-in-out p-0 border-none overflow-hidden !shadow-none",
                showIframe || isPaid
                    ? "fixed inset-0 !max-w-none !w-[100vw] !h-[100vh] !m-0 !rounded-none !translate-x-0 !translate-y-0 !left-0 !top-0 z-[200] flex flex-col bg-white"
                    : "sm:max-w-md rounded-[2rem] shadow-xl"
            )}>
                {/* Header Section */}
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
                        <DialogHeader>
                            <DialogTitle>Paiement de la téléconsultation</DialogTitle>
                            <DialogDescription>
                                Vous allez effectuer un paiement de {amount} FCFA pour une consultation avec Dr. {doctorName}.
                            </DialogDescription>
                        </DialogHeader>
                    )}
                </div>

                <div className={cn(
                    "flex-1 overflow-y-auto scrollbar-hide",
                    showIframe ? "p-0 h-full flex flex-col bg-slate-50" : "p-6 bg-white"
                )}>
                    {isPaid ? (
                        <div className="flex flex-col items-center justify-center h-full text-center space-y-8 bg-white p-6">
                            <div className="relative">
                                <div className="absolute inset-0 bg-green-500 blur-2xl opacity-20 animate-pulse" />
                                <div className="bg-white p-8 rounded-[2.5rem] border border-green-100 shadow-2xl relative text-center">
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
                                    Gardez ce code précieusement. Votre session démarre dans quelques instants.
                                </p>
                                <div className="flex items-center justify-center gap-2 text-green-600 font-semibold animate-pulse">
                                    <div className="w-2 h-2 bg-green-500 rounded-full" />
                                    Finalisation en cours...
                                </div>
                            </div>
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
                            <div className="p-4 bg-primary/5 rounded-2xl border border-primary/10">
                                <p className="text-sm text-slate-600 text-center font-medium">
                                    Cliquez sur le bouton ci-dessous pour lancer le paiement sécurisé via MoneyFusion.
                                    Aucune redirection vers un site externe ne sera nécessaire.
                                </p>
                            </div>

                            <Button
                                className="w-full h-16 rounded-2xl bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20 transition-all text-lg font-bold group"
                                onClick={handlePayment}
                                disabled={isLoading}
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
            </DialogContent>
        </Dialog>
    );
}
