import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BalcaoBanner } from '../BalcaoBanner';
import { mkEvento, ts } from '../../_test/fixtures';

describe('BalcaoBanner', () => {
  it('janela aberta (ao_vivo) → banner de entrega ativa', () => {
    render(<BalcaoBanner evento={mkEvento({ status: 'ao_vivo' })} />);
    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.getByText('Entrega de kit ativa')).toBeInTheDocument();
    expect(screen.getByText('Ativa')).toBeInTheDocument();
  });

  it('janela fechada (prova distante) → aviso de fechada', () => {
    // prova em 2027, evento publicado → fora da janela hoje
    const longe = ts(new Date('2027-12-01T09:00:00Z'));
    render(<BalcaoBanner evento={mkEvento({ data: longe })} />);
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText('A janela de entrega ainda não abriu')).toBeInTheDocument();
  });
});
