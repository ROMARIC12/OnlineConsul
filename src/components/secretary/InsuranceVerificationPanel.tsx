import { useState, useEffect, useCallback } from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Shield, Check, X, AlertCircle, Search } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface PatientWithPayment {
  appointmentId: string;
  patientName: string;
  doctorName: string;
  appointmentTime: string;
  hasInsurance: boolean;
  insuranceVerified: boolean;
  depositPaid: boolean;
  depositAmount: number;
}

export function InsuranceVerificationPanel() {
  const { toast } = useToast();
  const [patients, setPatients] = useState<PatientWithPayment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchPatients = useCallback(async () => {
    setIsLoading(true);
    const today = format(new Date(), 'yyyy-MM-dd');

    // Fetch today's appointments with payment info
    const { data: appointments } = await supabase
      .from('appointments')
      .select(`
        id,
        appointment_time,
        status,
        patient:patients(
          id,
          profile:profiles(first_name, last_name)
        ),
        doctor:doctors(
          accepts_insurance,
          profile:profiles(first_name, last_name)
        )
      `)
      .eq('appointment_date', today)
      .neq('status', 'cancelled')
      .order('appointment_time');

    if (!appointments) {
      setPatients([]);
      setIsLoading(false);
      return;
    }

    // Fetch payments for these appointments
    const appointmentIds = appointments.map(a => a.id);
    const { data: payments } = await supabase
      .from('payments')
      .select('appointment_id, amount, status, payment_type')
      .in('appointment_id', appointmentIds);

    const paymentMap = new Map<string, { depositPaid: boolean; amount: number }>();
    payments?.forEach(p => {
      if (p.payment_type === 'deposit' && p.status === 'success') {
        paymentMap.set(p.appointment_id, { depositPaid: true, amount: p.amount });
      }
    });

    const formattedPatients: PatientWithPayment[] = appointments.map(apt => ({
      appointmentId: apt.id,
      patientName: `${apt.patient?.profile?.first_name || ''} ${apt.patient?.profile?.last_name || ''}`.trim(),
      doctorName: `Dr. ${apt.doctor?.profile?.first_name || ''} ${apt.doctor?.profile?.last_name || ''}`.trim(),
      appointmentTime: apt.appointment_time.slice(0, 5),
      hasInsurance: apt.doctor?.accepts_insurance || false,
      insuranceVerified: false, // Would need a separate field in DB
      depositPaid: paymentMap.get(apt.id)?.depositPaid || false,
      depositAmount: paymentMap.get(apt.id)?.amount || 0,
    }));

    setPatients(formattedPatients);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    fetchPatients();
  }, [fetchPatients]);

  const filteredPatients = patients.filter(p =>
    p.patientName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const pendingVerification = patients.filter(p => p.hasInsurance && !p.insuranceVerified);
  const pendingDeposit = patients.filter(p => !p.depositPaid);

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            <CardTitle>Vérifications du jour</CardTitle>
          </div>
          <div className="flex gap-2">
            <Badge variant="secondary">
              {pendingVerification.length} assurances à vérifier
            </Badge>
            <Badge variant="outline">
              {pendingDeposit.length} arrhes en attente
            </Badge>
          </div>
        </div>
        <CardDescription>
          Validation des assurances et paiements
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher un patient..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        <ScrollArea className="h-[400px]">
          {isLoading ? (
            <div className="p-4 text-center text-muted-foreground">
              Chargement...
            </div>
          ) : filteredPatients.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground">
              Aucun patient trouvé
            </div>
          ) : (
            <div className="space-y-2">
              {filteredPatients.map((patient) => (
                <div
                  key={patient.appointmentId}
                  className="p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium bg-primary/10 text-primary px-2 py-0.5 rounded">
                          {patient.appointmentTime}
                        </span>
                        <p className="font-medium">{patient.patientName}</p>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {patient.doctorName}
                      </p>
                    </div>

                    <div className="flex flex-col items-end gap-1">
                      {/* Insurance status */}
                      {patient.hasInsurance ? (
                        patient.insuranceVerified ? (
                          <Badge className="bg-green-500">
                            <Check className="h-3 w-3 mr-1" />
                            Assurance OK
                          </Badge>
                        ) : (
                          <Badge variant="secondary">
                            <AlertCircle className="h-3 w-3 mr-1" />
                            À vérifier
                          </Badge>
                        )
                      ) : (
                        <Badge variant="outline" className="text-muted-foreground">
                          <X className="h-3 w-3 mr-1" />
                          Sans assurance
                        </Badge>
                      )}

                      {/* Deposit status */}
                      {patient.depositPaid ? (
                        <Badge className="bg-green-500">
                          <Check className="h-3 w-3 mr-1" />
                          Arrhes payées ({patient.depositAmount.toLocaleString()} FCFA)
                        </Badge>
                      ) : (
                        <Badge variant="destructive">
                          <AlertCircle className="h-3 w-3 mr-1" />
                          Arrhes non payées
                        </Badge>
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
  );
}
