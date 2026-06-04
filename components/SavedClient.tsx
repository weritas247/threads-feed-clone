'use client';

import { useState } from 'react';

// One-click bookmarklet: run it on your Threads "Saved" page while logged in. It
// reads the page's embedded data, intercepts the feed API responses as it
// auto-scrolls your whole saved list, then downloads threads-saved.json — which
// you import below. No credentials ever leave your browser.
const BOOKMARKLET =
  "javascript:(function(){if(window.__tsg){window.__tsg();return;}var b=[];function g(t){if(t&&t.indexOf('thread_items')!==-1){try{b.push(JSON.parse(t));}catch(e){}}}document.querySelectorAll('script[type=\"application/json\"]').forEach(function(s){g(s.textContent);});var of=window.fetch;window.fetch=function(){return of.apply(this,arguments).then(function(r){try{r.clone().text().then(g);}catch(e){}return r;});};function dl(){clearInterval(t);var p={source:'threads-saved',exportedAt:Date.now(),blocks:b};var u=URL.createObjectURL(new Blob([JSON.stringify(p)],{type:'application/json'}));var a=document.createElement('a');a.href=u;a.download='threads-saved.json';a.click();alert('Captured '+b.length+' data block(s). Import threads-saved.json on the Saved page.');window.__tsg=null;}var lh=0,still=0,t=setInterval(function(){scrollTo(0,document.body.scrollHeight);if(document.body.scrollHeight===lh){still++;}else{still=0;lh=document.body.scrollHeight;}if(still>=5){dl();}},1200);window.__tsg=dl;alert('Saved grabber running. It auto-scrolls your Saved list and downloads a JSON file when done. Re-run the bookmarklet to finish now.');})();";

type Result = { found: number; added: number; total: number } | { error: string };

export function SavedClient({ count }: { count: number }) {
  const [open, setOpen] = useState(count === 0);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  function copyBookmarklet() {
    navigator.clipboard.writeText(BOOKMARKLET).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  async function readFile(file: File) {
    setText(await file.text());
  }

  async function importJson() {
    const raw = text.trim();
    if (!raw) return;
    let body: unknown;
    try {
      body = JSON.parse(raw);
    } catch {
      setMsg('That is not valid JSON. Paste the contents of threads-saved.json.');
      return;
    }
    setBusy(true);
    setMsg(null);
    const res = await fetch('/api/bookmarks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = (await res.json().catch(() => null)) as Result | null;
    setBusy(false);
    if (!res.ok || !data || 'error' in data) {
      setMsg(data && 'error' in data ? data.error : 'Import failed.');
      return;
    }
    setText('');
    setMsg(`Imported ${data.found} posts (${data.added} new). Reloading…`);
    setTimeout(() => location.reload(), 600);
  }

  async function clearAll() {
    if (!confirm('Remove all imported bookmarks?')) return;
    setBusy(true);
    await fetch('/api/bookmarks', { method: 'DELETE' });
    location.reload();
  }

  return (
    <div className="border-b border-border px-4 py-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-secondary">
          {count} saved {count === 1 ? 'post' : 'posts'}
        </p>
        <div className="flex items-center gap-2">
          {count > 0 && (
            <button
              type="button"
              onClick={clearAll}
              disabled={busy}
              className="rounded-md border border-border px-2 py-1 text-xs text-red-500 disabled:opacity-50"
            >
              Clear
            </button>
          )}
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            className="rounded-md border border-border px-2 py-1 text-xs text-fg"
          >
            {open ? 'Hide import' : 'Import from Threads'}
          </button>
        </div>
      </div>

      {open && (
        <div className="mt-3 space-y-3 text-sm">
          <div className="rounded-lg border border-border bg-elevated px-3 py-2 text-xs text-secondary">
            <span className="font-semibold text-fg">Easiest: the Chrome extension.</span> Load the{' '}
            <code className="rounded bg-bg px-1">extension/</code> folder via{' '}
            <code className="rounded bg-bg px-1">chrome://extensions</code> → Load unpacked, then
            capture &amp; import from your Threads Saved page in one click — no file needed. The
            bookmarklet below is a no-install alternative.
          </div>
          <ol className="list-decimal space-y-1 pl-5 text-secondary">
            <li>
              Create a new browser bookmark and paste this as its URL:
              <div className="mt-1 flex gap-2">
                <input
                  readOnly
                  value={BOOKMARKLET}
                  onFocus={(e) => e.currentTarget.select()}
                  className="min-w-0 flex-1 rounded-lg border border-border bg-elevated px-2 py-1 text-xs text-fg outline-none"
                />
                <button
                  type="button"
                  onClick={copyBookmarklet}
                  className="shrink-0 rounded-lg border border-border px-3 py-1 text-xs font-semibold text-fg"
                >
                  {copied ? 'Copied' : 'Copy'}
                </button>
              </div>
            </li>
            <li>
              Open your Threads{' '}
              <a
                href="https://www.threads.com/saved"
                target="_blank"
                rel="noreferrer"
                className="underline"
              >
                Saved page
              </a>{' '}
              (logged in) and click the bookmark. It auto-scrolls and downloads{' '}
              <code className="rounded bg-elevated px-1">threads-saved.json</code>.
            </li>
            <li>Upload or paste that file below, then Import.</li>
          </ol>

          <div className="flex flex-wrap items-center gap-2">
            <input
              type="file"
              accept="application/json,.json"
              onChange={(e) => e.target.files?.[0] && readFile(e.target.files[0])}
              className="text-xs text-secondary file:mr-2 file:rounded-lg file:border file:border-border file:bg-elevated file:px-3 file:py-1 file:text-fg"
            />
          </div>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="…or paste the contents of threads-saved.json here"
            rows={3}
            className="w-full rounded-lg border border-border bg-elevated px-3 py-2 text-xs text-fg outline-none placeholder:text-secondary"
          />
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={importJson}
              disabled={busy || !text.trim()}
              className="rounded-full bg-fg px-4 py-1.5 text-sm font-semibold text-bg disabled:opacity-50"
            >
              {busy ? 'Importing…' : 'Import'}
            </button>
            {msg && <span className="text-xs text-secondary">{msg}</span>}
          </div>
        </div>
      )}
    </div>
  );
}
