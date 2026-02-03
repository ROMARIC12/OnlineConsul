import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Phone, Calendar } from 'lucide-react';
import { Database } from '@/integrations/supabase/types';

type AppRole = Database['public']['Enums']['app_role'];

interface UserCardProps {
  user: {
    id: string;
    first_name: string;
    last_name: string;
    phone: string | null;
    is_active: boolean | null;
    created_at: string | null;
    role: AppRole | null;
  };
}

const roleConfig: Record<AppRole, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' }> = {
  super_admin: { label: 'Super Admin', variant: 'destructive' },
  admin: { label: 'Admin', variant: 'destructive' },
  doctor: { label: 'Médecin', variant: 'default' },
  secretary: { label: 'Secrétaire', variant: 'secondary' },
  patient: { label: 'Patient', variant: 'outline' },
};

export function UserCard({ user }: UserCardProps) {
  const initials = `${user.first_name?.[0] || ''}${user.last_name?.[0] || ''}`.toUpperCase();
  const roleInfo = user.role ? roleConfig[user.role] : { label: 'Inconnu', variant: 'outline' as const };

  const formatDate = (date: string | null) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start gap-3">
          <Avatar className="h-12 w-12">
            <AvatarFallback className="bg-primary text-primary-foreground font-medium">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold truncate">
              {user.first_name} {user.last_name}
            </h3>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant={roleInfo.variant}>{roleInfo.label}</Badge>
              {user.is_active === false && (
                <Badge variant="outline" className="text-muted-foreground">Inactif</Badge>
              )}
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-2 text-sm">
          {user.phone && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Phone className="h-4 w-4" />
              <span>{user.phone}</span>
            </div>
          )}
          <div className="flex items-center gap-2 text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span>Inscrit le {formatDate(user.created_at)}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
