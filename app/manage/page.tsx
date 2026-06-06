import { getAccounts } from '@/lib/accountStore';
import { ManageClient } from '@/components/ManageClient';
import { SessionStatus } from '@/components/SessionStatus';
import { EnrichPanel } from '@/components/EnrichPanel';
import { BackupPanel } from '@/components/BackupPanel';

export const dynamic = 'force-dynamic';

export default function ManagePage() {
  const accounts = getAccounts();
  return (
    <>
      <h2 className="px-4 pt-4 text-xl font-bold text-fg">크롤 관리</h2>
      <div className="px-4 pt-4">
        <SessionStatus />
      </div>
      <EnrichPanel />
      <BackupPanel />
      <ManageClient initial={accounts} />
    </>
  );
}
