import React from 'react';
import { Providers } from './providers';
import './globals.css';
import './public.css';

export const metadata = {
  title: 'StayOS — Built for hospitality. Designed for people.',
  description: 'StayOS connects people to the right place to stay and helps property operators run their business smarter, every day.',
};

export default function RootLayout({ children }: { children: React.ReactNode }): React.ReactElement {
  return (
    <html lang="en">
      <body>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
