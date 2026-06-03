import type { Metadata } from 'next';
import './globals.css';
import { Providers } from '@/components/Providers';
import { ThemeToggle } from '@/components/ThemeToggle';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Threads',
  description: 'Threads feed clone',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <Providers>
          <div className="mx-auto min-h-screen max-w-[640px] border-x border-border bg-bg">
            <header className="sticky top-0 z-10 flex items-center justify-between bg-bg/80 px-4 py-3 backdrop-blur">
              <Link href="/" className="text-lg font-bold text-fg">Threads</Link>
              <div className="flex items-center gap-1">
                <Link href="/search" className="rounded-full px-3 py-1.5 text-sm text-fg hover:bg-elevated">
                  Search
                </Link>
                <Link href="/manage" className="rounded-full px-3 py-1.5 text-sm text-fg hover:bg-elevated">
                  Manage
                </Link>
                <ThemeToggle />
              </div>
            </header>
            <main>{children}</main>
          </div>
        </Providers>
      </body>
    </html>
  );
}
