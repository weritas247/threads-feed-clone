import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MediaView } from './Media';
import type { Media } from '@/lib/types';

describe('MediaView', () => {
  it('renders nothing for empty media', () => {
    const { container } = render(<MediaView media={[]} />);
    expect(container.firstChild).toBeNull();
  });
  it('renders an image', () => {
    const media: Media[] = [{ type: 'image', url: 'https://x/a.jpg', width: 100, height: 100, alt: 'pic' }];
    render(<MediaView media={media} />);
    expect(screen.getByAltText('pic')).toBeInTheDocument();
  });
  it('renders a video element', () => {
    const media: Media[] = [{ type: 'video', url: 'https://x/v.mp4', width: 100, height: 100 }];
    const { container } = render(<MediaView media={media} />);
    expect(container.querySelector('video')).toBeInTheDocument();
  });
});
