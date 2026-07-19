// =============================================================================
// MinhasAfiliacoesPage (R9-E · S-R9-11-T7 · RN-318) — lado do INFLUENCIADOR:
// vê SÓ as próprias conversões (projeção fechada do reader). Testa os estados
// da tela (carregando/vazio/erro/dados) e o gate de desconto RN-315 exibido.
// =============================================================================
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
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

beforeEach(() => {
  mocks.getMinhasAfiliacoes.mockReset();
});

describe('MinhasAfiliacoesPage', () => {
  it('sem afiliações, mostra EmptyState honesto (não vaza dado de terceiros)', async () => {
    mocks.getMinhasAfiliacoes.mockResolvedValue({ afiliacoes: [] });
    render(<MinhasAfiliacoesPage />);
    expect(await screen.findByText('Você ainda não tem afiliações')).toBeInTheDocument();
  });

  it('renderiza as PRÓPRIAS conversões: evento, KPIs e valor atribuído', async () => {
    mocks.getMinhasAfiliacoes.mockResolvedValue({ afiliacoes: [afiliacao()] });
    render(<MinhasAfiliacoesPage />);
    expect(await screen.findByText('Meia de Floripa')).toBeInTheDocument();
    expect(screen.getByText('Inscrições atribuídas')).toBeInTheDocument();
    expect(screen.getByText('12')).toBeInTheDocument();
    expect(screen.getByText('R$ 3.600,00')).toBeInTheDocument();
  });

  it('gate de desconto RN-315: abaixo do mínimo mostra progresso e nota "sem retroativo"', async () => {
    mocks.getMinhasAfiliacoes.mockResolvedValue({
      afiliacoes: [afiliacao({ minimoInscricoes: 20, conversoes: 12, cupomCodigo: 'FLORIPA10' })],
    });
    render(<MinhasAfiliacoesPage />);
    expect(await screen.findByText('12/20')).toBeInTheDocument();
    expect(
      screen.getByText('ativa ao atingir o mínimo (sem retroativo)'),
    ).toBeInTheDocument();
  });

  it('falha do reader mostra alerta honesto, não tela quebrada', async () => {
    mocks.getMinhasAfiliacoes.mockRejectedValue(new Error('permission-denied'));
    render(<MinhasAfiliacoesPage />);
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
    render(<MinhasAfiliacoesPage />);
    expect(await screen.findByText('Comissão acumulada')).toBeInTheDocument();
    expect(screen.getByText('R$ 260,00')).toBeInTheDocument(); // saldo
    expect(screen.getByText('Repasses registrados')).toBeInTheDocument();
    expect(screen.getByText('PIX')).toBeInTheDocument();
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
    render(<MinhasAfiliacoesPage />);
    expect(await screen.findByText('-R$ 150,00 (dívida)')).toBeInTheDocument();
  });

  it('sem comissão configurada não renderiza bloco de comissão', async () => {
    mocks.getMinhasAfiliacoes.mockResolvedValue({ afiliacoes: [afiliacao()] });
    render(<MinhasAfiliacoesPage />);
    await screen.findByText('Meia de Floripa');
    expect(screen.queryByText('Comissão acumulada')).not.toBeInTheDocument();
  });
});
