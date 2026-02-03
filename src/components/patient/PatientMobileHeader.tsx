import { Menu, Bell, X, MoreVertical, Flag } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface PatientMobileHeaderProps {
  title: string;
  unreadCount?: number;
  onMenuClick?: () => void;
  onNotificationsClick?: () => void;
  showBack?: boolean;
  onBack?: () => void;
  showActions?: boolean;
}

export function PatientMobileHeader({
  title,
  unreadCount = 0,
  onMenuClick,
  onNotificationsClick,
  showBack = false,
  onBack,
  showActions = false,
}: PatientMobileHeaderProps) {
  return (
    <header className="sticky top-0 z-40 bg-card border-b border-border">
      <div className="flex items-center justify-between h-14 px-4">
        {/* Left */}
        <div className="flex items-center gap-3">
          {showBack ? (
            <Button variant="ghost" size="icon" onClick={onBack} className="-ml-2">
              <X className="h-5 w-5" />
            </Button>
          ) : (
            <Button variant="ghost" size="icon" onClick={onMenuClick} className="-ml-2">
              <Menu className="h-5 w-5" />
            </Button>
          )}
          <h1 className="font-semibold text-lg">{title}</h1>
        </div>

        {/* Right */}
        <div className="flex items-center gap-1">
          {showActions && (
            <>
              <Button variant="ghost" size="icon">
                <Flag className="h-5 w-5 text-[hsl(45,70%,50%)]" />
              </Button>
              <Button variant="ghost" size="icon">
                <MoreVertical className="h-5 w-5" />
              </Button>
            </>
          )}
          {onNotificationsClick && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onNotificationsClick}
              className="relative"
            >
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <Badge
                  variant="destructive"
                  className="absolute -top-1 -right-1 h-5 min-w-[20px] p-0 flex items-center justify-center text-xs rounded-full"
                >
                  {unreadCount > 9 ? '9+' : unreadCount}
                </Badge>
              )}
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
