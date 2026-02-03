import { useState, useEffect, useCallback, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, CheckCircle, Smartphone, CreditCard, RefreshCw, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

// Declare CinetPay global type
declare global {
  interface Window {
    CinetPay: {
      setConfig: (config: {
        apikey: string;
        site_id: string;
        notify_url: string;
        mode: string;
      }) => void;
      getCheckout: (params: {
        transaction_id: string;
        amount: number;
        currency: string;
        channels: string;
        description: string;
        customer_name: string;
        customer_surname: string;
        customer_email: string;
        customer_phone_number: string;
        customer_address: string;
        customer_city: string;
        customer_country: string;
        customer_state: string;
        customer_zip_code: string;
      }) => void;
      waitResponse: (callback: (data: { status: string; amount?: number; transaction_id?: string }) => void) => void;
      onError: (callback: (data: unknown) => void) => void;
    };
  }
}

interface CinetPayPaymentProps {
  amount: number;
  appointmentId: string;
  patientId: string;
  paymentType?: 'deposit' | 'balance';
  onSuccess: (transactionRef: string) => void;
  onError?: () => void;
  onCancel?: () => void;
}

// Configuration CinetPay PRODUCTION
const CINETPAY_CONFIG = {
  apikey: '213623621665f9bc06d3b431.84358537',
  site_id: '105907468',
  mode: 'PRODUCTION'
};

export function CinetPayPayment({
  amount,
  appointmentId,
  patientId,
  paymentType = 'deposit',
  onSuccess,
  onError,
  onCancel,
}: CinetPayPaymentProps) {
  const { toast } = useToast();
  const { profile } = useAuth();
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [transactionRef, setTransactionRef] = useState('');
  const [sdkLoaded, setSdkLoaded] = useState(false);
  const [sdkReady, setSdkReady] = useState(false);
  const [pendingTransactionId, setPendingTransactionId] = useState<string | null>(null);
  const [sdkError, setSdkError] = useState<string | null>(null);
  
  // Ref pour stocker l'ID de transaction actuel
  const transactionIdRef = useRef('');
  const sdkInitialized = useRef(false);

  // Vérifier si le SDK est vraiment disponible
  const checkSdkAvailability = useCallback(() => {
    if (typeof window.CinetPay !== 'undefined' && 
        typeof window.CinetPay.setConfig === 'function' &&
        typeof window.CinetPay.getCheckout === 'function') {
      console.log('✅ CinetPay SDK vérifié et prêt');
      setSdkReady(true);
      setSdkError(null);
      return true;
    }
    return false;
  }, []);

  // Load CinetPay SDK
  useEffect(() => {
    // Vérifier si déjà chargé
    if (checkSdkAvailability()) {
      setSdkLoaded(true);
      return;
    }

    // Supprimer l'ancien script s'il existe
    const existingScript = document.getElementById('cinetpay-sdk');
    if (existingScript) {
      existingScript.remove();
    }

    console.log('📦 Chargement du SDK CinetPay...');
    
    const script = document.createElement('script');
    script.id = 'cinetpay-sdk';
    script.src = 'https://cdn.cinetpay.com/seamless/main.js';
    script.async = true;
    
    script.onload = () => {
      console.log('📦 Script CinetPay chargé, vérification...');
      setSdkLoaded(true);
      
      // Attendre un peu que le SDK s'initialise
      let attempts = 0;
      const maxAttempts = 10;
      
      const checkInterval = setInterval(() => {
        attempts++;
        if (checkSdkAvailability()) {
          clearInterval(checkInterval);
        } else if (attempts >= maxAttempts) {
          clearInterval(checkInterval);
          console.error('❌ SDK chargé mais CinetPay non disponible après', maxAttempts, 'tentatives');
          setSdkError('Le SDK CinetPay n\'a pas pu s\'initialiser correctement.');
        }
      }, 200);
    };
    
    script.onerror = (e) => {
      console.error('❌ Échec chargement SDK CinetPay:', e);
      setSdkError('Impossible de charger le module de paiement. Vérifiez votre connexion internet.');
      toast({
        variant: 'destructive',
        title: 'Erreur de chargement',
        description: 'Impossible de charger le module de paiement. Rafraîchissez la page.',
      });
    };
    
    document.head.appendChild(script);
    
    return () => {
      // Cleanup
    };
  }, [toast, checkSdkAvailability]);

  // Load user data on mount
  useEffect(() => {
    const loadUserData = async () => {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (authUser?.email) {
        setEmail(authUser.email);
      }
      if (profile?.phone) {
        setPhone(profile.phone);
      }
    };
    loadUserData();
  }, [profile]);

  // Mettre à jour le statut du paiement
  const updatePaymentStatus = useCallback(async (transactionId: string, status: 'success' | 'failed') => {
    try {
      console.log('📝 Mise à jour paiement:', transactionId, '->', status);
      
      const { error } = await supabase
        .from('payments')
        .update({
          status: status,
          paid_at: status === 'success' ? new Date().toISOString() : null,
        })
        .eq('transaction_ref', transactionId);
      
      if (error) {
        console.error('Erreur MAJ paiement:', error);
        return;
      }

      // Si succès, confirmer le RDV
      if (status === 'success') {
        const { error: appointmentError } = await supabase
          .from('appointments')
          .update({
            status: 'confirmed',
            confirmed_at: new Date().toISOString(),
          })
          .eq('id', appointmentId);
        
        if (appointmentError) {
          console.error('Erreur confirmation RDV:', appointmentError);
        } else {
          console.log('✅ RDV confirmé:', appointmentId);
        }
      }
    } catch (error) {
      console.error('Erreur MAJ paiement:', error);
    }
  }, [appointmentId]);

  // Créer l'enregistrement de paiement en base
  const createPaymentRecord = useCallback(async (transactionId: string) => {
    try {
      console.log('📝 Création enregistrement paiement:', transactionId);
      
      const { error } = await supabase
        .from('payments')
        .insert({
          appointment_id: appointmentId,
          patient_id: patientId,
          amount: amount,
          payment_type: paymentType,
          provider: 'cinetpay',
          transaction_ref: transactionId,
          status: 'pending',
        });
      
      if (error) {
        console.error('Erreur création paiement:', error);
        return false;
      }
      console.log('✅ Paiement créé:', transactionId);
      return true;
    } catch (error) {
      console.error('Erreur création paiement:', error);
      return false;
    }
  }, [appointmentId, patientId, amount, paymentType]);

  // Vérifier le statut du paiement via l'edge function
  const verifyPaymentStatus = useCallback(async (transactionId: string) => {
    setIsVerifying(true);
    try {
      console.log('🔍 Vérification paiement:', transactionId);
      
      const { data, error } = await supabase.functions.invoke('cinetpay-verify', {
        body: { transactionId }
      });

      if (error) {
        console.error('Erreur vérification:', error);
        toast({
          variant: 'destructive',
          title: 'Erreur de vérification',
          description: 'Impossible de vérifier le statut du paiement.',
        });
        return;
      }

      console.log('📊 Résultat vérification:', data);

      if (data?.success && data?.data?.status === 'success') {
        await updatePaymentStatus(transactionId, 'success');
        setTransactionRef(transactionId);
        setIsSuccess(true);
        setPendingTransactionId(null);
        
        toast({
          title: 'Paiement confirmé ! 🎉',
          description: 'Votre paiement a été vérifié avec succès.',
        });
        
        onSuccess(transactionId);
      } else if (data?.data?.status === 'pending') {
        toast({
          title: 'Paiement en cours',
          description: 'Veuillez finaliser le paiement sur votre téléphone.',
        });
      } else {
        toast({
          variant: 'destructive',
          title: 'Paiement non confirmé',
          description: 'Le paiement n\'a pas été finalisé. Veuillez réessayer.',
        });
        setPendingTransactionId(null);
      }
    } catch (error) {
      console.error('Erreur vérification:', error);
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: 'Une erreur est survenue lors de la vérification.',
      });
    } finally {
      setIsVerifying(false);
    }
  }, [toast, onSuccess, updatePaymentStatus]);

  // Lancer le paiement
  const handlePayment = useCallback(async () => {
    console.log('=== 🚀 DÉMARRAGE PAIEMENT ===');
    console.log('SDK Loaded:', sdkLoaded);
    console.log('SDK Ready:', sdkReady);
    console.log('CinetPay available:', typeof window.CinetPay !== 'undefined');

    // Vérification robuste du SDK
    if (!sdkReady || typeof window.CinetPay === 'undefined') {
      // Essayer une dernière fois de vérifier
      if (!checkSdkAvailability()) {
        console.error('❌ SDK CinetPay non disponible');
        toast({
          variant: 'destructive',
          title: 'Erreur',
          description: 'Le module de paiement n\'est pas prêt. Rafraîchissez la page et réessayez.',
        });
        return;
      }
    }

    if (!phone || phone.length < 8) {
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: 'Veuillez entrer un numéro de téléphone valide (8+ chiffres).',
      });
      return;
    }

    setIsProcessing(true);
    setSdkError(null);

    // Générer un ID de transaction unique
    const transactionId = `CPT${Date.now()}${Math.floor(Math.random() * 1000)}`;
    transactionIdRef.current = transactionId;
    
    console.log('💳 Transaction ID:', transactionId);
    console.log('💰 Montant:', amount, 'XOF');
    console.log('📱 Téléphone:', phone);
    console.log('📅 Appointment ID:', appointmentId);

    // Créer l'enregistrement de paiement en base
    const paymentCreated = await createPaymentRecord(transactionId);
    if (!paymentCreated) {
      setIsProcessing(false);
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: 'Impossible de créer le paiement. Veuillez réessayer.',
      });
      return;
    }

    const customerName = profile?.first_name || 'Patient';
    const customerSurname = profile?.last_name || '';

    try {
      // Construire l'URL du webhook Supabase
      const webhookUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/cinetpay-webhook`;

      console.log('🔧 Configuration CinetPay...');
      console.log('API Key:', CINETPAY_CONFIG.apikey.substring(0, 15) + '...');
      console.log('Site ID:', CINETPAY_CONFIG.site_id);
      console.log('Webhook URL:', webhookUrl);
      console.log('Mode:', CINETPAY_CONFIG.mode);

      // 1. Configuration du SDK
      window.CinetPay.setConfig({
        apikey: CINETPAY_CONFIG.apikey,
        site_id: CINETPAY_CONFIG.site_id,
        notify_url: webhookUrl,
        mode: CINETPAY_CONFIG.mode
      });

      console.log('✅ CinetPay.setConfig() appelé');

      // 2. Configurer les handlers AVANT getCheckout
      window.CinetPay.waitResponse((data: { status: string; amount?: number; transaction_id?: string }) => {
        console.log('📨 CinetPay waitResponse:', data);
        
        const txId = transactionIdRef.current;
        
        if (data.status === 'REFUSED') {
          updatePaymentStatus(txId, 'failed');
          setIsProcessing(false);
          setPendingTransactionId(null);
          
          toast({
            variant: 'destructive',
            title: 'Paiement refusé',
            description: 'Votre paiement a été refusé. Veuillez vérifier vos informations.',
          });
          
          onError?.();
        } else if (data.status === 'ACCEPTED') {
          updatePaymentStatus(txId, 'success');
          setTransactionRef(txId);
          setIsSuccess(true);
          setIsProcessing(false);
          setPendingTransactionId(null);
          
          toast({
            title: 'Paiement réussi ! 🎉',
            description: 'Votre paiement a été confirmé.',
          });
          
          onSuccess(txId);
        } else {
          // Statut inconnu ou modal fermée
          console.log('⏳ Statut paiement:', data.status);
          setIsProcessing(false);
          setPendingTransactionId(txId);
          
          toast({
            title: 'Paiement en attente',
            description: 'Veuillez finaliser le paiement puis cliquer sur "Vérifier".',
          });
        }
      });

      console.log('✅ CinetPay.waitResponse() configuré');

      // 3. Configurer le handler d'erreur
      window.CinetPay.onError((data: unknown) => {
        console.error('❌ CinetPay onError:', data);
        setIsProcessing(false);
        
        let errorMessage = 'Une erreur technique est survenue lors du paiement.';
        if (data && typeof data === 'object') {
          if ('message' in data) {
            errorMessage = String((data as { message: string }).message);
          } else if ('error' in data) {
            errorMessage = String((data as { error: string }).error);
          }
        }
        
        setSdkError(errorMessage);
        
        toast({
          variant: 'destructive',
          title: 'Erreur de paiement',
          description: errorMessage,
        });
        
        onError?.();
      });

      console.log('✅ CinetPay.onError() configuré');

      // 4. Préparer les données de transaction
      const transactionData = {
        transaction_id: transactionId,
        amount: amount,
        currency: 'XOF',
        channels: 'ALL',
        description: `Paiement consultation - ${paymentType === 'deposit' ? 'Acompte' : 'Solde'}`,
        customer_name: customerName,
        customer_surname: customerSurname,
        customer_email: email || 'patient@docta.ci',
        customer_phone_number: phone,
        customer_address: 'Abidjan',
        customer_city: 'Abidjan',
        customer_country: 'CI',
        customer_state: 'CI',
        customer_zip_code: '00225'
      };

      console.log('📤 Données transaction:', JSON.stringify(transactionData, null, 2));

      // 5. Lancer le checkout
      console.log('🚀 Appel CinetPay.getCheckout()...');
      window.CinetPay.getCheckout(transactionData);

      // Stocker l'ID pour la vérification manuelle si besoin
      setPendingTransactionId(transactionId);

      console.log('✅ CinetPay.getCheckout() appelé - Portail en cours d\'ouverture');

    } catch (error) {
      console.error('❌ Erreur lors du paiement:', error);
      setIsProcessing(false);
      
      const errorMessage = error instanceof Error ? error.message : 'Impossible d\'initialiser le paiement.';
      setSdkError(errorMessage);
      
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: errorMessage,
      });
      
      onError?.();
    }
  }, [sdkLoaded, sdkReady, phone, email, profile, amount, appointmentId, paymentType, createPaymentRecord, updatePaymentStatus, checkSdkAvailability, toast, onSuccess, onError]);

  // Affichage succès
  if (isSuccess) {
    return (
      <Card className="border-green-200 bg-green-50 dark:bg-green-950/20 dark:border-green-800">
        <CardContent className="py-8 text-center">
          <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-green-700 dark:text-green-400">Paiement confirmé !</h3>
          <p className="text-green-600 dark:text-green-500 mt-2">
            Référence : {transactionRef}
          </p>
          <p className="text-sm text-muted-foreground mt-4">
            Votre rendez-vous est maintenant confirmé.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Smartphone className="h-5 w-5" />
          Paiement CinetPay
        </CardTitle>
        <CardDescription>
          Payez par Mobile Money ou carte bancaire
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Erreur SDK */}
        {sdkError && (
          <div className="p-3 bg-destructive/10 rounded-lg border border-destructive/20">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-5 w-5 text-destructive mt-0.5" />
              <div>
                <p className="text-sm font-medium text-destructive">Erreur technique</p>
                <p className="text-sm text-destructive/80">{sdkError}</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-2"
                  onClick={() => window.location.reload()}
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Rafraîchir la page
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Montant */}
        <div className="p-4 bg-primary/5 rounded-lg text-center">
          <p className="text-sm text-muted-foreground">Montant à payer</p>
          <p className="text-3xl font-bold text-primary">
            {amount.toLocaleString()} FCFA
          </p>
        </div>

        {/* Téléphone */}
        <div>
          <Label htmlFor="phone">Numéro de téléphone *</Label>
          <Input
            id="phone"
            type="tel"
            placeholder="Ex: 0700000000"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="mt-1"
            disabled={isProcessing}
          />
          <p className="text-xs text-muted-foreground mt-1">
            Numéro associé à votre compte Mobile Money
          </p>
        </div>

        {/* Email (optionnel) */}
        <div>
          <Label htmlFor="email">Adresse email (optionnel)</Label>
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
            Pour recevoir le reçu de paiement
          </p>
        </div>

        {/* Modes de paiement */}
        <div className="p-3 bg-muted/50 rounded-lg">
          <p className="text-sm font-medium mb-2 flex items-center gap-2">
            <CreditCard className="h-4 w-4" />
            Modes de paiement acceptés :
          </p>
          <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-orange-500"></div>
              Orange Money
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
              MTN Money
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-blue-500"></div>
              Moov Money
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-cyan-500"></div>
              Wave
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-gray-500"></div>
              Cartes bancaires
            </div>
          </div>
        </div>

        {/* Indicateur de chargement SDK */}
        {!sdkReady && !sdkError && (
          <div className="flex items-center justify-center gap-2 text-muted-foreground p-3 bg-muted/30 rounded-lg">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm">Chargement du module de paiement...</span>
          </div>
        )}

        {/* Statut SDK prêt */}
        {sdkReady && !sdkError && (
          <div className="flex items-center justify-center gap-2 text-green-600 p-2">
            <CheckCircle className="h-4 w-4" />
            <span className="text-sm">Module de paiement prêt</span>
          </div>
        )}

        {/* Bouton de vérification si paiement en attente */}
        {pendingTransactionId && !isProcessing && (
          <div className="p-3 bg-yellow-50 dark:bg-yellow-950/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
            <p className="text-sm text-yellow-700 dark:text-yellow-400 mb-2">
              💳 Paiement en cours de traitement
            </p>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => verifyPaymentStatus(pendingTransactionId)}
              disabled={isVerifying}
            >
              {isVerifying ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Vérification...
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Vérifier le statut du paiement
                </>
              )}
            </Button>
          </div>
        )}

        {/* Boutons d'action */}
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
            disabled={isProcessing || !phone || !sdkReady || !!sdkError}
          >
            {isProcessing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Ouverture du portail...
              </>
            ) : (
              'Payer maintenant'
            )}
          </Button>
        </div>

        {/* Note de sécurité */}
        <p className="text-xs text-muted-foreground text-center">
          🔒 Paiement sécurisé via CinetPay. Vos données sont protégées.
        </p>
      </CardContent>
    </Card>
  );
}
