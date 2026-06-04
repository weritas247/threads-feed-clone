'use client';

import { useEffect, useState } from 'react';

type Session = { platform: string; connected: boolean; count: number; savedAt?: number };
const LABEL: Record<string, string> = { instagram: 'Instagram', threads: 'Threads', x: 'X' };

// Shows which SNS sessions the SNS Cookie Parser extension has exported into the app.
// The organic link between the cookie extension and this project.
export function SessionStatus() {
  const [sessions, setSessions] = useState<Session[] | null>(null);

  function load() {
    fetch('/api/cookies')
      .then((r) => r.json())
      .then((d: { sessions?: Session[] }) => setSessions(d.sessions ?? []))
      .catch(() => setSessions([]));
  }
  useEffect(load, []);

  async function clear(platform: string) {
    await fetch('/api/cookies', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ platform }),
    });
    load();
  }

  if (!sessions) return null;
  const anyConnected = sessions.some((s) => s.connected);

  return (
    <div className="mb-4 rounded-xl border border-border px-3 py-2.5 text-sm">
      <div className="flex items-center justify-between">
        <span className="font-medium text-fg">Sessions</span>
        {!anyConnected && (
          <span className="text-xs text-secondary">
            Connect via the SNS Cookie Parser extension
          </span>
        )}
      </div>
      <div className="mt-2 flex flex-wrap gap-2">
        {sessions.map((s) => (
          <span
            key={s.platform}
            className={
              'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs ' +
              (s.connected ? 'bg-green-500/15 text-green-500' : 'bg-elevated text-secondary')
            }
          >
            <span className={'h-1.5 w-1.5 rounded-full ' + (s.connected ? 'bg-green-500' : 'bg-secondary/50')} />
            {LABEL[s.platform] ?? s.platform}
            {s.connected && (
              <>
                <span className="opacity-70">· {s.count}</span>
                <button
                  type="button"
                  onClick={() => clear(s.platform)}
                  aria-label={`Disconnect ${LABEL[s.platform] ?? s.platform}`}
                  className="ml-0.5 text-secondary hover:text-fg"
                >
                  ×
                </button>
              </>
            )}
          </span>
        ))}
      </div>
    </div>
  );
}
