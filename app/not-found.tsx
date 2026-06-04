import Link from 'next/link';

// Styled 404 to match the app instead of the bare Next.js default.
export default function NotFound() {
  return (
    <div className="px-4 py-20 text-center">
      <p className="text-lg font-semibold text-fg">Page not found.</p>
      <p className="mt-2 text-sm text-secondary">That page doesn’t exist.</p>
      <Link
        href="/"
        className="mt-5 inline-block rounded-full border border-border px-5 py-2 text-sm font-semibold text-fg hover:bg-elevated"
      >
        Back to feed
      </Link>
    </div>
  );
}
