// =============================================================================
// Bloco de saldo e repasses da aba Financeiro (ADMIN-VISAO onda 2 · S1613-T5).
//
// Os dois casos que este arquivo existe para travar:
//   · RN-356 — repasse `pago` diz na tela que "pago" é REGISTRO MANUAL, sem
//     transferência bancária pelo sistema;
//   · `dentroJanelaDN` nunca aparece como "R$ 0,00" — a Function grava zero
//     ali sempre, porque a fonte por transação não existe, e zero ambíguo é
//     pior que ausência declarada.
// =============================================================================

import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RepassesDoTenant, AVISO_PAGO_MANUAL } from '../RepassesDoTenant';
import { mkSaldo } from '../../_test/fixtures';
import { mkRepasse } from '../../../repasses/_test/fixtures';

function renderBloco(over: Partial<React.ComponentProps<typeof RepassesDoTenant>> = {}) {
  const props: React.ComponentProps<typeof RepassesDoTenant> = {
    saldo: mkSaldo(),
    saldoLoading: false,
    saldoError: null,
    repasses: [],
    repassesLoading: false,
    repassesError: null,
    running: false,
    onAprovar: vi.fn(),
    onRecusar: vi.fn(),
    onRegistrarPagamento: vi.fn(),
    onRetry: vi.fn(),
    ...over,
  };
  render(<RepassesDoTenant {...props} />);
  return props;
}

describe('RepassesDoTenant · RN-356 · "pago" é registro manual', () => {
  it('repasse pago diz na tela que o sistema não transfere', () => {
    renderBloco({ repasses: [mkRepasse({ estado: 'pago', comprovanteNumero: 'REP-2026-0007' })] });

    expect(screen.getByText('Pago')).toBeInTheDocument();
    expect(screen.getByText(AVISO_PAGO_MANUAL)).toBeInTheDocument();
    expect(screen.getByText(AVISO_PAGO_MANUAL).textContent).toMatch(
      /não faz transferência bancária/
    );
    expect(screen.getByText('REP-2026-0007')).toBeInTheDocument();
  });

  it('repasse que NÃO está pago não carrega o aviso', () => {
    renderBloco({ repasses: [mkRepasse({ estado: 'solicitado' })] });

    expect(screen.queryByText(AVISO_PAGO_MANUAL)).not.toBeInTheDocument();
  });
});

describe('RepassesDoTenant · saldo', () => {
  it('mostra as quatro cifras do saldo, cent-exatas', () => {
    renderBloco({
      saldo: mkSaldo({ vendidoBruto: 42000, retido: 6300, disponivel: 27200, comprometido: 8500 }),
    });

    expect(screen.getByText('R$ 42.000,00')).toBeInTheDocument();
    expect(screen.getByText('R$ 6.300,00')).toBeInTheDocument();
    expect(screen.getByText('R$ 27.200,00')).toBeInTheDocument();
    expect(screen.getByText('R$ 8.500,00')).toBeInTheDocument();
  });

  it('dentro da janela D+N é EmBreve com a causa, NUNCA "R$ 0,00"', () => {
    renderBloco({ saldo: mkSaldo({ dentroJanelaDN: 0 }) });

    const bloco = screen.getByRole('region', { name: 'Dentro da janela D+N' });
    expect(within(bloco).getByText('Em breve')).toBeInTheDocument();
    expect(within(bloco).queryByText(/R\$/)).not.toBeInTheDocument();
    expect(within(bloco).getByText(/fonte por transação/i)).toBeInTheDocument();
  });

  it('eventos sem termo aparecem como contagem e acendem quando há', () => {
    renderBloco({ saldo: mkSaldo({ eventosSemTermo: 2 }) });

    expect(screen.getByText('Eventos sem termo comercial')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('saldo ausente declara "nenhuma movimentação" e não mostra zeros', () => {
    renderBloco({ saldo: null });

    expect(screen.getByText(/Nenhuma movimentação/)).toBeInTheDocument();
    expect(screen.queryByText('R$ 0,00')).not.toBeInTheDocument();
    expect(screen.queryByText('Vendido bruto')).not.toBeInTheDocument();
  });

  it('erro de saldo vira alerta e a tela não estima nada', () => {
    renderBloco({ saldo: null, saldoError: new Error('denied') });

    expect(screen.getByText('Não foi possível carregar o saldo')).toBeInTheDocument();
    expect(screen.queryByText('R$ 0,00')).not.toBeInTheDocument();
  });
});

describe('RepassesDoTenant · ações, as mesmas da fila global', () => {
  it('solicitado oferece Aprovar e Recusar, e chama os callbacks', async () => {
    const repasse = mkRepasse({ estado: 'solicitado' });
    const props = renderBloco({ repasses: [repasse] });

    await userEvent.click(screen.getByRole('button', { name: 'Aprovar' }));
    expect(props.onAprovar).toHaveBeenCalledWith(repasse);

    await userEvent.click(screen.getByRole('button', { name: 'Recusar' }));
    expect(props.onRecusar).toHaveBeenCalledWith(repasse);
  });

  it('aprovado oferece o registro de pagamento', async () => {
    const repasse = mkRepasse({ estado: 'aprovado' });
    const props = renderBloco({ repasses: [repasse] });

    await userEvent.click(screen.getByRole('button', { name: 'Registrar pagamento' }));
    expect(props.onRegistrarPagamento).toHaveBeenCalledWith(repasse);
  });

  it('pago não oferece ação nenhuma', () => {
    renderBloco({ repasses: [mkRepasse({ estado: 'pago' })] });

    expect(screen.queryByRole('button', { name: 'Aprovar' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Registrar pagamento' })).not.toBeInTheDocument();
  });

  it('mutação em andamento desabilita as ações da linha', () => {
    renderBloco({ repasses: [mkRepasse({ estado: 'solicitado' })], running: true });

    expect(screen.getByRole('button', { name: 'Aprovar' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Recusar' })).toBeDisabled();
  });
});

describe('RepassesDoTenant · histórico', () => {
  it('mostra os estados que a fila global esconde (pago, recusado)', () => {
    renderBloco({
      repasses: [
        mkRepasse({ id: 'r1', estado: 'pago', comprovanteNumero: 'REP-2026-0001' }),
        mkRepasse({ id: 'r2', estado: 'recusado' }),
      ],
    });

    expect(screen.getByText('Pago')).toBeInTheDocument();
    expect(screen.getByText('Recusado')).toBeInTheDocument();
  });

  it('sem repasse, EmptyState honesto', () => {
    renderBloco({ repasses: [] });
    expect(screen.getByText('Nenhum repasse solicitado')).toBeInTheDocument();
  });

  it('erro no histórico oferece tentar de novo', async () => {
    const props = renderBloco({ repassesError: new Error('denied') });

    await userEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }));
    expect(props.onRetry).toHaveBeenCalled();
  });
});
