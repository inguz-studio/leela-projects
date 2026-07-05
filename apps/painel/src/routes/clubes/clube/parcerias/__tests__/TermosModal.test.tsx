import { describe, it, expect } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { TermosModal } from '../TermosModal';
import { mkEventoAfiliado } from '../../../_test/fixtures';

describe('TermosModal', () => {
  it('mostra os termos espelhados como somente leitura (RN-122)', () => {
    const p = mkEventoAfiliado({
      comissaoPct: 15,
      cupom: 'CLUBE10',
      janelaAtribuicaoDias: 30,
      termosEspelho: { criterioLiberacao: 'Após 28 Abr 2026', prazoRepasseDiasUteis: 15, tetoMensal: null },
    });
    render(<TermosModal open onOpenChange={() => {}} parceria={p} />);
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText('Somente leitura')).toBeInTheDocument();
    expect(within(dialog).getByText('15%')).toBeInTheDocument();
    expect(within(dialog).getByText('CLUBE10')).toBeInTheDocument();
    expect(within(dialog).getByText('30 dias')).toBeInTheDocument();
    expect(within(dialog).getByText('Após 28 Abr 2026')).toBeInTheDocument();
    expect(within(dialog).getByText('Sem limite')).toBeInTheDocument();
    // read-only: nenhum campo editável
    expect(within(dialog).queryByRole('textbox')).not.toBeInTheDocument();
  });

  it('teto mensal formatado quando existe', () => {
    const p = mkEventoAfiliado({
      termosEspelho: { criterioLiberacao: 'Imediato', prazoRepasseDiasUteis: 10, tetoMensal: 5000 },
    });
    render(<TermosModal open onOpenChange={() => {}} parceria={p} />);
    expect(screen.getByText(/R\$\s?5\.000,00/)).toBeInTheDocument();
  });
});
