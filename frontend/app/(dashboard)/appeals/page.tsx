'use client';

import { PageContainer } from '../../../components/ui-custom/PageContainer';
import { LoadingScreen } from '../../../components/ui-custom/LoadingScreen';
import { ErrorState } from '../../../components/ui-custom/ErrorState';
import { EmptyState } from '../../../components/ui-custom/EmptyState';
import { useAppeals } from '../../../features/appeals/api/appeals.hooks';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../../components/ui/card';
import { Badge } from '../../../components/ui/badge';
import { MessageSquare, Clock, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { Button } from '../../../components/ui/button';

const statusConfig: Record<string, { color: string; icon: any; label: string }> = {
  PENDING: { color: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20', icon: Clock, label: 'Pending' },
  UNDER_REVIEW: { color: 'bg-blue-500/10 text-blue-600 border-blue-500/20', icon: AlertCircle, label: 'Under Review' },
  APPROVED: { color: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20', icon: CheckCircle2, label: 'Approved' },
  REJECTED: { color: 'bg-red-500/10 text-red-600 border-red-500/20', icon: XCircle, label: 'Rejected' },
};

export default function AppealsPage() {
  const [page, setPage] = useState(1);
  const { data, isLoading, error, refetch } = useAppeals({ page, limit: 10 });

  const appeals = data?.data?.appeals || [];
  const pagination = data?.data?.pagination;

  if (isLoading) return <LoadingScreen fullScreen message="Loading appeals..." />;
  if (error) return <ErrorState message="Failed to load appeals" onRetry={refetch} />;

  return (
    <PageContainer title="My Appeals" description="Track the status of your moderation appeals.">
      {appeals.length === 0 ? (
        <EmptyState
          title="No appeals yet"
          description="If you disagree with a moderation verdict, you can file an appeal from the submission details page."
          icon={<MessageSquare className="h-10 w-10 text-muted-foreground" />}
        />
      ) : (
        <div className="space-y-4">
          {appeals.map((appeal: any) => {
            const config = statusConfig[appeal.status] || statusConfig.PENDING;
            const Icon = config.icon;
            const submissionTitle = typeof appeal.submissionId === 'object' ? appeal.submissionId.title : 'Submission';
            const submissionIdStr = typeof appeal.submissionId === 'object' ? appeal.submissionId._id : appeal.submissionId;

            return (
              <Card key={appeal._id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-5">
                  <div className="flex items-start gap-4">
                    <div className={`rounded-full p-2 ${config.color}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 space-y-2 min-w-0">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div>
                          <Link href={`/submissions/${submissionIdStr}`} className="text-sm font-medium hover:underline">
                            {submissionTitle}
                          </Link>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            Filed on {new Date(appeal.createdAt).toLocaleDateString()} •
                            Original verdict: <span className="font-medium">{appeal.verdictSnapshot?.finalOutcome?.replace(/_/g, ' ')}</span>
                          </p>
                        </div>
                        <Badge variant="outline" className={config.color}>
                          {config.label}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{appeal.reason}</p>
                      {appeal.adminNotes && (
                        <div className="mt-3 rounded-md bg-muted/50 p-3 border-l-2 border-primary">
                          <p className="text-xs font-semibold text-muted-foreground mb-1">ADMIN RESPONSE</p>
                          <p className="text-sm">{appeal.adminNotes}</p>
                          {appeal.reviewedAt && (
                            <p className="text-xs text-muted-foreground mt-1">
                              Reviewed on {new Date(appeal.reviewedAt).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}

          {/* Pagination */}
          {pagination && pagination.totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-4">
              <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}>
                Previous
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {page} of {pagination.totalPages}
              </span>
              <Button variant="outline" size="sm" onClick={() => setPage(p => p + 1)} disabled={page >= pagination.totalPages}>
                Next
              </Button>
            </div>
          )}
        </div>
      )}
    </PageContainer>
  );
}
