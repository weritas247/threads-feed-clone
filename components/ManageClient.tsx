'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { AccountEntry, CrawlStatus } from '@/lib/accountStore';
import type { Platform } from '@/lib/types';
import { relativeTime } from '@/lib/format';
import { AccountIcon } from './AccountIcon';

const STATUS_LABEL: Record<CrawlStatus, string> = {
  ok: 'OK',
  private: 'Private',
  not_found: 'Not found',
  blocked: 'Blocked',
  parse_error: 'Parse error',
};

const key = (a: { platform: Platform; username: string }) => `${a.platform}:${a.username}`;
const profileHref = (a: AccountEntry) =>
  a.platform === 'x' ? `/x/${a.username}` : `/@${a.username}`;

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

function PlatformBadge({ platform }: { platform: Platform }) {
  return (
    <span className="rounded bg-elevated px-1.5 py-0.5 text-[11px] text-secondary">
      {platform === 'x' ? 'X' : 'Threads'}
    </span>
  );
}

export function ManageClient({ initial }: { initial: AccountEntry[] }) {
  const [accounts, setAccounts] = useState<AccountEntry[]>(initial);
  const [newName, setNewName] = useState('');
  const [newPlatform, setNewPlatform] = useState<Platform>('threads');
  const [busy, setBusy] = useState<string | null>(null); // composite key being crawled, or '*all*'
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

  // Self-heal: on first load, backfill avatars for any account missing one.
  useEffect(() => {
    let cancelled = false;
    if (accounts.some((a) => !a.avatarUrl)) {
      api('/api/accounts/avatars', 'POST').then((list) => {
        if (!cancelled && list) setAccounts(list);
      });
    }
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function add() {
    const name = newName.trim();
    if (!name) return;
    setAdding(true);
    const list = await api('/api/accounts', 'POST', { username: name, platform: newPlatform });
    if (list) {
      setAccounts(list);
      setNewName('');
    }
    setAdding(false);
  }

  async function toggle(a: AccountEntry, enabled: boolean) {
    const list = await api('/api/accounts', 'PATCH', { username: a.username, platform: a.platform, enabled });
    if (list) setAccounts(list);
  }

  async function remove(a: AccountEntry) {
    const list = await api('/api/accounts', 'DELETE', { username: a.username, platform: a.platform });
    if (list) setAccounts(list);
  }

  async function crawl(a?: AccountEntry) {
    setBusy(a ? key(a) : '*all*');
    const list = await api('/api/crawl', 'POST', a ? { username: a.username, platform: a.platform } : {});
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
        <select
          value={newPlatform}
          onChange={(e) => setNewPlatform(e.target.value as Platform)}
          aria-label="Platform"
          className="rounded-lg border border-border bg-elevated px-2 py-1.5 text-sm text-fg outline-none"
        >
          <option value="threads">Threads</option>
          <option value="x">X</option>
        </select>
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
            <tr key={key(a)} className="border-b border-border">
              <td className="py-2">
                <input
                  type="checkbox"
                  checked={a.enabled}
                  onChange={(e) => toggle(a, e.target.checked)}
                  aria-label={`Enable ${a.username}`}
                />
              </td>
              <td className="py-2">
                <div className="flex items-center gap-2">
                  <Link href={profileHref(a)} className="flex items-center gap-2 text-fg hover:underline">
                    <AccountIcon src={a.avatarUrl} username={a.username} size={28} />
                    {a.username}
                  </Link>
                  <PlatformBadge platform={a.platform} />
                </div>
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
                    href={`/manage/${a.username}?platform=${a.platform}`}
                    className="rounded-md border border-border px-2 py-1 text-xs text-fg"
                  >
                    Saved
                  </Link>
                  <button
                    type="button"
                    onClick={() => crawl(a)}
                    disabled={busy !== null}
                    className="rounded-md border border-border px-2 py-1 text-xs text-fg disabled:opacity-50"
                  >
                    {busy === key(a) ? '…' : 'Crawl'}
                  </button>
                  <button
                    type="button"
                    onClick={() => remove(a)}
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
