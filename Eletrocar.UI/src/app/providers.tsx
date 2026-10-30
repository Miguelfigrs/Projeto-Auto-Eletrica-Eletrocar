"use client";

/**
 * Provider TanStack Query (React Query)
 * Configurado com suporte a contingência offline-first para o balcão da oficina.
 */
import React, { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 1000 * 60 * 5, // 5 minutos de cache fresco
            gcTime: 1000 * 60 * 60 * 24, // 24 horas no cache de contingência
            retry: 2,
            networkMode: "offlineFirst", // Continua respondendo com cache do IndexedDB/memória se offline
            refetchOnWindowFocus: false,
          },
          mutations: {
            networkMode: "offlineFirst",
          },
        },
      })
  );

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
