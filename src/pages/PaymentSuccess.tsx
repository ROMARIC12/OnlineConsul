import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { CheckCircle, Loader2, Download, Eye, Printer, Home, AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface PaymentData {
  id: string;
  amount: number;
  transaction_ref: string | null;
  payment_type: string;
  provider: string;
  paid_at: string | null;
  created_at: string;
}

interface AppointmentData {
  id: string;
  date: string;
  time: string;
  status: string;
  doctor_name: string;
  specialty: string;
  clinic_name: string | null;
}

interface PatientData {
  name: string;
  phone: string | null;
  email: string | null;
}

export default function PaymentSuccess() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [isLoading, setIsLoading] = useState(true);
  const [status, setStatus] = useState<'success' | 'pending' | 'failed' | 'not_found'>('pending');
  const [payment, setPayment] = useState<PaymentData | null>(null);
  const [appointment, setAppointment] = useState<AppointmentData | null>(null);
  const [patient, setPatient] = useState<PatientData | null>(null);
  const [showReceipt, setShowReceipt] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  const token = searchParams.get('token');

  const verifyPayment = async () => {
    if (!token) {
      setStatus('not_found');
      setIsLoading(false);
      return;
    }

    try {
      console.log('[PaymentSuccess] Verifying payment with token:', token);

      const { data, error } = await supabase.functions.invoke('moneyfusion-verify', {
        body: { token, paymentId: token },
      });

      console.log('[PaymentSuccess] Verification response:', data);

      if (error || !data?.success) {
        console.error('[PaymentSuccess] Verification error:', error || data?.error);
        setStatus('not_found');
        setIsLoading(false);
        return;
      }

      setPayment(data.payment);
      setAppointment(data.appointment);
      setPatient(data.patient);

      if (data.status === 'success') {
        setStatus('success');
      } else if (data.status === 'failed') {
        setStatus('failed');
      } else {
        setStatus('pending');
        // If still pending, retry after a few seconds
        if (retryCount < 5) {
          setTimeout(() => {
            setRetryCount(prev => prev + 1);
          }, 3000);
        }
      }

      setIsLoading(false);
    } catch (error) {
      console.error('[PaymentSuccess] Error:', error);
      setStatus('not_found');
      setIsLoading(false);
    }
  };

  useEffect(() => {
    verifyPayment();
  }, [token, retryCount]);

  const generateReceiptNumber = () => {
    if (!payment) return '';
    const date = format(new Date(payment.created_at), 'yyyyMMdd');
    const ref = payment.transaction_ref?.slice(-6) || payment.id.slice(0, 6);
    return `KS-${date}-${ref.toUpperCase()}`;
  };

  const receiptNumber = generateReceiptNumber();

  const downloadReceipt = () => {
    if (!payment || !appointment || !patient) return;

    const receiptContent = `
╔══════════════════════════════════════════════════════════════════╗
║                         REÇU DE PAIEMENT                         ║
║                           KôKô Santé                              ║
╚══════════════════════════════════════════════════════════════════╝

N° Reçu: ${receiptNumber}
Date: ${format(new Date(payment.paid_at || payment.created_at), 'dd/MM/yyyy à HH:mm', { locale: fr })}

──────────────────────────────────────────────────────────────────
INFORMATIONS PATIENT
──────────────────────────────────────────────────────────────────
Nom: ${patient.name}
${patient.email ? `Email: ${patient.email}` : ''}
${patient.phone ? `Téléphone: ${patient.phone}` : ''}

──────────────────────────────────────────────────────────────────
DÉTAILS DE LA CONSULTATION
──────────────────────────────────────────────────────────────────
Médecin: ${appointment.doctor_name}
Spécialité: ${appointment.specialty}
${appointment.clinic_name ? `Centre: ${appointment.clinic_name}` : ''}
Date RDV: ${format(new Date(appointment.date), 'dd/MM/yyyy', { locale: fr })}
Heure: ${appointment.time?.slice(0, 5)}

──────────────────────────────────────────────────────────────────
PAIEMENT
──────────────────────────────────────────────────────────────────
Type: ${payment.payment_type === 'deposit' ? 'Arrhes (Acompte)' : 'Solde'}
Mode: Mobile Money (${payment.provider})
Référence Transaction: ${payment.transaction_ref || 'N/A'}

╔══════════════════════════════════════════════════════════════════╗
║   MONTANT PAYÉ:                     ${payment.amount.toLocaleString().padStart(15)} FCFA   ║
╚══════════════════════════════════════════════════════════════════╝

Statut: ✓ PAYÉ

──────────────────────────────────────────────────────────────────
Ce reçu atteste du paiement effectué via la plateforme KôKô Santé.
Conservez ce document pour vos records.

Merci de votre confiance !
www.koko-sante.com
    `;

    const blob = new Blob([receiptContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `recu-${receiptNumber}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const printReceipt = () => {
    if (!payment || !appointment || !patient) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>Reçu ${receiptNumber}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 40px; max-width: 600px; margin: 0 auto; }
            .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 20px; margin-bottom: 20px; }
            .header h1 { margin: 0; font-size: 24px; }
            .header p { margin: 5px 0; color: #666; }
            .section { margin: 20px 0; }
            .section h3 { border-bottom: 1px solid #ddd; padding-bottom: 5px; }
            .row { display: flex; justify-content: space-between; padding: 5px 0; }
            .amount-box { background: #f5f5f5; padding: 20px; text-align: center; margin: 20px 0; border-radius: 8px; }
            .amount { font-size: 28px; font-weight: bold; color: #2563eb; }
            .status { color: #22c55e; font-weight: bold; }
            .footer { text-align: center; margin-top: 40px; color: #666; font-size: 12px; }
            @media print { body { padding: 20px; } }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>KôKô Santé</h1>
            <p>Reçu de Paiement</p>
            <p><strong>N° ${receiptNumber}</strong></p>
          </div>
          
          <div class="section">
            <div class="row">
              <span>Date:</span>
              <span>${format(new Date(payment.paid_at || payment.created_at), 'dd/MM/yyyy à HH:mm', { locale: fr })}</span>
            </div>
          </div>
          
          <div class="section">
            <h3>Patient</h3>
            <div class="row"><span>Nom:</span><span>${patient.name}</span></div>
            ${patient.email ? `<div class="row"><span>Email:</span><span>${patient.email}</span></div>` : ''}
            ${patient.phone ? `<div class="row"><span>Téléphone:</span><span>${patient.phone}</span></div>` : ''}
          </div>
          
          <div class="section">
            <h3>Consultation</h3>
            <div class="row"><span>Médecin:</span><span>${appointment.doctor_name}</span></div>
            <div class="row"><span>Spécialité:</span><span>${appointment.specialty}</span></div>
            ${appointment.clinic_name ? `<div class="row"><span>Centre:</span><span>${appointment.clinic_name}</span></div>` : ''}
            <div class="row"><span>Date RDV:</span><span>${format(new Date(appointment.date), 'dd/MM/yyyy', { locale: fr })}</span></div>
            <div class="row"><span>Heure:</span><span>${appointment.time?.slice(0, 5)}</span></div>
          </div>
          
          <div class="section">
            <h3>Paiement</h3>
            <div class="row"><span>Type:</span><span>${payment.payment_type === 'deposit' ? 'Arrhes' : 'Solde'}</span></div>
            <div class="row"><span>Mode:</span><span>Mobile Money</span></div>
            <div class="row"><span>Référence:</span><span>${payment.transaction_ref || 'N/A'}</span></div>
          </div>
          
          <div class="amount-box">
            <p style="margin:0;color:#666;">Montant payé</p>
            <p class="amount">${payment.amount.toLocaleString()} FCFA</p>
            <p class="status">✓ PAYÉ</p>
          </div>
          
          <div class="footer">
            <p>Ce reçu atteste du paiement effectué via la plateforme KôKô Santé.</p>
            <p>Merci de votre confiance !</p>
          </div>
        </body>
      </html>
    `);
    
    printWindow.document.close();
    printWindow.print();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground">Vérification du paiement...</p>
        </div>
      </div>
    );
  }

  if (status === 'not_found') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full">
          <CardContent className="p-6 text-center space-y-4">
            <AlertCircle className="h-16 w-16 text-destructive mx-auto" />
            <h1 className="text-xl font-bold">Paiement non trouvé</h1>
            <p className="text-muted-foreground">
              Nous n'avons pas pu trouver les informations de ce paiement.
            </p>
            <Button onClick={() => navigate('/dashboard')} className="w-full">
              <Home className="h-4 w-4 mr-2" />
              Retour au dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (status === 'pending') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full">
          <CardContent className="p-6 text-center space-y-4">
            <Loader2 className="h-16 w-16 animate-spin text-yellow-500 mx-auto" />
            <h1 className="text-xl font-bold">Paiement en cours...</h1>
            <p className="text-muted-foreground">
              Votre paiement est en cours de traitement. Cette page se mettra à jour automatiquement.
            </p>
            <Button variant="outline" onClick={() => verifyPayment()} className="w-full">
              <RefreshCw className="h-4 w-4 mr-2" />
              Vérifier le statut
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (status === 'failed') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full">
          <CardContent className="p-6 text-center space-y-4">
            <AlertCircle className="h-16 w-16 text-destructive mx-auto" />
            <h1 className="text-xl font-bold">Paiement échoué</h1>
            <p className="text-muted-foreground">
              Votre paiement n'a pas pu être effectué. Veuillez réessayer.
            </p>
            <div className="space-y-2">
              <Button onClick={() => navigate('/dashboard')} className="w-full">
                <Home className="h-4 w-4 mr-2" />
                Retour au dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Success state
  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-md mx-auto space-y-6 py-8">
        {/* Success Animation */}
        <div className="text-center space-y-4">
          <div className="w-24 h-24 mx-auto bg-green-100 rounded-full flex items-center justify-center animate-in zoom-in duration-500">
            <CheckCircle className="h-14 w-14 text-green-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-green-600">Paiement réussi !</h1>
            <p className="text-muted-foreground mt-1">Votre rendez-vous est confirmé</p>
          </div>
        </div>

        {/* Payment Summary */}
        <Card>
          <CardContent className="p-4 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Montant payé</span>
              <span className="text-2xl font-bold text-primary">{payment?.amount.toLocaleString()} FCFA</span>
            </div>
            
            <div className="border-t pt-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">N° Reçu</span>
                <span className="font-mono">{receiptNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Médecin</span>
                <span>{appointment?.doctor_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Spécialité</span>
                <span>{appointment?.specialty}</span>
              </div>
              {appointment?.clinic_name && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Centre</span>
                  <span>{appointment.clinic_name}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">Date RDV</span>
                <span>
                  {appointment?.date && format(new Date(appointment.date), 'dd MMMM yyyy', { locale: fr })}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Heure</span>
                <span>{appointment?.time?.slice(0, 5)}</span>
              </div>
            </div>

            <Badge className="bg-green-500 w-full justify-center py-2">
              <CheckCircle className="h-4 w-4 mr-2" />
              Rendez-vous confirmé
            </Badge>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="grid grid-cols-3 gap-2">
          <Button variant="outline" onClick={() => setShowReceipt(true)}>
            <Eye className="h-4 w-4" />
            <span className="sr-only sm:not-sr-only sm:ml-2">Voir</span>
          </Button>
          <Button variant="outline" onClick={downloadReceipt}>
            <Download className="h-4 w-4" />
            <span className="sr-only sm:not-sr-only sm:ml-2">Télécharger</span>
          </Button>
          <Button variant="outline" onClick={printReceipt}>
            <Printer className="h-4 w-4" />
            <span className="sr-only sm:not-sr-only sm:ml-2">Imprimer</span>
          </Button>
        </div>

        <Button onClick={() => navigate('/dashboard')} className="w-full py-6 text-base">
          <Home className="h-5 w-5 mr-2" />
          Retour au dashboard
        </Button>
      </div>

      {/* Receipt Dialog */}
      <Dialog open={showReceipt} onOpenChange={setShowReceipt}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-center">Reçu de Paiement</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="text-center border-b pb-4">
              <h2 className="text-xl font-bold text-primary">KôKô Santé</h2>
              <p className="text-sm text-muted-foreground">N° {receiptNumber}</p>
              <p className="text-xs text-muted-foreground">
                {payment?.paid_at && format(new Date(payment.paid_at), 'dd MMMM yyyy à HH:mm', { locale: fr })}
              </p>
            </div>

            <div className="space-y-1">
              <p className="text-sm font-medium">Patient</p>
              <p className="text-sm text-muted-foreground">{patient?.name}</p>
              {patient?.email && <p className="text-xs text-muted-foreground">{patient.email}</p>}
              {patient?.phone && <p className="text-xs text-muted-foreground">{patient.phone}</p>}
            </div>

            <div className="space-y-1">
              <p className="text-sm font-medium">Consultation</p>
              <div className="text-sm text-muted-foreground space-y-0.5">
                <p>{appointment?.doctor_name}</p>
                <p>{appointment?.specialty}</p>
                {appointment?.clinic_name && <p>{appointment.clinic_name}</p>}
                <p>
                  RDV: {appointment?.date && format(new Date(appointment.date), 'dd/MM/yyyy', { locale: fr })} à {appointment?.time?.slice(0, 5)}
                </p>
              </div>
            </div>

            <div className="bg-primary/5 rounded-lg p-4 text-center">
              <p className="text-sm text-muted-foreground">Montant payé</p>
              <p className="text-3xl font-bold text-primary">{payment?.amount.toLocaleString()} FCFA</p>
              <Badge className="bg-green-500 mt-2">
                <CheckCircle className="h-3 w-3 mr-1" />
                Paiement confirmé
              </Badge>
            </div>

            <div className="text-center text-xs text-muted-foreground">
              <p>Référence: {payment?.transaction_ref || 'N/A'}</p>
            </div>

            <div className="flex gap-2 pt-2">
              <Button variant="outline" className="flex-1 gap-2" onClick={downloadReceipt}>
                <Download className="h-4 w-4" />
                Télécharger
              </Button>
              <Button variant="outline" className="flex-1 gap-2" onClick={printReceipt}>
                <Printer className="h-4 w-4" />
                Imprimer
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
