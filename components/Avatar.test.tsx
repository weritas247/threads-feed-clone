import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Avatar } from './Avatar';

describe('Avatar', () => {
  it('renders an image with the username as alt', () => {
    render(<Avatar src="https://example.com/a.jpg" username="zuck" size={36} />);
    const img = screen.getByAltText('zuck');
    expect(img).toBeInTheDocument();
  });
});
