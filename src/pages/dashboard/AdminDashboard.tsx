import { useEffect, useState, useCallback } from 'react';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { StatsCard } from '@/components/dashboard/StatsCard';
import { AuditLogsPanel } from '@/components/admin/AuditLogsPanel';
import { ClinicManagement } from '@/components/admin/ClinicManagement';
import { UserManagementPanel } from '@/components/admin/UserManagementPanel';
import { supabase } from '@/integrations/supabase/client';
import { useRealtimeSubscription } from '@/hooks/useRealtimeSubscription';
import { useAuth } from '@/hooks/useAuth';
import { Users, Stethoscope, Calendar, CreditCard, Building2, AlertCircle, TrendingUp, CheckCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface Stats {
  totalUsers: number;
  totalDoctors: number;
  totalAppointments: number;
  totalPayments: number;
  totalClinics: number;
  pendingAppointments: number;
  todayAppointments: number;
  confirmedToday: number;
}

export default function AdminDashboard() {
  const { isSuperAdmin } = useAuth();
  const [stats, setStats] = useState<Stats>({
    totalUsers: 0,
    totalDoctors: 0,
    totalAppointments: 0,
    totalPayments: 0,
    totalClinics: 0,
    pendingAppointments: 0,
    todayAppointments: 0,
    confirmedToday: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      
      const [
        profilesRes, 
        doctorsRes, 
        appointmentsRes, 
        paymentsRes, 
        clinicsRes, 
        pendingRes,
        todayRes,
        confirmedRes
      ] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
        supabase.from('doctors').select('id', { count: 'exact', head: true }),
        supabase.from('appointments').select('id', { count: 'exact', head: true }),
        supabase.from('payments').select('id', { count: 'exact', head: true }),
        supabase.from('clinics').select('id', { count: 'exact', head: true }),
        supabase.from('appointments').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('appointments').select('id', { count: 'exact', head: true }).eq('appointment_date', today),
        supabase.from('appointments').select('id', { count: 'exact', head: true }).eq('appointment_date', today).eq('status', 'confirmed'),
      ]);

      setStats({
        totalUsers: profilesRes.count || 0,
        totalDoctors: doctorsRes.count || 0,
        totalAppointments: appointmentsRes.count || 0,
        totalPayments: paymentsRes.count || 0,
        totalClinics: clinicsRes.count || 0,
        pendingAppointments: pendingRes.count || 0,
        todayAppointments: todayRes.count || 0,
        confirmedToday: confirmedRes.count || 0,
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  // Real-time updates
  useRealtimeSubscription({
    table: 'appointments',
    onChange: () => fetchStats(),
  });

  useRealtimeSubscription({
    table: 'profiles',
    onChange: () => fetchStats(),
  });

  return (
    <>
      <DashboardHeader title="Tableau de bord Admin" />
      <div className="flex-1 overflow-auto p-4 md:p-6">
        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatsCard
            title="Utilisateurs"
            value={isLoading ? '...' : stats.totalUsers}
            description="Total des comptes"
            icon={Users}
          />
          <StatsCard
            title="Médecins"
            value={isLoading ? '...' : stats.totalDoctors}
            description="Praticiens enregistrés"
            icon={Stethoscope}
          />
          <StatsCard
            title="RDV aujourd'hui"
            value={isLoading ? '...' : stats.todayAppointments}
            description={`${stats.confirmedToday} confirmés`}
            icon={Calendar}
          />
          <StatsCard
            title="À confirmer"
            value={isLoading ? '...' : stats.pendingAppointments}
            description="RDV en attente"
            icon={AlertCircle}
          />
        </div>

        {/* Secondary Stats */}
        <div className="grid gap-4 md:grid-cols-3 mt-4">
          <StatsCard
            title="Cliniques"
            value={isLoading ? '...' : stats.totalClinics}
            description="Établissements"
            icon={Building2}
          />
          <StatsCard
            title="Paiements"
            value={isLoading ? '...' : stats.totalPayments}
            description="Transactions totales"
            icon={CreditCard}
          />
          <StatsCard
            title="Total RDV"
            value={isLoading ? '...' : stats.totalAppointments}
            description="Historique complet"
            icon={TrendingUp}
          />
        </div>

        {/* Main Content Tabs */}
        <div className="mt-6">
          <Tabs defaultValue="overview">
            <TabsList className={`grid w-full max-w-lg ${isSuperAdmin ? 'grid-cols-4' : 'grid-cols-3'}`}>
              <TabsTrigger value="overview">Aperçu</TabsTrigger>
              {isSuperAdmin && <TabsTrigger value="users">Utilisateurs</TabsTrigger>}
              <TabsTrigger value="clinics">Cliniques</TabsTrigger>
              <TabsTrigger value="audit">Audit</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="mt-4">
              <div className="grid gap-4 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle>Bienvenue sur KôKô Santé</CardTitle>
                    <CardDescription>Administration de la plateforme</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">
                      Gérez facilement votre plateforme médicale. Utilisez les onglets pour accéder aux différentes fonctionnalités :
                    </p>
                    <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
                      <li className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <strong>Cliniques</strong> - Gérer les établissements
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <strong>Utilisateurs</strong> - Gérer les comptes
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <strong>Audit</strong> - Journaux temps réel
                      </li>
                    </ul>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Alertes système</CardTitle>
                    <CardDescription>Notifications importantes</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {stats.pendingAppointments > 0 ? (
                      <div className="flex items-center gap-2 text-amber-600 p-3 bg-amber-50 rounded-lg">
                        <AlertCircle className="h-5 w-5" />
                        <span>{stats.pendingAppointments} rendez-vous en attente de confirmation</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-green-600 p-3 bg-green-50 rounded-lg">
                        <CheckCircle className="h-5 w-5" />
                        <span>Aucune alerte pour le moment</span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {isSuperAdmin && (
              <TabsContent value="users" className="mt-4">
                <UserManagementPanel />
              </TabsContent>
            )}

            <TabsContent value="clinics" className="mt-4">
              <ClinicManagement />
            </TabsContent>

            <TabsContent value="audit" className="mt-4">
              <AuditLogsPanel />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </>
  );
}
