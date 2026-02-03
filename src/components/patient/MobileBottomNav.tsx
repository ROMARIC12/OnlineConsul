import { Home, Rocket, FileText, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MobileBottomNavProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  onPlusClick: () => void;
}

export function MobileBottomNav({ activeTab, onTabChange, onPlusClick }: MobileBottomNavProps) {
  const navItems = [
    { id: 'home', icon: Home, label: 'Accueil' },
    { id: 'explore', icon: Rocket, label: 'Explorer' },
    { id: 'documents', icon: FileText, label: 'Documents' },
    { id: 'settings', icon: Settings, label: 'Réglages' },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-card border-t border-border z-50 md:hidden">
      <div className="relative flex items-center justify-around h-16 px-2">
        {navItems.slice(0, 2).map((item) => (
          <button
            key={item.id}
            onClick={() => onTabChange(item.id)}
            className={cn(
              'flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-lg transition-colors',
              activeTab === item.id
                ? 'text-primary'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <item.icon className="h-5 w-5" />
            <span className="text-xs">{item.label}</span>
          </button>
        ))}

        {/* Floating + Button */}
        <button
          onClick={onPlusClick}
          className="absolute left-1/2 -translate-x-1/2 -top-6 w-14 h-14 rounded-full bg-[hsl(210,50%,35%)] text-white shadow-lg flex items-center justify-center hover:bg-[hsl(210,50%,30%)] transition-colors"
        >
          <span className="text-2xl font-light">+</span>
        </button>

        {navItems.slice(2).map((item) => (
          <button
            key={item.id}
            onClick={() => onTabChange(item.id)}
            className={cn(
              'flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-lg transition-colors',
              activeTab === item.id
                ? 'text-primary'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <item.icon className="h-5 w-5" />
            <span className="text-xs">{item.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
