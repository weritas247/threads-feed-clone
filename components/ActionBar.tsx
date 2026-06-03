import type { Stats } from '@/lib/types';
import { formatCount } from '@/lib/format';
import { HeartIcon, ReplyIcon, RepostIcon, ShareIcon } from './icons';

function Action({ icon, count }: { icon: React.ReactNode; count: number }) {
  const label = formatCount(count);
  return (
    <button className="flex items-center gap-1 rounded-full p-2 -m-2 text-fg hover:bg-elevated" type="button">
      {icon}
      {label && <span className="text-[13px] text-fg">{label}</span>}
    </button>
  );
}

export function ActionBar({ stats }: { stats: Stats }) {
  return (
    <div className="mt-2 flex items-center gap-5 text-fg">
      <Action icon={<HeartIcon />} count={stats.likes} />
      <Action icon={<ReplyIcon />} count={stats.replies} />
      <Action icon={<RepostIcon />} count={stats.reposts} />
      <Action icon={<ShareIcon />} count={stats.shares} />
    </div>
  );
}
