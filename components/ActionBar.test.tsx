import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ActionBar } from './ActionBar';

describe('ActionBar', () => {
  it('shows formatted like and reply counts, hides zeros', () => {
    render(<ActionBar stats={{ likes: 1200, replies: 4, reposts: 0, shares: 0 }} />);
    expect(screen.getByText('1.2K')).toBeInTheDocument();
    expect(screen.getByText('4')).toBeInTheDocument();
    expect(screen.queryByText('0')).not.toBeInTheDocument();
  });
});
