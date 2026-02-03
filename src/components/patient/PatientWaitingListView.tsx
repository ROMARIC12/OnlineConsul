import { useState, useEffect } from 'react';
import { ListPlus, Clock, Calendar, Bell, Trash2, User } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface WaitingListEntry {
  id: string;
  created_at: string;
  preferred_date: string | null;
  preferred_time_start: string | null;
  preferred_time_end: string | null;
  is_notified: boolean;
  doctor: {
    id: string;
    specialty: string;
    profile: {
      first_name: string;
      last_name: string;
    };
  };
}

export function PatientWaitingListView() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [entries, setEntries] = useState<WaitingListEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [patientId, setPatientId] = useState<string | null>(null);

  useEffect(() => {
    const fetchWaitingList = async () => {
      if (!user) return;

      try {
        // Get patient ID
        const { data: patientData } = await supabase
          .from('patients')
          .select('id')
          .eq('profile_id', user.id)
          .single();

        if (!patientData) {
          setIsLoading(false);
          return;
        }

        setPatientId(patientData.id);

        // Fetch waiting list entries
        const { data, error } = await supabase
          .from('appointment_waiting_list')
          .select(`
            id,
            created_at,
            preferred_date,
            preferred_time_start,
            preferred_time_end,
            is_notified,
            doctor:doctors(
              id,
              specialty,
              profile:profiles(first_name, last_name)
            )
          `)
          .eq('patient_id', patientData.id)
          .order('created_at', { ascending: false });

        if (error) throw error;

        setEntries(data as unknown as WaitingListEntry[] || []);
      } catch (error) {
        console.error('Error fetching waiting list:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchWaitingList();
  }, [user]);

  const handleRemove = async (entryId: string) => {
    try {
      const { error } = await supabase
        .from('appointment_waiting_list')
        .delete()
        .eq('id', entryId);

      if (error) throw error;

      setEntries(entries.filter(e => e.id !== entryId));
      toast({
        title: 'Inscription supprimée',
        description: 'Vous avez été retiré de la liste d\'attente.',
      });
    } catch (error) {
      console.error('Error removing from waiting list:', error);
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: 'Impossible de vous retirer de la liste.',
      });
    }
  };

  if (isLoading) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Chargement...
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="text-center py-16 px-6">
        <ListPlus className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
        <h3 className="font-semibold text-lg mb-2">Aucune inscription</h3>
        <p className="text-muted-foreground text-sm max-w-xs mx-auto">
          Inscrivez-vous sur la liste d'attente d'un médecin pour être notifié dès qu'un créneau se libère.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-medium text-sm text-muted-foreground">Mes inscriptions</h3>
        <Badge variant="secondary">{entries.length}</Badge>
      </div>

      {entries.map((entry) => {
        const doctorName = `Dr. ${entry.doctor.profile.first_name} ${entry.doctor.profile.last_name}`;
        
        return (
          <Card key={entry.id} className={entry.is_notified ? 'border-primary' : ''}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-primary" />
                    <span className="font-medium">{doctorName}</span>
                    {entry.is_notified && (
                      <Badge className="bg-primary">Créneau disponible !</Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">{entry.doctor.specialty}</p>
                  
                  <div className="flex flex-wrap gap-2 mt-3 text-xs text-muted-foreground">
                    {entry.preferred_date && (
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {format(new Date(entry.preferred_date), 'd MMMM yyyy', { locale: fr })}
                      </div>
                    )}
                    {entry.preferred_time_start && entry.preferred_time_end && (
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {entry.preferred_time_start} - {entry.preferred_time_end}
                      </div>
                    )}
                  </div>

                  <p className="text-xs text-muted-foreground mt-2">
                    Inscrit le {format(new Date(entry.created_at), 'd MMMM yyyy', { locale: fr })}
                  </p>
                </div>

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleRemove(entry.id)}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
