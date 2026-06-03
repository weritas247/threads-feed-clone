import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ThreadChain } from './ThreadChain';
import type { Post } from '@/lib/types';

const child: Post = {
  id: '2', code: 'def', platform: 'threads', permalink: 'https://www.threads.com/@zuck/post/def',
  author: { username: 'zuck', displayName: 'Mark', avatarUrl: 'https://x/a.jpg', verified: false },
  text: 'second in thread', createdAt: Math.floor(Date.now() / 1000),
  media: [], stats: { likes: 0, replies: 0, reposts: 0, shares: 0 }, chain: [],
};

describe('ThreadChain', () => {
  it('renders nothing when empty', () => {
    const { container } = render(<ThreadChain posts={[]} />);
    expect(container.firstChild).toBeNull();
  });
  it('renders chained post text', () => {
    render(<ThreadChain posts={[child]} />);
    expect(screen.getByText('second in thread')).toBeInTheDocument();
  });
});
