'use client';

import { useState } from 'react';
import { PageContainer } from '../../../../components/ui-custom/PageContainer';
import { useSubmissions } from '../../../../features/submissions/api/submissions.hooks';
import { Card, CardContent, CardHeader, CardTitle } from '../../../../components/ui/card';
import { Badge } from '../../../../components/ui/badge';
import { Button } from '../../../../components/ui/button';
import { Input } from '../../../../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../../components/ui/select';
import { LoadingScreen } from '../../../../components/ui-custom/LoadingScreen';
import { ErrorState } from '../../../../components/ui-custom/ErrorState';
import { Search, ChevronRight, Filter } from 'lucide-react';
import Link from 'next/link';
import { RoleGuard } from '../../../../components/guards/RoleGuard';

const statusColor: Record<string, string> = {
  PENDING: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20',
  REVIEWING: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  COMPLETED: 'bg-green-500/10 text-green-600 border-green-500/20',
  REJECTED: 'bg-red-500/10 text-red-600 border-red-500/20',
};

export default function ModerationQueuePage() {
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>('PENDING');

  const { data, isLoading, error, refetch } = useSubmissions({ page, limit: 10, status: statusFilter !== 'ALL' ? statusFilter : undefined });

  const submissions = data?.data?.submissions || [];
  const pagination = data?.data?.pagination;

  return (
    <RoleGuard allowedRoles={['ADMIN']} fallback={<ErrorState message="You do not have permission to view this page." />}>
      <PageContainer title="Moderation Queue" description="Review pending submissions and monitor the AI pipeline.">
        <Card className="mb-6">
          <CardContent className="p-4 flex flex-wrap gap-4 items-center justify-between">
            <div className="flex gap-4 flex-1">
              <div className="relative max-w-sm flex-1">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search submissions..." className="pl-9" />
              </div>
              <Select value={statusFilter} onValueChange={(val) => { setStatusFilter(val); setPage(1); }}>
                <SelectTrigger className="w-[180px]">
                  <Filter className="w-4 h-4 mr-2 text-muted-foreground" />
                  <SelectValue placeholder="Filter by Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Statuses</SelectItem>
                  <SelectItem value="PENDING">Pending</SelectItem>
                  <SelectItem value="REVIEWING">Reviewing</SelectItem>
                  <SelectItem value="COMPLETED">Completed</SelectItem>
                  <SelectItem value="REJECTED">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Submissions</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <LoadingScreen message="Loading queue..." />
            ) : error ? (
              <ErrorState message="Failed to load queue" onRetry={refetch} />
            ) : submissions.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Search className="h-10 w-10 mx-auto mb-3 opacity-20" />
                <p>No submissions found.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {submissions.map((sub: any) => (
                  <Link href={`/admin/moderation/${sub._id}`} key={sub._id} className="block">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between rounded-lg border p-4 hover:bg-muted/50 transition-colors gap-4">
                      <div className="space-y-1">
                        <p className="text-sm font-medium leading-none">{sub.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {sub.imageCount} image(s) • Submitted by {sub.submittedBy?.email || 'Unknown'} on {new Date(sub.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-4">
                        <Badge variant="outline" className={statusColor[sub.status] || ''}>
                          {sub.status}
                        </Badge>
                        <Button variant="ghost" size="icon">
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}

            {/* Pagination */}
            {pagination && pagination.totalPages > 1 && (
              <div className="flex items-center justify-end gap-2 pt-6">
                <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}>
                  Previous
                </Button>
                <span className="text-sm text-muted-foreground mx-2">
                  Page {page} of {pagination.totalPages}
                </span>
                <Button variant="outline" size="sm" onClick={() => setPage(p => p + 1)} disabled={page >= pagination.totalPages}>
                  Next
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </PageContainer>
    </RoleGuard>
  );
}
