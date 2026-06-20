'use client';

import { PageContainer } from '../../../components/ui-custom/PageContainer';
import { LoadingScreen } from '../../../components/ui-custom/LoadingScreen';
import { ErrorState } from '../../../components/ui-custom/ErrorState';
import { EmptyState } from '../../../components/ui-custom/EmptyState';
import { useDashboard } from '../../../features/analytics/api/analytics.hooks';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../components/ui/card';
import { Badge } from '../../../components/ui/badge';
import { RoleGuard } from '../../../components/guards/RoleGuard';
import { Users, FileText, Image, ShieldCheck, AlertTriangle, Scale, TrendingUp, BarChart3, Settings, Search, FileSearch, LineChart, ListTree } from 'lucide-react';
import Link from 'next/link';
import { Button } from '../../../components/ui/button';

export default function AdminDashboardPage() {
  const { data, isLoading, error, refetch } = useDashboard();
  const metrics = data?.data?.metrics;

  if (isLoading) return <LoadingScreen fullScreen message="Loading analytics..." />;
  if (error) return <ErrorState message="Failed to load dashboard" onRetry={refetch} />;
  if (!metrics) return <EmptyState title="No data" description="Dashboard data is not available yet." />;

  const statCards = [
    { title: 'Total Users', value: metrics.counts.totalUsers, icon: Users, color: 'text-blue-600' },
    { title: 'Total Submissions', value: metrics.counts.totalSubmissions, icon: FileText, color: 'text-indigo-600' },
    { title: 'Total Images', value: metrics.counts.totalImages, icon: Image, color: 'text-violet-600' },
    { title: 'Total Verdicts', value: metrics.counts.totalVerdicts, icon: Scale, color: 'text-purple-600' },
    { title: 'Approval Rate', value: `${metrics.approvalRate}%`, icon: ShieldCheck, color: 'text-emerald-600' },
    { title: 'Blocked Rate', value: `${metrics.blockedRate}%`, icon: AlertTriangle, color: 'text-red-600' },
    { title: 'Flagged Rate', value: `${metrics.flaggedRate}%`, icon: TrendingUp, color: 'text-amber-600' },
    { title: 'Appeal Success', value: `${metrics.appealSuccessRate}%`, icon: BarChart3, color: 'text-cyan-600' },
  ];

  return (
    <RoleGuard allowedRoles={['ADMIN']} fallback={<ErrorState message="You do not have permission to view this page." />}>
      <PageContainer title="Admin Dashboard" description="Platform-wide analytics and system health.">
        <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
          {statCards.map((stat) => {
            const Icon = stat.icon;
            return (
              <Card key={stat.title}>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">{stat.title}</CardTitle>
                  <Icon className={`h-4 w-4 ${stat.color}`} />
                </CardHeader>
                <CardContent>
                  <div className={`text-2xl font-bold ${stat.color}`}>{stat.value}</div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Quick Links */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Navigate to management interfaces.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4">
              <Link href="/admin/moderation">
                <Button variant="outline" className="gap-2"><Search className="h-4 w-4" /> Moderation Queue</Button>
              </Link>
              <Link href="/admin/appeals">
                <Button variant="outline" className="gap-2"><Scale className="h-4 w-4" /> Appeals Queue</Button>
              </Link>
              <Link href="/admin/policies">
                <Button variant="outline" className="gap-2"><Settings className="h-4 w-4" /> Policy Management</Button>
              </Link>
              <Link href="/admin/analytics">
                <Button variant="outline" className="gap-2"><LineChart className="h-4 w-4" /> Advanced Analytics</Button>
              </Link>
              <Link href="/admin/audit">
                <Button variant="outline" className="gap-2"><ListTree className="h-4 w-4" /> Audit Logs</Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Verdict Distribution</CardTitle>
            <CardDescription>Overall moderation outcomes across the platform.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              {metrics.verdictDistribution.map((v) => (
                <div key={v.outcome} className="rounded-lg border p-4 text-center space-y-2">
                  <p className="text-sm text-muted-foreground">{v.outcome.replace(/_/g, ' ')}</p>
                  <p className="text-3xl font-bold">{v.count}</p>
                  <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        v.outcome === 'APPROVED' ? 'bg-emerald-500' :
                        v.outcome === 'BLOCKED' ? 'bg-red-500' : 'bg-amber-500'
                      }`}
                      style={{ width: `${v.percentage}%` }}
                    />
                  </div>
                  <p className="text-sm font-medium">{v.percentage}%</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </PageContainer>
    </RoleGuard>
  );
}
