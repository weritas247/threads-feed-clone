import { fetchAccountFeed, normalizeUsername } from '@/lib/threads';
import { Feed } from '@/components/Feed';
import { AccountIcon } from '@/components/AccountIcon';

export const revalidate = 300;

export default async function AccountPage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const handle = normalizeUsername(decodeURIComponent(username));
  const result = await fetchAccountFeed(handle);

  if (!result.ok) {
    const msg =
      result.reason === 'not_found' ? 'Account not found.'
      : result.reason === 'private' ? 'This account is private.'
      : 'Could not load this account right now.';
    return <p className="px-4 py-16 text-center text-secondary">{msg}</p>;
  }

  const avatarUrl = result.posts[0]?.author.avatarUrl;
  return (
    <>
      <h2 className="flex items-center gap-2 px-4 pt-4 text-xl font-bold text-fg">
        <AccountIcon src={avatarUrl} username={handle} size={32} />@{handle}
      </h2>
      <Feed posts={result.posts} />
    </>
  );
}
