import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Calendar, Clock, MapPin, User, AlertTriangle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface AppointmentCardProps {
  appointment: {
    id: string;
    appointment_date: string;
    appointment_time: string;
    status: string;
    is_first_visit?: boolean;
    doctor?: {
      specialty: string;
      profile?: {
        first_name: string;
        last_name: string;
      };
    };
    clinic?: {
      name: string;
      address: string;
    } | null;
  };
  showActions?: boolean;
  onCancel?: (id: string) => void;
  queuePosition?: number;
  estimatedWaitTime?: number;
}

export function AppointmentCard({
  appointment,
  showActions = false,
  onCancel,
  queuePosition,
  estimatedWaitTime,
}: AppointmentCardProps) {
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'confirmed':
        return <Badge variant="default">Confirmé</Badge>;
      case 'completed':
        return <Badge className="bg-green-500 hover:bg-green-600">Terminé</Badge>;
      case 'pending':
        return <Badge variant="secondary">En attente</Badge>;
      case 'cancelled':
        return <Badge variant="destructive">Annulé</Badge>;
      case 'no_show':
        return <Badge variant="destructive">Absent</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const appointmentDate = new Date(appointment.appointment_date);
  const isToday = format(new Date(), 'yyyy-MM-dd') === appointment.appointment_date;
  const isPast = appointmentDate < new Date() && !isToday;

  return (
    <Card className={`transition-all ${isToday ? 'border-primary shadow-md' : ''} ${isPast ? 'opacity-70' : ''}`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 space-y-2">
            {/* Date and Time */}
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-1 text-primary">
                <Calendar className="h-4 w-4" />
                <span className="font-medium">
                  {isToday ? "Aujourd'hui" : format(appointmentDate, 'EEEE d MMMM', { locale: fr })}
                </span>
              </div>
              <div className="flex items-center gap-1 text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>{appointment.appointment_time.slice(0, 5)}</span>
              </div>
            </div>

            {/* Doctor Info */}
            {appointment.doctor && (
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <div>
                  <span className="font-medium">
                    Dr. {appointment.doctor.profile?.first_name} {appointment.doctor.profile?.last_name}
                  </span>
                  <span className="text-sm text-muted-foreground ml-2">
                    {appointment.doctor.specialty}
                  </span>
                </div>
              </div>
            )}

            {/* Clinic Info */}
            {appointment.clinic && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <MapPin className="h-4 w-4" />
                <span>{appointment.clinic.name} - {appointment.clinic.address}</span>
              </div>
            )}

            {/* First Visit Warning */}
            {appointment.is_first_visit && (
              <div className="flex items-center gap-1 text-amber-600 text-sm">
                <AlertTriangle className="h-3 w-3" />
                <span>Première consultation</span>
              </div>
            )}

            {/* Queue Position (Real-time) */}
            {queuePosition !== undefined && queuePosition > 0 && (
              <div className="mt-2 p-2 bg-primary/10 rounded-lg">
                <p className="text-sm font-medium text-primary">
                  Position dans la file : #{queuePosition}
                </p>
                {estimatedWaitTime !== undefined && (
                  <p className="text-xs text-muted-foreground">
                    Temps d'attente estimé : ~{estimatedWaitTime} min
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Status and Actions */}
          <div className="flex flex-col items-end gap-2">
            {getStatusBadge(appointment.status)}
            
            {showActions && appointment.status !== 'cancelled' && appointment.status !== 'completed' && !isPast && (
              <Button
                variant="outline"
                size="sm"
                className="text-destructive hover:text-destructive"
                onClick={() => onCancel?.(appointment.id)}
              >
                Annuler
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
