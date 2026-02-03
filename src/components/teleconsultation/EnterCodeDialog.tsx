import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Key, Video, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface EnterCodeDialogProps {
  open: boolean;
  onClose: () => void;
  onCodeValid: (sessionData: { channelName: string; token: string; doctorId: string }) => void;
}

export function EnterCodeDialog({ open, onClose, onCodeValid }: EnterCodeDialogProps) {
  const [code, setCode] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const { toast } = useToast();

  const handleVerifyCode = async () => {
    if (!code.trim()) {
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: 'Veuillez entrer le code reçu par email.',
      });
      return;
    }

    setIsVerifying(true);

    try {
      // Verify the teleconsultation code
      const { data, error } = await supabase.functions.invoke('verify-teleconsultation-code', {
        body: { code: code.trim().toUpperCase() }
      });

      if (error) throw error;

      if (data?.valid && data?.sessionData) {
        toast({
          title: 'Code validé',
          description: 'Connexion à la téléconsultation...',
        });
        onCodeValid(data.sessionData);
        onClose();
      } else {
        toast({
          variant: 'destructive',
          title: 'Code invalide',
          description: data?.message || 'Le code est invalide ou expiré.',
        });
      }
    } catch (error) {
      console.error('Error verifying code:', error);
      toast({
        variant: 'destructive',
        title: 'Erreur de vérification',
        description: 'Impossible de vérifier le code. Réessayez.',
      });
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Key className="h-5 w-5 text-primary" />
            Entrer le code de téléconsultation
          </DialogTitle>
          <DialogDescription>
            Entrez le code à 6 caractères que vous avez reçu par email après votre paiement.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label htmlFor="code">Code de session</Label>
            <Input
              id="code"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="XXXXXX"
              maxLength={6}
              className="text-center text-2xl tracking-widest font-mono"
              disabled={isVerifying}
            />
          </div>

          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1"
              onClick={onClose}
              disabled={isVerifying}
            >
              Annuler
            </Button>
            <Button
              className="flex-1"
              onClick={handleVerifyCode}
              disabled={isVerifying || code.length < 6}
            >
              {isVerifying ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Vérification...
                </>
              ) : (
                <>
                  <Video className="h-4 w-4 mr-2" />
                  Rejoindre
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
