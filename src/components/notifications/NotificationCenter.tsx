import { Bell, Check, CheckCheck, Calendar, CreditCard, AlertTriangle, Info, Users, Volume2, VolumeX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useNotifications, Notification } from '@/hooks/useNotifications';
import { NotificationActions } from './NotificationActions';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useState, useEffect, useRef } from 'react';

const getNotificationIcon = (type: Notification['type']) => {
  switch (type) {
    case 'appointment':
      return <Calendar className="h-4 w-4 text-blue-500" />;
    case 'payment':
      return <CreditCard className="h-4 w-4 text-green-500" />;
    case 'urgent':
      return <AlertTriangle className="h-4 w-4 text-red-500" />;
    case 'queue_update':
      return <Users className="h-4 w-4 text-amber-500" />;
    case 'reminder':
      return <Bell className="h-4 w-4 text-purple-500" />;
    default:
      return <Info className="h-4 w-4 text-muted-foreground" />;
  }
};

type FilterType = 'all' | 'appointment' | 'payment' | 'urgent';

export function NotificationCenter() {
  const { notifications, unreadCount, markAsRead, markAllAsRead, isLoading, refetch } = useNotifications();
  const [filter, setFilter] = useState<FilterType>('all');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const lastUrgentCountRef = useRef(0);

  // Play sound for urgent notifications
  useEffect(() => {
    const urgentNotifications = notifications.filter(n => n.type === 'urgent' && !n.is_read);

    if (soundEnabled && urgentNotifications.length > lastUrgentCountRef.current) {
      // New urgent notification - play sound
      playUrgentSound();
    }

    lastUrgentCountRef.current = urgentNotifications.length;
  }, [notifications, soundEnabled]);

  const playUrgentSound = () => {
    try {
      // Create a simple beep using Web Audio API
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.value = 800;
      oscillator.type = 'sine';
      gainNode.gain.value = 0.3;

      oscillator.start();

      // Beep pattern: on-off-on
      setTimeout(() => {
        gainNode.gain.value = 0;
      }, 150);
      setTimeout(() => {
        gainNode.gain.value = 0.3;
      }, 200);
      setTimeout(() => {
        oscillator.stop();
        audioContext.close();
      }, 350);
    } catch (error) {
      console.log('Could not play sound:', error);
    }
  };

  const filteredNotifications = notifications.filter(n => {
    if (filter === 'all') return true;
    return n.type === filter;
  });

  const getFilterCount = (type: FilterType) => {
    if (type === 'all') return notifications.filter(n => !n.is_read).length;
    return notifications.filter(n => n.type === type && !n.is_read).length;
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative hover:bg-slate-100 transition-colors duration-200">
          <Bell className="h-5 w-5 text-slate-600" />
          {unreadCount > 0 && (
            <Badge
              className="absolute -top-1 -right-1 h-5 min-w-[20px] p-0 flex items-center justify-center text-[10px] font-bold bg-primary text-white border-2 border-white rounded-full shadow-sm"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-0 border-none shadow-2xl rounded-3xl overflow-hidden glass mt-2" align="end">
        <div className="flex items-center justify-between p-6 bg-slate-900/5 backdrop-blur-sm">
          <h4 className="font-bold text-slate-900 text-lg">Notifications</h4>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 rounded-xl hover:bg-white/50"
              onClick={() => setSoundEnabled(!soundEnabled)}
              title={soundEnabled ? 'Désactiver le son' : 'Activer le son'}
            >
              {soundEnabled ? (
                <Volume2 className="h-4 w-4 text-primary" />
              ) : (
                <VolumeX className="h-4 w-4 text-slate-400" />
              )}
            </Button>
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="text-xs font-bold text-primary hover:bg-primary/5 rounded-lg px-3"
                onClick={markAllAsRead}
              >
                Tout lire
              </Button>
            )}
          </div>
        </div>

        {/* Filter tabs */}
        <Tabs value={filter} onValueChange={(v) => setFilter(v as FilterType)} className="w-full">
          <TabsList className="w-full flex h-11 bg-slate-100/50 p-1 rounded-none">
            <TabsTrigger value="all" className="flex-1 text-[10px] uppercase tracking-wider font-extrabold data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-lg transition-all">
              Tous {getFilterCount('all') > 0 && <Badge className="ml-1 h-4 min-w-[16px] p-0 text-[10px] bg-primary/20 text-primary border-none shadow-none">{getFilterCount('all')}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="appointment" className="flex-1 text-[10px] uppercase tracking-wider font-extrabold data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-lg transition-all">
              RDV
            </TabsTrigger>
            <TabsTrigger value="payment" className="flex-1 text-[10px] uppercase tracking-wider font-extrabold data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-lg transition-all">
              Paie.
            </TabsTrigger>
            <TabsTrigger value="urgent" className="flex-1 text-[10px] uppercase tracking-wider font-extrabold data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-lg text-red-500 transition-all">
              Urgences
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <ScrollArea className="h-[420px] bg-white/30">
          {isLoading ? (
            <div className="p-10 text-center">
              <div className="h-8 w-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin mx-auto mb-4" />
              <p className="text-slate-500 font-medium text-sm">Chargement...</p>
            </div>
          ) : filteredNotifications.length === 0 ? (
            <div className="p-12 text-center">
              <div className="h-16 w-16 bg-slate-100 rounded-3xl flex items-center justify-center mx-auto mb-4 border border-slate-50">
                <Bell className="h-8 w-8 text-slate-300" />
              </div>
              <p className="text-slate-900 font-bold mb-1">C'est tout calme ici</p>
              <p className="text-slate-500 text-xs">
                Aucune notification pour le moment.
              </p>
            </div>
          ) : (
            <div className="p-2 space-y-1">
              {filteredNotifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-4 rounded-2xl transition-all duration-300 cursor-pointer group hover:bg-white hover:shadow-lg hover:shadow-slate-200/50 ${!notification.is_read ? 'bg-primary/5' : ''
                    } ${notification.type === 'urgent' && !notification.is_read ? 'border-2 border-red-100 bg-red-50/30' : ''}`}
                  onClick={() => !notification.is_read && markAsRead(notification.id)}
                >
                  <div className="flex gap-4">
                    <div className="flex-shrink-0 mt-1">
                      <div className="h-10 w-10 rounded-xl bg-white border border-slate-100 flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                        {getNotificationIcon(notification.type)}
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className={`text-sm tracking-tight leading-snug ${!notification.is_read ? 'font-bold text-slate-900' : 'font-medium text-slate-600'}`}>
                          {notification.title}
                        </p>
                        {!notification.is_read && (
                          <div className="h-2 w-2 rounded-full bg-primary flex-shrink-0 mt-1.5 shadow-sm shadow-primary/40 animate-pulse" />
                        )}
                      </div>
                      {notification.message && (
                        <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                          {notification.message}
                        </p>
                      )}
                      <p className="text-[10px] uppercase tracking-widest font-black text-slate-400 mt-2">
                        {formatDistanceToNow(new Date(notification.created_at), {
                          addSuffix: true,
                          locale: fr,
                        })}
                      </p>

                      {/* Quick actions for actionable notifications */}
                      {notification.data && (notification.data as Record<string, any>).action && (
                        <div className="mt-3 pt-3 border-t border-slate-100/50">
                          <NotificationActions
                            notificationId={notification.id}
                            type={notification.type}
                            data={notification.data as Record<string, any>}
                            onActionComplete={refetch}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
        <div className="p-4 bg-slate-50 border-t border-slate-100">
          <Button variant="ghost" className="w-full text-xs font-bold text-slate-500 hover:text-slate-900 hover:bg-white rounded-xl h-9">
            Voir tout l'historique
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
