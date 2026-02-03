import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { TrendingUp, TrendingDown, DollarSign, Calendar, Users, XCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';

interface DoctorStatsProps {
  doctorId: string;
}

interface StatsData {
  totalAppointments: number;
  completedAppointments: number;
  noShowCount: number;
  noShowRate: number;
  monthlyRevenue: number;
  fillRate: number;
  commonReasons: { reason: string; count: number }[];
}

export function DoctorStatsPanel({ doctorId }: DoctorStatsProps) {
  const [stats, setStats] = useState<StatsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        // Fetch from doctor_statistics table
        const { data: statsData } = await supabase
          .from('doctor_statistics')
          .select('*')
          .eq('doctor_id', doctorId)
          .single();

        // Fetch current month appointments for additional calculations
        const startOfMonth = format(new Date(), 'yyyy-MM-01');
        const endOfMonth = format(new Date(), 'yyyy-MM-31');

        const { data: monthlyAppointments } = await supabase
          .from('appointments')
          .select('status')
          .eq('doctor_id', doctorId)
          .gte('appointment_date', startOfMonth)
          .lte('appointment_date', endOfMonth);

        // Fetch consultation forms for common reasons
        const { data: consultations } = await supabase
          .from('consultation_forms')
          .select(`
            consultation_reason,
            appointment:appointments!inner(doctor_id)
          `)
          .eq('appointment.doctor_id', doctorId)
          .not('consultation_reason', 'is', null)
          .limit(100);

        // Calculate common reasons
        const reasonCounts: Record<string, number> = {};
        consultations?.forEach((c) => {
          const reason = c.consultation_reason;
          if (reason) {
            reasonCounts[reason] = (reasonCounts[reason] || 0) + 1;
          }
        });

        const commonReasons = Object.entries(reasonCounts)
          .map(([reason, count]) => ({ reason, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 5);

        const total = monthlyAppointments?.length || 0;
        const completed = monthlyAppointments?.filter(a => a.status === 'completed').length || 0;
        const noShow = monthlyAppointments?.filter(a => a.status === 'no_show').length || 0;

        setStats({
          totalAppointments: statsData?.total_appointments || total,
          completedAppointments: statsData?.completed_appointments || completed,
          noShowCount: statsData?.no_show_count || noShow,
          noShowRate: statsData?.no_show_rate || (total > 0 ? (noShow / total) * 100 : 0),
          monthlyRevenue: statsData?.monthly_revenue || 0,
          fillRate: total > 0 ? (completed / total) * 100 : 0,
          commonReasons,
        });
      } catch (error) {
        console.error('Error fetching doctor stats:', error);
      } finally {
        setIsLoading(false);
      }
    };

    if (doctorId) {
      fetchStats();
    }
  }, [doctorId]);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Chargement des statistiques...
        </CardContent>
      </Card>
    );
  }

  if (!stats) {
    return null;
  }

  return (
    <div className="space-y-4">
      {/* Key Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <DollarSign className="h-4 w-4" />
              Revenus du mois
            </div>
            <p className="text-2xl font-bold mt-1">
              {stats.monthlyRevenue.toLocaleString()} <span className="text-sm font-normal">FCFA</span>
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <Calendar className="h-4 w-4" />
              Consultations
            </div>
            <p className="text-2xl font-bold mt-1">{stats.completedAppointments}</p>
            <p className="text-xs text-muted-foreground">ce mois</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <TrendingUp className="h-4 w-4" />
              Taux de remplissage
            </div>
            <p className="text-2xl font-bold mt-1 text-green-600">
              {stats.fillRate.toFixed(0)}%
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <XCircle className="h-4 w-4" />
              No-show
            </div>
            <p className={`text-2xl font-bold mt-1 ${stats.noShowRate > 10 ? 'text-destructive' : 'text-muted-foreground'}`}>
              {stats.noShowRate.toFixed(1)}%
            </p>
            <p className="text-xs text-muted-foreground">{stats.noShowCount} absences</p>
          </CardContent>
        </Card>
      </div>

      {/* Common Consultation Reasons */}
      {stats.commonReasons.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Motifs fréquents de consultation</CardTitle>
            <CardDescription>Top 5 ce mois</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {stats.commonReasons.map((item, index) => (
                <div key={item.reason} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-muted-foreground w-4">
                      {index + 1}.
                    </span>
                    <span className="text-sm truncate max-w-[200px]">{item.reason}</span>
                  </div>
                  <span className="text-sm text-muted-foreground">{item.count}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
