'use client';

import { PageContainer } from '../../../../components/ui-custom/PageContainer';
import { LoadingScreen } from '../../../../components/ui-custom/LoadingScreen';
import { ErrorState } from '../../../../components/ui-custom/ErrorState';
import { useTrends, useCategories } from '../../../../features/analytics/api/analytics.hooks';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../../components/ui/card';
import { RoleGuard } from '../../../../components/guards/RoleGuard';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend, LineChart, Line } from 'recharts';

export default function AnalyticsDashboardPage() {
  const { data: trendsData, isLoading: trendsLoading, error: trendsError } = useTrends(30);
  const { data: categoriesData, isLoading: categoriesLoading, error: categoriesError } = useCategories();

  if (trendsLoading || categoriesLoading) return <LoadingScreen fullScreen message="Loading analytics..." />;
  if (trendsError || categoriesError) return <ErrorState message="Failed to load analytics" />;

  const trends = trendsData?.data?.report?.dailyVolume || [];
  const categories = categoriesData?.data?.categories || [];

  return (
    <RoleGuard allowedRoles={['ADMIN']} fallback={<ErrorState message="Permission denied" />}>
      <PageContainer title="Advanced Analytics" description="Deep dive into platform trends and moderation performance.">
        
        <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
          {/* Trends Chart */}
          <Card className="col-span-1 lg:col-span-2">
            <CardHeader>
              <CardTitle>Moderation Volume (Last 30 Days)</CardTitle>
              <CardDescription>Daily verdicts breakdown by outcome.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[400px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={trends} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                    <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }} />
                    <Legend wrapperStyle={{ paddingTop: '20px' }} />
                    <Bar dataKey="approved" stackId="a" fill="#10b981" name="Approved" radius={[0, 0, 4, 4]} />
                    <Bar dataKey="flagged" stackId="a" fill="#f59e0b" name="Flagged" />
                    <Bar dataKey="blocked" stackId="a" fill="#ef4444" name="Blocked" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Category Stats */}
          <Card className="col-span-1 lg:col-span-2">
            <CardHeader>
              <CardTitle>Top Triggered Categories</CardTitle>
              <CardDescription>AI categories triggering policy actions.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[400px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={categories} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.2} horizontal={true} vertical={false} />
                    <XAxis type="number" />
                    <YAxis dataKey="category" type="category" width={150} tick={{ fontSize: 12 }} tickFormatter={(val) => val.replace(/_/g, ' ')} />
                    <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ borderRadius: '8px' }} />
                    <Bar dataKey="totalTriggered" fill="#8b5cf6" name="Total Triggered" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

      </PageContainer>
    </RoleGuard>
  );
}
