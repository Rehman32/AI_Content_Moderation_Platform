'use client';

import { useState } from 'react';
import { PageContainer } from '../../../../components/ui-custom/PageContainer';
import { LoadingScreen } from '../../../../components/ui-custom/LoadingScreen';
import { ErrorState } from '../../../../components/ui-custom/ErrorState';
import { usePoliciesHistory, useActivePolicy, useActivatePolicy } from '../../../../features/policies/api/policies.hooks';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../../components/ui/card';
import { Badge } from '../../../../components/ui/badge';
import { Button } from '../../../../components/ui/button';
import { CheckCircle2, History, Power, Settings2, Loader2 } from 'lucide-react';
import { RoleGuard } from '../../../../components/guards/RoleGuard';

export default function PolicyManagementPage() {
  const [page, setPage] = useState(1);
  const { data: activeData, isLoading: activeLoading } = useActivePolicy();
  const { data: historyData, isLoading: historyLoading, error, refetch } = usePoliciesHistory({ page, limit: 10 });
  const activatePolicy = useActivatePolicy();

  const activePolicy = activeData?.data?.policyVersion;
  const policies = historyData?.data?.policies || [];
  const pagination = historyData?.data?.pagination;

  const handleActivate = async (versionId: string) => {
    await activatePolicy.mutateAsync(versionId);
    refetch();
  };

  if (activeLoading || historyLoading) return <LoadingScreen fullScreen message="Loading policies..." />;
  if (error) return <ErrorState message="Failed to load policies" onRetry={refetch} />;

  return (
    <RoleGuard allowedRoles={['ADMIN']} fallback={<ErrorState message="Permission denied" />}>
      <PageContainer title="Policy Management" description="Manage moderation rules and thresholds.">
        
        {/* Active Policy Summary */}
        <Card className="mb-6 border-primary/20 bg-primary/5">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                  Active Policy
                </CardTitle>
                <CardDescription>Currently enforcing rules on all new submissions</CardDescription>
              </div>
              <Badge className="bg-emerald-500 hover:bg-emerald-600">v{activePolicy?.versionNumber}</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-lg">{activePolicy?.name}</h3>
                <p className="text-sm text-muted-foreground">{activePolicy?.description}</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {activePolicy?.rules.map((rule: any, i: number) => (
                  <div key={i} className="flex flex-col justify-between p-3 rounded bg-background border text-sm">
                    <span className="font-medium">{rule.category.replace(/_/g, ' ')}</span>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-muted-foreground text-xs">Threshold: {(rule.threshold * 100).toFixed(0)}%</span>
                      <Badge variant="outline" className={
                        rule.action === 'BLOCK' ? 'text-red-600 border-red-600/20 bg-red-600/10' :
                        rule.action === 'FLAG_FOR_REVIEW' ? 'text-amber-600 border-amber-600/20 bg-amber-600/10' :
                        'text-emerald-600 border-emerald-600/20 bg-emerald-600/10'
                      }>
                        {rule.action.replace(/_/g, ' ')}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Version History */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5 text-muted-foreground" />
                Version History
              </CardTitle>
              <CardDescription>Past and drafted policy versions</CardDescription>
            </div>
            <Button variant="outline" size="sm" className="gap-2" disabled>
              <Settings2 className="h-4 w-4" /> New Draft
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {policies.map((policy: any) => (
                <div key={policy._id} className="flex flex-col md:flex-row md:items-center justify-between p-4 rounded-lg border gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold">{policy.name}</h4>
                      <Badge variant="secondary">v{policy.versionNumber}</Badge>
                      {policy.isActive && <Badge className="bg-emerald-500">ACTIVE</Badge>}
                    </div>
                    <p className="text-sm text-muted-foreground">{policy.description}</p>
                    <p className="text-xs text-muted-foreground">
                      Created on {new Date(policy.createdAt).toLocaleDateString()} • {policy.rules.length} rules
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {!policy.isActive && (
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => handleActivate(policy._id)}
                        disabled={activatePolicy.isPending}
                      >
                        {activatePolicy.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Power className="h-4 w-4 mr-2" />}
                        Activate
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {pagination && pagination.totalPages > 1 && (
              <div className="flex items-center justify-end gap-2 pt-6">
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
