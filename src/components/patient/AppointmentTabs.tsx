import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Video, Calendar } from 'lucide-react';

interface AppointmentTabsProps {
  activeTab: 'rdv' | 'teleconsultation';
  onTabChange: (tab: 'rdv' | 'teleconsultation') => void;
  onlineDoctorsCount?: number;
}

export function AppointmentTabs({ activeTab, onTabChange, onlineDoctorsCount = 0 }: AppointmentTabsProps) {
  return (
    <div className="flex border-b border-border">
      <button
        onClick={() => onTabChange('rdv')}
        className={cn(
          'flex-1 py-3 text-center font-medium transition-colors relative flex items-center justify-center gap-2',
          activeTab === 'rdv'
            ? 'text-foreground'
            : 'text-muted-foreground hover:text-foreground'
        )}
      >
        <Calendar className="h-4 w-4" />
        <span>Mes RDV</span>
        {activeTab === 'rdv' && (
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-16 h-1 bg-primary rounded-t-full" />
        )}
      </button>
      <button
        onClick={() => onTabChange('teleconsultation')}
        className={cn(
          'flex-1 py-3 text-center font-medium transition-colors relative flex items-center justify-center gap-2',
          activeTab === 'teleconsultation'
            ? 'text-foreground'
            : 'text-muted-foreground hover:text-foreground'
        )}
      >
        <Video className="h-4 w-4" />
        <span>Téléconsultation</span>
        {onlineDoctorsCount > 0 && (
          <Badge variant="default" className="h-5 min-w-[20px] rounded-full text-xs bg-green-500">
            {onlineDoctorsCount}
          </Badge>
        )}
        {activeTab === 'teleconsultation' && (
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-16 h-1 bg-primary rounded-t-full" />
        )}
      </button>
    </div>
  );
}
