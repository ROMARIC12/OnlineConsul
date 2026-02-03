import { useState } from 'react';
import { ListPlus, Clock, Calendar, Bell, Check } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format, addDays } from 'date-fns';
import { fr } from 'date-fns/locale';

interface WaitingListSubscriptionProps {
  doctorId: string;
  doctorName: string;
  patientId: string;
  onSuccess?: () => void;
}

export function WaitingListSubscription({
  doctorId,
  doctorName,
  patientId,
  onSuccess,
}: WaitingListSubscriptionProps) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [preferredDate, setPreferredDate] = useState('');
  const [preferredTimeStart, setPreferredTimeStart] = useState('08:00');
  const [preferredTimeEnd, setPreferredTimeEnd] = useState('18:00');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);

  const handleSubscribe = async () => {
    setIsSubmitting(true);
    try {
      // Check if already on waiting list
      const { data: existing } = await supabase
        .from('appointment_waiting_list')
        .select('id')
        .eq('patient_id', patientId)
        .eq('doctor_id', doctorId)
        .single();

      if (existing) {
        toast({
          variant: 'destructive',
          title: 'Déjà inscrit',
          description: 'Vous êtes déjà sur la liste d\'attente pour ce médecin.',
        });
        return;
      }

      const { error } = await supabase
        .from('appointment_waiting_list')
        .insert({
          patient_id: patientId,
          doctor_id: doctorId,
          preferred_date: preferredDate || null,
          preferred_time_start: preferredTimeStart || null,
          preferred_time_end: preferredTimeEnd || null,
        });

      if (error) throw error;

      toast({
        title: 'Inscription réussie !',
        description: 'Vous serez notifié dès qu\'un créneau se libère.',
      });

      setIsSubscribed(true);
      onSuccess?.();
      
      setTimeout(() => {
        setOpen(false);
        setIsSubscribed(false);
      }, 2000);
    } catch (error) {
      console.error('Error subscribing to waiting list:', error);
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: 'Impossible de vous inscrire. Veuillez réessayer.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSubscribed) {
    return (
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" className="gap-2">
            <ListPlus className="h-4 w-4" />
            Liste d'attente
          </Button>
        </DialogTrigger>
        <DialogContent>
          <div className="py-8 text-center">
            <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <Check className="h-8 w-8 text-green-500" />
            </div>
            <h3 className="text-xl font-semibold text-green-600">Inscription confirmée !</h3>
            <p className="text-muted-foreground mt-2">
              Vous serez notifié dès qu'un créneau se libère.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <ListPlus className="h-4 w-4" />
          Liste d'attente
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ListPlus className="h-5 w-5 text-primary" />
            S'inscrire sur la liste d'attente
          </DialogTitle>
          <DialogDescription>
            Recevez une notification dès qu'un créneau se libère chez {doctorName}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          <Alert>
            <Bell className="h-4 w-4" />
            <AlertDescription>
              Vous serez notifié automatiquement lorsqu'un patient annule son rendez-vous.
            </AlertDescription>
          </Alert>

          <div>
            <Label className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Date préférée (optionnel)
            </Label>
            <Input
              type="date"
              value={preferredDate}
              onChange={(e) => setPreferredDate(e.target.value)}
              min={format(new Date(), 'yyyy-MM-dd')}
              max={format(addDays(new Date(), 60), 'yyyy-MM-dd')}
              className="mt-1"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Laissez vide pour être notifié pour toute date
            </p>
          </div>

          <div>
            <Label className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Plage horaire préférée
            </Label>
            <div className="grid grid-cols-2 gap-3 mt-1">
              <div>
                <Label className="text-xs text-muted-foreground">De</Label>
                <Input
                  type="time"
                  value={preferredTimeStart}
                  onChange={(e) => setPreferredTimeStart(e.target.value)}
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">À</Label>
                <Input
                  type="time"
                  value={preferredTimeEnd}
                  onChange={(e) => setPreferredTimeEnd(e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handleSubscribe} disabled={isSubmitting}>
              {isSubmitting ? 'Inscription...' : 'S\'inscrire'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
