import { Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface EmptyAppointmentsStateProps {
  onBookAppointment: () => void;
}

export function EmptyAppointmentsState({ onBookAppointment }: EmptyAppointmentsStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      <Calendar className="h-16 w-16 text-muted-foreground/30 mb-6" />
      <h3 className="text-lg font-semibold mb-2">
        Prenez vos rendez-vous médicaux en ligne
      </h3>
      <p className="text-muted-foreground text-sm mb-8 max-w-xs">
        Trouvez un professionnel de santé et réservez facilement votre consultation
      </p>
      <Button
        onClick={onBookAppointment}
        className="w-full max-w-sm py-6 text-base font-medium rounded-xl bg-[hsl(0,70%,70%)] hover:bg-[hsl(0,70%,65%)] text-white border-0"
      >
        Réservez rendez-vous
      </Button>
    </div>
  );
}
