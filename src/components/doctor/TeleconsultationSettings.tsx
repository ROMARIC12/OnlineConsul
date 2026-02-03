import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Video, VideoOff, Gift, DollarSign, Users, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

interface TeleconsultationSettingsProps {
  doctorId: string;
}

export function TeleconsultationSettings({ doctorId }: TeleconsultationSettingsProps) {
  const { toast } = useToast();
  const [isOnline, setIsOnline] = useState(false);
  const [isFree, setIsFree] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [activeSessionsCount, setActiveSessionsCount] = useState(0);

  const fetchSettings = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('doctors')
        .select('teleconsultation_enabled, is_teleconsultation_free')
        .eq('id', doctorId)
        .single();

      if (error) throw error;

      setIsOnline(data?.teleconsultation_enabled || false);
      setIsFree(data?.is_teleconsultation_free || false);

      // Get active sessions count
      const { count } = await supabase
        .from('teleconsultation_sessions')
        .select('id', { count: 'exact', head: true })
        .eq('doctor_id', doctorId)
        .in('status', ['paid', 'active']);

      setActiveSessionsCount(count || 0);
    } catch (error) {
      console.error('Error fetching teleconsultation settings:', error);
    } finally {
      setIsLoading(false);
    }
  }, [doctorId]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const handleToggleOnline = async (enabled: boolean) => {
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('doctors')
        .update({ teleconsultation_enabled: enabled })
        .eq('id', doctorId);

      if (error) throw error;

      setIsOnline(enabled);
      toast({
        title: enabled ? 'En ligne' : 'Hors ligne',
        description: enabled 
          ? 'Vous êtes maintenant visible pour les téléconsultations.'
          : 'Vous n\'êtes plus visible pour les téléconsultations.',
      });
    } catch (error) {
      console.error('Error updating online status:', error);
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: 'Impossible de mettre à jour le statut.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleFree = async (free: boolean) => {
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('doctors')
        .update({ is_teleconsultation_free: free })
        .eq('id', doctorId);

      if (error) throw error;

      setIsFree(free);
      toast({
        title: free ? 'Téléconsultation gratuite' : 'Téléconsultation payante',
        description: free 
          ? 'Les patients peuvent consulter gratuitement.'
          : 'Les patients devront payer pour consulter.',
      });
    } catch (error) {
      console.error('Error updating free status:', error);
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: 'Impossible de mettre à jour le paramètre.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Video className="h-5 w-5 text-primary" />
          Téléconsultation
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Online Status Toggle */}
        <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
          <div className="flex items-center gap-3">
            {isOnline ? (
              <div className="relative">
                <Video className="h-5 w-5 text-green-500" />
                <span className="absolute -top-1 -right-1 flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                </span>
              </div>
            ) : (
              <VideoOff className="h-5 w-5 text-muted-foreground" />
            )}
            <div>
              <Label htmlFor="online-toggle" className="font-medium">
                {isOnline ? 'En ligne' : 'Hors ligne'}
              </Label>
              <p className="text-xs text-muted-foreground">
                {isOnline 
                  ? 'Visible pour les patients'
                  : 'Non visible pour les patients'
                }
              </p>
            </div>
          </div>
          <Switch
            id="online-toggle"
            checked={isOnline}
            onCheckedChange={handleToggleOnline}
            disabled={isSaving}
          />
        </div>

        {/* Free Teleconsultation Toggle */}
        <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
          <div className="flex items-center gap-3">
            {isFree ? (
              <Gift className="h-5 w-5 text-primary" />
            ) : (
              <DollarSign className="h-5 w-5 text-muted-foreground" />
            )}
            <div>
              <Label htmlFor="free-toggle" className="font-medium">
                {isFree ? 'Consultation gratuite' : 'Consultation payante'}
              </Label>
              <p className="text-xs text-muted-foreground">
                {isFree 
                  ? 'Les patients consultent gratuitement'
                  : 'Les patients paient selon vos tarifs'
                }
              </p>
            </div>
          </div>
          <Switch
            id="free-toggle"
            checked={isFree}
            onCheckedChange={handleToggleFree}
            disabled={isSaving}
          />
        </div>

        {/* Active Sessions */}
        {activeSessionsCount > 0 && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-primary/10 border border-primary/20">
            <Users className="h-5 w-5 text-primary" />
            <div>
              <p className="font-medium text-sm">
                {activeSessionsCount} session{activeSessionsCount > 1 ? 's' : ''} en attente
              </p>
              <p className="text-xs text-muted-foreground">
                Des patients attendent de vous consulter
              </p>
            </div>
          </div>
        )}

        {/* Status Badge */}
        <div className="flex justify-center pt-2">
          <Badge 
            variant={isOnline ? 'default' : 'secondary'}
            className={isOnline ? 'bg-green-500' : ''}
          >
            {isOnline ? (
              <>
                <span className="relative flex h-2 w-2 mr-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
                </span>
                Disponible pour téléconsultation
              </>
            ) : (
              'Non disponible'
            )}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}
