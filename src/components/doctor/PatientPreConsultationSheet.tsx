import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { User, Phone, Calendar, AlertTriangle, Pill, Heart, FileText } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface PatientPreConsultationSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patientId: string;
  appointmentId?: string;
}

interface PatientData {
  profile: {
    first_name: string;
    last_name: string;
    phone: string | null;
  };
  date_of_birth: string | null;
  gender: string | null;
  emergency_contact: string | null;
  address: string | null;
}

interface ConsultationForm {
  consultation_reason: string | null;
  allergies: string[] | null;
  chronic_conditions: string[] | null;
  current_treatments: string | null;
  identity_confirmed: boolean | null;
  created_at: string;
}

interface PastAppointment {
  id: string;
  appointment_date: string;
  status: string;
  consultation_form: ConsultationForm | null;
}

export function PatientPreConsultationSheet({
  open,
  onOpenChange,
  patientId,
  appointmentId,
}: PatientPreConsultationSheetProps) {
  const [patient, setPatient] = useState<PatientData | null>(null);
  const [currentForm, setCurrentForm] = useState<ConsultationForm | null>(null);
  const [pastAppointments, setPastAppointments] = useState<PastAppointment[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!patientId) return;

      setIsLoading(true);
      try {
        // Fetch patient data
        const { data: patientData } = await supabase
          .from('patients')
          .select(`
            profile:profiles(first_name, last_name, phone),
            date_of_birth,
            gender,
            emergency_contact,
            address
          `)
          .eq('id', patientId)
          .single();

        setPatient(patientData);

        // Fetch current consultation form if appointmentId provided
        if (appointmentId) {
          const { data: formData } = await supabase
            .from('consultation_forms')
            .select('*')
            .eq('appointment_id', appointmentId)
            .single();

          setCurrentForm(formData);
        }

        // Fetch past appointments with forms
        const { data: pastData } = await supabase
          .from('appointments')
          .select(`
            id,
            appointment_date,
            status,
            consultation_form:consultation_forms(
              consultation_reason,
              allergies,
              chronic_conditions,
              current_treatments,
              identity_confirmed,
              created_at
            )
          `)
          .eq('patient_id', patientId)
          .eq('status', 'completed')
          .order('appointment_date', { ascending: false })
          .limit(5);

        setPastAppointments(pastData || []);
      } catch (error) {
        console.error('Error fetching patient data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    if (open) {
      fetchData();
    }
  }, [open, patientId, appointmentId]);

  const calculateAge = (dateOfBirth: string) => {
    const today = new Date();
    const birth = new Date(dateOfBirth);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Fiche Patient - Pré-consultation
          </DialogTitle>
          <DialogDescription>
            Informations médicales et historique du patient
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <p className="text-center text-muted-foreground py-8">Chargement...</p>
        ) : !patient ? (
          <p className="text-center text-muted-foreground py-8">Patient non trouvé</p>
        ) : (
          <div className="space-y-6">
            {/* Patient Info */}
            <Card>
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                    <User className="h-8 w-8 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold">
                      {patient.profile?.first_name} {patient.profile?.last_name}
                    </h3>
                    <div className="flex flex-wrap gap-4 mt-2 text-sm text-muted-foreground">
                      {patient.date_of_birth && (
                        <span className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          {calculateAge(patient.date_of_birth)} ans ({format(new Date(patient.date_of_birth), 'dd/MM/yyyy')})
                        </span>
                      )}
                      {patient.gender && (
                        <Badge variant="outline">{patient.gender}</Badge>
                      )}
                      {patient.profile?.phone && (
                        <span className="flex items-center gap-1">
                          <Phone className="h-4 w-4" />
                          {patient.profile.phone}
                        </span>
                      )}
                    </div>
                    {patient.emergency_contact && (
                      <p className="text-sm text-muted-foreground mt-2">
                        Contact d'urgence : {patient.emergency_contact}
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Current Consultation Form */}
            {currentForm && (
              <>
                <Separator />
                <div>
                  <h4 className="font-semibold mb-3">Consultation du jour</h4>
                  
                  {currentForm.consultation_reason && (
                    <div className="mb-4">
                      <p className="text-sm font-medium text-muted-foreground">Motif</p>
                      <p className="mt-1 p-3 bg-muted rounded-lg">{currentForm.consultation_reason}</p>
                    </div>
                  )}

                  <div className="grid md:grid-cols-2 gap-4">
                    {/* Allergies */}
                    <div>
                      <p className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                        <AlertTriangle className="h-4 w-4 text-destructive" />
                        Allergies
                      </p>
                      {currentForm.allergies && currentForm.allergies.length > 0 ? (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {currentForm.allergies.map((allergy) => (
                            <Badge key={allergy} variant="destructive">{allergy}</Badge>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground mt-1">Aucune allergie signalée</p>
                      )}
                    </div>

                    {/* Chronic Conditions */}
                    <div>
                      <p className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                        <Heart className="h-4 w-4 text-amber-500" />
                        Antécédents
                      </p>
                      {currentForm.chronic_conditions && currentForm.chronic_conditions.length > 0 ? (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {currentForm.chronic_conditions.map((condition) => (
                            <Badge key={condition} variant="secondary">{condition}</Badge>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground mt-1">Aucun antécédent signalé</p>
                      )}
                    </div>
                  </div>

                  {currentForm.current_treatments && (
                    <div className="mt-4">
                      <p className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                        <Pill className="h-4 w-4 text-blue-500" />
                        Traitements en cours
                      </p>
                      <p className="mt-1 p-3 bg-muted rounded-lg text-sm">{currentForm.current_treatments}</p>
                    </div>
                  )}
                </div>
              </>
            )}

            {/* Past Consultations */}
            {pastAppointments.length > 0 && (
              <>
                <Separator />
                <div>
                  <h4 className="font-semibold mb-3">Consultations précédentes</h4>
                  <ScrollArea className="h-[200px]">
                    <div className="space-y-2">
                      {pastAppointments.map((apt) => (
                        <div key={apt.id} className="p-3 border rounded-lg text-sm">
                          <div className="flex items-center justify-between">
                            <span className="font-medium">
                              {format(new Date(apt.appointment_date), 'd MMMM yyyy', { locale: fr })}
                            </span>
                            <Badge variant="outline">{apt.status}</Badge>
                          </div>
                          {apt.consultation_form?.consultation_reason && (
                            <p className="text-muted-foreground mt-1">
                              {apt.consultation_form.consultation_reason}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              </>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
