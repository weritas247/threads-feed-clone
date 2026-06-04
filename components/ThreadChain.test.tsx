import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
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
  it('is collapsed by default and reveals the thread on click', () => {
    render(<ThreadChain posts={[child]} />);
    // collapsed: lead-post-first, chain hidden behind a toggle
    expect(screen.queryByText('second in thread')).not.toBeInTheDocument();
    const toggle = screen.getByRole('button', { name: /show this thread/i });
    fireEvent.click(toggle);
    expect(screen.getByText('second in thread')).toBeInTheDocument();
  });
});
