'use client';

import { useState } from 'react';
import { PageContainer } from '../../../../components/ui-custom/PageContainer';
import { LoadingScreen } from '../../../../components/ui-custom/LoadingScreen';
import { ErrorState } from '../../../../components/ui-custom/ErrorState';
import { useAppeals, useApproveAppeal, useRejectAppeal, useMarkAppealUnderReview } from '../../../../features/appeals/api/appeals.hooks';
import { Card, CardContent } from '../../../../components/ui/card';
import { Badge } from '../../../../components/ui/badge';
import { Button } from '../../../../components/ui/button';
import { Textarea } from '../../../../components/ui/textarea';
import { Check, X, Eye, ShieldCheck, Scale, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { RoleGuard } from '../../../../components/guards/RoleGuard';

const statusColor: Record<string, string> = {
  PENDING: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20',
  UNDER_REVIEW: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  APPROVED: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
  REJECTED: 'bg-red-500/10 text-red-600 border-red-500/20',
};

export default function AdminAppealsPage() {
  const [page, setPage] = useState(1);
  const { data, isLoading, error } = useAppeals({ page, limit: 10 });
  const approveAppeal = useApproveAppeal();
  const rejectAppeal = useRejectAppeal();
  const markReview = useMarkAppealUnderReview();

  const [notes, setNotes] = useState<Record<string, string>>({});
  const [activeAppeal, setActiveAppeal] = useState<string | null>(null);

  const appeals = data?.data?.appeals || [];
  const pagination = data?.data?.pagination;

  const handleAction = async (appealId: string, action: 'approve' | 'reject' | 'review') => {
    if (action === 'review') {
      await markReview.mutateAsync(appealId);
    } else if (action === 'approve') {
      await approveAppeal.mutateAsync({ appealId, adminNotes: notes[appealId] });
      setActiveAppeal(null);
    } else {
      await rejectAppeal.mutateAsync({ appealId, adminNotes: notes[appealId] });
      setActiveAppeal(null);
    }
  };

  if (isLoading) return <LoadingScreen fullScreen message="Loading appeals..." />;
  if (error) return <ErrorState message="Failed to load appeals" />;

  return (
    <RoleGuard allowedRoles={['ADMIN']} fallback={<ErrorState message="Permission denied" />}>
      <PageContainer title="Appeals Queue" description="Review and resolve user appeals.">
        {appeals.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Scale className="h-10 w-10 mx-auto mb-3 opacity-20" />
            <p>No appeals pending review.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {appeals.map((appeal: any) => (
              <Card key={appeal._id}>
                <CardContent className="p-5">
                  <div className="flex flex-col md:flex-row justify-between gap-4">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-3 flex-wrap">
                        <Link href={`/admin/moderation/${appeal.submissionId?._id || appeal.submissionId}`} className="text-sm font-semibold hover:underline">
                          Submission: {appeal.submissionId?.title || appeal.submissionId}
                        </Link>
                        <Badge variant="outline" className={statusColor[appeal.status]}>
                          {appeal.status.replace(/_/g, ' ')}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Appellant: {appeal.appellantId?.email || 'Unknown'} • Filed: {new Date(appeal.createdAt).toLocaleDateString()}
                      </p>
                      <div className="bg-muted/30 rounded p-3 mt-2">
                        <p className="text-xs font-semibold text-muted-foreground mb-1">ORIGINAL VERDICT:</p>
                        <p className="text-sm font-medium">{appeal.verdictSnapshot?.finalOutcome?.replace(/_/g, ' ')}</p>
                        <p className="text-sm text-muted-foreground mt-1">{appeal.verdictSnapshot?.reasoning}</p>
                      </div>
                      <div className="bg-primary/5 border border-primary/10 rounded p-3 mt-2">
                        <p className="text-xs font-semibold text-primary/70 mb-1">USER REASON:</p>
                        <p className="text-sm">{appeal.reason}</p>
                      </div>

                      {appeal.adminNotes && (
                        <div className="bg-muted rounded p-3 mt-2">
                          <p className="text-xs font-semibold text-muted-foreground mb-1">ADMIN NOTES:</p>
                          <p className="text-sm">{appeal.adminNotes}</p>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col gap-2 min-w-[200px]">
                      {appeal.status === 'PENDING' && (
                        <Button variant="outline" size="sm" className="w-full justify-start" onClick={() => handleAction(appeal._id, 'review')}>
                          <Eye className="w-4 h-4 mr-2" /> Mark Under Review
                        </Button>
                      )}
                      
                      {(appeal.status === 'PENDING' || appeal.status === 'UNDER_REVIEW') && (
                        <>
                          {activeAppeal === appeal._id ? (
                            <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                              <Textarea 
                                placeholder="Admin resolution notes..." 
                                value={notes[appeal._id] || ''}
                                onChange={(e) => setNotes({ ...notes, [appeal._id]: e.target.value })}
                                className="text-sm min-h-[80px]"
                              />
                              <div className="flex gap-2">
                                <Button 
                                  size="sm" 
                                  className="w-full bg-emerald-600 hover:bg-emerald-700" 
                                  onClick={() => handleAction(appeal._id, 'approve')}
                                  disabled={approveAppeal.isPending}
                                >
                                  {approveAppeal.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4 mr-1" />} Approve
                                </Button>
                                <Button 
                                  size="sm" 
                                  variant="destructive" 
                                  className="w-full"
                                  onClick={() => handleAction(appeal._id, 'reject')}
                                  disabled={rejectAppeal.isPending}
                                >
                                  {rejectAppeal.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4 mr-1" />} Reject
                                </Button>
                              </div>
                              <Button variant="ghost" size="sm" className="w-full" onClick={() => setActiveAppeal(null)}>Cancel</Button>
                            </div>
                          ) : (
                            <Button variant="default" size="sm" className="w-full justify-start" onClick={() => setActiveAppeal(appeal._id)}>
                              <ShieldCheck className="w-4 h-4 mr-2" /> Resolve Appeal
                            </Button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            
            {pagination && pagination.totalPages > 1 && (
              <div className="flex items-center justify-end gap-2 pt-6">
                <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}>Previous</Button>
                <span className="text-sm text-muted-foreground mx-2">Page {page} of {pagination.totalPages}</span>
                <Button variant="outline" size="sm" onClick={() => setPage(p => p + 1)} disabled={page >= pagination.totalPages}>Next</Button>
              </div>
            )}
          </div>
        )}
      </PageContainer>
    </RoleGuard>
  );
}
