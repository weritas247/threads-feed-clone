'use client';

// App-wide error boundary: a friendly fallback with retry instead of a blank crash.
export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="px-4 py-20 text-center">
      <p className="text-lg font-semibold text-fg">문제가 발생했습니다.</p>
      <p className="mx-auto mt-2 max-w-sm break-words text-sm text-secondary">
        {error.message || '예기치 않은 오류가 발생했습니다.'}
      </p>
      <button
        type="button"
        onClick={reset}
        className="mt-5 rounded-full bg-fg px-5 py-2 text-sm font-semibold text-bg"
      >
        다시 시도
      </button>
    </div>
  );
}
