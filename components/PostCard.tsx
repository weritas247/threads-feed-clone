import Link from 'next/link';
import type { Post } from '@/lib/types';
import { relativeTime } from '@/lib/format';
import { Avatar } from './Avatar';
import { VerifiedBadge } from './VerifiedBadge';
import { MoreIcon } from './icons';
import { MediaView } from './Media';
import { ActionBar } from './ActionBar';
import { ThreadChain } from './ThreadChain';
import { PostTags } from './PostTags';
import { PostNote } from './PostNote';
import { Highlight } from './Highlight';

export function PostCard({
  post,
  highlight,
  saved,
  tags,
  note,
}: {
  post: Post;
  highlight?: string[];
  saved?: boolean;
  tags?: string[];
  note?: string;
}) {
  return (
    <article className="flex gap-3 border-b border-border px-4 py-3">
      <div className="flex flex-col items-center">
        <Link href={`/@${post.author.username}`} aria-hidden tabIndex={-1}>
          <Avatar src={post.author.avatarUrl} username={post.author.username} size={36} />
        </Link>
        {post.chain.length > 0 && <div className="mt-2 w-[2px] flex-1 bg-border" />}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1 text-[15px]">
          <Link href={`/@${post.author.username}`} className="font-semibold text-fg hover:underline">
            {post.author.username}
          </Link>
          {post.author.verified && <VerifiedBadge />}
          <span className="text-secondary">
            ·{' '}
            {post.code ? (
              <a
                href={post.permalink}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:underline"
                title="View original"
              >
                <time>{relativeTime(post.createdAt)}</time>
              </a>
            ) : (
              <time>{relativeTime(post.createdAt)}</time>
            )}
          </span>
          <span className="ml-2 rounded bg-elevated px-1.5 py-0.5 text-[11px] font-normal text-secondary">
            {post.platform === 'x' ? 'X' : 'Threads'}
          </span>
          {post.code && (
            <a
              href={post.permalink}
              target="_blank"
              rel="noopener noreferrer"
              className="ml-auto text-secondary hover:text-fg"
              aria-label="Open original"
              title="Open original"
            >
              <MoreIcon />
            </a>
          )}
        </div>
        {post.text && (
          <p className="mt-1 whitespace-pre-wrap break-words text-[15px] leading-[1.4] text-fg">
            <Highlight text={post.text} terms={highlight} />
          </p>
        )}
        <MediaView media={post.media} />
        <ActionBar stats={post.stats} post={post} saved={saved} />
        <PostTags post={post} initialTags={tags} />
        <PostNote post={post} initialNote={note} />
        <ThreadChain posts={post.chain} highlight={highlight} />
      </div>
    </article>
  );
}
