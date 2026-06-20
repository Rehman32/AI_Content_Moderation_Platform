'use client';

import { use } from 'react';
import { PageContainer } from '../../../../components/ui-custom/PageContainer';
import { LoadingScreen } from '../../../../components/ui-custom/LoadingScreen';
import { ErrorState } from '../../../../components/ui-custom/ErrorState';
import { useSubmission } from '../../../../features/submissions/api/submissions.hooks';
import { useSubmissionVerdicts } from '../../../../features/moderation/api/moderation.hooks';
import { useAppealsBySubmission, useCreateAppeal } from '../../../../features/appeals/api/appeals.hooks';
import { useProcessImage } from '../../../../features/moderation/api/moderation.hooks';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../../components/ui/card';
import { Badge } from '../../../../components/ui/badge';
import { Button } from '../../../../components/ui/button';
import { Loader2, ShieldCheck, ShieldAlert, ShieldX, Play, MessageSquare } from 'lucide-react';
import { useState } from 'react';
import { Textarea } from '../../../../components/ui/textarea';
import { toast } from 'sonner';

const statusColor: Record<string, string> = {
  PENDING: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20',
  REVIEWING: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  COMPLETED: 'bg-green-500/10 text-green-600 border-green-500/20',
  REJECTED: 'bg-red-500/10 text-red-600 border-red-500/20',
  PROCESSING: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  FAILED: 'bg-red-500/10 text-red-600 border-red-500/20',
};

const verdictIcon: Record<string, any> = {
  APPROVED: ShieldCheck,
  FLAGGED_FOR_REVIEW: ShieldAlert,
  BLOCKED: ShieldX,
};

const verdictColor: Record<string, string> = {
  APPROVED: 'text-emerald-600',
  FLAGGED_FOR_REVIEW: 'text-amber-600',
  BLOCKED: 'text-red-600',
};

