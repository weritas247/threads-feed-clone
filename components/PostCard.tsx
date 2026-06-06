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
import { PostTopics } from './PostTopics';
import { PostNote } from './PostNote';
import { TriageControls } from './TriageControls';
import { RelatedPosts } from './RelatedPosts';
import { AddToCollection } from './AddToCollection';
import { Highlight } from './Highlight';
import type { CaptureState } from '@/lib/captureStateStore';

export function PostCard({
  post,
  highlight,
  saved,
  tags,
  note,
  state,
  topics,
  preserved,
}: {
  post: Post;
  highlight?: string[];
  saved?: boolean;
  tags?: string[];
  note?: string;
  state?: CaptureState;
  topics?: string[];
  preserved?: boolean;
}) {
  return (
    <article className="group/card flex gap-3 border-b border-border px-4 py-3">
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
          {preserved && (
            <span
              title="원본에서 사라진 포스트 — 아카이브에 보존됨"
              className="rounded bg-amber-500/15 px-1.5 py-0.5 text-[11px] font-normal text-amber-600 dark:text-amber-400"
            >
              📦 보존됨
            </span>
          )}
          {post.code && (
            <a
              href={post.permalink}
              target="_blank"
              rel="noopener noreferrer"
              className="ml-auto text-secondary hover:text-fg"
              aria-label="원본 열기"
              title="원본 열기"
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
        {/* 보조 도구: 데스크톱에서는 카드에 마우스를 올리거나 포커스될 때만 표시해 피드를
            깔끔하게 유지한다. 모바일(hover 불가)에서는 항상 표시. */}
        <div className="transition-opacity duration-150 sm:opacity-0 sm:group-hover/card:opacity-100 sm:focus-within:opacity-100">
          <PostTopics post={post} initialTopics={topics} />
          <PostTags post={post} initialTags={tags} />
          <PostNote post={post} initialNote={note} />
          <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1">
            <TriageControls post={post} initialState={state} />
            <RelatedPosts post={post} />
            <AddToCollection post={post} />
          </div>
        </div>
        <ThreadChain posts={post.chain} highlight={highlight} />
      </div>
    </article>
  );
}
