'use client';

import React from 'react';
import './globals.css';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SessionProvider } from '@stayos/auth';
import { ToastStack } from '@stayos/ui';
import { useRouter } from 'next/navigation';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, retry: 1 },
  },
});

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}): React.ReactElement {
  const router = useRouter();

  return (
    <html lang="en">
      <body>
        <QueryClientProvider client={queryClient}>
          <SessionProvider
            portalUserType="property"
            onUnauthenticated={(redirect) => {
              const url = redirect
                ? `/login?redirect=${encodeURIComponent(redirect)}`
                : '/login';
              router.replace(url);
            }}
            onDisconnect={() => {
              // Socket disconnect on session loss — socket tears itself down
              // via useEffect cleanup when session becomes null
            }}
          >
            <ToastStack>
              {children}
            </ToastStack>
          </SessionProvider>
        </QueryClientProvider>
      </body>
    </html>
  );
}
