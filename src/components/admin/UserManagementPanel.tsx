import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  Loader2, 
  Search, 
  Trash2, 
  UserX, 
  UserCheck, 
  Shield, 
  Stethoscope, 
  ClipboardList, 
  Users,
  RefreshCw
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';

type AppRole = 'patient' | 'doctor' | 'secretary' | 'admin' | 'super_admin';

interface UserWithRole {
  id: string;
  first_name: string;
  last_name: string;
  phone: string | null;
  is_active: boolean | null;
  created_at: string | null;
  role: AppRole | null;
}

const roleConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive'; icon: React.ComponentType<{ className?: string }> }> = {
  super_admin: { label: 'Super Admin', variant: 'destructive', icon: Shield },
  admin: { label: 'Admin', variant: 'destructive', icon: Shield },
  doctor: { label: 'Médecin', variant: 'default', icon: Stethoscope },
  secretary: { label: 'Secrétaire', variant: 'secondary', icon: ClipboardList },
  patient: { label: 'Patient', variant: 'outline', icon: Users },
};

export function UserManagementPanel() {
  const { isSuperAdmin } = useAuth();
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState<AppRole | 'all'>('all');
  const [userToDelete, setUserToDelete] = useState<UserWithRole | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [userToToggle, setUserToToggle] = useState<UserWithRole | null>(null);
  const [isToggling, setIsToggling] = useState(false);

  const fetchUsers = useCallback(async () => {
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
          role: (userRole?.role as AppRole) || null,
        };
      });

      setUsers(usersWithRoles);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Erreur lors du chargement des utilisateurs');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleDeleteUser = async () => {
    if (!userToDelete || !isSuperAdmin) return;
    
    setIsDeleting(true);
    try {
      // Delete user role first
      const { error: roleError } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userToDelete.id);

      if (roleError) throw roleError;

      // Delete profile (this should cascade to auth.users if set up correctly)
      const { error: profileError } = await supabase
        .from('profiles')
        .delete()
        .eq('id', userToDelete.id);

      if (profileError) throw profileError;

      toast.success(`Utilisateur ${userToDelete.first_name} ${userToDelete.last_name} supprimé`);
      setUsers(prev => prev.filter(u => u.id !== userToDelete.id));
    } catch (error) {
      console.error('Error deleting user:', error);
      toast.error('Erreur lors de la suppression');
    } finally {
      setIsDeleting(false);
      setUserToDelete(null);
    }
  };

  const handleToggleActive = async () => {
    if (!userToToggle) return;
    
    setIsToggling(true);
    try {
      const newStatus = !userToToggle.is_active;
      const { error } = await supabase
        .from('profiles')
        .update({ is_active: newStatus })
        .eq('id', userToToggle.id);

      if (error) throw error;

      toast.success(`Utilisateur ${newStatus ? 'activé' : 'désactivé'}`);
      setUsers(prev => prev.map(u => 
        u.id === userToToggle.id ? { ...u, is_active: newStatus } : u
      ));
    } catch (error) {
      console.error('Error toggling user status:', error);
      toast.error('Erreur lors de la modification');
    } finally {
      setIsToggling(false);
      setUserToToggle(null);
    }
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = 
      user.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (user.phone && user.phone.includes(searchTerm));
    
    const matchesRole = filterRole === 'all' || user.role === filterRole;
    
    return matchesSearch && matchesRole;
  });

  const formatDate = (date: string | null) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const getRoleBadge = (role: AppRole | null) => {
    const config = role ? roleConfig[role] : { label: 'Inconnu', variant: 'outline' as const, icon: Users };
    return (
      <Badge variant={config.variant} className="flex items-center gap-1 w-fit">
        <config.icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  const stats = {
    total: users.length,
    admins: users.filter(u => u.role === 'admin' || u.role === 'super_admin').length,
    doctors: users.filter(u => u.role === 'doctor').length,
    secretaries: users.filter(u => u.role === 'secretary').length,
    patients: users.filter(u => u.role === 'patient').length,
    active: users.filter(u => u.is_active !== false).length,
    inactive: users.filter(u => u.is_active === false).length,
  };

  return (
    <div className="space-y-4">
      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total utilisateurs</CardDescription>
            <CardTitle className="text-2xl">{stats.total}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Médecins</CardDescription>
            <CardTitle className="text-2xl text-primary">{stats.doctors}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Patients</CardDescription>
            <CardTitle className="text-2xl text-accent">{stats.patients}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Actifs / Inactifs</CardDescription>
            <CardTitle className="text-2xl">
              <span className="text-green-600">{stats.active}</span>
              <span className="text-muted-foreground mx-1">/</span>
              <span className="text-red-600">{stats.inactive}</span>
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Main Panel */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Gestion des utilisateurs</CardTitle>
              <CardDescription>Visualisez et gérez tous les utilisateurs de la plateforme</CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={fetchUsers}>
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Actualiser
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Search and Filters */}
          <div className="flex flex-col md:flex-row gap-4 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher par nom ou téléphone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Tabs value={filterRole} onValueChange={(v) => setFilterRole(v as AppRole | 'all')}>
              <TabsList>
                <TabsTrigger value="all">Tous ({stats.total})</TabsTrigger>
                <TabsTrigger value="admin">Admins ({stats.admins})</TabsTrigger>
                <TabsTrigger value="doctor">Médecins ({stats.doctors})</TabsTrigger>
                <TabsTrigger value="secretary">Secrétaires ({stats.secretaries})</TabsTrigger>
                <TabsTrigger value="patient">Patients ({stats.patients})</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {/* Users Table */}
          {isLoading ? (
            <div className="flex justify-center items-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Aucun utilisateur trouvé</p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Utilisateur</TableHead>
                    <TableHead>Rôle</TableHead>
                    <TableHead>Téléphone</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Inscrit le</TableHead>
                    {isSuperAdmin && <TableHead className="text-right">Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map(user => {
                    const initials = `${user.first_name?.[0] || ''}${user.last_name?.[0] || ''}`.toUpperCase();
                    return (
                      <TableRow key={user.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-9 w-9">
                              <AvatarFallback className="bg-primary/10 text-primary text-sm">
                                {initials}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium">{user.first_name} {user.last_name}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{getRoleBadge(user.role)}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {user.phone || '—'}
                        </TableCell>
                        <TableCell>
                          {user.is_active !== false ? (
                            <Badge variant="outline" className="text-green-600 border-green-600">
                              Actif
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-red-600 border-red-600">
                              Inactif
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {formatDate(user.created_at)}
                        </TableCell>
                        {isSuperAdmin && (
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setUserToToggle(user)}
                                title={user.is_active !== false ? 'Désactiver' : 'Activer'}
                              >
                                {user.is_active !== false ? (
                                  <UserX className="h-4 w-4 text-amber-600" />
                                ) : (
                                  <UserCheck className="h-4 w-4 text-green-600" />
                                )}
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setUserToDelete(user)}
                                title="Supprimer"
                                disabled={user.role === 'super_admin'}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </TableCell>
                        )}
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!userToDelete} onOpenChange={() => setUserToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer l'utilisateur{' '}
              <strong>{userToDelete?.first_name} {userToDelete?.last_name}</strong> ?
              Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteUser}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Toggle Active Confirmation Dialog */}
      <AlertDialog open={!!userToToggle} onOpenChange={() => setUserToToggle(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {userToToggle?.is_active !== false ? 'Désactiver' : 'Activer'} l'utilisateur
            </AlertDialogTitle>
            <AlertDialogDescription>
              {userToToggle?.is_active !== false
                ? `L'utilisateur ${userToToggle?.first_name} ${userToToggle?.last_name} ne pourra plus se connecter.`
                : `L'utilisateur ${userToToggle?.first_name} ${userToToggle?.last_name} pourra à nouveau se connecter.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isToggling}>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleToggleActive} disabled={isToggling}>
              {isToggling ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Confirmer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
