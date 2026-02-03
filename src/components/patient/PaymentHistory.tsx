import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CreditCard, Receipt, XCircle, Clock, CheckCircle2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ReceiptCard } from './ReceiptCard';
import { cn } from '@/lib/utils';

interface Payment {
  id: string;
  amount: number;
  payment_type: 'deposit' | 'balance';
  status: 'pending' | 'success' | 'failed';
  provider: string | null;
  transaction_ref: string | null;
  created_at: string;
  paid_at: string | null;
  appointment: {
    appointment_date: string;
    doctor: {
      specialty: string;
      profile: {
        first_name: string;
        last_name: string;
      };
    };
    clinic?: {
      name: string;
    } | null;
  };
}

export function PaymentHistory() {
  const { user, profile } = useAuth();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchPayments = async () => {
      if (!user) return;

      try {
        // Get patient ID
        const { data: patient } = await supabase
          .from('patients')
          .select('id')
          .eq('profile_id', user.id)
          .single();

        if (!patient) return;

        const { data } = await supabase
          .from('payments')
          .select(`
            id,
            amount,
            payment_type,
            status,
            provider,
            transaction_ref,
            created_at,
            paid_at,
            appointment:appointments(
              appointment_date,
              doctor:doctors(
                specialty,
                profile:profiles(first_name, last_name)
              ),
              clinic:clinics(name)
            )
          `)
          .eq('patient_id', patient.id)
          .order('created_at', { ascending: false });

        setPayments(data || []);
      } catch (error) {
        console.error('Error fetching payments:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPayments();
  }, [user]);

  const handleCancelPayment = async (paymentId: string) => {
    try {
      const { error } = await supabase
        .from('payments')
        .update({ status: 'failed' }) // or 'cancelled' if your DB supports it, but following existing enum
        .eq('id', paymentId);

      if (error) throw error;

      setPayments(prev => prev.map(p =>
        p.id === paymentId ? { ...p, status: 'failed' } : p
      ));

      toast.success("Paiement annulé avec succès");
    } catch (error) {
      console.error('Error cancelling payment:', error);
      toast.error("Erreur lors de l'annulation");
    }
  };

  const patientName = profile ? `${profile.first_name} ${profile.last_name}` : '';

  // Filter only successful payments for receipts
  const successfulPayments = payments.filter(p => p.status === 'success');
  const pendingPayments = payments.filter(p => p.status === 'pending');

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Receipt className="h-5 w-5" />
          Mes reçus et paiements
        </CardTitle>
        <CardDescription>
          Vos transactions et reçus de paiement
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-muted-foreground text-center py-4">Chargement...</p>
        ) : payments.length === 0 ? (
          <div className="text-center py-8">
            <CreditCard className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
            <p className="text-muted-foreground">Aucun paiement</p>
          </div>
        ) : (
          <ScrollArea className="h-[500px] pr-4">
            <div className="space-y-6">
              {/* Pending payments section */}
              {pendingPayments.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-amber-600 uppercase tracking-wider flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      En attente ({pendingPayments.length})
                    </h3>
                  </div>
                  {pendingPayments.map((payment) => (
                    <Card key={payment.id} className="border-amber-100 bg-amber-50/30 overflow-hidden group">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-bold text-lg text-slate-900">
                                {payment.amount.toLocaleString()} FCFA
                              </span>
                              <Badge variant="outline" className="border-amber-200 text-amber-700 bg-amber-50 text-[10px] uppercase font-bold">
                                Temporaire
                              </Badge>
                            </div>
                            <p className="text-sm text-slate-600 font-medium">
                              {payment.appointment?.doctor?.profile?.first_name ? `Dr. ${payment.appointment.doctor.profile.first_name} ${payment.appointment.doctor.profile.last_name}` : 'Consultation'}
                            </p>
                            <p className="text-xs text-slate-400 mt-1">
                              Initié le {format(new Date(payment.created_at), 'dd MMM yyyy à HH:mm', { locale: fr })}
                            </p>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-10 px-4 rounded-xl text-red-500 hover:bg-red-50 hover:text-red-600 font-bold gap-2"
                            onClick={() => handleCancelPayment(payment.id)}
                          >
                            <XCircle className="h-4 w-4" />
                            Annuler
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              {/* Successful payments section */}
              <div className="space-y-3">
                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4" />
                  Historique des reçus
                </h3>
                {successfulPayments.length > 0 ? (
                  successfulPayments.map((payment) => (
                    <ReceiptCard
                      key={payment.id}
                      receipt={{
                        id: payment.id,
                        amount: payment.amount,
                        transaction_ref: payment.transaction_ref,
                        paid_at: payment.paid_at,
                        created_at: payment.created_at,
                        payment_type: payment.payment_type,
                        doctor_name: payment.appointment?.doctor?.profile?.first_name ? `Dr. ${payment.appointment.doctor.profile.first_name} ${payment.appointment.doctor.profile.last_name}` : 'Consultation',
                        specialty: payment.appointment?.doctor?.specialty || '',
                        appointment_date: payment.appointment?.appointment_date || '',
                        clinic_name: payment.appointment?.clinic?.name,
                      }}
                      patientName={patientName}
                      patientEmail={user?.email}
                    />
                  ))
                ) : (
                  <div className="text-center py-10 bg-slate-50 rounded-[2rem] border border-dashed border-slate-200">
                    <AlertCircle className="h-8 w-8 mx-auto text-slate-300 mb-2" />
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Aucun reçu disponible</p>
                  </div>
                )}
              </div>
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
