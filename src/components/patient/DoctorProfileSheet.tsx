import { useState, useEffect } from 'react';
import { X, MapPin, AlertCircle, CreditCard, Info, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { format, addDays, startOfWeek, endOfWeek } from 'date-fns';
import { fr } from 'date-fns/locale';

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
  profile: {
    first_name: string;
    last_name: string;
    phone: string | null;
  };
  clinics: Array<{
    clinic: {
      id: string;
      name: string;
      address: string;
      city: string | null;
    };
  }>;
}

interface DoctorProfileSheetProps {
  doctorId: string;
  open: boolean;
  onClose: () => void;
  onBookSlot: (doctorId: string, date: string, time: string) => void;
}

// Accordion section
function AccordionSection({
  icon,
  title,
  children,
  defaultOpen = false,
}: {
  icon: React.ReactNode;
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
          {icon}
          <span className="font-medium">{title}</span>
        </div>
        {isOpen ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
      </button>
      {isOpen && <div className="px-4 pb-4">{children}</div>}
    </div>
  );
}

export function DoctorProfileSheet({ doctorId, open, onClose, onBookSlot }: DoctorProfileSheetProps) {
  const [doctor, setDoctor] = useState<DoctorData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [step, setStep] = useState<'profile' | 'booking'>('profile');
  const [consultationType, setConsultationType] = useState('');
  const [weekStart, setWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [availability, setAvailability] = useState<Array<{ day_of_week: number; start_time: string; end_time: string }>>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);

  useEffect(() => {
    const fetchDoctor = async () => {
      if (!doctorId || !open) return;

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
            profile:profiles(first_name, last_name, phone),
            clinics:clinic_doctors(
              clinic:clinics(id, name, address, city)
            )
          `)
          .eq('id', doctorId)
          .single();

        if (error) throw error;
        setDoctor(data as unknown as DoctorData);

        // Fetch availability
        const { data: availData } = await supabase
          .from('doctor_availability')
          .select('day_of_week, start_time, end_time')
          .eq('doctor_id', doctorId)
          .eq('is_active', true);

        setAvailability(availData || []);
      } catch (error) {
        console.error('Error fetching doctor:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDoctor();
  }, [doctorId, open]);

  if (!open) return null;

  if (isLoading || !doctor) {
    return (
      <div className="fixed inset-0 z-50 bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Chargement...</p>
      </div>
    );
  }

  const fullName = `Pr ${doctor.profile.first_name} ${doctor.profile.last_name}`;
  const initials = `${doctor.profile.first_name[0]}${doctor.profile.last_name[0]}`;
  const primaryClinic = doctor.clinics?.[0]?.clinic;

  const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
  const weekLabel = `${format(weekStart, 'd/M/yyyy')} - ${format(weekEnd, 'd/M/yyyy')}`;

  const handlePreviousWeek = () => {
    setWeekStart(addDays(weekStart, -7));
  };

  const handleNextWeek = () => {
    setWeekStart(addDays(weekStart, 7));
  };

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between h-14 px-4 border-b">
        <Button variant="ghost" size="icon" onClick={step === 'booking' ? () => setStep('profile') : onClose}>
          <X className="h-5 w-5" />
        </Button>
        <h1 className="font-semibold">{fullName}</h1>
        <div className="w-10" />
      </header>

      {step === 'profile' ? (
        <ScrollArea className="flex-1">
          {/* Profile Header */}
          <div className="flex flex-col items-center py-8 px-4">
            <Avatar className="h-28 w-28 mb-4">
              <AvatarImage src={doctor.photo_url || undefined} />
              <AvatarFallback className="text-2xl bg-[hsl(170,40%,85%)] text-[hsl(170,40%,30%)]">
                {initials}
              </AvatarFallback>
            </Avatar>
            <h2 className="text-xl font-bold">{fullName}</h2>
            <p className="text-muted-foreground">{doctor.specialty}</p>
          </div>

          {/* Book Button */}
          <div className="px-4 pb-4">
            <Button
              onClick={() => setStep('booking')}
              className="w-full py-6 text-base font-medium rounded-xl bg-[hsl(0,70%,70%)] hover:bg-[hsl(0,70%,65%)] text-white border-0"
            >
              Prendre rendez-vous
            </Button>
          </div>

          {/* Accordion Sections */}
          <div>
            <AccordionSection
              icon={<MapPin className="h-5 w-5 text-[hsl(120,50%,45%)]" />}
              title="Adresse"
              defaultOpen
            >
              {primaryClinic ? (
                <div className="space-y-1 text-sm text-muted-foreground">
                  <p className="font-medium text-foreground">{primaryClinic.name}</p>
                  <p>{primaryClinic.address}</p>
                  {primaryClinic.city && <p>{primaryClinic.city}</p>}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Adresse non renseignée</p>
              )}
            </AccordionSection>

            <AccordionSection
              icon={<AlertCircle className="h-5 w-5 text-[hsl(45,80%,50%)]" />}
              title="Informations"
              defaultOpen
            >
              <div className="space-y-2 text-sm">
                {doctor.years_experience && (
                  <p>{doctor.years_experience} ans d'expérience</p>
                )}
                {doctor.languages && doctor.languages.length > 0 && (
                  <p>Langues : {doctor.languages.join(', ')}</p>
                )}
              </div>
            </AccordionSection>

            <AccordionSection
              icon={<CreditCard className="h-5 w-5 text-[hsl(120,50%,45%)]" />}
              title="Prise en charge"
            >
              <div className="space-y-2 text-sm">
                {doctor.consultation_price_min && (
                  <p>
                    Tarif consultation : {doctor.consultation_price_min.toLocaleString()} - {doctor.consultation_price_max?.toLocaleString() || doctor.consultation_price_min.toLocaleString()} FCFA
                  </p>
                )}
                {doctor.accepts_insurance && (
                  <Badge variant="secondary">Assurance acceptée</Badge>
                )}
                {doctor.accepts_mobile_money && (
                  <Badge variant="secondary" className="ml-2">Mobile Money</Badge>
                )}
              </div>
            </AccordionSection>

            <AccordionSection
              icon={<Info className="h-5 w-5 text-[hsl(45,80%,50%)]" />}
              title="Infos pratiques"
            >
              <p className="text-sm text-muted-foreground">
                {doctor.bio || 'Aucune information supplémentaire'}
              </p>
            </AccordionSection>
          </div>
        </ScrollArea>
      ) : (
        // Booking Step
        <ScrollArea className="flex-1">
          <div className="p-4 space-y-4">
            {/* Consultation Type */}
            <Select value={consultationType} onValueChange={setConsultationType}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Sélectionnez le type de RDV" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="consultation">Consultation</SelectItem>
                <SelectItem value="teleconsultation">Téléconsultation</SelectItem>
                <SelectItem value="followup">Suivi</SelectItem>
              </SelectContent>
            </Select>

            {consultationType && (
              <>
                {/* Week Navigation */}
                <div className="flex items-center justify-between">
                  <Button variant="ghost" size="icon" onClick={handlePreviousWeek}>
                    <ChevronLeft className="h-5 w-5" />
                  </Button>
                  <div className="bg-[hsl(210,30%,45%)] text-white px-6 py-2 rounded-lg font-medium">
                    {weekLabel}
                  </div>
                  <Button variant="ghost" size="icon" onClick={handleNextWeek}>
                    <ChevronRight className="h-5 w-5" />
                  </Button>
                  <Button variant="default" size="icon" className="bg-[hsl(210,50%,35%)]">
                    <Search className="h-5 w-5" />
                  </Button>
                </div>

                {/* Time Slots Grid */}
                <div className="bg-muted/50 rounded-lg p-4 min-h-[200px]">
                  {availability.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">
                      Aucun créneau disponible
                    </p>
                  ) : (
                    <div className="grid grid-cols-7 gap-2 text-center">
                      {/* Days of week header */}
                      {[...Array(7)].map((_, i) => {
                        const day = addDays(weekStart, i);
                        return (
                          <div key={i} className="text-xs text-muted-foreground">
                            {format(day, 'EEE', { locale: fr })}
                            <br />
                            {format(day, 'd')}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {selectedDate && selectedTime && (
                  <Button
                    onClick={() => onBookSlot(doctorId, selectedDate, selectedTime)}
                    className="w-full py-6 text-base font-medium rounded-xl bg-[hsl(0,70%,70%)] hover:bg-[hsl(0,70%,65%)] text-white border-0"
                  >
                    Confirmer le rendez-vous
                  </Button>
                )}
              </>
            )}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}
