// =============================================================================
// InfluenciadoresPage (R9-E · S-R9-11-T8 · RN-319, lado do ORGANIZADOR) — na
// aba Clubs, vê as vendas/conversões + comissão dos afiliados do PRÓPRIO tenant.
// Testa os estados da tela (vazio/dados/erro), KPIs somados, busca, e o registro
// de repasse manual de comissão (FASE 2 · idempotência amigável).
// =============================================================================
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { ToastProvider } from '@leela/design-system';
import { InfluenciadoresPage } from '../InfluenciadoresPage';
import type { AfiliadoDoTenant } from '@leela/api-client';

const mocks = vi.hoisted(() => ({
  getAfiliadosDoTenant: vi.fn(),
  registrarRepasseComissao: vi.fn(),
}));

vi.mock('@leela/api-client', () => ({
  getAfiliadosDoTenant: mocks.getAfiliadosDoTenant,
  registrarRepasseComissao: mocks.registrarRepasseComissao,
}));

function afiliado(over: Partial<AfiliadoDoTenant> = {}): AfiliadoDoTenant {
  return {
    eventoId: 'evt-1',
    eventoNome: 'Meia de Floripa',
    eventoSlug: 'meia-floripa-2026',
    refCodigo: 'DIONEY10',
    tipo: 'pessoa_fisica',
    status: 'ativo',
    janelaAtribuicaoDias: 7,
    minimoInscricoes: null,
    cupomCodigo: null,
    conversoes: 10,
    valorAtribuido: 3000,
    comissao: null,
    comissaoAcumulada: 0,
    comissaoRepassada: 0,
    saldoComissao: 0,
    ultimasConversoes: [],
    ultimosRepasses: [],
    nome: 'Dioney Galharte',
    canal: 'instagram',
    clubeRef: null,
    responsavelEmail: 'dioney@exemplo.com',
    documentoMascarado: null,
    ...over,
  };
}

/** Afiliado com comissão e saldo POSITIVO — a porta do modal de repasse. */
function comSaldo(saldo: number): AfiliadoDoTenant {
  return afiliado({
    comissao: { tipo: 'percentual', percentual: 10 },
    comissaoAcumulada: saldo,
    comissaoRepassada: 0,
    saldoComissao: saldo,
  });
}

/** Campo de valor do modal (S705-T2). */
function campoValor(): HTMLInputElement {
  return screen.getByLabelText('Valor do repasse (R$)') as HTMLInputElement;
}

async function abrirModal(): Promise<void> {
  await userEvent.click(await screen.findByRole('button', { name: 'Registrar repasse' }));
  await screen.findByRole('button', { name: 'Confirmar repasse' });
}

function renderPage(): void {
  render(
    <ToastProvider>
      <MemoryRouter initialEntries={['/clubes/influenciadores']}>
        <InfluenciadoresPage />
      </MemoryRouter>
    </ToastProvider>,
  );
}

beforeEach(() => {
  mocks.getAfiliadosDoTenant.mockReset();
  mocks.registrarRepasseComissao.mockReset();
});

