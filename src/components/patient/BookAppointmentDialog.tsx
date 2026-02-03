import { useState, useEffect, useCallback } from 'react';
import { format, addDays } from 'date-fns';
import { fr } from 'date-fns/locale';
import { X, Clock, Loader2, AlertCircle, CheckCircle, CreditCard, ChevronLeft, ChevronRight, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useRealtimeSubscription } from '@/hooks/useRealtimeSubscription';
import { UrgentAlertStep } from './UrgentAlertStep';
import { PaystackPayment } from './PaystackPayment';

interface BookAppointmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  doctorId: string;
  patientId: string;
  clinicId?: string;
  doctorName: string;
  consultationPrice?: number;
  onSuccess?: () => void;
}

interface TimeSlot {
  time: string;
  available: boolean;
}

interface AvailabilityData {
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_active: boolean;
}

const COMMON_ALLERGIES = ['Pénicilline', 'Aspirine', 'Latex', 'Iode', 'Arachides', 'Fruits de mer'];
const CHRONIC_CONDITIONS = ['Diabète', 'Hypertension', 'Asthme', 'Cardiopathie', 'Épilepsie', 'VIH/SIDA'];

export function BookAppointmentDialog({
  open,
  onOpenChange,
  doctorId,
  patientId,
  clinicId,
  doctorName,
  consultationPrice = 15000,
  onSuccess,
}: BookAppointmentDialogProps) {
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [consultationType, setConsultationType] = useState('');
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [availability, setAvailability] = useState<AvailabilityData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isBooking, setIsBooking] = useState(false);
  
  // Pre-consultation form
  const [consultationReason, setConsultationReason] = useState('');
  const [selectedAllergies, setSelectedAllergies] = useState<string[]>([]);
  const [selectedConditions, setSelectedConditions] = useState<string[]>([]);
  const [currentTreatments, setCurrentTreatments] = useState('');
  const [identityConfirmed, setIdentityConfirmed] = useState(false);

  // Payment state
  const [paymentStatus, setPaymentStatus] = useState<'pending' | 'processing' | 'success' | 'failed'>('pending');
  const [paymentRef, setPaymentRef] = useState<string>('');
  
  // Final result
  const [bookedAppointmentId, setBookedAppointmentId] = useState<string | null>(null);
  const [queuePosition, setQueuePosition] = useState<number>(0);
  
  // Pending appointment for payment step
  const [pendingAppointmentId, setPendingAppointmentId] = useState<string | null>(null);

  // Deposit amount (typically 30% of consultation price)
  const depositAmount = Math.round(consultationPrice * 0.3);

  // Fetch doctor availability
  useEffect(() => {
    const fetchAvailability = async () => {
      const { data } = await supabase
        .from('doctor_availability')
        .select('*')
        .eq('doctor_id', doctorId)
        .eq('is_active', true);
      
      if (data) {
        setAvailability(data);
      }
    };

    if (open && doctorId) {
      fetchAvailability();
    }
  }, [open, doctorId]);

  // Generate time slots for selected date
  const generateTimeSlots = useCallback(async (date: Date) => {
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
      .eq('doctor_id', doctorId)
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
  }, [availability, doctorId]);

  // Real-time slot updates
  useRealtimeSubscription({
    table: 'appointments',
    filter: 'doctor_id',
    filterValue: doctorId,
    onChange: () => {
      if (selectedDate) {
        generateTimeSlots(selectedDate);
      }
    },
  });

  useEffect(() => {
    if (selectedDate) {
      generateTimeSlots(selectedDate);
      setSelectedTime(null);
    }
  }, [selectedDate, generateTimeSlots]);

  // Check if a day is available
  const isDayAvailable = (date: Date) => {
    const dayOfWeek = date.getDay();
    return availability.some(a => a.day_of_week === dayOfWeek && a.is_active);
  };

  // Calculate queue position after booking
  const calculateQueuePosition = async (appointmentId: string) => {
    const { data } = await supabase.rpc('get_queue_position', { p_appointment_id: appointmentId });
    return data || 1;
  };

  // Create appointment (before payment)
  const handleCreateAppointment = async (): Promise<string | null> => {
    if (!selectedDate || !selectedTime) return null;

    try {
      const dateStr = format(selectedDate, 'yyyy-MM-dd');

      // Use atomic booking function to prevent race conditions
      const { data: appointmentId, error: bookingError } = await supabase
        .rpc('book_appointment_atomic', {
          p_patient_id: patientId,
          p_doctor_id: doctorId,
          p_appointment_date: dateStr,
          p_appointment_time: selectedTime + ':00',
          p_clinic_id: clinicId || null,
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
          setStep(1);
          return null;
        }
        throw bookingError;
      }

      // Create pre-consultation form
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

  // Proceed to payment step
  const handleProceedToPayment = async () => {
    setIsBooking(true);
    const appointmentId = await handleCreateAppointment();
    setIsBooking(false);
    
    if (appointmentId) {
      setPendingAppointmentId(appointmentId);
      setStep(4);
    }
  };

  // Finalize booking after payment
  const handleFinalizeBooking = async () => {
    if (!pendingAppointmentId || !selectedDate || !selectedTime) return;

    try {
      const position = await calculateQueuePosition(pendingAppointmentId);
      setQueuePosition(position);
      setBookedAppointmentId(pendingAppointmentId);

      toast({
        title: 'Rendez-vous réservé !',
        description: `Votre RDV du ${format(selectedDate, 'EEEE d MMMM', { locale: fr })} à ${selectedTime} est confirmé.`,
      });

      setStep(5);
    } catch (error) {
      console.error('Error finalizing booking:', error);
    }
  };

  const resetForm = () => {
    setStep(1);
    setConsultationType('');
    setSelectedDate(undefined);
    setSelectedTime(null);
    setConsultationReason('');
    setSelectedAllergies([]);
    setSelectedConditions([]);
    setCurrentTreatments('');
    setIdentityConfirmed(false);
    setPaymentStatus('pending');
    setPaymentRef('');
    setBookedAppointmentId(null);
    setQueuePosition(0);
    setPendingAppointmentId(null);
  };

  const toggleAllergy = (allergy: string) => {
    setSelectedAllergies(prev =>
      prev.includes(allergy) ? prev.filter(a => a !== allergy) : [...prev, allergy]
    );
  };

  const toggleCondition = (condition: string) => {
    setSelectedConditions(prev =>
      prev.includes(condition) ? prev.filter(c => c !== condition) : [...prev, condition]
    );
  };

  const handlePaymentSuccess = async (ref: string) => {
    setPaymentRef(ref);
    setPaymentStatus('success');
    await handleFinalizeBooking();
  };

  const handleUrgentRequest = () => {
    onOpenChange(false);
    resetForm();
    toast({
      title: 'Demande urgente',
      description: 'Veuillez contacter le secrétariat ou les urgences directement.',
    });
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-card border-b border-border">
        <div className="flex items-center justify-between h-14 px-4">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => { 
              if (step > 1 && step < 5) {
                setStep(step - 1);
              } else {
                onOpenChange(false); 
                resetForm(); 
              }
            }} 
            className="-ml-2"
          >
            <X className="h-5 w-5" />
          </Button>
          <h1 className="font-semibold text-lg">{doctorName}</h1>
          <div className="w-10" />
        </div>
      </header>

      <ScrollArea className="flex-1">
        {/* Step 1: Consultation Type & Date Selection */}
        {step === 1 && (
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
                            className={`relative ${
                              selectedTime === slot.time 
                                ? 'bg-[hsl(210,50%,45%)] hover:bg-[hsl(210,50%,40%)]' 
                                : ''
                            }`}
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
                    onClick={() => setStep(2)}
                    className="w-full py-6 text-base font-medium rounded-xl bg-[hsl(0,70%,70%)] hover:bg-[hsl(0,70%,65%)] text-white border-0"
                  >
                    Continuer
                  </Button>
                )}
              </>
            )}
          </div>
        )}

        {/* Step 2: Urgent Alert */}
        {step === 2 && (
          <div className="p-4">
            <UrgentAlertStep
              onContinue={() => setStep(3)}
              onUrgent={handleUrgentRequest}
            />
          </div>
        )}

        {/* Step 3: Pre-consultation Form */}
        {step === 3 && (
          <div className="p-4 space-y-4">
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
              className="w-full py-6 text-base font-medium rounded-xl bg-[hsl(0,70%,70%)] hover:bg-[hsl(0,70%,65%)] text-white border-0"
            >
              {isBooking ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Création...
                </>
              ) : (
                'Continuer vers le paiement'
              )}
            </Button>
          </div>
        )}

        {/* Step 4: Payment */}
        {step === 4 && (
          <div className="p-4 space-y-4">
            <Alert>
              <CreditCard className="h-4 w-4" />
              <AlertDescription>
                Un acompte de <strong>{depositAmount.toLocaleString()} FCFA</strong> est requis pour confirmer votre rendez-vous.
                Le solde sera payable lors de la consultation.
              </AlertDescription>
            </Alert>

            {pendingAppointmentId ? (
              <PaystackPayment
                amount={depositAmount}
                appointmentId={pendingAppointmentId}
                patientId={patientId}
                paymentType="deposit"
                onSuccess={handlePaymentSuccess}
                onError={() => setPaymentStatus('failed')}
                onCancel={() => setStep(3)}
              />
            ) : (
              <div className="text-center py-8">
                <Loader2 className="h-8 w-8 animate-spin mx-auto" />
                <p className="mt-2 text-muted-foreground">Préparation du paiement...</p>
              </div>
            )}

            {paymentStatus === 'failed' && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Le paiement a échoué. Veuillez réessayer.
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}

        {/* Step 5: Confirmation */}
        {step === 5 && (
          <div className="p-4 space-y-4">
            <div className="text-center py-6">
              <div className="w-16 h-16 bg-[hsl(120,50%,90%)] rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="h-8 w-8 text-[hsl(120,50%,45%)]" />
              </div>
              <h3 className="text-xl font-bold text-[hsl(120,50%,45%)]">Rendez-vous confirmé !</h3>
            </div>

            <div className="bg-card border rounded-xl p-4 space-y-3">
              <h4 className="font-medium">Récapitulatif</h4>
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Médecin</p>
                  <p className="font-medium">{doctorName}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Date</p>
                  <p className="font-medium">
                    {selectedDate && format(selectedDate, 'EEEE d MMMM yyyy', { locale: fr })}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Heure</p>
                  <p className="font-medium">{selectedTime}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Arrhes payées</p>
                  <p className="font-medium text-[hsl(120,50%,45%)]">{depositAmount.toLocaleString()} FCFA</p>
                </div>
              </div>
            </div>

            {/* Queue Position */}
            <div className="bg-primary/10 border-primary border rounded-xl p-4 text-center">
              <p className="text-muted-foreground">Votre position dans la file</p>
              <p className="text-4xl font-bold text-primary mt-2">#{queuePosition}</p>
              <p className="text-sm text-muted-foreground mt-2">
                Temps d'attente estimé : ~{Math.max(0, (queuePosition - 1) * 20)} min
              </p>
            </div>

            <p className="text-sm text-muted-foreground text-center">
              Vous recevrez une notification de rappel avant votre consultation.
            </p>

            <Button 
              onClick={() => { onSuccess?.(); onOpenChange(false); resetForm(); }}
              className="w-full py-6 text-base font-medium rounded-xl bg-[hsl(0,70%,70%)] hover:bg-[hsl(0,70%,65%)] text-white border-0"
            >
              Retour au tableau de bord
            </Button>
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
