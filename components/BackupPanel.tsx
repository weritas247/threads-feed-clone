'use client';

import { useRef, useState } from 'react';

// Backup / restore the whole knowledge base. Download is a plain link to /api/backup;
// restore uploads a previously-downloaded bundle. The archive is the product, so this is
// its safety net + portability path.
export function BackupPanel() {
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function restore(file: File) {
    setBusy(true);
    setMsg(null);
    try {
      const text = await file.text();
      const json = JSON.parse(text);
      const r = await fetch('/api/backup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(json),
      });
      const data = (await r.json()) as { restored?: number; error?: string };
      if (!r.ok || data.error) setMsg(data.error ?? '복원에 실패했습니다.');
      else setMsg(`파일 ${data.restored}개를 복원했습니다. 데이터를 보려면 새로고침하세요.`);
    } catch {
      setMsg('올바른 백업 파일이 아닙니다.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-4 mb-2 mt-4 rounded-xl border border-border bg-elevated/40 px-4 py-3">
      <h3 className="text-sm font-semibold text-fg">백업 및 복원</h3>
      <p className="mt-0.5 text-xs text-secondary">
        게시물, 보강, 임베딩, 태그, 노트, 컬렉션, 분류까지 전체 아카이브를 하나의 파일로.
      </p>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <a
          href="/api/backup"
          className="rounded-full bg-fg px-4 py-1.5 text-sm font-semibold text-bg"
        >
          ⬇ 백업 다운로드
        </a>
        <button
          type="button"
          disabled={busy}
          onClick={() => fileRef.current?.click()}
          className="rounded-full border border-border px-4 py-1.5 text-sm text-fg hover:bg-elevated disabled:opacity-50"
        >
          {busy ? '복원 중…' : '⬆ 파일에서 복원'}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) restore(f);
            e.target.value = '';
          }}
        />
        {msg && <span className="text-xs text-secondary">{msg}</span>}
      </div>
    </div>
  );
}
