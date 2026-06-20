'use client';

import { use } from 'react';
import { PageContainer } from '../../../../../components/ui-custom/PageContainer';
import { LoadingScreen } from '../../../../../components/ui-custom/LoadingScreen';
import { ErrorState } from '../../../../../components/ui-custom/ErrorState';
import { useSubmission } from '../../../../../features/submissions/api/submissions.hooks';
import { useSubmissionVerdicts, useProcessImage, useGenerateSubmissionVerdicts } from '../../../../../features/moderation/api/moderation.hooks';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../../../components/ui/card';
import { Badge } from '../../../../../components/ui/badge';
import { Button } from '../../../../../components/ui/button';
import { Loader2, ShieldCheck, ShieldAlert, ShieldX, Play, Scale } from 'lucide-react';
import { RoleGuard } from '../../../../../components/guards/RoleGuard';

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

export default function AdminSubmissionReviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data, isLoading, error, refetch } = useSubmission(id);
  const { data: verdictData } = useSubmissionVerdicts(id);
  
  const processImage = useProcessImage();
  const generateVerdicts = useGenerateSubmissionVerdicts();

  if (isLoading) return <LoadingScreen fullScreen message="Loading submission..." />;
  if (error) return <ErrorState message="Failed to load submission" onRetry={refetch} />;

  const submission = data?.data?.submission;
  const images = data?.data?.images || [];
  const verdicts = verdictData?.data?.verdicts || verdictData?.data || [];

  if (!submission) return <ErrorState message="Submission not found" />;

  const handleProcessImage = async (imageId: string) => {
    await processImage.mutateAsync(imageId);
    refetch();
  };

  const handleGenerateVerdicts = async () => {
    await generateVerdicts.mutateAsync(id);
    refetch();
  };

  const allImagesProcessed = images.every((img: any) => img.status === 'COMPLETED');
  const canGenerateVerdicts = allImagesProcessed && submission.status !== 'COMPLETED';

  return (
    <RoleGuard allowedRoles={['ADMIN']} fallback={<ErrorState message="Permission denied" />}>
      <PageContainer
        title={`Review: ${submission.title}`}
        description={`Submitted by ${submission.submittedBy?.email || 'Unknown'} on ${new Date(submission.createdAt).toLocaleDateString()}`}
        action={
          <div className="flex gap-2">
            <Badge variant="outline" className={`text-sm ${statusColor[submission.status]}`}>
              {submission.status}
            </Badge>
            {canGenerateVerdicts && (
              <Button size="sm" onClick={handleGenerateVerdicts} disabled={generateVerdicts.isPending}>
                {generateVerdicts.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Scale className="h-4 w-4 mr-2" />}
                Generate Final Verdicts
              </Button>
            )}
          </div>
        }
      >
        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Image Analysis</CardTitle>
              <CardDescription>Review individual image moderation results.</CardDescription>
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
                      <p className="text-sm font-medium truncate" title={img.meta.originalName}>{img.meta.originalName}</p>
                      <div className="flex items-center justify-between">
                        <Badge variant="outline" className={statusColor[img.status] || ''}>
                          {img.status}
                        </Badge>
                        {img.status === 'PENDING' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleProcessImage(img._id)}
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

          {Array.isArray(verdicts) && verdicts.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Final Verdicts</CardTitle>
                <CardDescription>System-generated verdicts based on the active policy.</CardDescription>
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
        </div>
      </PageContainer>
    </RoleGuard>
  );
}
