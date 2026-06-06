import Link from 'next/link';

// First-run onboarding shown when the archive is empty. Lays out the core loop so a new
// user knows the path: add accounts → crawl → datafy → connect → use.
const STEPS: Array<{ n: number; title: string; body: React.ReactNode; href: string; cta: string }> = [
  {
    n: 1,
    title: '계정 추가 및 크롤',
    body: <>Threads/X 계정을 추가하고 크롤을 실행해 공개 포스트를 아카이브에 담으세요.</>,
    href: '/manage',
    cta: '관리 열기',
  },
  {
    n: 2,
    title: '아카이브 데이터화',
    body: <>“아카이브 보강”을 실행해 토픽, 엔티티, 임베딩을 추출하세요 — 아래의 모든 기능을 뒷받침합니다.</>,
    href: '/manage',
    cta: '보강',
  },
  {
    n: 3,
    title: '연결 및 탐색',
    body: <>토픽 그래프, 엔티티 허브, 포스트별 “관련”을 둘러보며 지식이 어떻게 연결되는지 확인하세요.</>,
    href: '/graph',
    cta: '그래프 보기',
  },
  {
    n: 4,
    title: '활용하기',
    body: <>아카이브에 질문하고 출처가 달린 답변을 받거나, 컬렉션을 만들어 메모로 정리하세요.</>,
    href: '/ask',
    cta: '아카이브에 질문',
  },
];

export function GettingStarted() {
  return (
    <div className="px-4 py-6">
      <h2 className="text-lg font-bold text-fg">환영합니다 — 지식 베이스를 만들어 봅시다</h2>
      <p className="mt-1 text-sm text-secondary">
        관심 있는 Threads/X 포스트를 검색 가능하고 서로 연결된 제2의 뇌로 바꿔 줍니다. 네 단계:
      </p>
      <ol className="mt-4 space-y-3">
        {STEPS.map((s) => (
          <li key={s.n} className="flex gap-3 rounded-xl border border-border bg-elevated/40 px-4 py-3">
            <span className="flex h-7 w-7 flex-none items-center justify-center rounded-full bg-fg text-sm font-bold text-bg">
              {s.n}
            </span>
            <div className="min-w-0 flex-1">
              <h3 className="text-sm font-semibold text-fg">{s.title}</h3>
              <p className="mt-0.5 text-sm text-secondary">{s.body}</p>
            </div>
            <Link
              href={s.href}
              className="flex-none self-center rounded-full border border-border px-3 py-1.5 text-xs text-fg hover:bg-elevated"
            >
              {s.cta}
            </Link>
          </li>
        ))}
      </ol>
      <p className="mt-4 text-xs text-secondary">
        API 키가 없으신가요? 로컬 폴백으로도 모두 동작합니다 —{' '}
        <code className="rounded bg-elevated px-1">GEMINI_API_KEY</code>를 추가하면 더 풍부한 AI 추출과 답변을 얻을 수 있습니다.
      </p>
    </div>
  );
}
