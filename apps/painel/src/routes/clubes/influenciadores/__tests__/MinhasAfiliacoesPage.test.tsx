// =============================================================================
// MinhasAfiliacoesPage (R9-E · S-R9-11-T7 · RN-318 + PROMOTOR/E08) — lado do
// INFLUENCIADOR: vê SÓ as próprias conversões (projeção fechada do reader).
// Testa os estados da tela (carregando/vazio/erro/dados), o gate de desconto
// RN-315, o RESUMO CONSOLIDADO cross-eventos (KPIs somados só das próprias
// afiliações — RN-318) e o "copiar código de indicação" (JTBD "qual link uso").
// =============================================================================
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { ToastProvider } from '@leela/design-system';
import { MinhasAfiliacoesPage } from '../MinhasAfiliacoesPage';
import type { MinhaAfiliacao } from '@leela/api-client';

const mocks = vi.hoisted(() => ({ getMinhasAfiliacoes: vi.fn() }));

vi.mock('@leela/api-client', () => ({
  getMinhasAfiliacoes: mocks.getMinhasAfiliacoes,
}));

function afiliacao(over: Partial<MinhaAfiliacao> = {}): MinhaAfiliacao {
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
    conversoes: 12,
    valorAtribuido: 3600,
    // FASE 2 (COMF2): campos de comissão agora obrigatórios no tipo do reader.
    comissao: null,
    comissaoAcumulada: 0,
    comissaoRepassada: 0,
    saldoComissao: 0,
    ultimasConversoes: [
      { valor: 300, qtdInscricoes: 1, comissao: 0, convertidoEmMillis: 1_700_000_000_000 },
    ],
    ultimosRepasses: [],
    ...over,
  };
}

const writeText = vi.fn<(s: string) => Promise<void>>();

function renderPage(): void {
  render(
    <ToastProvider>
      <MinhasAfiliacoesPage />
    </ToastProvider>,
  );
}

/** Escopo do 1º cartão de afiliação (fora do resumo consolidado). */
async function primeiroCartao(): Promise<HTMLElement> {
  const cartoes = await screen.findAllByRole('article');
  return cartoes[0] as HTMLElement;
}

/** Base pública do ambiente (RN-423) — o gerador do link a exige (S1215-T1). */
const BASE = 'https://leela-landing.web.app';

