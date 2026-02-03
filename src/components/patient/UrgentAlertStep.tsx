import { AlertTriangle, Phone, ArrowRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface UrgentAlertStepProps {
  onContinue: () => void;
  onUrgent: () => void;
}

export function UrgentAlertStep({ onContinue, onUrgent }: UrgentAlertStepProps) {
  return (
    <div className="space-y-6">
      <Alert variant="destructive" className="border-2">
        <AlertTriangle className="h-5 w-5" />
        <AlertTitle className="text-lg">Attention - Message important</AlertTitle>
        <AlertDescription className="mt-2 text-base">
          La prise de rendez-vous en ligne est destinée aux consultations programmées.
          <br /><br />
          <strong>En cas d'urgence médicale</strong> (douleur thoracique, difficulté respiratoire, 
          hémorragie, perte de conscience, etc.), veuillez :
        </AlertDescription>
      </Alert>

      <Card className="border-destructive/50">
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-center">
            <div className="text-center sm:text-left">
              <p className="font-semibold">Appelez les urgences</p>
              <p className="text-2xl font-bold text-destructive">15 ou 115</p>
            </div>
            <div className="text-center text-muted-foreground">ou</div>
            <div className="text-center sm:text-left">
              <p className="font-semibold">Rendez-vous aux urgences</p>
              <p className="text-sm text-muted-foreground">de l'hôpital le plus proche</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
        <p className="text-sm text-amber-800 dark:text-amber-200">
          <strong>Important :</strong> Cette plateforme ne fournit pas de diagnostic médical. 
          Les créneaux disponibles sont destinés aux consultations de routine et de suivi.
          Seul un médecin peut évaluer l'urgence de votre situation.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 pt-4">
        <Button
          variant="destructive"
          className="flex-1 gap-2"
          onClick={onUrgent}
        >
          <Phone className="h-4 w-4" />
          Mon cas semble urgent
        </Button>
        <Button
          className="flex-1 gap-2"
          onClick={onContinue}
        >
          Continuer la prise de RDV
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
