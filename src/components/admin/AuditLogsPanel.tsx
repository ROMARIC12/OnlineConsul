import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useRealtimeSubscription } from '@/hooks/useRealtimeSubscription';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileText, Search, Filter } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface AuditLog {
  id: string;
  user_id: string | null;
  action: string;
  target_table: string | null;
  target_id: string | null;
  details: any;
  ip_address: string | null;
  created_at: string;
}

export function AuditLogsPanel() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [actionFilter, setActionFilter] = useState<string>('all');

  const fetchLogs = async () => {
    try {
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      setLogs(data || []);
      setFilteredLogs(data || []);
    } catch (error) {
      console.error('Error fetching audit logs:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  // Real-time subscription - need to handle audit_logs as any since it's not in our type definition
  useEffect(() => {
    const channel = supabase
      .channel('audit-logs-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'audit_logs',
        },
        (payload) => {
          console.log('[AuditLogs] New log:', payload);
          const newLog = payload.new as AuditLog;
          setLogs((prev) => [newLog, ...prev]);
          setFilteredLogs((prev) => [newLog, ...prev]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Filter logs
  useEffect(() => {
    let filtered = [...logs];

    if (searchQuery) {
      filtered = filtered.filter(
        (log) =>
          log.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
          log.target_table?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          log.user_id?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (actionFilter && actionFilter !== 'all') {
      filtered = filtered.filter((log) => log.action === actionFilter);
    }

    setFilteredLogs(filtered);
  }, [logs, searchQuery, actionFilter]);

  const uniqueActions = [...new Set(logs.map((log) => log.action))];

  const getActionBadge = (action: string) => {
    if (action.includes('create') || action.includes('insert')) {
      return <Badge className="bg-green-500">Création</Badge>;
    }
    if (action.includes('update') || action.includes('edit')) {
      return <Badge className="bg-blue-500">Modification</Badge>;
    }
    if (action.includes('delete') || action.includes('remove')) {
      return <Badge variant="destructive">Suppression</Badge>;
    }
    if (action.includes('login') || action.includes('auth')) {
      return <Badge variant="secondary">Authentification</Badge>;
    }
    return <Badge variant="outline">{action}</Badge>;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Journaux d'audit
        </CardTitle>
        <CardDescription>
          Historique des actions en temps réel
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Filters */}
        <div className="flex gap-3 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={actionFilter} onValueChange={setActionFilter}>
            <SelectTrigger className="w-[180px]">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Filtrer par action" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes les actions</SelectItem>
              {uniqueActions.map((action) => (
                <SelectItem key={action} value={action}>{action}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Logs List */}
        {isLoading ? (
          <p className="text-center text-muted-foreground py-8">Chargement...</p>
        ) : filteredLogs.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            Aucun journal trouvé
          </p>
        ) : (
          <ScrollArea className="h-[500px]">
            <div className="space-y-2">
              {filteredLogs.map((log) => (
                <div
                  key={log.id}
                  className="p-3 border rounded-lg text-sm hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        {getActionBadge(log.action)}
                        <span className="font-medium">{log.action}</span>
                      </div>
                      {log.target_table && (
                        <p className="text-muted-foreground mt-1">
                          Table: <code className="bg-muted px-1 rounded">{log.target_table}</code>
                          {log.target_id && (
                            <> · ID: <code className="bg-muted px-1 rounded">{log.target_id.slice(0, 8)}...</code></>
                          )}
                        </p>
                      )}
                      {log.details && Object.keys(log.details).length > 0 && (
                        <details className="mt-2">
                          <summary className="text-xs text-muted-foreground cursor-pointer">
                            Voir les détails
                          </summary>
                          <pre className="mt-1 p-2 bg-muted rounded text-xs overflow-auto">
                            {JSON.stringify(log.details, null, 2)}
                          </pre>
                        </details>
                      )}
                    </div>
                    <div className="text-right text-xs text-muted-foreground">
                      <p>{format(new Date(log.created_at), 'HH:mm:ss', { locale: fr })}</p>
                      <p>{format(new Date(log.created_at), 'dd/MM/yyyy', { locale: fr })}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
