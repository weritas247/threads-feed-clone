import { getAccounts } from '@/lib/accountStore';
import { ManageClient } from '@/components/ManageClient';

export const dynamic = 'force-dynamic';

export default function ManagePage() {
  const accounts = getAccounts();
  return (
    <>
      <h2 className="px-4 pt-4 text-xl font-bold text-fg">Crawl management</h2>
      <ManageClient initial={accounts} />
    </>
  );
}
