import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PostCard } from './PostCard';
import type { Post } from '@/lib/types';

const post: Post = {
  id: '1', code: 'abc',
  author: { username: 'zuck', displayName: 'Mark', avatarUrl: 'https://x/a.jpg', verified: true },
  text: 'hello threads', createdAt: Math.floor(Date.now() / 1000) - 3600,
  media: [], stats: { likes: 5, replies: 1, reposts: 0, shares: 0 }, chain: [],
};

describe('PostCard', () => {
  it('renders username, body, time and a link to the profile', () => {
    render(<PostCard post={post} />);
    expect(screen.getByText('zuck')).toBeInTheDocument();
    expect(screen.getByText('hello threads')).toBeInTheDocument();
    expect(screen.getByText('1h')).toBeInTheDocument();
    const link = screen.getByRole('link', { name: /zuck/ });
    expect(link).toHaveAttribute('href', '/@zuck');
  });
});
