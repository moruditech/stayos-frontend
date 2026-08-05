import React from 'react';

// The (auth) route group covers /login and password reset flows.
// No sidebar, no session requirement, no socket connection.
// middleware.ts already redirects authenticated users away from /login.
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}): React.ReactElement {
  return <>{children}</>;
}
