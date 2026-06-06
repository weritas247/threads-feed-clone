import type { Metadata } from 'next';
import './globals.css';
import { Providers } from '@/components/Providers';
import { Sidebar } from '@/components/Sidebar';

export const metadata: Metadata = {
  title: 'Threads — 지식 베이스',
  description: 'Threads/X 피드를 지식으로 — 저장·정리·연결·검색·활용',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <body>
        <Providers>
          <div className="mx-auto flex min-h-screen max-w-[840px] bg-bg">
            <Sidebar />
            <div className="min-w-0 flex-1 border-r border-border">
              <main>{children}</main>
            </div>
          </div>
        </Providers>
      </body>
    </html>
  );
}
