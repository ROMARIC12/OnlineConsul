import { useState, useEffect } from 'react';
import { Clock, Save, Plus, Trash2, Settings } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface AvailabilitySlot {
  id?: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_active: boolean;
  max_appointments?: number;
}

interface AvailabilitySettingsProps {
  doctorId: string;
}

const DAYS_OF_WEEK = [
  { value: 0, label: 'Dimanche' },
  { value: 1, label: 'Lundi' },
  { value: 2, label: 'Mardi' },
  { value: 3, label: 'Mercredi' },
  { value: 4, label: 'Jeudi' },
  { value: 5, label: 'Vendredi' },
  { value: 6, label: 'Samedi' },
];

export function AvailabilitySettings({ doctorId }: AvailabilitySettingsProps) {
  const { toast } = useToast();
  const [slots, setSlots] = useState<AvailabilitySlot[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  
  // New slot form
  const [newDay, setNewDay] = useState<number>(1);
  const [newStartTime, setNewStartTime] = useState('08:00');
  const [newEndTime, setNewEndTime] = useState('17:00');
  const [newMaxAppointments, setNewMaxAppointments] = useState<number>(20);

  useEffect(() => {
    fetchAvailability();
  }, [doctorId]);

  const fetchAvailability = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('doctor_availability')
        .select('*')
        .eq('doctor_id', doctorId)
        .order('day_of_week');

      if (error) throw error;
      setSlots(data || []);
    } catch (error) {
      console.error('Error fetching availability:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const addSlot = async () => {
    // Check if slot already exists for this day
    if (slots.some(s => s.day_of_week === newDay)) {
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: 'Un créneau existe déjà pour ce jour.',
      });
      return;
    }

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('doctor_availability')
        .insert({
          doctor_id: doctorId,
          day_of_week: newDay,
          start_time: newStartTime,
          end_time: newEndTime,
          max_appointments: newMaxAppointments,
          is_active: true,
        });

      if (error) throw error;

      toast({
        title: 'Créneau ajouté',
        description: 'Votre disponibilité a été enregistrée.',
      });

      setDialogOpen(false);
      fetchAvailability();
    } catch (error) {
      console.error('Error adding slot:', error);
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: 'Impossible d\'ajouter le créneau.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const toggleSlotActive = async (slotId: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from('doctor_availability')
        .update({ is_active: isActive })
        .eq('id', slotId);

      if (error) throw error;

      setSlots(slots.map(s => s.id === slotId ? { ...s, is_active: isActive } : s));
      
      toast({
        title: isActive ? 'Créneau activé' : 'Créneau désactivé',
        description: 'La disponibilité a été mise à jour.',
      });
    } catch (error) {
      console.error('Error toggling slot:', error);
    }
  };

  const updateSlotTimes = async (slotId: string, startTime: string, endTime: string) => {
    try {
      const { error } = await supabase
        .from('doctor_availability')
        .update({ start_time: startTime, end_time: endTime })
        .eq('id', slotId);

      if (error) throw error;

      setSlots(slots.map(s => s.id === slotId ? { ...s, start_time: startTime, end_time: endTime } : s));
      
      toast({
        title: 'Horaires mis à jour',
        description: 'Vos horaires ont été enregistrés.',
      });
    } catch (error) {
      console.error('Error updating slot times:', error);
    }
  };

  const deleteSlot = async (slotId: string) => {
    try {
      const { error } = await supabase
        .from('doctor_availability')
        .delete()
        .eq('id', slotId);

      if (error) throw error;

      setSlots(slots.filter(s => s.id !== slotId));
      
      toast({
        title: 'Créneau supprimé',
        description: 'La disponibilité a été retirée.',
      });
    } catch (error) {
      console.error('Error deleting slot:', error);
    }
  };

  const getDayName = (dayOfWeek: number) => {
    return DAYS_OF_WEEK.find(d => d.value === dayOfWeek)?.label || '';
  };

  const getAvailableDays = () => {
    const usedDays = slots.map(s => s.day_of_week);
    return DAYS_OF_WEEK.filter(d => !usedDays.includes(d.value));
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            <CardTitle>Mes disponibilités</CardTitle>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1" disabled={getAvailableDays().length === 0}>
                <Plus className="h-4 w-4" />
                Ajouter
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Ajouter une disponibilité</DialogTitle>
                <DialogDescription>
                  Définissez vos heures de consultation pour un jour de la semaine
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4 mt-4">
                <div>
                  <Label>Jour</Label>
                  <Select 
                    value={newDay.toString()} 
                    onValueChange={(v) => setNewDay(parseInt(v))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {getAvailableDays().map((day) => (
                        <SelectItem key={day.value} value={day.value.toString()}>
                          {day.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Heure de début</Label>
                    <Input
                      type="time"
                      value={newStartTime}
                      onChange={(e) => setNewStartTime(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>Heure de fin</Label>
                    <Input
                      type="time"
                      value={newEndTime}
                      onChange={(e) => setNewEndTime(e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <Label>Nombre max de RDV/jour</Label>
                  <Input
                    type="number"
                    value={newMaxAppointments}
                    onChange={(e) => setNewMaxAppointments(parseInt(e.target.value))}
                    min={1}
                    max={50}
                  />
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <Button variant="outline" onClick={() => setDialogOpen(false)}>
                    Annuler
                  </Button>
                  <Button onClick={addSlot} disabled={isSaving}>
                    {isSaving ? 'Enregistrement...' : 'Ajouter'}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
        <CardDescription>
          Définissez vos jours et horaires de consultation
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-muted-foreground text-center py-4">Chargement...</p>
        ) : slots.length === 0 ? (
          <div className="text-center py-8">
            <Clock className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
            <p className="text-muted-foreground">Aucune disponibilité définie</p>
            <p className="text-sm text-muted-foreground mt-1">
              Cliquez sur "Ajouter" pour configurer vos créneaux
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {slots.map((slot) => (
              <div
                key={slot.id}
                className={`p-4 border rounded-lg ${
                  slot.is_active ? 'bg-primary/5 border-primary/20' : 'bg-muted/50 opacity-60'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="font-medium w-24">
                      {getDayName(slot.day_of_week)}
                    </div>
                    <div className="flex items-center gap-2">
                      <Input
                        type="time"
                        value={slot.start_time.slice(0, 5)}
                        onChange={(e) => updateSlotTimes(slot.id!, e.target.value, slot.end_time)}
                        className="w-24"
                      />
                      <span>à</span>
                      <Input
                        type="time"
                        value={slot.end_time.slice(0, 5)}
                        onChange={(e) => updateSlotTimes(slot.id!, slot.start_time, e.target.value)}
                        className="w-24"
                      />
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={slot.is_active}
                        onCheckedChange={(checked) => toggleSlotActive(slot.id!, checked)}
                      />
                      <span className="text-sm text-muted-foreground">
                        {slot.is_active ? 'Actif' : 'Inactif'}
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive"
                      onClick={() => deleteSlot(slot.id!)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
