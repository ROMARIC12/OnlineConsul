import { useState, useEffect, useCallback } from 'react';
import { format, addDays } from 'date-fns';
import { fr } from 'date-fns/locale';
import { X, ChevronLeft, ChevronRight, Clock, Loader2, CheckCircle, Building2, Stethoscope, User, Calendar as CalendarIcon, CreditCard, FileText, MapPin, Receipt, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useRealtimeSubscription } from '@/hooks/useRealtimeSubscription';
import { useDoctorPricing } from '@/hooks/useDoctorPricing';
import { useDoctorAvailability } from '@/hooks/useDoctorAvailability';
import { MoneyFusionPayment } from './MoneyFusionPayment';
import { HealthProblemButton } from './HealthProblemSelector';

interface FullBookingFlowProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

interface Clinic {
  id: string;
  name: string;
  address: string;
  city: string | null;
}

interface Doctor {
  id: string;
  profile_id: string;
  specialty: string;
  photo_url: string | null;
  consultation_price_min: number | null;
  profile: {
    first_name: string;
    last_name: string;
  };
}

interface TimeSlot {
  time: string;
  available: boolean;
}

// AvailabilityData is now handled by useDoctorAvailability hook

const COMMON_ALLERGIES = ['Pénicilline', 'Aspirine', 'Latex', 'Iode', 'Arachides', 'Fruits de mer'];
const CHRONIC_CONDITIONS = ['Diabète', 'Hypertension', 'Asthme', 'Cardiopathie', 'Épilepsie', 'VIH/SIDA'];

type Step = 'clinic' | 'specialty' | 'doctor' | 'datetime' | 'preconsultation' | 'payment' | 'confirmation';

