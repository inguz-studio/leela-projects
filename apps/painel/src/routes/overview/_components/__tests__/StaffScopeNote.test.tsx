import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StaffScopeNote } from '../StaffScopeNote';

describe('StaffScopeNote (FIX-E02 #16)', () => {
  it('explica que o resumo é do escopo individual do staff', () => {
    render(<StaffScopeNote />);
    expect(screen.getByRole('note')).toHaveTextContent(
      'apenas os eventos que você organiza'
    );
  });
});
