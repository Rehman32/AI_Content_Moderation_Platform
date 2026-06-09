'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode, useState } from 'react';

export function QueryProvider({ children }: { children: ReactNode }) {
  // We initialize the client inside a useState to ensure that data is not shared
  // across different users and requests in SSR, while persisting on the client.
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 1000 * 60 * 5, // Data is fresh for 5 minutes
            retry: 1, // Only retry once on failure before throwing error
            refetchOnWindowFocus: false, // Prevents excessive API calls during dev
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}
