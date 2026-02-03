import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, CreditCard, CheckCircle, ExternalLink } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface PaystackPaymentProps {
  amount: number;
  appointmentId: string;
  patientId: string;
  paymentType?: 'deposit' | 'balance';
  onSuccess: (transactionRef: string) => void;
  onError?: () => void;
  onCancel?: () => void;
}

export function PaystackPayment({
  amount,
  appointmentId,
  patientId,
  paymentType = 'deposit',
  onSuccess,
  onError,
  onCancel,
}: PaystackPaymentProps) {
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [transactionRef, setTransactionRef] = useState('');
  const [pendingReference, setPendingReference] = useState<string | null>(null);

  // Load user email on mount
  useEffect(() => {
    const loadUserEmail = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.email) {
        setEmail(user.email);
      }
    };
    loadUserEmail();
  }, []);

  // Check for callback reference in URL (after Paystack redirect)
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const reference = urlParams.get('reference');
    
    if (reference) {
      setPendingReference(reference);
      verifyPayment(reference);
      // Clean URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  const verifyPayment = async (reference: string) => {
    setIsVerifying(true);
    try {
      const { data, error } = await supabase.functions.invoke('paystack-verify', {
        body: { reference },
      });

      if (error) throw error;

      if (data.success && data.data.status === 'success') {
        setTransactionRef(reference);
        setIsSuccess(true);
        toast({
          title: 'Paiement réussi !',
          description: 'Votre paiement a été confirmé.',
        });
        onSuccess(reference);
      } else {
        throw new Error('Le paiement n\'a pas pu être vérifié');
      }
    } catch (error) {
      console.error('Payment verification error:', error);
      toast({
        variant: 'destructive',
        title: 'Erreur de vérification',
        description: 'Impossible de vérifier le paiement. Veuillez contacter le support.',
      });
      onError?.();
    } finally {
      setIsVerifying(false);
      setPendingReference(null);
    }
  };

  const handlePayment = async () => {
    if (!email || !email.includes('@')) {
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: 'Veuillez entrer une adresse email valide.',
      });
      return;
    }

    setIsProcessing(true);

    try {
      const callbackUrl = window.location.href.split('?')[0];

      const { data, error } = await supabase.functions.invoke('paystack-initialize', {
        body: {
          amount,
          email,
          appointmentId,
          patientId,
          paymentType,
          callbackUrl,
        },
      });

      if (error) throw error;

      if (data.success && data.data.authorization_url) {
        // Redirect to Paystack checkout
        window.location.href = data.data.authorization_url;
      } else {
        throw new Error(data.error || 'Échec de l\'initialisation du paiement');
      }
    } catch (error) {
      console.error('Payment error:', error);
      toast({
        variant: 'destructive',
        title: 'Erreur de paiement',
        description: error instanceof Error ? error.message : 'Impossible d\'initier le paiement. Veuillez réessayer.',
      });
      onError?.();
      setIsProcessing(false);
    }
  };

  if (isVerifying || pendingReference) {
    return (
      <Card className="border-primary/20">
        <CardContent className="py-8 text-center">
          <Loader2 className="h-12 w-12 text-primary mx-auto mb-4 animate-spin" />
          <h3 className="text-lg font-semibold">Vérification du paiement...</h3>
          <p className="text-muted-foreground mt-2">
            Veuillez patienter pendant que nous vérifions votre transaction.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (isSuccess) {
    return (
      <Card className="border-green-200 bg-green-50 dark:bg-green-950/20 dark:border-green-800">
        <CardContent className="py-8 text-center">
          <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-green-700 dark:text-green-400">Paiement confirmé !</h3>
          <p className="text-green-600 dark:text-green-500 mt-2">
            Référence : {transactionRef}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="h-5 w-5" />
          Paiement Paystack
        </CardTitle>
        <CardDescription>
          Payez vos arrhes pour confirmer votre rendez-vous
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Amount */}
        <div className="p-4 bg-primary/5 rounded-lg text-center">
          <p className="text-sm text-muted-foreground">Montant à payer</p>
          <p className="text-3xl font-bold text-primary">
            {amount.toLocaleString()} FCFA
          </p>
        </div>

        {/* Email */}
        <div>
          <Label htmlFor="email">Adresse email</Label>
          <Input
            id="email"
            type="email"
            placeholder="votre@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1"
            disabled={isProcessing}
          />
          <p className="text-xs text-muted-foreground mt-1">
            Vous recevrez un reçu de paiement à cette adresse
          </p>
        </div>

        {/* Payment Info */}
        <div className="p-3 bg-muted/50 rounded-lg">
          <p className="text-sm text-muted-foreground">
            <strong>Modes de paiement acceptés :</strong>
          </p>
          <ul className="text-sm text-muted-foreground mt-1 space-y-1">
            <li>• Cartes bancaires (Visa, Mastercard)</li>
            <li>• Mobile Money (Orange, MTN, Moov, Wave)</li>
            <li>• Comptes bancaires</li>
          </ul>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          {onCancel && (
            <Button
              variant="outline"
              className="flex-1"
              onClick={onCancel}
              disabled={isProcessing}
            >
              Annuler
            </Button>
          )}
          <Button
            className={onCancel ? "flex-1" : "w-full"}
            onClick={handlePayment}
            disabled={isProcessing || !email}
          >
            {isProcessing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Redirection...
              </>
            ) : (
              <>
                Payer avec Paystack
                <ExternalLink className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>
        </div>

        {/* Security note */}
        <p className="text-xs text-muted-foreground text-center">
          🔒 Paiement sécurisé via Paystack. Vos données sont protégées.
        </p>
      </CardContent>
    </Card>
  );
}