export default function SubmissionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data, isLoading, error, refetch } = useSubmission(id);
  const { data: verdictData } = useSubmissionVerdicts(id);
  const { data: appealData } = useAppealsBySubmission(id);
  const processImage = useProcessImage();
  const createAppeal = useCreateAppeal();

  const [appealReason, setAppealReason] = useState('');
  const [showAppealForm, setShowAppealForm] = useState(false);

  if (isLoading) return <LoadingScreen fullScreen message="Loading submission..." />;
  if (error) return <ErrorState message="Failed to load submission" onRetry={refetch} />;

  const submission = data?.data?.submission;
  const images = data?.data?.images || [];
  const verdicts = verdictData?.data?.verdicts || verdictData?.data || [];
  const appeals = appealData?.data?.appeals || appealData?.data || [];

  if (!submission) return <ErrorState message="Submission not found" />;

  const handleProcess = async (imageId: string) => {
    await processImage.mutateAsync(imageId);
    refetch();
  };

  const handleAppeal = async () => {
    if (!appealReason.trim()) {
      toast.error('Please provide a reason for your appeal');
      return;
    }
    await createAppeal.mutateAsync({ submissionId: id, reason: appealReason });
    setShowAppealForm(false);
    setAppealReason('');
  };

  return (
    <PageContainer
      title={submission.title}
      description={`Submitted on ${new Date(submission.createdAt).toLocaleDateString()} • ${images.length} image(s)`}
      action={
        <Badge variant="outline" className={`text-sm ${statusColor[submission.status]}`}>
          {submission.status}
        </Badge>
      }
    >
      {/* Image Gallery */}
      <Card>
        <CardHeader>
          <CardTitle>Uploaded Images</CardTitle>
          <CardDescription>Click "Process" on each image to run AI moderation.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {images.map((img: any) => (
              <div key={img._id} className="rounded-lg border overflow-hidden">
                <div className="aspect-video bg-muted relative flex items-center justify-center">
                  <img
                    src={`http://localhost:5000/${img.meta.storagePath.replace(/\\\\/g, '/')}`}
                    alt={img.meta.originalName}
                    className="object-cover w-full h-full"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                </div>
                <div className="p-3 space-y-2">
                  <p className="text-sm font-medium truncate">{img.meta.originalName}</p>
                  <div className="flex items-center justify-between">
                    <Badge variant="outline" className={statusColor[img.status] || ''}>
                      {img.status}
                    </Badge>
                    {img.status === 'PENDING' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleProcess(img._id)}
                        disabled={processImage.isPending}
                      >
                        {processImage.isPending ? (
                          <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                        ) : (
                          <Play className="mr-1 h-3 w-3" />
                        )}
                        Process
                      </Button>
                    )}
                  </div>
                  {/* AI Analysis Results */}
                  {img.moderationResult && (
                    <div className="mt-3 pt-3 border-t space-y-2">
                      <p className="text-xs font-semibold text-muted-foreground">AI ANALYSIS</p>
                      <div className="space-y-1">
                        {img.moderationResult.categories.map((cat: any) => (
                          <div key={cat.name} className="flex items-center justify-between text-xs">
                            <span className={cat.flagged ? 'text-red-600 font-medium' : 'text-muted-foreground'}>
                              {cat.name.replace(/_/g, ' ')}
                            </span>
                            <div className="flex items-center gap-2">
                              <div className="w-16 h-1.5 rounded-full bg-muted overflow-hidden">
                                <div
                                  className={`h-full rounded-full ${cat.confidence > 0.7 ? 'bg-red-500' : cat.confidence > 0.4 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                                  style={{ width: `${cat.confidence * 100}%` }}
                                />
                              </div>
                              <span className="w-10 text-right font-mono">{(cat.confidence * 100).toFixed(0)}%</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Verdicts Section */}
      {Array.isArray(verdicts) && verdicts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Verdicts</CardTitle>
            <CardDescription>Deterministic policy evaluation results.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {verdicts.map((v: any) => {
                const Icon = verdictIcon[v.finalOutcome] || ShieldCheck;
                return (
                  <div key={v._id} className="flex items-start gap-4 rounded-lg border p-4">
                    <div className={`mt-0.5 ${verdictColor[v.finalOutcome]}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1 space-y-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" className={`${verdictColor[v.finalOutcome]} border-current/20`}>
                          {v.finalOutcome.replace(/_/g, ' ')}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          Policy v{v.policyVersionNumber}
                        </span>
                        {v.isOverridden && (
                          <Badge variant="outline" className="bg-purple-500/10 text-purple-600 border-purple-500/20">
                            OVERRIDDEN
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">{v.reasoning}</p>
                      {v.triggeredRules && v.triggeredRules.length > 0 && (
                        <div className="mt-2 space-y-1">
                          <p className="text-xs font-semibold text-muted-foreground">TRIGGERED RULES:</p>
                          {v.triggeredRules.map((rule: any, i: number) => (
                            <p key={i} className="text-xs text-red-600">
                              {rule.category}: {(rule.confidence * 100).toFixed(0)}% (threshold: {(rule.threshold * 100).toFixed(0)}%) → {rule.action}
                            </p>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Appeals Section */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Appeals</CardTitle>
            <CardDescription>Challenge moderation decisions if you disagree.</CardDescription>
          </div>
          {!showAppealForm && (
            <Button variant="outline" size="sm" onClick={() => setShowAppealForm(true)}>
              <MessageSquare className="mr-2 h-4 w-4" /> File Appeal
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {showAppealForm && (
            <div className="mb-6 rounded-lg border p-4 space-y-3 bg-muted/30">
              <p className="text-sm font-medium">Why do you disagree with the moderation outcome?</p>
              <Textarea
                placeholder="Provide a detailed explanation..."
                value={appealReason}
                onChange={(e) => setAppealReason(e.target.value)}
                disabled={createAppeal.isPending}
              />
              <div className="flex gap-2">
                <Button size="sm" onClick={handleAppeal} disabled={createAppeal.isPending || !appealReason.trim()}>
                  {createAppeal.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Submit Appeal
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setShowAppealForm(false)}>Cancel</Button>
              </div>
            </div>
          )}

          {Array.isArray(appeals) && appeals.length > 0 ? (
            <div className="space-y-3">
              {appeals.map((appeal: any) => (
                <div key={appeal._id} className="rounded-lg border p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <Badge variant="outline" className={statusColor[appeal.status] || ''}>
                      {appeal.status.replace(/_/g, ' ')}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {new Date(appeal.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-sm">{appeal.reason}</p>
                  {appeal.adminNotes && (
                    <div className="mt-2 rounded-md bg-muted/50 p-3">
                      <p className="text-xs font-semibold text-muted-foreground">ADMIN RESPONSE</p>
                      <p className="text-sm mt-1">{appeal.adminNotes}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : !showAppealForm ? (
            <p className="text-sm text-muted-foreground">No appeals filed for this submission.</p>
          ) : null}
        </CardContent>
      </Card>
    </PageContainer>
  );
}
