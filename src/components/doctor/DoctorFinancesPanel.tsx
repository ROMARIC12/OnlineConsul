import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TrendingUp, CreditCard, Calendar, Download } from 'lucide-react';
import { format, startOfMonth, endOfMonth, startOfDay, endOfDay } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Button } from '@/components/ui/button';

interface Payment {
  id: string;
  amount: number;
  status: string;
  payment_type: string;
  paid_at: string | null;
  created_at: string;
  patient: {
    profile: {
      first_name: string;
      last_name: string;
    };
  };
}

interface DoctorFinancesPanelProps {
  doctorId: string;
}

export function DoctorFinancesPanel({ doctorId }: DoctorFinancesPanelProps) {
  const [todayRevenue, setTodayRevenue] = useState(0);
  const [monthlyRevenue, setMonthlyRevenue] = useState(0);
  const [recentPayments, setRecentPayments] = useState<Payment[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchFinances = async () => {
      try {
        const today = new Date();
        const todayStart = format(startOfDay(today), 'yyyy-MM-dd');
        const monthStart = format(startOfMonth(today), 'yyyy-MM-dd');
        const monthEnd = format(endOfMonth(today), 'yyyy-MM-dd');

        // Fetch payments for this doctor's appointments
        const { data: appointments } = await supabase
          .from('appointments')
          .select('id')
          .eq('doctor_id', doctorId);

        if (!appointments || appointments.length === 0) {
          setIsLoading(false);
          return;
        }

        const appointmentIds = appointments.map((a) => a.id);

        // Fetch payments
        const { data: payments } = await supabase
          .from('payments')
          .select(`
            id,
            amount,
            status,
            payment_type,
            paid_at,
            created_at,
            appointment:appointments(
              patient:patients(
                profile:profiles(first_name, last_name)
              )
            )
          `)
          .in('appointment_id', appointmentIds)
          .eq('status', 'success')
          .order('paid_at', { ascending: false });

        // Calculate revenues
        let todayTotal = 0;
        let monthTotal = 0;
        const processedPayments: Payment[] = [];

        payments?.forEach((p: any) => {
          const paidDate = p.paid_at ? format(new Date(p.paid_at), 'yyyy-MM-dd') : null;
          
          if (paidDate === todayStart) {
            todayTotal += p.amount;
          }
          if (paidDate && paidDate >= monthStart && paidDate <= monthEnd) {
            monthTotal += p.amount;
          }

          processedPayments.push({
            id: p.id,
            amount: p.amount,
            status: p.status,
            payment_type: p.payment_type,
            paid_at: p.paid_at,
            created_at: p.created_at,
            patient: p.appointment?.patient,
          });
        });

        setTodayRevenue(todayTotal);
        setMonthlyRevenue(monthTotal);
        setRecentPayments(processedPayments.slice(0, 20));
      } catch (error) {
        console.error('Error fetching finances:', error);
      } finally {
        setIsLoading(false);
      }
    };

    if (doctorId) {
      fetchFinances();
    }
  }, [doctorId]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Finances
        </CardTitle>
        <CardDescription>Suivi de vos revenus</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-muted-foreground text-center py-4">Chargement...</p>
        ) : (
          <div className="space-y-4">
            {/* Revenue Summary */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-xs text-green-600 font-medium">Aujourd'hui</p>
                <p className="text-xl font-bold text-green-700">
                  {todayRevenue.toLocaleString()} FCFA
                </p>
              </div>
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-xs text-blue-600 font-medium">Ce mois</p>
                <p className="text-xl font-bold text-blue-700">
                  {monthlyRevenue.toLocaleString()} FCFA
                </p>
              </div>
            </div>

            {/* Recent Payments */}
            <div>
              <h4 className="font-medium text-sm mb-2">Paiements récents</h4>
              {recentPayments.length === 0 ? (
                <p className="text-muted-foreground text-sm text-center py-4">
                  Aucun paiement récent
                </p>
              ) : (
                <ScrollArea className="h-[200px]">
                  <div className="space-y-2">
                    {recentPayments.map((payment) => (
                      <div
                        key={payment.id}
                        className="flex items-center justify-between p-2 bg-muted/50 rounded-lg text-sm"
                      >
                        <div>
                          <p className="font-medium">
                            {payment.patient?.profile?.first_name} {payment.patient?.profile?.last_name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {payment.paid_at
                              ? format(new Date(payment.paid_at), 'dd MMM à HH:mm', { locale: fr })
                              : 'En attente'}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium text-green-600">
                            +{payment.amount.toLocaleString()} FCFA
                          </p>
                          <Badge variant="outline" className="text-xs">
                            {payment.payment_type === 'deposit' ? 'Arrhes' : 'Solde'}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
