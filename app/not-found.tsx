import Link from 'next/link';

// Styled 404 to match the app instead of the bare Next.js default.
export default function NotFound() {
  return (
    <div className="px-4 py-20 text-center">
      <p className="text-lg font-semibold text-fg">페이지를 찾을 수 없습니다.</p>
      <p className="mt-2 text-sm text-secondary">존재하지 않는 페이지입니다.</p>
      <Link
        href="/"
        className="mt-5 inline-block rounded-full border border-border px-5 py-2 text-sm font-semibold text-fg hover:bg-elevated"
      >
        피드로 돌아가기
      </Link>
    </div>
  );
}
