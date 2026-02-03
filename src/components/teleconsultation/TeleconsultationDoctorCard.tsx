import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Video, Phone, Key, Play } from 'lucide-react';

interface TeleconsultationDoctorCardProps {
  doctor: {
    id: string;
    specialty: string;
    photo_url?: string | null;
    teleconsultation_price_per_minute?: number | null;
    teleconsultation_price_per_hour?: number | null;
    teleconsultation_enabled?: boolean | null;
    is_teleconsultation_free?: boolean;
    profile: {
      first_name: string;
      last_name: string;
    };
  };
  onEnterCode: (doctorId: string) => void;
  onBookTeleconsultation: (doctor: TeleconsultationDoctorCardProps['doctor']) => void;
}

export function TeleconsultationDoctorCard({
  doctor,
  onEnterCode,
  onBookTeleconsultation
}: TeleconsultationDoctorCardProps) {
  const initials = doctor.profile ? `${doctor.profile.first_name?.[0] || ''}${doctor.profile.last_name?.[0] || ''}` : 'Dr';
  const fullName = doctor.profile ? `Dr. ${doctor.profile.first_name || ''} ${doctor.profile.last_name || ''}` : 'Médecin';

  const pricePerMinute = doctor.teleconsultation_price_per_minute || 0;
  const pricePerHour = doctor.teleconsultation_price_per_hour || 0;
  const isFree = doctor.is_teleconsultation_free;

  return (
    <Card className="overflow-hidden hover:shadow-lg transition-all duration-300 border-2 hover:border-primary/30">
      <CardContent className="p-4">
        {/* Doctor Header */}
        <div className="flex items-start gap-4">
          {/* Avatar with online indicator */}
          <div className="relative">
            <Avatar className="h-16 w-16 border-2 border-background shadow-lg">
              <AvatarImage src={doctor.photo_url || undefined} alt={fullName} />
              <AvatarFallback className="bg-primary/10 text-primary font-semibold text-lg">
                {initials || 'Dr'}
              </AvatarFallback>
            </Avatar>
            {/* Online status indicator */}
            <div className="absolute -bottom-1 -right-1 flex items-center justify-center">
              <span className="relative flex h-4 w-4">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-4 w-4 bg-green-500 border-2 border-white"></span>
              </span>
            </div>
          </div>

          {/* Doctor Info */}
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-foreground truncate">{fullName}</h3>
            <p className="text-sm text-muted-foreground">{doctor.specialty}</p>

            <div className="flex items-center gap-2 mt-2">
              <Badge variant="secondary" className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">
                <Video className="h-3 w-3 mr-1" />
                En ligne
              </Badge>

              {isFree ? (
                <Badge className="bg-primary text-primary-foreground">
                  Gratuit
                </Badge>
              ) : (
                <Badge variant="outline" className="text-xs">
                  {pricePerMinute > 0
                    ? `${pricePerMinute} FCFA/min`
                    : pricePerHour > 0
                      ? `${pricePerHour} FCFA/h`
                      : '100 FCFA/min'
                  }
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 mt-4">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => onEnterCode(doctor.id)}
          >
            <Key className="h-4 w-4 mr-2" />
            Entrer un code
          </Button>

          {isFree ? (
            <Button
              className="flex-1 bg-green-600 hover:bg-green-700"
              onClick={() => onBookTeleconsultation(doctor)}
            >
              <Play className="h-4 w-4 mr-2" />
              Commencer
            </Button>
          ) : (
            <Button
              className="flex-1"
              onClick={() => onBookTeleconsultation(doctor)}
            >
              <Video className="h-4 w-4 mr-2" />
              Prendre RDV
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
