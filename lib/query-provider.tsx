"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";

/**
 * App-wide TanStack Query provider (ARCHITECTURE.md §7.1).
 *
 * The client is created in state so it's stable across re-renders but fresh
 * per browser session. Defaults favor the viewer's read-mostly workload:
 * a short stale window plus refetch-on-focus keeps a play current without
 * hammering the database.
 */
export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            refetchOnWindowFocus: true,
            retry: 1,
          },
        },
      }),
  );

  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
