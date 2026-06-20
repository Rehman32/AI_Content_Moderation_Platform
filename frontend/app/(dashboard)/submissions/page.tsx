'use client';

import { PageContainer } from '../../../components/ui-custom/PageContainer';
import { LoadingScreen } from '../../../components/ui-custom/LoadingScreen';
import { ErrorState } from '../../../components/ui-custom/ErrorState';
import { EmptyState } from '../../../components/ui-custom/EmptyState';
import { useSubmissions } from '../../../features/submissions/api/submissions.hooks';
import { useDashboard } from '../../../features/analytics/api/analytics.hooks';
import { useAppeals } from '../../../features/appeals/api/appeals.hooks';
import { useAuth } from '../../../features/auth/context/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../components/ui/card';
import { Badge } from '../../../components/ui/badge';
import { Button } from '../../../components/ui/button';
import { FileText, Image, ShieldCheck, AlertTriangle, Plus, ArrowRight } from 'lucide-react';
import Link from 'next/link';

const statusColor: Record<string, string> = {
  PENDING: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20',
  REVIEWING: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  COMPLETED: 'bg-green-500/10 text-green-600 border-green-500/20',
  REJECTED: 'bg-red-500/10 text-red-600 border-red-500/20',
};

const verdictColor: Record<string, string> = {
  APPROVED: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
  FLAGGED_FOR_REVIEW: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
  BLOCKED: 'bg-red-500/10 text-red-600 border-red-500/20',
};

export default function SubmissionsPage() {
  const { user } = useAuth();
  const { data: subData, isLoading: subLoading, error: subError, refetch: subRefetch } = useSubmissions({ page: 1, limit: 5 });
  const { data: dashData, isLoading: dashLoading } = useDashboard();
  const { data: appealData, isLoading: appealLoading } = useAppeals({ page: 1, limit: 5 });

  const submissions = subData?.data?.submissions || [];
  const metrics = dashData?.data?.metrics;
  const appeals = appealData?.data?.appeals || [];

  if (subLoading && dashLoading) return <LoadingScreen fullScreen message="Loading your dashboard..." />;

  return (
    <PageContainer
      title={`Welcome back, ${user?.firstName}`}
      description="Here's an overview of your content moderation activity."
      action={
        <Link href="/submissions/create">
          <Button>
            <Plus className="mr-2 h-4 w-4" /> New Submission
          </Button>
        </Link>
      }
    >
      {/* Stats Overview */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">My Submissions</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.counts.totalSubmissions ?? '—'}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Images</CardTitle>
            <Image className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.counts.totalImages ?? '—'}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Approval Rate</CardTitle>
            <ShieldCheck className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">{metrics?.approvalRate ?? 0}%</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active Appeals</CardTitle>
            <AlertTriangle className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.counts.totalAppeals ?? 0}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Submissions */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Recent Submissions</CardTitle>
              <CardDescription>Your latest content submissions</CardDescription>
            </div>
            <Link href="/submissions">
              <Button variant="ghost" size="sm">
                View All <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {subError ? (
              <ErrorState message="Failed to load submissions" onRetry={subRefetch} />
            ) : submissions.length === 0 ? (
              <EmptyState
                title="No submissions yet"
                description="Create your first submission to get started."
                action={
                  <Link href="/submissions/create">
                    <Button size="sm"><Plus className="mr-2 h-4 w-4" />Create Submission</Button>
                  </Link>
                }
              />
            ) : (
              <div className="space-y-3">
                {submissions.map((sub: any) => (
                  <Link href={`/submissions/${sub._id}`} key={sub._id} className="block">
                    <div className="flex items-center justify-between rounded-lg border p-3 hover:bg-muted/50 transition-colors cursor-pointer">
                      <div className="space-y-1">
                        <p className="text-sm font-medium leading-none">{sub.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {sub.imageCount} image(s) • {new Date(sub.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <Badge variant="outline" className={statusColor[sub.status] || ''}>
                        {sub.status}
                      </Badge>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Verdict Summary */}
        <Card>
          <CardHeader>
            <CardTitle>Verdict Distribution</CardTitle>
            <CardDescription>Breakdown of moderation outcomes</CardDescription>
          </CardHeader>
          <CardContent>
            {dashLoading ? (
              <LoadingScreen message="Loading verdicts..." />
            ) : metrics?.verdictDistribution ? (
              <div className="space-y-4">
                {metrics.verdictDistribution.map((v: any) => (
                  <div key={v.outcome} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className={verdictColor[v.outcome] || ''}>
                          {v.outcome.replace(/_/g, ' ')}
                        </Badge>
                      </div>
                      <span className="text-sm font-medium">{v.count} ({v.percentage}%)</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          v.outcome === 'APPROVED' ? 'bg-emerald-500' :
                          v.outcome === 'BLOCKED' ? 'bg-red-500' : 'bg-amber-500'
                        }`}
                        style={{ width: `${v.percentage}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState title="No verdicts yet" description="Process images to see verdict distribution." />
            )}
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  );
}
