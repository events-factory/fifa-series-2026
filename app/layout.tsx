import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'FIFA Series 2026',
  description: 'FIFA Series 2026 Rwanda— Official Registration Portal',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
