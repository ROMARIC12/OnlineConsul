import { useSearchParams, useNavigate } from 'react-router-dom';
import { XCircle, Home, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export default function PaymentFailure() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  const reason = searchParams.get('reason');

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="max-w-md w-full">
        <CardContent className="p-6 text-center space-y-6">
          {/* Error Icon */}
          <div className="w-20 h-20 mx-auto bg-red-100 rounded-full flex items-center justify-center">
            <XCircle className="h-12 w-12 text-red-600" />
          </div>
          
          {/* Error Message */}
          <div>
            <h1 className="text-xl font-bold text-red-600">Paiement échoué</h1>
            <p className="text-muted-foreground mt-2">
              {reason || 'Votre paiement n\'a pas pu être effectué. Veuillez réessayer.'}
            </p>
          </div>

          {/* Possible reasons */}
          <div className="bg-muted/50 rounded-lg p-4 text-left">
            <p className="text-sm font-medium mb-2">Raisons possibles :</p>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Solde insuffisant sur votre compte Mobile Money</li>
              <li>• Transaction annulée par l'utilisateur</li>
              <li>• Délai d'expiration dépassé</li>
              <li>• Problème de connexion réseau</li>
            </ul>
          </div>

          {/* Actions */}
          <div className="space-y-3">
            <Button 
              onClick={() => navigate('/dashboard')} 
              className="w-full"
            >
              <Home className="h-4 w-4 mr-2" />
              Retour au dashboard
            </Button>
            <p className="text-xs text-muted-foreground">
              Vous pouvez reprendre une nouvelle réservation depuis votre dashboard
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
