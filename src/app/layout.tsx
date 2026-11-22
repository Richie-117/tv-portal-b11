import type { Metadata, Viewport } from 'next';
import './globals.css';
import Navbar from '@/components/Navbar';

export const metadata: Metadata = {
  title: 'TV B11 — Division of Television Studies | UCR',
  description: 'Cyber-futuristic mobile-first academic portal for UCR Television Studies Batch 11.',
  manifest: '/manifest.json',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#0088FF',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50 text-slate-900 antialiased flex flex-col justify-between selection:bg-[#0088FF] selection:text-white">
        <div>
          <Navbar />
          {children}
        </div>
        <footer className="border-t border-slate-200 bg-white/80 py-4 text-center text-xs font-mono text-slate-500">
          Division of Television Studies · Batch 11
        </footer>
      </body>
    </html>
  );
}
