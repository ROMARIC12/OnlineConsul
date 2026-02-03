import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { 
  X, 
  MapPin, 
  Clock, 
  CreditCard, 
  Languages, 
  Calendar,
  Phone,
  CheckCircle,
  Loader2,
  ChevronDown,
  ChevronUp,
  Info,
  AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { BookAppointmentDialog } from '@/components/patient/BookAppointmentDialog';

interface DoctorData {
  id: string;
  specialty: string;
  photo_url: string | null;
  bio: string | null;
  years_experience: number | null;
  consultation_price_min: number | null;
  consultation_price_max: number | null;
  accepts_insurance: boolean;
  accepts_mobile_money: boolean;
  languages: string[];
  is_verified: boolean;
  license_number: string | null;
  profile: {
    first_name: string;
    last_name: string;
    phone: string | null;
  };
  availability: Array<{
    day_of_week: number;
    start_time: string;
    end_time: string;
    is_active: boolean;
  }>;
  clinics: Array<{
    clinic: {
      id: string;
      name: string;
      address: string;
      city: string | null;
      phone: string | null;
      pmr_access: boolean;
    };
  }>;
}

// Accordion section component
function AccordionSection({
  icon,
  iconColor,
  title,
  children,
  defaultOpen = false,
}: {
  icon: React.ReactNode;
  iconColor?: string;
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border-b border-border">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between py-4 px-4"
      >
        <div className="flex items-center gap-3">
          <span className={iconColor}>{icon}</span>
          <span className="font-medium">{title}</span>
        </div>
        {isOpen ? (
          <span className="text-muted-foreground">−</span>
        ) : (
          <span className="text-muted-foreground">+</span>
        )}
      </button>
      {isOpen && <div className="px-4 pb-4">{children}</div>}
    </div>
  );
}

export default function DoctorProfile() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, role } = useAuth();
  const [doctor, setDoctor] = useState<DoctorData | null>(null);
  const [patientId, setPatientId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isBookingOpen, setIsBookingOpen] = useState(false);

  useEffect(() => {
    const fetchDoctor = async () => {
      if (!id) return;

      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('doctors')
          .select(`
            id,
            specialty,
            photo_url,
            bio,
            years_experience,
            consultation_price_min,
            consultation_price_max,
            accepts_insurance,
            accepts_mobile_money,
            languages,
            is_verified,
            license_number,
            profile:profiles(first_name, last_name, phone),
            availability:doctor_availability(day_of_week, start_time, end_time, is_active),
            clinics:clinic_doctors(
              clinic:clinics(id, name, address, city, phone, pmr_access)
            )
          `)
          .eq('id', id)
          .single();

        if (error) throw error;

        setDoctor(data as unknown as DoctorData);
      } catch (error) {
        console.error('Error fetching doctor:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDoctor();
  }, [id]);

  // Fetch patient ID for booking
  useEffect(() => {
    const fetchPatientId = async () => {
      if (!user || role !== 'patient') return;

      const { data } = await supabase
        .from('patients')
        .select('id')
        .eq('profile_id', user.id)
        .single();

      if (data) {
        setPatientId(data.id);
      }
    };

    fetchPatientId();
  }, [user, role]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!doctor) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-background">
        <p className="text-muted-foreground">Médecin non trouvé</p>
        <Button onClick={() => navigate(-1)}>Retour</Button>
      </div>
    );
  }

  const fullName = `Pr ${doctor.profile.first_name} ${doctor.profile.last_name}`;
  const initials = `${doctor.profile.first_name[0]}${doctor.profile.last_name[0]}`;
  const primaryClinic = doctor.clinics?.[0]?.clinic;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-card border-b border-border">
        <div className="flex items-center justify-between h-14 px-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="-ml-2">
            <X className="h-5 w-5" />
          </Button>
          <h1 className="font-semibold text-lg">{fullName}</h1>
          <div className="w-10" />
        </div>
      </header>

      {/* Profile Content */}
      <div className="flex-1 overflow-auto">
        {/* Profile Header */}
        <div className="flex flex-col items-center py-8 px-4 bg-gradient-to-b from-card to-background">
          <Avatar className="h-28 w-28 mb-4 border-4 border-background shadow-lg">
            <AvatarImage src={doctor.photo_url || undefined} />
            <AvatarFallback className="text-2xl bg-[hsl(170,40%,85%)] text-[hsl(170,40%,30%)]">
              {initials}
            </AvatarFallback>
          </Avatar>
          <h2 className="text-xl font-bold">{fullName}</h2>
          <p className="text-muted-foreground">{doctor.specialty}</p>
          {doctor.is_verified && (
            <Badge className="mt-2 bg-[hsl(120,50%,45%)]">
              <CheckCircle className="h-3 w-3 mr-1" />
              Vérifié
            </Badge>
          )}
        </div>

        {/* Book Button */}
        {role === 'patient' && patientId && (
          <div className="px-4 pb-4">
            <Button
              onClick={() => setIsBookingOpen(true)}
              className="w-full py-6 text-base font-medium rounded-xl bg-[hsl(0,70%,70%)] hover:bg-[hsl(0,70%,65%)] text-white border-0"
            >
              Prendre rendez-vous
            </Button>
          </div>
        )}

        {/* Accordion Sections */}
        <div className="bg-card">
          <AccordionSection
            icon={<MapPin className="h-5 w-5" />}
            iconColor="text-[hsl(120,50%,45%)]"
            title="Adresse"
            defaultOpen
          >
            {primaryClinic ? (
              <div className="space-y-1 text-sm">
                <p className="font-medium">{primaryClinic.name}</p>
                <p className="text-muted-foreground">{primaryClinic.address}</p>
                {primaryClinic.city && (
                  <p className="text-muted-foreground">{primaryClinic.city}</p>
                )}
                {primaryClinic.phone && (
                  <p className="text-muted-foreground flex items-center gap-1 mt-2">
                    <Phone className="h-3 w-3" />
                    {primaryClinic.phone}
                  </p>
                )}
                {primaryClinic.pmr_access && (
                  <Badge variant="secondary" className="mt-2">♿ Accès PMR</Badge>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Adresse non renseignée</p>
            )}
          </AccordionSection>

          <AccordionSection
            icon={<AlertCircle className="h-5 w-5" />}
            iconColor="text-[hsl(45,80%,50%)]"
            title="Informations"
            defaultOpen
          >
            <div className="space-y-2 text-sm">
              {doctor.years_experience && (
                <p>{doctor.years_experience} ans d'expérience</p>
              )}
              {doctor.license_number && (
                <p className="text-muted-foreground">N° Ordre : {doctor.license_number}</p>
              )}
              {doctor.languages && doctor.languages.length > 0 && (
                <div className="flex items-center gap-2">
                  <Languages className="h-4 w-4" />
                  <span>{doctor.languages.join(', ')}</span>
                </div>
              )}
            </div>
          </AccordionSection>

          <AccordionSection
            icon={<CreditCard className="h-5 w-5" />}
            iconColor="text-[hsl(120,50%,45%)]"
            title="Prise en charge"
          >
            <div className="space-y-3 text-sm">
              {doctor.consultation_price_min && (
                <div>
                  <p className="text-muted-foreground">Tarif consultation</p>
                  <p className="font-medium text-lg text-primary">
                    {doctor.consultation_price_min.toLocaleString()}
                    {doctor.consultation_price_max && doctor.consultation_price_max !== doctor.consultation_price_min 
                      ? ` - ${doctor.consultation_price_max.toLocaleString()}` 
                      : ''} FCFA
                  </p>
                </div>
              )}
              <div className="flex flex-wrap gap-2">
                {doctor.accepts_insurance && (
                  <Badge variant="secondary">Assurance acceptée</Badge>
                )}
                {doctor.accepts_mobile_money && (
                  <Badge variant="secondary">📱 Mobile Money</Badge>
                )}
              </div>
            </div>
          </AccordionSection>

          <AccordionSection
            icon={<Info className="h-5 w-5" />}
            iconColor="text-[hsl(45,80%,50%)]"
            title="Infos pratiques"
          >
            <div className="space-y-3 text-sm">
              {doctor.bio ? (
                <p className="text-muted-foreground whitespace-pre-line">{doctor.bio}</p>
              ) : (
                <p className="text-muted-foreground">Aucune information supplémentaire</p>
              )}
              
              {/* Availability */}
              {doctor.availability && doctor.availability.filter(a => a.is_active).length > 0 && (
                <div className="mt-4">
                  <p className="font-medium mb-2 flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Horaires de consultation
                  </p>
                  <div className="space-y-1">
                    {doctor.availability
                      .filter(a => a.is_active)
                      .sort((a, b) => a.day_of_week - b.day_of_week)
                      .map((slot) => {
                        const days = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
                        return (
                          <div key={slot.day_of_week} className="flex justify-between text-muted-foreground">
                            <span>{days[slot.day_of_week]}</span>
                            <span>{slot.start_time.slice(0, 5)} - {slot.end_time.slice(0, 5)}</span>
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}
            </div>
          </AccordionSection>
        </div>
      </div>

      {/* Booking Dialog */}
      {patientId && doctor && (
        <BookAppointmentDialog
          open={isBookingOpen}
          onOpenChange={setIsBookingOpen}
          doctorId={doctor.id}
          patientId={patientId}
          clinicId={primaryClinic?.id}
          doctorName={fullName}
          consultationPrice={doctor.consultation_price_min || 15000}
          onSuccess={() => {
            setIsBookingOpen(false);
            navigate('/dashboard');
          }}
        />
      )}
    </div>
  );
}