beforeEach(() => {
  mocks.getMinhasAfiliacoes.mockReset();
  writeText.mockReset();
  writeText.mockResolvedValue(undefined);
  Object.assign(navigator, { clipboard: { writeText } });
  vi.stubEnv('VITE_LEELA_URL', BASE);
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('MinhasAfiliacoesPage', () => {
  it('sem afiliações, mostra EmptyState honesto (não vaza dado de terceiros)', async () => {
    mocks.getMinhasAfiliacoes.mockResolvedValue({ afiliacoes: [] });
    renderPage();
    expect(await screen.findByText('Você ainda não tem afiliações')).toBeInTheDocument();
    // Sem afiliação NÃO existe resumo consolidado (nada a somar).
    expect(
      screen.queryByRole('region', { name: 'Resumo consolidado das suas afiliações' }),
    ).not.toBeInTheDocument();
  });

  it('renderiza as PRÓPRIAS conversões: evento, KPIs e valor atribuído', async () => {
    mocks.getMinhasAfiliacoes.mockResolvedValue({ afiliacoes: [afiliacao()] });
    renderPage();
    expect(await screen.findByText('Meia de Floripa')).toBeInTheDocument();
    const cartao = await primeiroCartao();
    expect(within(cartao).getByText('Inscrições atribuídas')).toBeInTheDocument();
    expect(within(cartao).getByText('12')).toBeInTheDocument();
    expect(within(cartao).getByText('R$ 3.600,00')).toBeInTheDocument();
  });

  it('resumo consolidado soma os agregados das próprias afiliações (só as suas — RN-318)', async () => {
    mocks.getMinhasAfiliacoes.mockResolvedValue({
      afiliacoes: [
        afiliacao({ eventoId: 'evt-1', refCodigo: 'DIONEY10', conversoes: 12, valorAtribuido: 3600 }),
        afiliacao({
          eventoId: 'evt-2',
          eventoNome: 'Trail Ratones',
          refCodigo: 'DIONEY20',
          status: 'inativo',
          conversoes: 8,
          valorAtribuido: 2400,
        }),
      ],
    });
    renderPage();
    const resumo = await screen.findByRole('region', {
      name: 'Resumo consolidado das suas afiliações',
    });
    // 1 ativa (a outra é inativa), 20 inscrições (12+8), R$ 6.000,00 (3600+2400).
    expect(within(resumo).getByText('Afiliações ativas')).toBeInTheDocument();
    expect(within(resumo).getByText('1')).toBeInTheDocument();
    expect(within(resumo).getByText('20')).toBeInTheDocument();
    expect(within(resumo).getByText('R$ 6.000,00')).toBeInTheDocument();
  });

  it('resumo: comissão a receber soma só saldos positivos (dívida não abate)', async () => {
    mocks.getMinhasAfiliacoes.mockResolvedValue({
      afiliacoes: [
        afiliacao({
          refCodigo: 'A',
          comissao: { tipo: 'percentual', percentual: 10 },
          comissaoAcumulada: 300,
          comissaoRepassada: 100,
          saldoComissao: 200,
        }),
        afiliacao({
          eventoId: 'evt-2',
          refCodigo: 'B',
          comissao: { tipo: 'valor_fixo', valorPorInscricao: 5 },
          comissaoAcumulada: 50,
          comissaoRepassada: 200,
          saldoComissao: -150,
        }),
      ],
    });
    renderPage();
    const resumo = await screen.findByRole('region', {
      name: 'Resumo consolidado das suas afiliações',
    });
    expect(within(resumo).getByText('Comissão a receber')).toBeInTheDocument();
    // 200 (positivo) + 0 (dívida clampada), NÃO 50.
    expect(within(resumo).getByText('R$ 200,00')).toBeInTheDocument();
  });

  it('copiar link: escreve a URL completa {landing}/{slug}?ref= no clipboard (T-extra TAMANHOS-GRADE)', async () => {
    mocks.getMinhasAfiliacoes.mockResolvedValue({ afiliacoes: [afiliacao({ refCodigo: 'DIONEY10' })] });
    renderPage();
    const cartao = await primeiroCartao();
    fireEvent.click(
      within(cartao).getByRole('button', { name: /copiar link de indicação/i }),
    );
    expect(writeText).toHaveBeenCalledWith(`${BASE}/meia-floripa-2026?ref=DIONEY10`);
    expect(await screen.findByText('Link copiado')).toBeInTheDocument();
  });

  // S1215-T1 · RN-429 — o cupom vinculado viaja DENTRO do link do promotor.
  // É o ponto inteiro da feature: antes o influenciador copiava um link que
  // atribuía a conversão e não aplicava desconto nenhum.
  it('copiar link: o cupom vinculado entra no link (S1215-T1 · RN-429)', async () => {
    mocks.getMinhasAfiliacoes.mockResolvedValue({
      afiliacoes: [afiliacao({ refCodigo: 'DIONEY10', cupomCodigo: 'FLORIPA10' })],
    });
    renderPage();
    const cartao = await primeiroCartao();
    fireEvent.click(
      within(cartao).getByRole('button', { name: /copiar link de indicação/i }),
    );
    expect(writeText).toHaveBeenCalledWith(
      `${BASE}/meia-floripa-2026?ref=DIONEY10&cupom=FLORIPA10`,
    );
  });

  // Ambiente sem base configurada: degrada para o CÓDIGO, nunca para um link
  // torto com domínio de terceiro (RN-423/429). O código nu ainda é usável —
  // a pessoa cola o `?ref=` no link do evento.
  it('sem base pública configurada, copia o código e diz o porquê (RN-429)', async () => {
    vi.stubEnv('VITE_LEELA_URL', '');
    mocks.getMinhasAfiliacoes.mockResolvedValue({ afiliacoes: [afiliacao({ refCodigo: 'DIONEY10' })] });
    renderPage();
    const cartao = await primeiroCartao();
    fireEvent.click(
      within(cartao).getByRole('button', { name: /copiar link de indicação/i }),
    );
    expect(writeText).toHaveBeenCalledWith('DIONEY10');
    expect(await screen.findByText('Código copiado')).toBeInTheDocument();
  });

  it('gate de desconto RN-315: abaixo do mínimo mostra progresso e nota "sem retroativo"', async () => {
    mocks.getMinhasAfiliacoes.mockResolvedValue({
      afiliacoes: [afiliacao({ minimoInscricoes: 20, conversoes: 12, cupomCodigo: 'FLORIPA10' })],
    });
    renderPage();
    expect(await screen.findByText('12/20')).toBeInTheDocument();
    expect(
      screen.getByText('ativa ao atingir o mínimo (sem retroativo)'),
    ).toBeInTheDocument();
  });

  it('falha do reader mostra alerta honesto, não tela quebrada', async () => {
    mocks.getMinhasAfiliacoes.mockRejectedValue(new Error('permission-denied'));
    renderPage();
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Não foi possível carregar suas afiliações',
    );
  });

  it('comissão configurada: mostra saldo/extrato próprio (projeção RN-318)', async () => {
    mocks.getMinhasAfiliacoes.mockResolvedValue({
      afiliacoes: [
        afiliacao({
          comissao: { tipo: 'percentual', percentual: 10 },
          comissaoAcumulada: 360,
          comissaoRepassada: 100,
          saldoComissao: 260,
          ultimasConversoes: [
            { valor: 300, qtdInscricoes: 1, comissao: 30, convertidoEmMillis: 1_700_000_000_000 },
          ],
          ultimosRepasses: [
            { valor: 100, observacao: 'PIX', criadoEmMillis: 1_700_100_000_000 },
          ],
        }),
      ],
    });
    renderPage();
    const cartao = (await screen.findAllByRole('article'))[0] as HTMLElement;
    expect(within(cartao).getByText('Comissão acumulada')).toBeInTheDocument();
    expect(within(cartao).getByText('R$ 260,00')).toBeInTheDocument(); // saldo
    expect(within(cartao).getByText('Repasses que você recebeu')).toBeInTheDocument();
    expect(within(cartao).getByText('PIX')).toBeInTheDocument();
    expect(within(cartao).getByText('1 repasse · R$ 100,00')).toBeInTheDocument();
  });

  // ── S705-T3 · RN-385 — o parcial é um evento próprio também para quem recebe
  it('dois parciais viram DUAS linhas no extrato do afiliado, não um total somado', async () => {
    mocks.getMinhasAfiliacoes.mockResolvedValue({
      afiliacoes: [
        afiliacao({
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
    const cartao = (await screen.findAllByRole('article'))[0] as HTMLElement;
    const tabelaRepasses = within(cartao).getByRole('table', {
      name: /Repasses de/,
    });
    expect(within(tabelaRepasses).getAllByRole('row')).toHaveLength(3); // 2 + cabeçalho
    expect(within(tabelaRepasses).getByText('R$ 500,00')).toBeInTheDocument();
    expect(within(tabelaRepasses).getByText('R$ 300,00')).toBeInTheDocument();
    expect(within(tabelaRepasses).queryByText('R$ 800,00')).not.toBeInTheDocument();
    expect(within(cartao).getByText('2 repasses · R$ 800,00 no total')).toBeInTheDocument();
    // RN-318: o extrato do afiliado continua fechado no que é dele.
    expect(cartao.textContent).not.toMatch(/@/);
  });

  it('saldo negativo (estorno pós-repasse) aparece como dívida — sem clamp', async () => {
    mocks.getMinhasAfiliacoes.mockResolvedValue({
      afiliacoes: [
        afiliacao({
          comissao: { tipo: 'valor_fixo', valorPorInscricao: 5 },
          comissaoAcumulada: 50,
          comissaoRepassada: 200,
          saldoComissao: -150,
        }),
      ],
    });
    renderPage();
    const cartao = (await screen.findAllByRole('article'))[0] as HTMLElement;
    expect(within(cartao).getByText('-R$ 150,00 (dívida)')).toBeInTheDocument();
  });

  it('sem comissão configurada não renderiza bloco de comissão', async () => {
    mocks.getMinhasAfiliacoes.mockResolvedValue({ afiliacoes: [afiliacao()] });
    renderPage();
    await screen.findByText('Meia de Floripa');
    const cartao = await primeiroCartao();
    expect(within(cartao).queryByText('Comissão acumulada')).not.toBeInTheDocument();
    // Sem comissão em nenhuma afiliação, o resumo NÃO mostra "Comissão a receber".
    const resumo = screen.getByRole('region', {
      name: 'Resumo consolidado das suas afiliações',
    });
    expect(within(resumo).queryByText('Comissão a receber')).not.toBeInTheDocument();
  });
});
