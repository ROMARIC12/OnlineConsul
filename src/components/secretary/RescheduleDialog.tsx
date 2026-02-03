import { useState, useEffect } from 'react';
import { format, addDays } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Calendar, Clock, RefreshCcw } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface RescheduleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  appointmentId: string;
  currentDate: string;
  currentTime: string;
  doctorId: string;
  patientName: string;
  onSuccess: () => void;
}

export function RescheduleDialog({
  open,
  onOpenChange,
  appointmentId,
  currentDate,
  currentTime,
  doctorId,
  patientName,
  onSuccess,
}: RescheduleDialogProps) {
  const { toast } = useToast();
  const [newDate, setNewDate] = useState(currentDate);
  const [newTime, setNewTime] = useState(currentTime.slice(0, 5));
  const [isLoading, setIsLoading] = useState(false);
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);

  useEffect(() => {
    if (open && newDate) {
      fetchAvailableSlots();
    }
  }, [open, newDate, doctorId]);

  const fetchAvailableSlots = async () => {
    // Fetch existing appointments for the selected date
    const { data: existingAppointments } = await supabase
      .from('appointments')
      .select('appointment_time')
      .eq('doctor_id', doctorId)
      .eq('appointment_date', newDate)
      .neq('id', appointmentId)
      .in('status', ['pending', 'confirmed']);

    const bookedTimes = new Set(
      existingAppointments?.map((a) => a.appointment_time.slice(0, 5)) || []
    );

    // Generate available time slots from 8:00 to 17:30
    const slots: string[] = [];
    for (let hour = 8; hour < 18; hour++) {
      for (let minute of [0, 30]) {
        const timeStr = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        if (!bookedTimes.has(timeStr)) {
          slots.push(timeStr);
        }
      }
    }

    setAvailableSlots(slots);
  };

  const handleReschedule = async () => {
    if (!newDate || !newTime) {
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: 'Veuillez sélectionner une date et une heure.',
      });
      return;
    }

    setIsLoading(true);
    try {
      // Check if the slot is still available (race condition protection)
      const { data: conflict } = await supabase
        .from('appointments')
        .select('id')
        .eq('doctor_id', doctorId)
        .eq('appointment_date', newDate)
        .eq('appointment_time', newTime + ':00')
        .neq('id', appointmentId)
        .in('status', ['pending', 'confirmed'])
        .single();

      if (conflict) {
        toast({
          variant: 'destructive',
          title: 'Créneau indisponible',
          description: 'Ce créneau vient d\'être réservé. Veuillez en choisir un autre.',
        });
        fetchAvailableSlots();
        return;
      }

      // Update the appointment
      const { error } = await supabase
        .from('appointments')
        .update({
          appointment_date: newDate,
          appointment_time: newTime + ':00',
          status: 'pending', // Reset to pending for re-confirmation
        })
        .eq('id', appointmentId);

      if (error) throw error;

      toast({
        title: 'RDV reporté',
        description: `Le rendez-vous a été reporté au ${format(new Date(newDate), 'd MMMM', { locale: fr })} à ${newTime}.`,
      });

      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error rescheduling:', error);
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: error.message || 'Impossible de reporter le rendez-vous.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RefreshCcw className="h-5 w-5" />
            Reporter le rendez-vous
          </DialogTitle>
          <DialogDescription>
            Choisissez une nouvelle date et heure pour {patientName}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {/* Current appointment info */}
          <div className="p-3 bg-muted rounded-lg text-sm">
            <p className="text-muted-foreground">Rendez-vous actuel :</p>
            <p className="font-medium">
              {format(new Date(currentDate), 'd MMMM yyyy', { locale: fr })} à{' '}
              {currentTime.slice(0, 5)}
            </p>
          </div>

          {/* New date */}
          <div>
            <Label className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Nouvelle date
            </Label>
            <Input
              type="date"
              value={newDate}
              onChange={(e) => setNewDate(e.target.value)}
              min={format(new Date(), 'yyyy-MM-dd')}
              max={format(addDays(new Date(), 90), 'yyyy-MM-dd')}
              className="mt-1"
            />
          </div>

          {/* New time */}
          <div>
            <Label className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Nouvelle heure
            </Label>
            {availableSlots.length > 0 ? (
              <div className="grid grid-cols-4 gap-2 mt-2 max-h-[200px] overflow-y-auto">
                {availableSlots.map((slot) => (
                  <Button
                    key={slot}
                    type="button"
                    variant={newTime === slot ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setNewTime(slot)}
                  >
                    {slot}
                  </Button>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground mt-2">
                Aucun créneau disponible pour cette date.
              </p>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button
              onClick={handleReschedule}
              disabled={isLoading || !newTime || availableSlots.length === 0}
            >
              {isLoading ? 'Report en cours...' : 'Confirmer le report'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