describe('InfluenciadoresPage', () => {
  it('sem afiliados, mostra EmptyState que aponta para a aba Afiliados', async () => {
    mocks.getAfiliadosDoTenant.mockResolvedValue({ afiliados: [] });
    renderPage();
    expect(await screen.findByText('Nenhum influenciador ainda')).toBeInTheDocument();
  });

  it('lista os afiliados do tenant e soma os KPIs', async () => {
    mocks.getAfiliadosDoTenant.mockResolvedValue({
      afiliados: [
        afiliado(),
        afiliado({
          refCodigo: 'CLUBE5',
          nome: 'Floripa Run',
          tipo: 'clube',
          eventoNome: 'Trail da Serra',
          conversoes: 5,
          valorAtribuido: 1500,
        }),
      ],
    });
    renderPage();
    expect(await screen.findByText('Dioney Galharte')).toBeInTheDocument();
    expect(screen.getByText('Floripa Run')).toBeInTheDocument();
    // KPI de inscrições somadas: 10 + 5 = 15; valor 3000 + 1500 = R$ 4.500,00.
    expect(screen.getByText('15')).toBeInTheDocument();
    expect(screen.getByText('R$ 4.500,00')).toBeInTheDocument();
  });

  it('a busca filtra por nome/código/evento', async () => {
    mocks.getAfiliadosDoTenant.mockResolvedValue({
      afiliados: [
        afiliado(),
        afiliado({ refCodigo: 'CLUBE5', nome: 'Floripa Run', eventoNome: 'Trail da Serra' }),
      ],
    });
    renderPage();
    await screen.findByText('Dioney Galharte');
    await userEvent.type(screen.getByRole('searchbox', { name: 'Buscar influenciador' }), 'serra');
    expect(screen.getByText('Floripa Run')).toBeInTheDocument();
    expect(screen.queryByText('Dioney Galharte')).not.toBeInTheDocument();
  });

  it('falha do reader mostra alerta honesto', async () => {
    mocks.getAfiliadosDoTenant.mockRejectedValue(new Error('permission-denied'));
    renderPage();
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Não foi possível carregar os influenciadores',
    );
  });

  it('saldo negativo aparece como dívida e não oferece repasse', async () => {
    mocks.getAfiliadosDoTenant.mockResolvedValue({
      afiliados: [
        afiliado({
          comissao: { tipo: 'percentual', percentual: 10 },
          comissaoAcumulada: 100,
          comissaoRepassada: 300,
          saldoComissao: -200,
        }),
      ],
    });
    renderPage();
    expect(await screen.findByText('-R$ 200,00 (dívida)')).toBeInTheDocument();
    expect(screen.getByText('Em dívida')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Registrar repasse' })).not.toBeInTheDocument();
  });

  it('registra repasse do saldo com idempotência e atualiza o toast', async () => {
    mocks.getAfiliadosDoTenant.mockResolvedValue({
      afiliados: [comSaldo(500)],
    });
    mocks.registrarRepasseComissao.mockResolvedValue({
      ok: true,
      repasseId: 'r1',
      duplicado: false,
      saldoComissao: 0,
    });
    renderPage();
    await abrirModal();
    // ConfirmModal aberto mostrando o saldo E com o campo JÁ preenchido com
    // ele (S705-T2 · RN-385 — o caminho de um clique continua existindo).
    expect(await screen.findByText(/Saldo de comissão:\s*R\$\s*500,00/)).toBeInTheDocument();
    expect(campoValor()).toHaveValue('500,00');
    await userEvent.click(screen.getByRole('button', { name: 'Confirmar repasse' }));
    await vi.waitFor(() => expect(mocks.registrarRepasseComissao).toHaveBeenCalledTimes(1));
    const arg = mocks.registrarRepasseComissao.mock.calls[0]![0];
    expect(arg).toMatchObject({ eventoId: 'evt-1', afiliadoId: 'DIONEY10', valor: 500 });
    expect(typeof arg.repasseId).toBe('string');
    expect(arg.repasseId.length).toBeGreaterThanOrEqual(8);
    expect(await screen.findByText('Repasse registrado')).toBeInTheDocument();
  });

  // ── S705-T2 · RN-385 — repasse PARCIAL ────────────────────────────────────

  it('registra PARCIAL: 500 de saldo, 200 informados, e o resto continua a receber', async () => {
    mocks.getAfiliadosDoTenant.mockResolvedValue({ afiliados: [comSaldo(500)] });
    mocks.registrarRepasseComissao.mockResolvedValue({
      ok: true, repasseId: 'r1', duplicado: false, saldoComissao: 300,
    });
    renderPage();
    await abrirModal();
    await userEvent.clear(campoValor());
    await userEvent.type(campoValor(), '200');
    // O modal conta a consequência exata do parcial, não "vai a zero".
    expect(screen.getByText(/R\$\s*200,00 do saldo em aberto \(restam R\$\s*300,00\)/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Confirmar repasse' }));
    await vi.waitFor(() => expect(mocks.registrarRepasseComissao).toHaveBeenCalledTimes(1));
    expect(mocks.registrarRepasseComissao.mock.calls[0]![0]).toMatchObject({ valor: 200 });
    expect(await screen.findByText('Novo saldo de comissão: R$ 300,00')).toBeInTheDocument();
  });

  it('valor acima do saldo é barrado ANTES da chamada, com motivo no campo', async () => {
    mocks.getAfiliadosDoTenant.mockResolvedValue({ afiliados: [comSaldo(700)] });
    renderPage();
    await abrirModal();
    await userEvent.clear(campoValor());
    await userEvent.type(campoValor(), '700.01');
    expect(await screen.findByRole('alert')).toHaveTextContent('excede o saldo de comissão');
    expect(campoValor()).toHaveAttribute('aria-invalid', 'true');
    await userEvent.click(screen.getByRole('button', { name: 'Confirmar repasse' }));
    expect(mocks.registrarRepasseComissao).not.toHaveBeenCalled();
  });

  it('mais de duas casas decimais é barrado ANTES da chamada (mesma régua do servidor)', async () => {
    mocks.getAfiliadosDoTenant.mockResolvedValue({ afiliados: [comSaldo(700)] });
    renderPage();
    await abrirModal();
    await userEvent.clear(campoValor());
    // Vírgula: é como se escreve centavo em pt-BR, e é a forma que preserva a
    // terceira casa viva para o core reprovar. (Com PONTO, "10.005" é a forma
    // ambígua — coberta no caso abaixo.)
    await userEvent.type(campoValor(), '10,005');
    expect(await screen.findByRole('alert')).toHaveTextContent('duas casas decimais');
    await userEvent.click(screen.getByRole('button', { name: 'Confirmar repasse' }));
    expect(mocks.registrarRepasseComissao).not.toHaveBeenCalled();
  });

  it('valor com milhar chega inteiro na chamada (FIX-PARSE-DINHEIRO)', async () => {
    mocks.getAfiliadosDoTenant.mockResolvedValue({ afiliados: [comSaldo(5000)] });
    renderPage();
    await abrirModal();
    await userEvent.clear(campoValor());
    await userEvent.type(campoValor(), '1.234,56');
    await userEvent.click(screen.getByRole('button', { name: 'Confirmar repasse' }));
    await waitFor(() => expect(mocks.registrarRepasseComissao).toHaveBeenCalled());
    const [input] = mocks.registrarRepasseComissao.mock.calls[0]!;
    // O defeito registrava R$ 1,23 e dava mil reais de comissão por pagos.
    expect(input.valor).toBe(1234.56);
    expect(Math.round(input.valor * 100)).toBe(123456);
  });

  it('ponto sem vírgula é milhar: "1.500" registra mil e quinhentos', async () => {
    mocks.getAfiliadosDoTenant.mockResolvedValue({ afiliados: [comSaldo(5000)] });
    renderPage();
    await abrirModal();
    await userEvent.clear(campoValor());
    await userEvent.type(campoValor(), '1.500');
    await userEvent.click(screen.getByRole('button', { name: 'Confirmar repasse' }));
    await waitFor(() => expect(mocks.registrarRepasseComissao).toHaveBeenCalled());
    const [input] = mocks.registrarRepasseComissao.mock.calls[0]!;
    expect(input.valor).toBe(1500);
  });

  it('valor zerado não vira chamada de repasse', async () => {
    mocks.getAfiliadosDoTenant.mockResolvedValue({ afiliados: [comSaldo(700)] });
    renderPage();
    await abrirModal();
    await userEvent.clear(campoValor());
    await userEvent.click(screen.getByRole('button', { name: 'Confirmar repasse' }));
    expect(mocks.registrarRepasseComissao).not.toHaveBeenCalled();
  });

  it('retentativa depois de falha REUSA o mesmo repasseId (idempotência amigável)', async () => {
    mocks.getAfiliadosDoTenant.mockResolvedValue({ afiliados: [comSaldo(500)] });
    mocks.registrarRepasseComissao
      .mockRejectedValueOnce(new Error('network'))
      .mockResolvedValueOnce({ ok: true, repasseId: 'r1', duplicado: true, saldoComissao: 300 });
    renderPage();
    await abrirModal();
    await userEvent.clear(campoValor());
    await userEvent.type(campoValor(), '200');
    await userEvent.click(screen.getByRole('button', { name: 'Confirmar repasse' }));
    await vi.waitFor(() => expect(mocks.registrarRepasseComissao).toHaveBeenCalledTimes(1));
    await userEvent.click(screen.getByRole('button', { name: 'Confirmar repasse' }));
    await vi.waitFor(() => expect(mocks.registrarRepasseComissao).toHaveBeenCalledTimes(2));
    const [primeira, segunda] = mocks.registrarRepasseComissao.mock.calls;
    expect(segunda![0].repasseId).toBe(primeira![0].repasseId);
    expect(await screen.findByText('Repasse já estava registrado')).toBeInTheDocument();
  });

  // ── S705-T3 · RN-385 — extrato com uma linha por repasse (lado de quem paga)

  it('dois parciais aparecem como DUAS linhas com valor e data próprios, não como total somado', async () => {
    mocks.getAfiliadosDoTenant.mockResolvedValue({
      afiliados: [
        afiliado({
          comissao: { tipo: 'percentual', percentual: 10 },
          comissaoAcumulada: 1200,
          comissaoRepassada: 800,
          saldoComissao: 400,
          ultimosRepasses: [
            { valor: 500, observacao: 'Pix 18/07', criadoEmMillis: Date.UTC(2026, 6, 18, 15, 0) },
            { valor: 300, observacao: 'Pix 25/07', criadoEmMillis: Date.UTC(2026, 6, 25, 15, 0) },
          ],
        }),
      ],
    });
    renderPage();
    await userEvent.click(await screen.findByRole('button', { name: 'Ver repasses de Dioney Galharte' }));
    const dialogo = await screen.findByRole('dialog');
    // Duas linhas próprias — e NÃO uma linha de R$ 800,00.
    expect(within(dialogo).getByText('R$ 500,00')).toBeInTheDocument();
    expect(within(dialogo).getByText('R$ 300,00')).toBeInTheDocument();
    expect(within(dialogo).getByText('Pix 18/07')).toBeInTheDocument();
    expect(within(dialogo).getByText('Pix 25/07')).toBeInTheDocument();
    expect(within(dialogo).getByText('2 repasses · R$ 800,00 no total')).toBeInTheDocument();
    // Uma linha de tabela por repasse (+1 do cabeçalho).
    expect(within(dialogo).getAllByRole('row')).toHaveLength(3);
  });

  it('afiliado sem repasse não oferece extrato', async () => {
    mocks.getAfiliadosDoTenant.mockResolvedValue({ afiliados: [comSaldo(500)] });
    renderPage();
    await screen.findByRole('button', { name: 'Registrar repasse' });
    expect(screen.queryByRole('button', { name: /Ver repasses/ })).not.toBeInTheDocument();
  });

  it('o modal de repasse mostra o que já foi adiantado antes de pedir o próximo valor', async () => {
    mocks.getAfiliadosDoTenant.mockResolvedValue({
      afiliados: [
        afiliado({
          comissao: { tipo: 'percentual', percentual: 10 },
          comissaoAcumulada: 1200,
          comissaoRepassada: 500,
          saldoComissao: 700,
          ultimosRepasses: [
            { valor: 500, observacao: 'Pix 18/07', criadoEmMillis: Date.UTC(2026, 6, 18, 15, 0) },
          ],
        }),
      ],
    });
    renderPage();
    await abrirModal();
    expect(screen.getByText('Já repassado antes')).toBeInTheDocument();
    expect(screen.getByText('1 repasse · R$ 500,00')).toBeInTheDocument();
    // O campo continua propondo o SALDO (700), não o total acumulado.
    expect(campoValor()).toHaveValue('700,00');
  });
});
