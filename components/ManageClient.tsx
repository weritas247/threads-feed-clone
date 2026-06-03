'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { AccountEntry, CrawlStatus } from '@/lib/accountStore';
import { relativeTime } from '@/lib/format';

const STATUS_LABEL: Record<CrawlStatus, string> = {
  ok: 'OK',
  private: 'Private',
  not_found: 'Not found',
  blocked: 'Blocked',
  parse_error: 'Parse error',
};

function StatusBadge({ status }: { status?: CrawlStatus }) {
  if (!status) return <span className="text-secondary">—</span>;
  const ok = status === 'ok';
  return (
    <span
      className={
        'rounded-full px-2 py-0.5 text-[12px] ' +
        (ok ? 'bg-green-500/15 text-green-500' : 'bg-red-500/15 text-red-500')
      }
    >
      {STATUS_LABEL[status]}
    </span>
  );
}

export function ManageClient({ initial }: { initial: AccountEntry[] }) {
  const [accounts, setAccounts] = useState<AccountEntry[]>(initial);
  const [newName, setNewName] = useState('');
  const [busy, setBusy] = useState<string | null>(null); // username being crawled, or '*all*'
  const [adding, setAdding] = useState(false);

  async function api(path: string, method: string, body?: unknown): Promise<AccountEntry[] | null> {
    const res = await fetch(path, {
      method,
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) return null;
    return (await res.json()) as AccountEntry[];
  }

  async function add() {
    const name = newName.trim();
    if (!name) return;
    setAdding(true);
    const list = await api('/api/accounts', 'POST', { username: name });
    if (list) {
      setAccounts(list);
      setNewName('');
    }
    setAdding(false);
  }

  async function toggle(username: string, enabled: boolean) {
    const list = await api('/api/accounts', 'PATCH', { username, enabled });
    if (list) setAccounts(list);
  }

  async function remove(username: string) {
    const list = await api('/api/accounts', 'DELETE', { username });
    if (list) setAccounts(list);
  }

  async function crawl(username?: string) {
    setBusy(username ?? '*all*');
    const list = await api('/api/crawl', 'POST', username ? { username } : {});
    if (list) setAccounts(list);
    setBusy(null);
  }

  const enabledCount = accounts.filter((a) => a.enabled).length;

  return (
    <div className="px-4 py-4">
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-secondary">
          {accounts.length} accounts · {enabledCount} enabled
        </p>
        <button
          type="button"
          onClick={() => crawl()}
          disabled={busy !== null}
          className="rounded-full bg-fg px-4 py-1.5 text-sm font-semibold text-bg disabled:opacity-50"
        >
          {busy === '*all*' ? 'Crawling…' : 'Crawl all enabled'}
        </button>
      </div>

      <div className="mb-4 flex gap-2">
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && add()}
          placeholder="Add account (e.g. @zuck)"
          className="flex-1 rounded-lg border border-border bg-elevated px-3 py-1.5 text-sm text-fg outline-none placeholder:text-secondary"
        />
        <button
          type="button"
          onClick={add}
          disabled={adding || !newName.trim()}
          className="rounded-lg border border-border px-4 py-1.5 text-sm font-semibold text-fg disabled:opacity-50"
        >
          Add
        </button>
      </div>

      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left text-secondary">
            <th className="py-2 font-normal">On</th>
            <th className="py-2 font-normal">Account</th>
            <th className="py-2 font-normal">Status</th>
            <th className="py-2 text-right font-normal">Posts</th>
            <th className="py-2 text-right font-normal">Last crawl</th>
            <th className="py-2" />
          </tr>
        </thead>
        <tbody>
          {accounts.map((a) => (
            <tr key={a.username} className="border-b border-border">
              <td className="py-2">
                <input
                  type="checkbox"
                  checked={a.enabled}
                  onChange={(e) => toggle(a.username, e.target.checked)}
                  aria-label={`Enable ${a.username}`}
                />
              </td>
              <td className="py-2">
                <Link href={`/@${a.username}`} className="text-fg hover:underline">
                  {a.username}
                </Link>
              </td>
              <td className="py-2">
                <StatusBadge status={a.lastStatus} />
              </td>
              <td className="py-2 text-right text-fg">{a.lastCount ?? '—'}</td>
              <td className="py-2 text-right text-secondary">
                {a.lastCrawledAt ? relativeTime(Math.floor(a.lastCrawledAt / 1000)) + ' ago' : '—'}
              </td>
              <td className="py-2">
                <div className="flex items-center justify-end gap-2">
                  <Link
                    href={`/manage/${a.username}`}
                    className="rounded-md border border-border px-2 py-1 text-xs text-fg"
                  >
                    Saved
                  </Link>
                  <button
                    type="button"
                    onClick={() => crawl(a.username)}
                    disabled={busy !== null}
                    className="rounded-md border border-border px-2 py-1 text-xs text-fg disabled:opacity-50"
                  >
                    {busy === a.username ? '…' : 'Crawl'}
                  </button>
                  <button
                    type="button"
                    onClick={() => remove(a.username)}
                    className="rounded-md border border-border px-2 py-1 text-xs text-red-500"
                  >
                    Remove
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
