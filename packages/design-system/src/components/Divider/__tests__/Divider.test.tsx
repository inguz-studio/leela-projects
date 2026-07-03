import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Divider } from '../Divider';

describe('Divider', () => {
  it('renders a separator element', () => {
    render(<Divider />);
    expect(screen.getByRole('separator')).toBeInTheDocument();
  });

  it('has horizontal orientation by default', () => {
    render(<Divider />);
    expect(screen.getByRole('separator')).toHaveAttribute('aria-orientation', 'horizontal');
  });

  it('renders vertical orientation', () => {
    render(<Divider orientation="vertical" />);
    expect(screen.getByRole('separator')).toHaveAttribute('aria-orientation', 'vertical');
  });

  it.each(['subtle', 'default', 'strong'] as const)(
    'renders %s variant',
    (variant) => {
      render(<Divider variant={variant} />);
      expect(screen.getByRole('separator')).toBeInTheDocument();
    },
  );

  it('accepts custom className', () => {
    render(<Divider className="test-divider" />);
    expect(screen.getByRole('separator')).toHaveClass('test-divider');
  });
});
