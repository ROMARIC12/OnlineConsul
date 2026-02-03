import { Star, MapPin, Clock, CreditCard, Shield, Languages } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface DoctorSearchCardProps {
  doctor: {
    id: string;
    specialty: string;
    photo_url?: string | null;
    bio?: string | null;
    years_experience?: number | null;
    consultation_price_min?: number | null;
    consultation_price_max?: number | null;
    accepts_insurance?: boolean | null;
    accepts_mobile_money?: boolean | null;
    languages?: string[] | null;
    is_verified?: boolean | null;
    profile?: {
      first_name: string;
      last_name: string;
    };
    clinics?: Array<{
      clinic: {
        name: string;
        address: string;
        city?: string | null;
        pmr_access?: boolean | null;
      };
    }>;
  };
  onViewProfile: (doctorId: string) => void;
  onBookAppointment: (doctorId: string) => void;
}

export function DoctorSearchCard({ doctor, onViewProfile, onBookAppointment }: DoctorSearchCardProps) {
  const initials = `${doctor.profile?.first_name?.[0] || ''}${doctor.profile?.last_name?.[0] || ''}`;
  const fullName = `Dr. ${doctor.profile?.first_name || ''} ${doctor.profile?.last_name || ''}`;
  
  const priceRange = doctor.consultation_price_min && doctor.consultation_price_max
    ? `${doctor.consultation_price_min.toLocaleString()} - ${doctor.consultation_price_max.toLocaleString()} FCFA`
    : doctor.consultation_price_min
    ? `À partir de ${doctor.consultation_price_min.toLocaleString()} FCFA`
    : 'Tarif non communiqué';

  const primaryClinic = doctor.clinics?.[0]?.clinic;

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardContent className="p-4">
        <div className="flex gap-4">
          {/* Photo */}
          <Avatar className="h-20 w-20 flex-shrink-0">
            <AvatarImage src={doctor.photo_url || undefined} alt={fullName} />
            <AvatarFallback className="text-lg bg-primary/10 text-primary">
              {initials}
            </AvatarFallback>
          </Avatar>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="font-semibold text-lg flex items-center gap-2">
                  {fullName}
                  {doctor.is_verified && (
                    <Badge variant="secondary" className="text-xs">
                      <Shield className="h-3 w-3 mr-1" />
                      Vérifié
                    </Badge>
                  )}
                </h3>
                <p className="text-primary font-medium">{doctor.specialty}</p>
              </div>
            </div>

            {/* Experience */}
            {doctor.years_experience && (
              <p className="text-sm text-muted-foreground mt-1">
                {doctor.years_experience} ans d'expérience
              </p>
            )}

            {/* Location */}
            {primaryClinic && (
              <div className="flex items-center gap-1 text-sm text-muted-foreground mt-2">
                <MapPin className="h-4 w-4" />
                <span>{primaryClinic.name}, {primaryClinic.city || primaryClinic.address}</span>
                {primaryClinic.pmr_access && (
                  <Badge variant="outline" className="ml-2 text-xs">
                    ♿ PMR
                  </Badge>
                )}
              </div>
            )}

            {/* Features */}
            <div className="flex flex-wrap gap-2 mt-3">
              {doctor.accepts_insurance && (
                <Badge variant="outline" className="text-xs">
                  <CreditCard className="h-3 w-3 mr-1" />
                  Assurance
                </Badge>
              )}
              {doctor.accepts_mobile_money && (
                <Badge variant="outline" className="text-xs">
                  📱 Mobile Money
                </Badge>
              )}
              {doctor.languages && doctor.languages.length > 0 && (
                <Badge variant="outline" className="text-xs">
                  <Languages className="h-3 w-3 mr-1" />
                  {doctor.languages.join(', ')}
                </Badge>
              )}
            </div>

            {/* Price and Actions */}
            <div className="flex items-center justify-between mt-4 pt-3 border-t">
              <div className="text-sm">
                <span className="text-muted-foreground">Consultation : </span>
                <span className="font-medium">{priceRange}</span>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => onViewProfile(doctor.id)}>
                  Voir profil
                </Button>
                <Button size="sm" onClick={() => onBookAppointment(doctor.id)}>
                  Prendre RDV
                </Button>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
