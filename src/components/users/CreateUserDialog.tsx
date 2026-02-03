import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { CreateUserForm } from './CreateUserForm';
import { Database } from '@/integrations/supabase/types';

type AppRole = Database['public']['Enums']['app_role'];

interface CreateUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  role: AppRole;
  onSuccess: () => void;
}

const roleLabels: Record<AppRole, string> = {
  super_admin: 'un Super Admin',
  admin: 'un Admin',
  doctor: 'un Médecin',
  secretary: 'une Secrétaire',
  patient: 'un Patient',
};

export function CreateUserDialog({ open, onOpenChange, role, onSuccess }: CreateUserDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Créer {roleLabels[role]}</DialogTitle>
          <DialogDescription>
            Remplissez les informations pour créer un nouveau compte.
          </DialogDescription>
        </DialogHeader>
        <CreateUserForm role={role} onSuccess={onSuccess} />
      </DialogContent>
    </Dialog>
  );
}
