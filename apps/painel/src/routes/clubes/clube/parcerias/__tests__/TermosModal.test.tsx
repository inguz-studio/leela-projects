import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { TermosModal } from '../TermosModal';
import { mkEventoAfiliado } from '../../../_test/fixtures';

const BASE = 'https://leela-landing.web.app';

beforeEach(() => vi.stubEnv('VITE_LEELA_URL', BASE));
afterEach(() => vi.unstubAllEnvs());

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

  // S1215-T1 · RN-429 — a assessoria (E18) vê o link DERIVADO, com o cupom do
  // clube dentro. O `linkMaster` do documento aponta para `be-hero.com.br` e
  // não pode reaparecer nesta tela por fallback nenhum.
  it('exibe o link master DERIVADO, com o cupom, e nunca o legado do documento', () => {
    const p = mkEventoAfiliado({
      eventoId: 'meia-floripa-2026',
      refCodigo: 'CLUBECPS',
      cupom: 'CLUBE10',
    });
    render(<TermosModal open onOpenChange={() => {}} parceria={p} />);
    const dialog = screen.getByRole('dialog');
    expect(
      within(dialog).getByText(`${BASE}/meia-floripa-2026?ref=CLUBECPS&cupom=CLUBE10`),
    ).toBeInTheDocument();
    expect(dialog.textContent ?? '').not.toContain('be-hero');
  });

  it('parceria sem refCodigo diz que não há link — não cai no legado', () => {
    const p = mkEventoAfiliado({ refCodigo: undefined as never });
    render(<TermosModal open onOpenChange={() => {}} parceria={p} />);
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText(/Link indispon/)).toBeInTheDocument();
    expect(dialog.textContent ?? '').not.toContain('be-hero');
  });
});
