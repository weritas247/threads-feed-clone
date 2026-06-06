'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { AccountEntry, CrawlStatus } from '@/lib/accountStore';
import type { Platform } from '@/lib/types';
import { relativeTime } from '@/lib/format';
import { parseAccountInput } from '@/lib/accountInput';
import { AccountIcon } from './AccountIcon';

const STATUS_LABEL: Record<CrawlStatus, string> = {
  ok: '정상',
  private: '비공개',
  not_found: '없음',
  blocked: '차단됨',
  parse_error: '파싱 오류',
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
  const [tagDrafts, setTagDrafts] = useState<Record<string, string>>({});
  const [platformFilter, setPlatformFilter] = useState<Platform | 'all'>('all');

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

  // Accept a bare @handle (uses the dropdown platform) or a pasted profile URL
  // (platform auto-detected from the host).
  function onNameChange(value: string) {
    setNewName(value);
    const parsed = parseAccountInput(value, newPlatform);
    if (parsed?.fromUrl) setNewPlatform(parsed.platform);
  }

  async function add() {
    const parsed = parseAccountInput(newName, newPlatform);
    if (!parsed) return;
    setAdding(true);
    const list = await api('/api/accounts', 'POST', {
      username: parsed.username,
      platform: parsed.platform,
    });
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

  async function toggleVip(a: AccountEntry) {
    const list = await api('/api/accounts', 'PATCH', { username: a.username, platform: a.platform, vip: !a.vip });
    if (list) setAccounts(list);
  }

  async function changeTag(a: AccountEntry, tag: string, op: 'add' | 'remove') {
    const list = await api('/api/accounts/tags', 'POST', { username: a.username, platform: a.platform, tag, op });
    if (list) setAccounts(list);
  }

  async function submitTag(a: AccountEntry) {
    const draft = (tagDrafts[key(a)] ?? '').trim();
    if (!draft) return;
    await changeTag(a, draft, 'add');
    setTagDrafts((d) => ({ ...d, [key(a)]: '' }));
  }

  const enabledCount = accounts.filter((a) => a.enabled).length;
  const vipCount = accounts.filter((a) => a.vip).length;
  const threadsCount = accounts.filter((a) => a.platform === 'threads').length;
  const xCount = accounts.filter((a) => a.platform === 'x').length;
  // VIP accounts pinned to the top (Slack-style), otherwise input order.
  const ordered = [...accounts].sort((a, b) => Number(b.vip) - Number(a.vip));
  const visible = ordered.filter((a) => platformFilter === 'all' || a.platform === platformFilter);

  const filters: { key: Platform | 'all'; label: string; count: number }[] = [
    { key: 'all', label: '전체', count: accounts.length },
    { key: 'threads', label: 'Threads', count: threadsCount },
    { key: 'x', label: 'X', count: xCount },
  ];

  return (
    <div className="px-4 py-4">
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-secondary">
          계정 {accounts.length}개 · 활성 {enabledCount}개 · VIP {vipCount}개
        </p>
        <button
          type="button"
          onClick={() => crawl()}
          disabled={busy !== null}
          className="rounded-full bg-fg px-4 py-1.5 text-sm font-semibold text-bg disabled:opacity-50"
        >
          {busy === '*all*' ? '크롤 중…' : '활성 계정 전체 크롤'}
        </button>
      </div>

      <div className="mb-4 flex gap-2">
        <select
          value={newPlatform}
          onChange={(e) => setNewPlatform(e.target.value as Platform)}
          aria-label="플랫폼"
          className="rounded-lg border border-border bg-elevated px-2 py-1.5 text-sm text-fg outline-none"
        >
          <option value="threads">Threads</option>
          <option value="x">X</option>
        </select>
        <input
          value={newName}
          onChange={(e) => onNameChange(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && add()}
          placeholder="@핸들 또는 프로필 URL 붙여넣기"
          className="flex-1 rounded-lg border border-border bg-elevated px-3 py-1.5 text-sm text-fg outline-none placeholder:text-secondary"
        />
        <button
          type="button"
          onClick={add}
          disabled={adding || !newName.trim()}
          className="rounded-lg border border-border px-4 py-1.5 text-sm font-semibold text-fg disabled:opacity-50"
        >
          추가
        </button>
      </div>

      <div className="mb-3 flex flex-wrap gap-2">
        {filters.map((f) => {
          const on = platformFilter === f.key;
          return (
            <button
              key={f.key}
              type="button"
              onClick={() => setPlatformFilter(f.key)}
              className={
                'rounded-full border px-3 py-1 text-xs ' +
                (on ? 'border-fg bg-fg text-bg' : 'border-border text-secondary hover:text-fg')
              }
            >
              {f.label} <span className="opacity-70">{f.count}</span>
            </button>
          );
        })}
      </div>

      <div className="-mx-4 overflow-x-auto px-4">
      <table className="w-full min-w-[640px] border-separate border-spacing-0 text-sm">
        <thead>
          <tr className="text-left text-[11px] uppercase tracking-wider text-secondary">
            <th className="border-b border-border px-2 py-2.5 font-medium" aria-label="VIP" />
            <th className="border-b border-border px-2 py-2.5 font-medium" aria-label="활성화" />
            <th className="border-b border-border px-3 py-2.5 font-medium">계정</th>
            <th className="border-b border-border px-3 py-2.5 font-medium">상태</th>
            <th className="border-b border-border px-3 py-2.5 text-right font-medium">게시물</th>
            <th className="whitespace-nowrap border-b border-border px-3 py-2.5 text-right font-medium">
              마지막 크롤
            </th>
            <th className="border-b border-border px-2 py-2.5" />
          </tr>
        </thead>
        <tbody>
          {visible.map((a) => (
            <tr key={key(a)} className={'group ' + (a.vip ? 'bg-yellow-400/5' : 'hover:bg-elevated/40')}>
              <td className="border-b border-border px-2 py-3 align-top">
                <button
                  type="button"
                  onClick={() => toggleVip(a)}
                  aria-label={a.vip ? `${a.username} VIP 해제` : `${a.username} VIP 지정`}
                  title={a.vip ? 'VIP' : 'VIP 지정'}
                  className={
                    'text-lg leading-none transition-colors ' +
                    (a.vip ? 'text-yellow-400' : 'text-secondary/50 hover:text-fg')
                  }
                >
                  {a.vip ? '★' : '☆'}
                </button>
              </td>
              <td className="border-b border-border px-2 py-3 align-top">
                <input
                  type="checkbox"
                  checked={a.enabled}
                  onChange={(e) => toggle(a, e.target.checked)}
                  aria-label={`${a.username} 활성화`}
                  className="mt-0.5 accent-fg"
                />
              </td>
              <td className="border-b border-border px-3 py-3 align-top">
                <div className="flex items-center gap-2">
                  <Link
                    href={profileHref(a)}
                    className="flex items-center gap-2 font-medium text-fg hover:underline"
                  >
                    <AccountIcon src={a.avatarUrl} username={a.username} size={32} />
                    {a.username}
                  </Link>
                  {/* Threads is the default — only badge the exception (X) to cut noise */}
                  {a.platform === 'x' && <PlatformBadge platform="x" />}
                </div>
                <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                  {a.tags.map((t) => (
                    <span
                      key={t}
                      className="inline-flex items-center gap-1 rounded-full bg-elevated px-2 py-0.5 text-[11px] text-secondary"
                    >
                      {t}
                      <button
                        type="button"
                        onClick={() => changeTag(a, t, 'remove')}
                        aria-label={`태그 ${t} 제거`}
                        className="text-secondary hover:text-fg"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                  <input
                    value={tagDrafts[key(a)] ?? ''}
                    onChange={(e) => setTagDrafts((d) => ({ ...d, [key(a)]: e.target.value }))}
                    onKeyDown={(e) => e.key === 'Enter' && submitTag(a)}
                    placeholder="+ 태그"
                    className="w-14 rounded-full border border-transparent bg-transparent px-2 py-0.5 text-[11px] text-fg outline-none transition-colors placeholder:text-secondary/60 hover:border-border focus:w-20 focus:border-border"
                  />
                </div>
              </td>
              <td className="border-b border-border px-3 py-3 align-top">
                <StatusBadge status={a.lastStatus} />
              </td>
              <td className="border-b border-border px-3 py-3 text-right align-top tabular-nums text-fg">
                {a.lastCount ?? '—'}
              </td>
              <td className="whitespace-nowrap border-b border-border px-3 py-3 text-right align-top text-secondary">
                {a.lastCrawledAt ? relativeTime(Math.floor(a.lastCrawledAt / 1000)) + ' 전' : '—'}
              </td>
              <td className="border-b border-border px-2 py-3 align-top">
                <div className="flex items-center justify-end gap-1.5 opacity-80 transition-opacity group-hover:opacity-100">
                  <Link
                    href={`/manage/${a.username}?platform=${a.platform}`}
                    className="rounded-md border border-border px-2 py-1 text-xs text-fg hover:bg-elevated"
                  >
                    저장됨
                  </Link>
                  <button
                    type="button"
                    onClick={() => crawl(a)}
                    disabled={busy !== null}
                    className="rounded-md border border-border px-2 py-1 text-xs text-fg hover:bg-elevated disabled:opacity-50"
                  >
                    {busy === key(a) ? '…' : '크롤'}
                  </button>
                  <button
                    type="button"
                    onClick={() => remove(a)}
                    aria-label={`${a.username} 삭제`}
                    title="삭제"
                    className="rounded-md border border-border px-2 py-1 text-xs text-red-500 hover:bg-red-500/10"
                  >
                    삭제
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
    </div>
  );
}
