import { fetchXAccountFeed, normalizeXHandle } from '@/lib/x';
import { Feed } from '@/components/Feed';
import { AccountIcon } from '@/components/AccountIcon';

export const revalidate = 300;

export default async function XAccountPage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const handle = normalizeXHandle(decodeURIComponent(username));
  const result = await fetchXAccountFeed(handle);

  if (!result.ok) {
    const msg =
      result.reason === 'not_found'
        ? 'Account not found.'
        : 'Could not load this account right now.';
    return <p className="px-4 py-16 text-center text-secondary">{msg}</p>;
  }

  const avatarUrl = result.posts[0]?.author.avatarUrl;
  return (
    <>
      <h2 className="flex items-center gap-2 px-4 pt-4 text-xl font-bold text-fg">
        <AccountIcon src={avatarUrl} username={handle} size={32} />@{handle}
        <span className="rounded bg-elevated px-1.5 py-0.5 text-xs font-normal text-secondary">X</span>
      </h2>
      <Feed posts={result.posts} />
    </>
  );
}
