import Link from 'next/link';
import type { Post } from '@/lib/types';
import { relativeTime } from '@/lib/format';
import { Avatar } from './Avatar';
import { VerifiedBadge } from './VerifiedBadge';
import { MoreIcon } from './icons';
import { MediaView } from './Media';
import { ActionBar } from './ActionBar';
import { ThreadChain } from './ThreadChain';

export function PostCard({ post }: { post: Post }) {
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
          <span className="text-secondary">· <time>{relativeTime(post.createdAt)}</time></span>
          <button type="button" className="ml-auto text-secondary"><MoreIcon /></button>
        </div>
        {post.text && <p className="mt-1 whitespace-pre-wrap break-words text-[15px] leading-[1.4] text-fg">{post.text}</p>}
        <MediaView media={post.media} />
        <ActionBar stats={post.stats} />
        <ThreadChain posts={post.chain} />
      </div>
    </article>
  );
}
