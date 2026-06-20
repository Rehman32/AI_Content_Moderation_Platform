'use client';

import { useState } from 'react';
import { PageContainer } from '../../../../components/ui-custom/PageContainer';
import { LoadingScreen } from '../../../../components/ui-custom/LoadingScreen';
import { ErrorState } from '../../../../components/ui-custom/ErrorState';
import { useAuditLogs } from '../../../../features/audit/api/audit.hooks';
import { Card, CardContent } from '../../../../components/ui/card';
import { Badge } from '../../../../components/ui/badge';
import { Button } from '../../../../components/ui/button';
import { Input } from '../../../../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../../components/ui/select';
import { Search, Filter, History } from 'lucide-react';
import { RoleGuard } from '../../../../components/guards/RoleGuard';

export default function AuditLogsPage() {
  const [page, setPage] = useState(1);
  const [eventType, setEventType] = useState<string>('ALL');
  const [entityType, setEntityType] = useState<string>('ALL');

  const { data, isLoading, error, refetch } = useAuditLogs({ 
    page, 
    limit: 15,
    eventType: eventType !== 'ALL' ? eventType : undefined,
    entityType: entityType !== 'ALL' ? entityType : undefined
  });

  const logs = data?.data?.logs || [];
  const pagination = data?.data?.pagination;

  return (
    <RoleGuard allowedRoles={['ADMIN']} fallback={<ErrorState message="Permission denied" />}>
      <PageContainer title="System Audit Logs" description="Immutable record of system actions and state changes.">
        <Card className="mb-6">
          <CardContent className="p-4 flex flex-wrap gap-4 items-center">
            <Select value={eventType} onValueChange={(val) => { setEventType(val); setPage(1); }}>
              <SelectTrigger className="w-[200px]">
                <Filter className="w-4 h-4 mr-2 text-muted-foreground" />
                <SelectValue placeholder="Event Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Events</SelectItem>
                <SelectItem value="USER_LOGGED_IN">User Logins</SelectItem>
                <SelectItem value="SUBMISSION_CREATED">Submissions</SelectItem>
                <SelectItem value="VERDICT_GENERATED">Verdicts</SelectItem>
                <SelectItem value="APPEAL_CREATED">Appeals</SelectItem>
                <SelectItem value="POLICY_ACTIVATED">Policies</SelectItem>
              </SelectContent>
            </Select>

            <Select value={entityType} onValueChange={(val) => { setEntityType(val); setPage(1); }}>
              <SelectTrigger className="w-[180px]">
                <Filter className="w-4 h-4 mr-2 text-muted-foreground" />
                <SelectValue placeholder="Entity Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Entities</SelectItem>
                <SelectItem value="USER">User</SelectItem>
                <SelectItem value="SUBMISSION">Submission</SelectItem>
                <SelectItem value="VERDICT">Verdict</SelectItem>
                <SelectItem value="APPEAL">Appeal</SelectItem>
                <SelectItem value="POLICY">Policy</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={() => { setEventType('ALL'); setEntityType('ALL'); setPage(1); }}>Reset</Button>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <LoadingScreen message="Loading audit logs..." />
            ) : error ? (
              <ErrorState message="Failed to load logs" onRetry={refetch} />
            ) : logs.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <History className="h-10 w-10 mx-auto mb-3 opacity-20" />
                <p>No audit logs found matching your filters.</p>
              </div>
            ) : (
              <div className="divide-y">
                {logs.map((log: any) => (
                  <div key={log._id} className="p-4 hover:bg-muted/30 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm font-semibold">{log.eventType}</span>
                        <Badge variant="outline" className="text-xs bg-primary/5">{log.entityType}</Badge>
                      </div>
                      <p className="text-xs font-mono text-muted-foreground">Entity ID: {log.entityId}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">{typeof log.actorId === 'object' && log.actorId ? log.actorId.email : (log.actorId || 'SYSTEM')}</p>
                      <p className="text-xs text-muted-foreground">{new Date(log.createdAt).toLocaleString()}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            {pagination && pagination.totalPages > 1 && (
              <div className="flex items-center justify-end gap-2 p-4 border-t">
                <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}>Previous</Button>
                <span className="text-sm text-muted-foreground mx-2">Page {page} of {pagination.totalPages}</span>
                <Button variant="outline" size="sm" onClick={() => setPage(p => p + 1)} disabled={page >= pagination.totalPages}>Next</Button>
              </div>
            )}
          </CardContent>
        </Card>
      </PageContainer>
    </RoleGuard>
  );
}