export function FullBookingFlow({ open, onClose, onSuccess }: FullBookingFlowProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  
  // Step management
  const [step, setStep] = useState<Step>('clinic');
  
  // Selection state
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [selectedClinic, setSelectedClinic] = useState<Clinic | null>(null);
  const [specialties, setSpecialties] = useState<string[]>([]);
  const [selectedSpecialty, setSelectedSpecialty] = useState<string>('');
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);
  const [patientId, setPatientId] = useState<string | null>(null);
  const [patientName, setPatientName] = useState<string>('');
  const [patientPhone, setPatientPhone] = useState<string>('');
  
  // DateTime selection
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  
  // Use real-time pricing and availability hooks
  const { pricing, depositAmount } = useDoctorPricing(selectedDoctor?.id || null);
  const { availability, isDayAvailable: checkDayAvailable } = useDoctorAvailability(selectedDoctor?.id || null);
  const [consultationType, setConsultationType] = useState('consultation');
  
  // Pre-consultation form
  const [consultationReason, setConsultationReason] = useState('');
  const [selectedAllergies, setSelectedAllergies] = useState<string[]>([]);
  const [selectedConditions, setSelectedConditions] = useState<string[]>([]);
  const [currentTreatments, setCurrentTreatments] = useState('');
  const [identityConfirmed, setIdentityConfirmed] = useState(false);
  
  // Booking state
  const [isLoading, setIsLoading] = useState(false);
  const [isBooking, setIsBooking] = useState(false);
  const [pendingAppointmentId, setPendingAppointmentId] = useState<string | null>(null);
  const [queuePosition, setQueuePosition] = useState<number>(0);
  const [paymentSuccess, setPaymentSuccess] = useState(false);

  // Get patient ID and info
  useEffect(() => {
    const fetchPatientInfo = async () => {
      if (!user) return;
      const { data } = await supabase
        .from('patients')
        .select('id, profile:profiles(first_name, last_name, phone)')
        .eq('profile_id', user.id)
        .single();
      if (data) {
        setPatientId(data.id);
        const profile = data.profile as { first_name: string; last_name: string; phone: string } | null;
        if (profile) {
          setPatientName(`${profile.first_name} ${profile.last_name}`);
          setPatientPhone(profile.phone || '');
        }
      }
    };
    if (open) fetchPatientInfo();
  }, [user, open]);

  // Fetch clinics
  useEffect(() => {
    const fetchClinics = async () => {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('clinics')
        .select('id, name, address, city')
        .order('name');
      
      if (!error && data) {
        setClinics(data);
      }
      setIsLoading(false);
    };
    
    if (open && step === 'clinic') {
      fetchClinics();
    }
  }, [open, step]);

  // Fetch specialties when clinic is selected
  useEffect(() => {
    const fetchSpecialties = async () => {
      if (!selectedClinic) return;
      
      setIsLoading(true);
      // Get doctors in this clinic
      const { data: clinicDoctors } = await supabase
        .from('clinic_doctors')
        .select('doctor_id')
        .eq('clinic_id', selectedClinic.id)
        .eq('is_active', true);
      
      if (clinicDoctors && clinicDoctors.length > 0) {
        const doctorIds = clinicDoctors.map(cd => cd.doctor_id);
        // Don't filter by is_verified to show all doctors
        const { data: doctorsData } = await supabase
          .from('doctors')
          .select('specialty')
          .in('id', doctorIds);
        
        const specs = [...new Set(doctorsData?.map(d => d.specialty).filter(Boolean) || [])];
        setSpecialties(specs);
      } else {
        // If no clinic_doctors, get ALL doctors' specialties (not just verified)
        const { data: allDoctors } = await supabase
          .from('doctors')
          .select('specialty');
        
        const specs = [...new Set(allDoctors?.map(d => d.specialty).filter(Boolean) || [])];
        setSpecialties(specs);
      }
      setIsLoading(false);
    };

    if (step === 'specialty') {
      fetchSpecialties();
    }
  }, [selectedClinic, step]);

  // Fetch doctors when specialty is selected
  useEffect(() => {
    const fetchDoctors = async () => {
      if (!selectedSpecialty) return;
      
      setIsLoading(true);
      // Don't filter by is_verified to show all doctors
      let query = supabase
        .from('doctors')
        .select(`
          id,
          profile_id,
          specialty,
          photo_url,
          consultation_price_min,
          profile:profiles(first_name, last_name)
        `)
        .eq('specialty', selectedSpecialty);

      // If clinic selected and has doctors, filter by clinic
      if (selectedClinic) {
        const { data: clinicDoctors } = await supabase
          .from('clinic_doctors')
          .select('doctor_id')
          .eq('clinic_id', selectedClinic.id)
          .eq('is_active', true);
        
        if (clinicDoctors && clinicDoctors.length > 0) {
          const doctorIds = clinicDoctors.map(cd => cd.doctor_id);
          query = query.in('id', doctorIds);
        }
        // If no clinic_doctors association, show all doctors of this specialty
      }

      const { data } = await query;
      setDoctors(data as Doctor[] || []);
      setIsLoading(false);
    };

    if (step === 'doctor') {
      fetchDoctors();
    }
  }, [selectedClinic, selectedSpecialty, step]);

  // Note: Availability is now fetched via useDoctorAvailability hook with real-time sync

  // Generate time slots for selected date
  const generateTimeSlots = useCallback(async (date: Date) => {
    if (!selectedDoctor) return;
    
    setIsLoading(true);
    const dayOfWeek = date.getDay();
    const dateStr = format(date, 'yyyy-MM-dd');
    
    const dayAvailability = availability.find(a => a.day_of_week === dayOfWeek);
    
    if (!dayAvailability) {
      setTimeSlots([]);
      setIsLoading(false);
      return;
    }

    // Get existing appointments for this date
    const { data: existingAppointments } = await supabase
      .from('appointments')
      .select('appointment_time')
      .eq('doctor_id', selectedDoctor.id)
      .eq('appointment_date', dateStr)
      .neq('status', 'cancelled');

    const bookedTimes = new Set(existingAppointments?.map(a => a.appointment_time.slice(0, 5)) || []);

    // Generate slots
    const slots: TimeSlot[] = [];
    const startHour = parseInt(dayAvailability.start_time.split(':')[0]);
    const endHour = parseInt(dayAvailability.end_time.split(':')[0]);
    
    for (let hour = startHour; hour < endHour; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const timeStr = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        slots.push({
          time: timeStr,
          available: !bookedTimes.has(timeStr),
        });
      }
    }

    setTimeSlots(slots);
    setIsLoading(false);
  }, [selectedDoctor, availability]);

  // Real-time slot updates
  useRealtimeSubscription({
    table: 'appointments',
    filter: selectedDoctor ? 'doctor_id' : undefined,
    filterValue: selectedDoctor?.id,
    onChange: () => {
      if (selectedDate) {
        generateTimeSlots(selectedDate);
      }
    },
  });

  useEffect(() => {
    if (selectedDate && step === 'datetime') {
      generateTimeSlots(selectedDate);
      setSelectedTime(null);
    }
  }, [selectedDate, generateTimeSlots, step]);

  // Check if a day is available - use the hook's function
  const isDayAvailable = (date: Date) => {
    return checkDayAvailable(date.getDay());
  };

  // Toggle allergy
  const toggleAllergy = (allergy: string) => {
    setSelectedAllergies(prev =>
      prev.includes(allergy) ? prev.filter(a => a !== allergy) : [...prev, allergy]
    );
  };

  // Toggle condition
  const toggleCondition = (condition: string) => {
    setSelectedConditions(prev =>
      prev.includes(condition) ? prev.filter(c => c !== condition) : [...prev, condition]
    );
  };

  // Create appointment
  const handleCreateAppointment = async (): Promise<string | null> => {
    if (!selectedDate || !selectedTime || !selectedDoctor || !patientId) return null;

    try {
      const dateStr = format(selectedDate, 'yyyy-MM-dd');

      // Use atomic booking function
      const { data: appointmentId, error: bookingError } = await supabase
        .rpc('book_appointment_atomic', {
          p_patient_id: patientId,
          p_doctor_id: selectedDoctor.id,
          p_appointment_date: dateStr,
          p_appointment_time: selectedTime + ':00',
          p_clinic_id: selectedClinic?.id || null,
          p_is_first_visit: true,
        });

      if (bookingError) {
        if (bookingError.message?.includes('déjà réservé')) {
          toast({
            variant: 'destructive',
            title: 'Créneau non disponible',
            description: 'Ce créneau vient d\'être réservé. Veuillez en choisir un autre.',
          });
          generateTimeSlots(selectedDate);
          setStep('datetime');
          return null;
        }
        throw bookingError;
      }

      // Create pre-consultation form (notifications are sent AFTER payment success)
      if (appointmentId) {
        await supabase.from('consultation_forms').insert({
          appointment_id: appointmentId,
          consultation_reason: consultationReason,
          allergies: selectedAllergies,
          chronic_conditions: selectedConditions,
          current_treatments: currentTreatments,
          identity_confirmed: identityConfirmed,
        });
      }

      return appointmentId;
    } catch (error: any) {
      console.error('Error creating appointment:', error);
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: error.message || 'Impossible de créer le rendez-vous.',
      });
      return null;
    }
  };

  // Proceed to payment
  const handleProceedToPayment = async () => {
    setIsBooking(true);
    const appointmentId = await handleCreateAppointment();
    setIsBooking(false);
    
    if (appointmentId) {
      setPendingAppointmentId(appointmentId);
      setStep('payment');
    }
  };

  // Handle payment success - send notifications and create receipt
  const handlePaymentSuccess = async (ref: string) => {
    setPaymentSuccess(true);
    
    if (pendingAppointmentId && selectedDoctor && selectedDate && patientId) {
      // Get queue position
      const { data: queueData } = await supabase.rpc('get_queue_position', { p_appointment_id: pendingAppointmentId });
      setQueuePosition(queueData || 1);

      // Get patient name for notification
      const { data: patientData } = await supabase
        .from('patients')
        .select('profile:profiles(first_name, last_name)')
        .eq('id', patientId)
        .single();
      
      const patientName = patientData?.profile 
        ? `${patientData.profile.first_name} ${patientData.profile.last_name}`
        : 'Un patient';

      const doctorName = `Dr. ${selectedDoctor.profile?.first_name || ''} ${selectedDoctor.profile?.last_name || ''}`;
      const appointmentInfo = `${format(selectedDate, 'd MMMM yyyy', { locale: fr })} à ${selectedTime}`;

      // NOW send notifications after payment success
      // Send notification to doctor
      await supabase.from('notifications').insert({
        user_id: selectedDoctor.profile_id,
        type: 'new_appointment',
        title: 'Nouveau RDV confirmé',
        message: `${patientName} a réservé un rendez-vous le ${appointmentInfo} (paiement effectué)`,
        data: {
          appointment_id: pendingAppointmentId,
          patient_id: patientId,
          action: 'confirm_required',
          payment_ref: ref,
        },
      });

      // Send notifications to clinic secretaries if clinic selected
      if (selectedClinic?.id) {
        const { data: secretaries } = await supabase
          .from('clinic_secretaries')
          .select('secretary_id')
          .eq('clinic_id', selectedClinic.id)
          .eq('is_active', true);

        if (secretaries && secretaries.length > 0) {
          const secretaryNotifications = secretaries.map(sec => ({
            user_id: sec.secretary_id,
            type: 'new_appointment',
            title: 'Nouveau RDV à confirmer',
            message: `${patientName} a pris RDV avec ${doctorName} le ${appointmentInfo} (paiement effectué)`,
            data: {
              appointment_id: pendingAppointmentId,
              clinic_id: selectedClinic.id,
              doctor_id: selectedDoctor.id,
              patient_id: patientId,
              action: 'confirm_required',
              payment_ref: ref,
            },
          }));

          await supabase.from('notifications').insert(secretaryNotifications);
        }
      }

      // Send confirmation notification to patient
      if (user) {
        await supabase.from('notifications').insert({
          user_id: user.id,
          type: 'payment_success',
          title: 'Paiement confirmé',
          message: `Votre paiement de ${depositAmount.toLocaleString()} FCFA a été reçu. Votre reçu est disponible dans vos documents.`,
          data: {
            appointment_id: pendingAppointmentId,
            amount: depositAmount,
            transaction_ref: ref,
          },
        });
      }
    }

    toast({
      title: 'Paiement réussi ! 🎉',
      description: `Votre rendez-vous est confirmé. Votre reçu a été généré.`,
    });

    setStep('confirmation');
  };

  // Reset form
  const resetForm = () => {
    setStep('clinic');
    setSelectedClinic(null);
    setSelectedSpecialty('');
    setSelectedDoctor(null);
    setSelectedDate(undefined);
    setSelectedTime(null);
    setConsultationType('consultation');
    setConsultationReason('');
    setSelectedAllergies([]);
    setSelectedConditions([]);
    setCurrentTreatments('');
    setIdentityConfirmed(false);
    setPendingAppointmentId(null);
    setQueuePosition(0);
    setPaymentSuccess(false);
  };

  // Handle close
  const handleClose = () => {
    resetForm();
    onClose();
  };

  // Go back
  const handleBack = () => {
    switch (step) {
      case 'specialty':
        setStep('clinic');
        break;
      case 'doctor':
        setStep('specialty');
        break;
      case 'datetime':
        setStep('doctor');
        break;
      case 'preconsultation':
        setStep('datetime');
        break;
      case 'payment':
        setStep('preconsultation');
        break;
      default:
        handleClose();
    }
  };

  if (!open) return null;

  // depositAmount comes from the useDoctorPricing hook with real-time sync

  const stepTitles: Record<Step, string> = {
    clinic: 'Choisir un centre',
    specialty: 'Choisir une spécialité',
    doctor: 'Choisir un médecin',
    datetime: 'Choisir un créneau',
    preconsultation: 'Pré-consultation',
    payment: 'Paiement',
    confirmation: 'Confirmation',
  };

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-card border-b border-border">
        <div className="flex items-center justify-between h-14 px-4">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={step === 'confirmation' ? handleClose : handleBack}
            className="-ml-2"
          >
            {step === 'clinic' || step === 'confirmation' ? <X className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
          </Button>
          <h1 className="font-semibold text-lg">{stepTitles[step]}</h1>
          <div className="w-10" />
        </div>
      </header>

      <ScrollArea className="flex-1">
        {/* Step 1: Select Clinic */}
        {step === 'clinic' && (
          <div className="p-4 space-y-3">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : clinics.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Building2 className="h-12 w-12 mx-auto mb-4 opacity-30" />
                <p>Aucun centre de santé disponible</p>
              </div>
            ) : (
              clinics.map((clinic) => (
                <Card 
                  key={clinic.id}
                  className={`cursor-pointer transition-all hover:shadow-md ${
                    selectedClinic?.id === clinic.id ? 'ring-2 ring-primary' : ''
                  }`}
                  onClick={() => {
                    setSelectedClinic(clinic);
                    setStep('specialty');
                  }}
                >
                  <CardContent className="flex items-center gap-4 p-4">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                      <Building2 className="h-6 w-6 text-primary" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-medium">{clinic.name}</h3>
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {clinic.address}
                        {clinic.city && `, ${clinic.city}`}
                      </p>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        )}

        {/* Step 2: Select Specialty */}
        {step === 'specialty' && (
          <div className="p-4 space-y-3">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : specialties.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Stethoscope className="h-12 w-12 mx-auto mb-4 opacity-30" />
                <p>Aucune spécialité disponible</p>
              </div>
            ) : (
              specialties.map((specialty) => (
                <Card 
                  key={specialty}
                  className={`cursor-pointer transition-all hover:shadow-md ${
                    selectedSpecialty === specialty ? 'ring-2 ring-primary' : ''
                  }`}
                  onClick={() => {
                    setSelectedSpecialty(specialty);
                    setStep('doctor');
                  }}
                >
                  <CardContent className="flex items-center gap-4 p-4">
                    <div className="w-12 h-12 rounded-full bg-accent/50 flex items-center justify-center">
                      <Stethoscope className="h-6 w-6 text-accent-foreground" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-medium">{specialty}</h3>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        )}

        {/* Step 3: Select Doctor */}
        {step === 'doctor' && (
          <div className="p-4 space-y-3">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : doctors.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <User className="h-12 w-12 mx-auto mb-4 opacity-30" />
                <p>Aucun médecin disponible</p>
              </div>
            ) : (
              doctors.map((doctor) => {
                const fullName = `Dr. ${doctor.profile?.first_name || ''} ${doctor.profile?.last_name || ''}`.trim();
                const initials = `${doctor.profile?.first_name?.[0] || ''}${doctor.profile?.last_name?.[0] || ''}`;
                
                return (
                  <Card 
                    key={doctor.id}
                    className={`cursor-pointer transition-all hover:shadow-md ${
                      selectedDoctor?.id === doctor.id ? 'ring-2 ring-primary' : ''
                    }`}
                    onClick={() => {
                      setSelectedDoctor(doctor);
                      setStep('datetime');
                    }}
                  >
                    <CardContent className="flex items-center gap-4 p-4">
                      <Avatar className="h-14 w-14">
                        <AvatarImage src={doctor.photo_url || undefined} />
                        <AvatarFallback className="bg-primary/10 text-primary">
                          {initials}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <h3 className="font-medium">{fullName}</h3>
                        <p className="text-sm text-muted-foreground">{doctor.specialty}</p>
                        {doctor.consultation_price_min && (
                          <p className="text-sm text-primary font-medium">
                            {doctor.consultation_price_min.toLocaleString()} FCFA
                          </p>
                        )}
                      </div>
                      <ChevronRight className="h-5 w-5 text-muted-foreground" />
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        )}

        {/* Step 4: Select Date & Time */}
        {step === 'datetime' && (
          <div className="p-4 space-y-4">
            {/* Consultation Type */}
            <Select value={consultationType} onValueChange={setConsultationType}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Type de consultation" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="consultation">Consultation</SelectItem>
                <SelectItem value="teleconsultation">Téléconsultation</SelectItem>
                <SelectItem value="followup">Suivi</SelectItem>
              </SelectContent>
            </Select>

            {/* Date Selection */}
            <div>
              <Label className="text-sm font-medium mb-2 block">Sélectionnez une date</Label>
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                disabled={(date) => 
                  date < new Date() || 
                  date > addDays(new Date(), 60) ||
                  !isDayAvailable(date)
                }
                locale={fr}
                className="rounded-lg border mx-auto"
              />
            </div>

            {/* Time Slots */}
            {selectedDate && (
              <div>
                <Label className="text-sm font-medium mb-2 block">
                  Créneaux disponibles - {format(selectedDate, 'd MMMM', { locale: fr })}
                </Label>
                
                {isLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                ) : timeSlots.length === 0 ? (
                  <p className="text-muted-foreground text-sm text-center py-4">
                    Aucun créneau disponible ce jour
                  </p>
                ) : (
                  <div className="grid grid-cols-4 gap-2">
                    {timeSlots.map((slot) => (
                      <Button
                        key={slot.time}
                        variant={selectedTime === slot.time ? 'default' : 'outline'}
                        size="sm"
                        disabled={!slot.available}
                        onClick={() => setSelectedTime(slot.time)}
                        className={selectedTime === slot.time ? 'bg-primary' : ''}
                      >
                        {slot.time}
                      </Button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {selectedTime && (
              <Button
                onClick={() => setStep('preconsultation')}
                className="w-full py-6 text-base font-medium rounded-xl bg-accent hover:bg-accent/90 text-accent-foreground border-0"
              >
                Continuer
              </Button>
            )}
          </div>
        )}

        {/* Step 5: Pre-consultation Form */}
        {step === 'preconsultation' && (
          <div className="p-4 space-y-4">
            <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
              <h3 className="font-medium text-primary mb-1">Formulaire administratif</h3>
              <p className="text-sm text-muted-foreground">
                Ces informations aideront le médecin à mieux préparer votre consultation.
              </p>
            </div>

            {/* Health Problem Selector for illiterate users */}
            <HealthProblemButton 
              onSelect={(description) => setConsultationReason(description)} 
            />

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">OU</span>
              </div>
            </div>

            <div>
              <Label htmlFor="reason">Motif de consultation</Label>
              <Textarea
                id="reason"
                placeholder="Décrivez brièvement la raison de votre consultation..."
                value={consultationReason}
                onChange={(e) => setConsultationReason(e.target.value)}
                className="mt-1"
              />
            </div>

            <div>
              <Label className="mb-2 block">Allergies connues</Label>
              <div className="flex flex-wrap gap-2">
                {COMMON_ALLERGIES.map((allergy) => (
                  <Badge
                    key={allergy}
                    variant={selectedAllergies.includes(allergy) ? 'default' : 'outline'}
                    className="cursor-pointer"
                    onClick={() => toggleAllergy(allergy)}
                  >
                    {allergy}
                  </Badge>
                ))}
              </div>
            </div>

            <div>
              <Label className="mb-2 block">Antécédents / Maladies chroniques</Label>
              <div className="flex flex-wrap gap-2">
                {CHRONIC_CONDITIONS.map((condition) => (
                  <Badge
                    key={condition}
                    variant={selectedConditions.includes(condition) ? 'default' : 'outline'}
                    className="cursor-pointer"
                    onClick={() => toggleCondition(condition)}
                  >
                    {condition}
                  </Badge>
                ))}
              </div>
            </div>

            <div>
              <Label htmlFor="treatments">Traitements en cours</Label>
              <Textarea
                id="treatments"
                placeholder="Listez vos médicaments actuels..."
                value={currentTreatments}
                onChange={(e) => setCurrentTreatments(e.target.value)}
                className="mt-1"
              />
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="identity"
                checked={identityConfirmed}
                onCheckedChange={(checked) => setIdentityConfirmed(checked as boolean)}
              />
              <Label htmlFor="identity" className="text-sm">
                Je confirme que les informations fournies sont exactes
              </Label>
            </div>

            <Button
              onClick={handleProceedToPayment}
              disabled={!identityConfirmed || isBooking}
              className="w-full py-6 text-base font-medium rounded-xl bg-accent hover:bg-accent/90 text-accent-foreground border-0"
            >
              {isBooking ? (
                <>
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  Création du RDV...
                </>
              ) : (
                <>
                  <CreditCard className="h-5 w-5 mr-2" />
                  Procéder au paiement ({depositAmount.toLocaleString()} FCFA)
                </>
              )}
            </Button>
          </div>
        )}

        {/* Step 6: Payment */}
        {step === 'payment' && pendingAppointmentId && patientId && (
          <div className="p-4 space-y-4">
            <Card>
              <CardContent className="p-4 space-y-3">
                <h3 className="font-medium">Récapitulatif</h3>
                <div className="text-sm space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Centre :</span>
                    <span>{selectedClinic?.name || 'Non spécifié'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Médecin :</span>
                    <span>Dr. {selectedDoctor?.profile?.first_name} {selectedDoctor?.profile?.last_name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Date :</span>
                    <span>{selectedDate && format(selectedDate, 'EEEE d MMMM yyyy', { locale: fr })}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Heure :</span>
                    <span>{selectedTime}</span>
                  </div>
                  <div className="flex justify-between font-medium pt-2 border-t">
                    <span>Acompte à payer :</span>
                    <span className="text-primary">{depositAmount.toLocaleString()} FCFA</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <MoneyFusionPayment
              amount={depositAmount}
              appointmentId={pendingAppointmentId}
              patientId={patientId}
              customerName={patientName}
              customerPhone={patientPhone}
              onSuccess={handlePaymentSuccess}
              onError={(error) => {
                toast({
                  variant: 'destructive',
                  title: 'Erreur de paiement',
                  description: error || 'Une erreur est survenue lors du paiement.',
                });
              }}
            />
          </div>
        )}

        {/* Step 7: Confirmation */}
        {step === 'confirmation' && (
          <div className="p-4 text-center space-y-6 py-8">
            <div className="w-20 h-20 mx-auto bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle className="h-12 w-12 text-green-600" />
            </div>
            
            <div>
              <h2 className="text-xl font-bold mb-2">Rendez-vous confirmé !</h2>
              <p className="text-muted-foreground">
                Votre rendez-vous a été réservé avec succès.
              </p>
            </div>

            <Card>
              <CardContent className="p-4 space-y-3">
                <div className="text-sm space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Centre :</span>
                    <span>{selectedClinic?.name || 'Non spécifié'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Médecin :</span>
                    <span>Dr. {selectedDoctor?.profile?.first_name} {selectedDoctor?.profile?.last_name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Date :</span>
                    <span>{selectedDate && format(selectedDate, 'EEEE d MMMM yyyy', { locale: fr })}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Heure :</span>
                    <span>{selectedTime}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-primary">
              <CardContent className="p-4 text-center">
                <p className="text-sm text-muted-foreground mb-2">Votre position dans la file d'attente</p>
                <p className="text-4xl font-bold text-primary">#{queuePosition}</p>
              </CardContent>
            </Card>

            <Button
              onClick={() => {
                handleClose();
                onSuccess?.();
              }}
              className="w-full py-6 text-base font-medium rounded-xl"
            >
              Voir mes rendez-vous
            </Button>
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
