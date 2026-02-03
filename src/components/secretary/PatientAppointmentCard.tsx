import { useState } from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Check, X, Phone, Clock, User, RefreshCcw, Mail, Calendar } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface PatientAppointmentCardProps {
  appointment: {
    id: string;
    appointment_time: string;
    appointment_date: string;
    status: string;
    is_first_visit?: boolean;
    patient: {
      id: string;
      profile: {
        first_name: string;
        last_name: string;
        phone: string | null;
      };
    };
    doctor: {
      id: string;
      specialty: string;
      profile: {
        first_name: string;
        last_name: string;
      };
    };
  };
  onConfirm?: () => void;
  onCancel?: () => void;
  onReschedule?: () => void;
  showDoctor?: boolean;
}

export function PatientAppointmentCard({
  appointment,
  onConfirm,
  onCancel,
  onReschedule,
  showDoctor = true,
}: PatientAppointmentCardProps) {
  const { toast } = useToast();
  const [isUpdating, setIsUpdating] = useState(false);

  const patientName = `${appointment.patient?.profile?.first_name || ''} ${appointment.patient?.profile?.last_name || ''}`.trim();
  const initials = `${appointment.patient?.profile?.first_name?.[0] || ''}${appointment.patient?.profile?.last_name?.[0] || ''}`;
  const doctorName = `Dr. ${appointment.doctor?.profile?.first_name || ''} ${appointment.doctor?.profile?.last_name || ''}`.trim();

  const handleConfirm = async () => {
    setIsUpdating(true);
    try {
      const { error } = await supabase
        .from('appointments')
        .update({
          status: 'confirmed',
          confirmed_at: new Date().toISOString(),
        })
        .eq('id', appointment.id);

      if (error) throw error;

      // Send notification to patient
      const { data: patientData } = await supabase
        .from('patients')
        .select('profile_id')
        .eq('id', appointment.patient.id)
        .single();

      if (patientData) {
        await supabase.from('notifications').insert({
          user_id: patientData.profile_id,
          type: 'appointment_confirmed',
          title: 'RDV Confirmé ✅',
          message: `Votre rendez-vous du ${format(new Date(appointment.appointment_date), 'd MMMM', { locale: fr })} à ${appointment.appointment_time.slice(0, 5)} avec ${doctorName} est confirmé.`,
          data: {
            appointment_id: appointment.id,
          },
        });
      }

      toast({
        title: 'RDV Confirmé',
        description: `${patientName} a été notifié(e).`,
      });

      onConfirm?.();
    } catch (error) {
      console.error('Error confirming appointment:', error);
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: 'Impossible de confirmer le rendez-vous.',
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleCancel = async () => {
    setIsUpdating(true);
    try {
      const { error } = await supabase
        .from('appointments')
        .update({
          status: 'cancelled',
          cancelled_at: new Date().toISOString(),
          cancellation_reason: 'Annulé par le secrétariat',
        })
        .eq('id', appointment.id);

      if (error) throw error;

      // Send notification to patient
      const { data: patientData } = await supabase
        .from('patients')
        .select('profile_id')
        .eq('id', appointment.patient.id)
        .single();

      if (patientData) {
        await supabase.from('notifications').insert({
          user_id: patientData.profile_id,
          type: 'appointment_cancelled',
          title: 'RDV Annulé',
          message: `Votre rendez-vous du ${format(new Date(appointment.appointment_date), 'd MMMM', { locale: fr })} a été annulé. Veuillez reprendre rendez-vous.`,
          data: {
            appointment_id: appointment.id,
          },
        });
      }

      toast({
        title: 'RDV Annulé',
        description: `${patientName} a été notifié(e).`,
      });

      onCancel?.();
    } catch (error) {
      console.error('Error cancelling appointment:', error);
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: 'Impossible d\'annuler le rendez-vous.',
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const isPending = appointment.status === 'pending';
  const isConfirmed = appointment.status === 'confirmed';
  const isPast = new Date(appointment.appointment_date) < new Date(new Date().toDateString());

  // Don't show past appointments
  if (isPast && appointment.status !== 'completed') return null;

  return (
    <Card className={`transition-all hover:shadow-md ${
      isPending ? 'border-amber-300 bg-amber-50/50 dark:bg-amber-950/20' : ''
    } ${appointment.is_first_visit ? 'border-l-4 border-l-purple-500' : ''}`}>
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          {/* Avatar */}
          <Avatar className="h-14 w-14 border-2 border-background shadow">
            <AvatarFallback className="bg-primary/10 text-primary font-semibold">
              {initials}
            </AvatarFallback>
          </Avatar>

          {/* Patient Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold text-base truncate">{patientName}</h3>
              {appointment.is_first_visit && (
                <Badge variant="outline" className="text-purple-600 border-purple-300 text-xs">
                  1ère visite
                </Badge>
              )}
            </div>
            
            <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {format(new Date(appointment.appointment_date), 'd MMM', { locale: fr })}
              </span>
              <span className="flex items-center gap-1 font-medium text-primary">
                <Clock className="h-3 w-3" />
                {appointment.appointment_time.slice(0, 5)}
              </span>
            </div>

            {showDoctor && (
              <p className="text-sm text-muted-foreground mt-1">
                {doctorName} • {appointment.doctor?.specialty}
              </p>
            )}

            {/* Phone */}
            {appointment.patient?.profile?.phone && (
              <a 
                href={`tel:${appointment.patient.profile.phone}`}
                className="text-xs text-primary hover:underline flex items-center gap-1 mt-1"
              >
                <Phone className="h-3 w-3" />
                {appointment.patient.profile.phone}
              </a>
            )}
          </div>

          {/* Status Badge */}
          <div className="text-right">
            {isPending && (
              <Badge variant="secondary" className="bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200">
                En attente
              </Badge>
            )}
            {isConfirmed && (
              <Badge variant="default" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                Confirmé
              </Badge>
            )}
            {appointment.status === 'completed' && (
              <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                Terminé
              </Badge>
            )}
          </div>
        </div>

        {/* Actions */}
        {isPending && (
          <div className="flex gap-2 mt-4 pt-3 border-t">
            <Button
              variant="default"
              size="sm"
              className="flex-1 bg-green-600 hover:bg-green-700"
              onClick={handleConfirm}
              disabled={isUpdating}
            >
              <Check className="h-4 w-4 mr-1" />
              Confirmer
            </Button>
            {onReschedule && (
              <Button
                variant="outline"
                size="sm"
                onClick={onReschedule}
                disabled={isUpdating}
              >
                <RefreshCcw className="h-4 w-4 mr-1" />
                Reporter
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              className="text-destructive hover:bg-destructive hover:text-destructive-foreground"
              onClick={handleCancel}
              disabled={isUpdating}
            >
              <X className="h-4 w-4 mr-1" />
              Annuler
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
