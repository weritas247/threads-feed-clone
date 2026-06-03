import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Feed } from './Feed';
import type { Post } from '@/lib/types';

const mk = (id: string, text: string): Post => ({
  id, code: id, platform: 'threads', permalink: `https://www.threads.com/@u/post/${id}`,
  author: { username: 'u' + id, displayName: 'U', avatarUrl: 'https://x/a.jpg', verified: false },
  text, createdAt: 1, media: [], stats: { likes: 0, replies: 0, reposts: 0, shares: 0 }, chain: [],
});

describe('Feed', () => {
  it('renders all posts', () => {
    render(<Feed posts={[mk('1', 'one'), mk('2', 'two')]} />);
    expect(screen.getByText('one')).toBeInTheDocument();
    expect(screen.getByText('two')).toBeInTheDocument();
  });
  it('renders an empty state when there are no posts', () => {
    render(<Feed posts={[]} />);
    expect(screen.getByText(/No posts/i)).toBeInTheDocument();
  });
});
