import { useLocation } from 'react-router-dom';
import { NavLink } from '@/components/NavLink';
import {
  LayoutDashboard,
  Users,
  User,
  Heart,
  LogOut,
  Calendar,
  Stethoscope,
  CreditCard,
  FileText,
  Clock,
  Building2,
  Bell,
  Video,
  Home,
  Rocket,
  Settings,
  Plus
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from '@/components/ui/sidebar';

// Menu items by role - comprehensive navigation
const menuItemsByRole = {
  admin: [
    { title: 'Tableau de bord', url: '/dashboard', icon: LayoutDashboard },
    { title: 'Utilisateurs', url: '/dashboard/users', icon: Users },
    { title: 'Mon Profil', url: '/dashboard/profile', icon: User },
  ],
  doctor: [
    { title: 'Mon agenda', url: '/dashboard', icon: Calendar },
    { title: 'Teleconsultation', url: '/dashboard/teleconsultation', icon: Video },
    { title: 'Mon Profil', url: '/dashboard/profile', icon: User },
  ],
  secretary: [
    { title: 'Accueil', url: '/dashboard', icon: LayoutDashboard },
    { title: 'Mon Profil', url: '/dashboard/profile', icon: User },
  ],
  patient: [
    { title: 'Accueil', url: '/dashboard?tab=home', icon: Home },
    { title: 'Explorer', url: '/dashboard?tab=explore', icon: Rocket },
    { title: 'Documents', url: '/dashboard?tab=documents', icon: FileText },
    { title: 'Teleconsultation', url: '/dashboard/teleconsultation', icon: Video },
    { title: 'Réglages', url: '/dashboard?tab=settings', icon: Settings },
    { title: 'Mon Profil', url: '/dashboard/profile', icon: User },
  ],
};

export function DashboardSidebar() {
  const { state, toggleSidebar } = useSidebar();
  const collapsed = state === 'collapsed';
  const location = useLocation();
  const { signOut, profile, role } = useAuth();

  const handleSignOut = async () => {
    await signOut();
  };

  // Get menu items based on role
  const menuItems = menuItemsByRole[role || 'patient'] || menuItemsByRole.patient;

  // Get role display name
  const getRoleDisplayName = (role: string | null) => {
    switch (role) {
      case 'super_admin':
        return 'Super Administrateur';
      case 'admin':
        return 'Administrateur';
      case 'doctor':
        return 'Médecin';
      case 'secretary':
        return 'Secrétaire';
      case 'patient':
        return 'Patient';
      default:
        return 'Utilisateur';
    }
  };

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border bg-sidebar-background/95 backdrop-blur-md">
      <SidebarHeader className="p-6">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary to-blue-600 flex items-center justify-center flex-shrink-0 shadow-lg shadow-primary/20">
            <Heart className="h-6 w-6 text-white" />
          </div>
          {!collapsed && (
            <div className="flex flex-col">
              <span className="font-bold text-lg tracking-tight text-white">KôKô Santé</span>
              <span className="text-[10px] uppercase tracking-widest font-semibold text-sidebar-foreground/50">{getRoleDisplayName(role)}</span>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-foreground/60">
            {!collapsed && 'Navigation'}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={location.pathname === item.url}
                    tooltip={item.title}
                  >
                    <NavLink
                      to={item.url}
                      className="flex items-center gap-3 px-3 py-2 rounded-md transition-colors"
                      activeClassName="bg-sidebar-accent text-sidebar-accent-foreground"
                    >
                      <item.icon className="h-5 w-5 flex-shrink-0" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {role === 'patient' && !collapsed && (
          <div className="px-6 py-4">
            <Button
              className="w-full h-12 rounded-2xl bg-gradient-to-r from-primary to-blue-600 hover:from-primary/90 hover:to-blue-500 shadow-xl shadow-primary/20 font-bold group border-none transition-all duration-300 active:scale-95"
              onClick={() => {
                const url = new URL(window.location.href);
                url.searchParams.set('booking', 'open');
                window.history.pushState({}, '', url);
                window.dispatchEvent(new Event('popstate'));
              }}
            >
              <Plus className="h-5 w-5 mr-2 group-hover:rotate-90 transition-transform duration-300" />
              Nouveau RDV
            </Button>
          </div>
        )}
      </SidebarContent>

      <SidebarFooter className="p-6">
        {!collapsed && profile && (
          <div className="mb-4 p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm">
            <p className="text-sm font-bold text-white">
              {profile.first_name} {profile.last_name}
            </p>
            <p className="text-[11px] text-sidebar-foreground/50 font-medium mt-0.5">{profile.phone || 'Pas de téléphone'}</p>
          </div>
        )}
        <Button
          variant="ghost"
          className="w-full justify-start text-sidebar-foreground/70 hover:bg-white/10 hover:text-white rounded-xl transition-all duration-200"
          onClick={handleSignOut}
        >
          <LogOut className="h-5 w-5 mr-3" />
          {!collapsed && <span className="font-medium">Déconnexion</span>}
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
