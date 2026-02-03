import { useAuth } from '@/hooks/useAuth';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Badge } from '@/components/ui/badge';
import { NotificationCenter } from '@/components/notifications/NotificationCenter';

interface DashboardHeaderProps {
  title: string;
}

export function DashboardHeader({ title }: DashboardHeaderProps) {
  const { role, profile } = useAuth();

  const getRoleBadge = () => {
    const roleLabels: Record<string, { label: string; className: string }> = {
      admin: { label: 'Admin', className: 'bg-primary/10 text-primary border-primary/20' },
      doctor: { label: 'Médecin', className: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' },
      secretary: { label: 'Secrétaire', className: 'bg-amber-500/10 text-amber-600 border-amber-500/20' },
      patient: { label: 'Patient', className: 'bg-blue-500/10 text-blue-600 border-blue-500/20' },
    };
    return roleLabels[role || ''] || { label: 'Utilisateur', className: 'bg-slate-500/10 text-slate-600 border-slate-500/20' };
  };

  const badge = getRoleBadge();

  return (
    <header className="sticky top-0 z-40 h-16 border-b border-border bg-white/80 backdrop-blur-xl supports-[backdrop-filter]:bg-white/60">
      <div className="flex h-full items-center gap-4 px-6">
        <SidebarTrigger className="md:hidden" />
        <div className="flex-1">
          <h1 className="text-xl font-bold tracking-tight text-slate-900">{title}</h1>
        </div>
        <div className="flex items-center gap-4">
          <NotificationCenter />
          <div className="hidden md:flex items-center gap-3 pl-4 border-l border-slate-100">
            <div className="text-right">
              <p className="text-sm font-bold text-slate-900">{profile?.first_name} {profile?.last_name}</p>
              <Badge variant="outline" className={`${badge.className} h-5 px-1.5 text-[10px] uppercase font-bold tracking-wider rounded-md`}>
                {badge.label}
              </Badge>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
