'use client';

import * as React from 'react';
import { ErrorBoundary as ReactErrorBoundary, FallbackProps } from 'react-error-boundary';
import { Button } from '../ui/button';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { useRouter } from 'next/navigation';

function ErrorFallback({ error, resetErrorBoundary }: FallbackProps) {
  const router = useRouter();

  return (
    <div className="flex h-[calc(100vh-4rem)] w-full flex-col items-center justify-center p-6 text-center">
      <div className="mx-auto flex max-w-[420px] flex-col items-center justify-center text-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/20 mb-4">
          <AlertTriangle className="h-10 w-10 text-red-600 dark:text-red-500" />
        </div>
        <h2 className="text-2xl font-semibold tracking-tight">Something went wrong</h2>
        <p className="mb-6 mt-2 text-sm text-muted-foreground">
          {error instanceof Error ? error.message : 'An unexpected error occurred while rendering this component.'}
        </p>
        <div className="flex gap-4">
          <Button onClick={resetErrorBoundary}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Try again
          </Button>
          <Button variant="outline" onClick={() => router.push('/')}>
            Go Home
          </Button>
        </div>
      </div>
    </div>
  );
}

export function ErrorBoundary({ children }: { children: React.ReactNode }) {
  return (
    <ReactErrorBoundary FallbackComponent={ErrorFallback}>
      {children}
    </ReactErrorBoundary>
  );
}
