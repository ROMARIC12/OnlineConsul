import { useState } from 'react';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { UserList } from '@/components/users/UserList';
import { CreateUserDialog } from '@/components/users/CreateUserDialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { UserPlus, Shield, Stethoscope, ClipboardList, Users as UsersIcon } from 'lucide-react';
import { Database } from '@/integrations/supabase/types';

type AppRole = Database['public']['Enums']['app_role'];

export default function Users() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<AppRole>('patient');
  const [filterRole, setFilterRole] = useState<AppRole | 'all'>('all');
  const [refreshKey, setRefreshKey] = useState(0);

  const openCreateDialog = (role: AppRole) => {
    setSelectedRole(role);
    setIsDialogOpen(true);
  };

  const handleUserCreated = () => {
    setIsDialogOpen(false);
    setRefreshKey(prev => prev + 1);
  };

  const roleButtons = [
    { role: 'admin' as AppRole, label: 'Admin', icon: Shield, color: 'bg-red-500 hover:bg-red-600' },
    { role: 'doctor' as AppRole, label: 'Médecin', icon: Stethoscope, color: 'bg-primary hover:bg-primary/90' },
    { role: 'secretary' as AppRole, label: 'Secrétaire', icon: ClipboardList, color: 'bg-amber-500 hover:bg-amber-600' },
    { role: 'patient' as AppRole, label: 'Patient', icon: UsersIcon, color: 'bg-accent hover:bg-accent/90' },
  ];

  return (
    <>
      <DashboardHeader title="Gestion des utilisateurs" />
      <div className="flex-1 overflow-auto p-4 md:p-6">
        {/* Action Buttons */}
        <div className="mb-6">
          <h3 className="text-sm font-medium text-muted-foreground mb-3">Créer un nouvel utilisateur</h3>
          <div className="flex flex-wrap gap-2">
            {roleButtons.map(({ role, label, icon: Icon, color }) => (
              <Button
                key={role}
                onClick={() => openCreateDialog(role)}
                className={`${color} text-white`}
              >
                <Icon className="mr-2 h-4 w-4" />
                <UserPlus className="mr-1 h-3 w-3" />
                {label}
              </Button>
            ))}
          </div>
        </div>

        {/* Filter Tabs */}
        <Tabs value={filterRole} onValueChange={(v) => setFilterRole(v as AppRole | 'all')} className="w-full">
          <TabsList className="mb-4 flex-wrap h-auto">
            <TabsTrigger value="all">Tous</TabsTrigger>
            <TabsTrigger value="admin">Admins</TabsTrigger>
            <TabsTrigger value="doctor">Médecins</TabsTrigger>
            <TabsTrigger value="secretary">Secrétaires</TabsTrigger>
            <TabsTrigger value="patient">Patients</TabsTrigger>
          </TabsList>

          <TabsContent value={filterRole} className="mt-0">
            <UserList filterRole={filterRole === 'all' ? undefined : filterRole} refreshKey={refreshKey} />
          </TabsContent>
        </Tabs>

        {/* Create User Dialog */}
        <CreateUserDialog
          open={isDialogOpen}
          onOpenChange={setIsDialogOpen}
          role={selectedRole}
          onSuccess={handleUserCreated}
        />
      </div>
    </>
  );
}
