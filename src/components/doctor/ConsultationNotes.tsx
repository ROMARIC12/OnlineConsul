import { useState, useEffect } from 'react';
import { FileText, Save, CheckCircle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface ConsultationNotesProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  appointmentId: string;
  patientName: string;
  onSuccess: () => void;
}

interface ConsultationForm {
  id: string;
  consultation_reason: string | null;
  allergies: string[] | null;
  chronic_conditions: string[] | null;
  current_treatments: string | null;
}

export function ConsultationNotes({
  open,
  onOpenChange,
  appointmentId,
  patientName,
  onSuccess,
}: ConsultationNotesProps) {
  const { toast } = useToast();
  const [notes, setNotes] = useState('');
  const [markCompleted, setMarkCompleted] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [preConsultation, setPreConsultation] = useState<ConsultationForm | null>(null);

  useEffect(() => {
    if (open && appointmentId) {
      fetchPreConsultationData();
    }
  }, [open, appointmentId]);

  const fetchPreConsultationData = async () => {
    const { data } = await supabase
      .from('consultation_forms')
      .select('*')
      .eq('appointment_id', appointmentId)
      .single();

    if (data) {
      setPreConsultation(data);
    }
  };

  const handleSave = async () => {
    setIsLoading(true);
    try {
      // Update or create consultation form with notes
      if (preConsultation) {
        // Update existing
        await supabase
          .from('consultation_forms')
          .update({
            consultation_reason: preConsultation.consultation_reason 
              ? `${preConsultation.consultation_reason}\n\n--- Notes du médecin ---\n${notes}`
              : `--- Notes du médecin ---\n${notes}`,
          })
          .eq('id', preConsultation.id);
      } else {
        // Create new
        await supabase.from('consultation_forms').insert({
          appointment_id: appointmentId,
          consultation_reason: `--- Notes du médecin ---\n${notes}`,
          identity_confirmed: true,
        });
      }

      // Mark appointment as completed if checked
      if (markCompleted) {
        const { error } = await supabase
          .from('appointments')
          .update({ status: 'completed' })
          .eq('id', appointmentId);

        if (error) throw error;
      }

      toast({
        title: 'Notes enregistrées',
        description: markCompleted 
          ? 'Consultation terminée et notes sauvegardées.'
          : 'Notes sauvegardées.',
      });

      onSuccess();
      onOpenChange(false);
      setNotes('');
    } catch (error: any) {
      console.error('Error saving notes:', error);
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: error.message || 'Impossible de sauvegarder les notes.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Notes de consultation
          </DialogTitle>
          <DialogDescription>
            Consultation avec {patientName}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {/* Pre-consultation info if available */}
          {preConsultation && (
            <div className="p-3 bg-muted rounded-lg space-y-2 text-sm">
              <p className="font-medium text-muted-foreground">Informations pré-consultation :</p>
              
              {preConsultation.consultation_reason && (
                <div>
                  <span className="font-medium">Motif : </span>
                  {preConsultation.consultation_reason}
                </div>
              )}
              
              {preConsultation.allergies && preConsultation.allergies.length > 0 && (
                <div>
                  <span className="font-medium text-destructive">Allergies : </span>
                  {preConsultation.allergies.join(', ')}
                </div>
              )}
              
              {preConsultation.chronic_conditions && preConsultation.chronic_conditions.length > 0 && (
                <div>
                  <span className="font-medium">Antécédents : </span>
                  {preConsultation.chronic_conditions.join(', ')}
                </div>
              )}
              
              {preConsultation.current_treatments && (
                <div>
                  <span className="font-medium">Traitements en cours : </span>
                  {preConsultation.current_treatments}
                </div>
              )}
            </div>
          )}

          {/* Doctor notes */}
          <div>
            <Label>Notes de la consultation</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Observations, diagnostic, prescription, recommandations..."
              className="mt-1"
              rows={6}
            />
          </div>

          {/* Mark as completed */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="markCompleted"
              checked={markCompleted}
              onCheckedChange={(checked) => setMarkCompleted(checked as boolean)}
            />
            <label
              htmlFor="markCompleted"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex items-center gap-2"
            >
              <CheckCircle className="h-4 w-4 text-green-500" />
              Marquer la consultation comme terminée
            </label>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button onClick={handleSave} disabled={isLoading} className="gap-2">
              <Save className="h-4 w-4" />
              {isLoading ? 'Enregistrement...' : 'Enregistrer'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
