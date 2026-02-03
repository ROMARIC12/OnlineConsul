import { useNavigate, useSearchParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Video, CheckCircle, Copy, ArrowRight } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function TeleconsultationSuccess() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const code = searchParams.get('code') || '';
  const [copied, setCopied] = useState(false);

  const handleCopyCode = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    toast({
      title: 'Code copié',
      description: 'Le code a été copié dans le presse-papiers.',
    });
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center mb-4">
            <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
          </div>
          <CardTitle className="text-2xl">Paiement réussi !</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="text-center">
            <p className="text-muted-foreground mb-4">
              Votre code d'accès à la téléconsultation :
            </p>
            <div className="bg-muted p-4 rounded-lg">
              <p className="text-3xl font-mono font-bold tracking-widest text-primary">
                {code}
              </p>
            </div>
          </div>

          <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
            <p className="text-sm text-muted-foreground">
              Ce code vous a également été envoyé par email. Utilisez-le pour rejoindre votre téléconsultation.
            </p>
          </div>

          <div className="space-y-3">
            <Button
              onClick={handleCopyCode}
              variant="outline"
              className="w-full"
            >
              <Copy className="h-4 w-4 mr-2" />
              {copied ? 'Copié !' : 'Copier le code'}
            </Button>

            <Button
              onClick={() => navigate('/dashboard')}
              className="w-full"
            >
              <Video className="h-4 w-4 mr-2" />
              Aller à la téléconsultation
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
