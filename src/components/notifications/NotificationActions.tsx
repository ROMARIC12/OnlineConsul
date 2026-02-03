import { Check, X, Eye, RefreshCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';

interface NotificationActionsProps {
  notificationId: string;
  type: string;
  data: Record<string, any>;
  onActionComplete: () => void;
}

export function NotificationActions({
  notificationId,
  type,
  data,
  onActionComplete,
}: NotificationActionsProps) {
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleConfirmAppointment = async () => {
    if (!data?.appointment_id) return;

    try {
      const { error } = await supabase
        .from('appointments')
        .update({
          status: 'confirmed',
          confirmed_at: new Date().toISOString(),
        })
        .eq('id', data.appointment_id);

      if (error) throw error;

      // Mark notification as read
      await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId);

      toast({
        title: 'RDV confirmé',
        description: 'Le rendez-vous a été confirmé avec succès.',
      });

      onActionComplete();
    } catch (error) {
      console.error('Error confirming appointment:', error);
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: 'Impossible de confirmer le rendez-vous.',
      });
    }
  };

  const handleCancelAppointment = async () => {
    if (!data?.appointment_id) return;

    try {
      const { error } = await supabase
        .from('appointments')
        .update({
          status: 'cancelled',
          cancelled_at: new Date().toISOString(),
          cancellation_reason: 'Annulé via notification',
        })
        .eq('id', data.appointment_id);

      if (error) throw error;

      // Mark notification as read
      await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId);

      toast({
        title: 'RDV annulé',
        description: 'Le rendez-vous a été annulé.',
      });

      onActionComplete();
    } catch (error) {
      console.error('Error cancelling appointment:', error);
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: 'Impossible d\'annuler le rendez-vous.',
      });
    }
  };

  const handleViewDetails = () => {
    // Mark as read
    supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', notificationId)
      .then(() => {
        onActionComplete();
        // Navigate to appropriate page based on notification type
        navigate('/dashboard');
      });
  };

  // Determine which actions to show based on notification type and data
  const showConfirmAction = data?.action === 'confirm_required' && type === 'appointment';
  const showCancelAction = type === 'appointment' && data?.status !== 'cancelled';
  const showViewAction = true;

  if (!showConfirmAction && !showCancelAction && !showViewAction) {
    return null;
  }

  return (
    <div className="flex items-center gap-1 mt-2">
      {showConfirmAction && (
        <Button
          size="sm"
          variant="default"
          className="h-7 text-xs gap-1"
          onClick={(e) => {
            e.stopPropagation();
            handleConfirmAppointment();
          }}
        >
          <Check className="h-3 w-3" />
          Confirmer
        </Button>
      )}
      
      {showCancelAction && data?.action === 'confirm_required' && (
        <Button
          size="sm"
          variant="outline"
          className="h-7 text-xs gap-1 text-destructive hover:text-destructive"
          onClick={(e) => {
            e.stopPropagation();
            handleCancelAppointment();
          }}
        >
          <X className="h-3 w-3" />
          Annuler
        </Button>
      )}
      
      {showViewAction && (
        <Button
          size="sm"
          variant="ghost"
          className="h-7 text-xs gap-1"
          onClick={(e) => {
            e.stopPropagation();
            handleViewDetails();
          }}
        >
          <Eye className="h-3 w-3" />
          Voir
        </Button>
      )}
    </div>
  );
}
