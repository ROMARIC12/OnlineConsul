import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { UserCard } from './UserCard';
import { Loader2 } from 'lucide-react';
import { Database } from '@/integrations/supabase/types';

type AppRole = Database['public']['Enums']['app_role'];

interface UserWithRole {
  id: string;
  first_name: string;
  last_name: string;
  phone: string | null;
  is_active: boolean | null;
  created_at: string | null;
  role: AppRole | null;
}

interface UserListProps {
  filterRole?: AppRole;
  refreshKey?: number;
}

export function UserList({ filterRole, refreshKey }: UserListProps) {
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchUsers = async () => {
      setIsLoading(true);
      try {
        // Fetch all profiles
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('*')
          .order('created_at', { ascending: false });

        if (profilesError) throw profilesError;

        // Fetch all roles
        const { data: roles, error: rolesError } = await supabase
          .from('user_roles')
          .select('*');

        if (rolesError) throw rolesError;

        // Combine profiles with their roles
        const usersWithRoles: UserWithRole[] = (profiles || []).map(profile => {
          const userRole = roles?.find(r => r.user_id === profile.id);
          return {
            ...profile,
            role: userRole?.role || null,
          };
        });

        // Filter by role if specified
        const filteredUsers = filterRole
          ? usersWithRoles.filter(u => u.role === filterRole)
          : usersWithRoles;

        setUsers(filteredUsers);
      } catch (error) {
        console.error('Error fetching users:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUsers();
  }, [filterRole, refreshKey]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (users.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Aucun utilisateur trouvé</p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {users.map(user => (
        <UserCard key={user.id} user={user} />
      ))}
    </div>
  );
}
