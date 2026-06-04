import { getAccounts } from '@/lib/accountStore';
import { ManageClient } from '@/components/ManageClient';
import { SessionStatus } from '@/components/SessionStatus';

export const dynamic = 'force-dynamic';

export default function ManagePage() {
  const accounts = getAccounts();
  return (
    <>
      <h2 className="px-4 pt-4 text-xl font-bold text-fg">Crawl management</h2>
      <div className="px-4 pt-4">
        <SessionStatus />
      </div>
      <ManageClient initial={accounts} />
    </>
  );
}
