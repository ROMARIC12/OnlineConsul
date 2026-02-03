import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Loader2, Smartphone, CheckCircle } from 'lucide-react';

interface MobileMoneyPaymentProps {
  amount: number;
  onSuccess: (transactionRef: string) => void;
  onError?: () => void;
  onCancel?: () => void;
}

const PROVIDERS = [
  { id: 'orange', name: 'Orange Money', color: 'bg-orange-500' },
  { id: 'mtn', name: 'MTN Mobile Money', color: 'bg-yellow-500' },
  { id: 'moov', name: 'Moov Money', color: 'bg-blue-500' },
  { id: 'wave', name: 'Wave', color: 'bg-cyan-500' },
];

export function MobileMoneyPayment({
  amount,
  onSuccess,
  onError,
  onCancel,
}: MobileMoneyPaymentProps) {
  const { toast } = useToast();
  const [selectedProvider, setSelectedProvider] = useState('orange');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [transactionRef, setTransactionRef] = useState('');

  const handlePayment = async () => {
    if (!phoneNumber || phoneNumber.length < 10) {
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: 'Veuillez entrer un numéro de téléphone valide.',
      });
      return;
    }

    setIsProcessing(true);

    try {
      // Simulate payment processing (in production, integrate with actual Mobile Money API)
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Generate transaction reference
      const ref = `MM-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
      setTransactionRef(ref);
      setIsSuccess(true);
      
      toast({
        title: 'Paiement réussi !',
        description: 'Votre paiement a été confirmé.',
      });

      // Notify parent component
      onSuccess(ref);
    } catch (error) {
      console.error('Payment error:', error);
      toast({
        variant: 'destructive',
        title: 'Erreur de paiement',
        description: 'Impossible de traiter le paiement. Veuillez réessayer.',
      });
      onError?.();
    } finally {
      setIsProcessing(false);
    }
  };

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
          <Smartphone className="h-5 w-5" />
          Paiement Mobile Money
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

        {/* Provider Selection */}
        <div>
          <Label className="mb-3 block">Choisissez votre opérateur</Label>
          <RadioGroup
            value={selectedProvider}
            onValueChange={setSelectedProvider}
            className="grid grid-cols-2 gap-3"
          >
            {PROVIDERS.map((provider) => (
              <div key={provider.id}>
                <RadioGroupItem
                  value={provider.id}
                  id={provider.id}
                  className="peer sr-only"
                />
                <Label
                  htmlFor={provider.id}
                  className={`flex items-center gap-2 p-3 border rounded-lg cursor-pointer transition-all
                    peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5
                    hover:bg-muted/50`}
                >
                  <div className={`w-3 h-3 rounded-full ${provider.color}`} />
                  <span className="text-sm font-medium">{provider.name}</span>
                </Label>
              </div>
            ))}
          </RadioGroup>
        </div>

        {/* Phone Number */}
        <div>
          <Label htmlFor="phone">Numéro de téléphone</Label>
          <Input
            id="phone"
            type="tel"
            placeholder="07 00 00 00 00"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
            className="mt-1"
            disabled={isProcessing}
          />
          <p className="text-xs text-muted-foreground mt-1">
            Vous recevrez une demande de confirmation sur ce numéro
          </p>
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
            disabled={isProcessing || !phoneNumber}
          >
            {isProcessing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Traitement...
              </>
            ) : (
              'Payer maintenant'
            )}
          </Button>
        </div>

        {/* Security note */}
        <p className="text-xs text-muted-foreground text-center">
          🔒 Paiement sécurisé. Vos données sont protégées.
        </p>
      </CardContent>
    </Card>
  );
}
