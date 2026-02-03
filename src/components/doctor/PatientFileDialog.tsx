import { useState } from 'react';
import { format, differenceInYears } from 'date-fns';
import { fr } from 'date-fns/locale';
import { User, Phone, Calendar, Heart, AlertTriangle, FileText, Clock, MapPin } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';

interface PatientDetails {
  id: string;
  date_of_birth?: string;
  gender?: string;
  address?: string;
  emergency_contact?: string;
  profile: {
    first_name: string;
    last_name: string;
    phone: string | null;
  };
}

interface ConsultationForm {
  consultation_reason?: string | null;
  allergies?: string[] | null;
  chronic_conditions?: string[] | null;
  current_treatments?: string | null;
}

interface PatientFileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patient: PatientDetails | null;
  consultationForm?: ConsultationForm | null;
  appointmentInfo?: {
    date: string;
    time: string;
    doctorName: string;
    isFirstVisit?: boolean;
  };
}

export function PatientFileDialog({
  open,
  onOpenChange,
  patient,
  consultationForm,
  appointmentInfo,
}: PatientFileDialogProps) {
  if (!patient) return null;

  const fullName = `${patient.profile?.first_name || ''} ${patient.profile?.last_name || ''}`.trim();
  const initials = `${patient.profile?.first_name?.[0] || ''}${patient.profile?.last_name?.[0] || ''}`;
  const age = patient.date_of_birth 
    ? differenceInYears(new Date(), new Date(patient.date_of_birth))
    : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="sr-only">Fiche Patient</DialogTitle>
        </DialogHeader>
        
        <ScrollArea className="max-h-[75vh] pr-4">
          {/* Patient Header */}
          <div className="flex items-center gap-4 pb-4">
            <Avatar className="h-20 w-20 border-2 border-primary/20">
              <AvatarFallback className="bg-primary/10 text-primary text-xl font-semibold">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div>
              <h2 className="text-xl font-bold">{fullName}</h2>
              <div className="flex items-center gap-2 text-muted-foreground text-sm mt-1">
                {age !== null && <span>{age} ans</span>}
                {patient.gender && (
                  <>
                    <span>•</span>
                    <span>{patient.gender === 'M' ? 'Homme' : patient.gender === 'F' ? 'Femme' : patient.gender}</span>
                  </>
                )}
              </div>
              {appointmentInfo?.isFirstVisit && (
                <Badge variant="outline" className="mt-2 text-purple-600 border-purple-300">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  Première visite
                </Badge>
              )}
            </div>
          </div>

          <Separator className="my-4" />

          {/* Appointment Info */}
          {appointmentInfo && (
            <div className="mb-4 p-3 bg-primary/5 rounded-lg border border-primary/20">
              <h3 className="font-semibold text-sm text-primary mb-2 flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Rendez-vous
              </h3>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-muted-foreground">Date:</span>
                  <p className="font-medium">
                    {format(new Date(appointmentInfo.date), 'EEEE d MMMM yyyy', { locale: fr })}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">Heure:</span>
                  <p className="font-medium">{appointmentInfo.time}</p>
                </div>
                <div className="col-span-2">
                  <span className="text-muted-foreground">Médecin:</span>
                  <p className="font-medium">{appointmentInfo.doctorName}</p>
                </div>
              </div>
            </div>
          )}

          {/* Contact Info */}
          <div className="space-y-3 mb-4">
            <h3 className="font-semibold text-sm flex items-center gap-2">
              <User className="h-4 w-4" />
              Informations de contact
            </h3>
            <div className="space-y-2 text-sm">
              {patient.profile?.phone && (
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <a href={`tel:${patient.profile.phone}`} className="text-primary hover:underline">
                    {patient.profile.phone}
                  </a>
                </div>
              )}
              {patient.address && (
                <div className="flex items-start gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <span>{patient.address}</span>
                </div>
              )}
              {patient.emergency_contact && (
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-orange-500" />
                  <span>Contact urgence: {patient.emergency_contact}</span>
                </div>
              )}
              {patient.date_of_birth && (
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span>Né(e) le {format(new Date(patient.date_of_birth), 'd MMMM yyyy', { locale: fr })}</span>
                </div>
              )}
            </div>
          </div>

          <Separator className="my-4" />

          {/* Medical Info */}
          <div className="space-y-4">
            <h3 className="font-semibold text-sm flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Informations médicales
            </h3>

            {/* Consultation Reason */}
            {consultationForm?.consultation_reason && (
              <div className="p-3 bg-muted/50 rounded-lg">
                <span className="text-xs text-muted-foreground block mb-1">Motif de consultation</span>
                <p className="text-sm">{consultationForm.consultation_reason}</p>
              </div>
            )}

            {/* Allergies */}
            {consultationForm?.allergies && consultationForm.allergies.length > 0 && (
              <div>
                <span className="text-xs text-muted-foreground block mb-2">Allergies</span>
                <div className="flex flex-wrap gap-2">
                  {consultationForm.allergies.map((allergy, i) => (
                    <Badge key={i} variant="destructive" className="text-xs">
                      <AlertTriangle className="h-3 w-3 mr-1" />
                      {allergy}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Chronic Conditions */}
            {consultationForm?.chronic_conditions && consultationForm.chronic_conditions.length > 0 && (
              <div>
                <span className="text-xs text-muted-foreground block mb-2">Antécédents / Maladies chroniques</span>
                <div className="flex flex-wrap gap-2">
                  {consultationForm.chronic_conditions.map((condition, i) => (
                    <Badge key={i} variant="secondary" className="text-xs">
                      <Heart className="h-3 w-3 mr-1" />
                      {condition}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Current Treatments */}
            {consultationForm?.current_treatments && (
              <div className="p-3 bg-muted/50 rounded-lg">
                <span className="text-xs text-muted-foreground block mb-1">Traitements en cours</span>
                <p className="text-sm">{consultationForm.current_treatments}</p>
              </div>
            )}

            {/* No medical info */}
            {!consultationForm?.consultation_reason && 
             (!consultationForm?.allergies || consultationForm.allergies.length === 0) && 
             (!consultationForm?.chronic_conditions || consultationForm.chronic_conditions.length === 0) && (
              <p className="text-sm text-muted-foreground text-center py-4">
                Aucune information médicale renseignée
              </p>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
