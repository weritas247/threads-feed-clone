import type { Post } from '@/lib/types';
import { Avatar } from './Avatar';
import { MediaView } from './Media';
import { ActionBar } from './ActionBar';
import { Highlight } from './Highlight';

export function ThreadChain({ posts, highlight }: { posts: Post[]; highlight?: string[] }) {
  if (posts.length === 0) return null;
  return (
    <div className="mt-1">
      {posts.map((p) => (
        <div key={p.id} className="flex gap-3 pt-3">
          <Avatar src={p.author.avatarUrl} username={p.author.username} size={28} />
          <div className="min-w-0 flex-1">
            <span className="text-[15px] font-semibold text-fg">{p.author.username}</span>
            {p.text && (
              <p className="mt-1 whitespace-pre-wrap break-words text-[15px] leading-[1.4] text-fg">
                <Highlight text={p.text} terms={highlight} />
              </p>
            )}
            <MediaView media={p.media} />
            <ActionBar stats={p.stats} />
          </div>
        </div>
      ))}
    </div>
  );
}
