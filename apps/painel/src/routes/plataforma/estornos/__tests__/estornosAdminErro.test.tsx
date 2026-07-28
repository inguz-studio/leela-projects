/**
 * estornosAdminErro.test.tsx — review antagonista ESTORNO-REV (vetor 6)
 *
 * A fila admin move DINHEIRO alheio. Quando o servidor recusa a ação, a
 * recusa dele é a única informação útil na tela: a RN-371 não diz "tente de
 * novo", diz "confira o extrato do gateway antes de qualquer nova tentativa".
 * Estas provas prendem o caminho do erro de ponta a ponta — o callable
 * rejeita, o hook guarda, a tela conta ao operador o que de fato aconteceu.
 *
 * O que elas pegaram: o handler lia `acoes.error` do MESMO render em que foi
 * criado (o `setError` do hook só aparece no render seguinte), então o toast
 * do primeiro erro saía com descrição VAZIA; e o mapeador genérico de
 * plataforma trocava a frase da RN-371 por "e-mail com papel conflitante ou
 * transição de status inválida" — texto errado numa tela de dinheiro.
 */

import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ToastProvider } from '@leela/design-system';
import { EstornosAdminRoute } from '../EstornosAdminRoute';

const mocks = vi.hoisted(() => ({
  decideRefund: vi.fn(),
  requestRefund: vi.fn(),
  cancelarInscricao: vi.fn(),
}));

vi.mock('@leela/api-client', () => ({
  decideRefund: mocks.decideRefund,
  requestRefund: mocks.requestRefund,
  cancelarInscricao: mocks.cancelarInscricao,
}));

const ts = { toMillis: () => 1_700_000_000_000, toDate: () => new Date(1_700_000_000_000) };

const ITEM = {
  tenantId: 'castelo',
  tenantNome: 'Castelo Produções',
  eventoId: 'meia-floripa-2026',
  eventoNome: 'Meia Floripa 2026',
  reembolso: {
    id: 'insc-1',
    tenantId: 'castelo',
    eventoId: 'meia-floripa-2026',
    pedidoId: 'ped-1',
    inscritoId: 'insc-1',
    motivo: 'desistência',
    estado: 'em_analise',
    origem: 'organizador',
    valorSolicitado: 188.86,
    transicoes: [],
    criadoEm: ts,
    atualizadoEm: ts,
  },
};

// A fila em si não é o alvo aqui — o alvo é o caminho do erro da AÇÃO.
vi.mock('../../../../lib/query/queries', () => ({
  TETO_TENANTS_FILA_ADMIN: 100,
  TETO_EVENTOS_POR_TENANT_FILA_ADMIN: 50,
  estornosFilaAdminQuery: () => ({
    queryKey: ['reembolsos', 'fila-admin', 'test'],
    queryFn: async () => ({
      itens: [ITEM],
      ramosComFalha: 0,
      tenantsNoTeto: false,
      tenantsComEventosNoTeto: [],
    }),
  }),
}));

/** Erro no formato que o callable do Firebase entrega à tela. */
function erroDeCallable(code: string, message: string): Error {
  const err = new Error(message) as Error & { code: string };
  err.code = code;
  return err;
}

const MSG_RN371 =
  'Um pedido de estorno desta inscrição saiu para o gateway e a resposta não ' +
  'foi registrada — o efeito é desconhecido. Confira o extrato do gateway ' +
  'antes de qualquer nova tentativa (RN-371).';

function renderRoute(): void {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  render(
    <QueryClientProvider client={client}>
      <ToastProvider>
        <EstornosAdminRoute />
      </ToastProvider>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('fila admin: a recusa do servidor chega ao operador', () => {
  it('aprovar barrado pela RN-371 mostra a frase do servidor, não um texto vazio', async () => {
    mocks.decideRefund.mockRejectedValue(
      erroDeCallable('functions/failed-precondition', MSG_RN371),
    );
    const usuario = userEvent.setup();
    renderRoute();

    await usuario.click(await screen.findByRole('button', { name: 'Aprovar' }));
    const modal = await screen.findByRole('dialog');
    await usuario.click(within(modal).getByRole('button', { name: 'Aprovar' }));

    await waitFor(() => {
      expect(screen.getByText('Não foi possível aprovar')).toBeInTheDocument();
    });
    // A prova: o operador lê o que o servidor disse (extrato do gateway),
    // não o silêncio nem o texto genérico sobre papel/e-mail.
    expect(screen.getByText(/confira o extrato do gateway/i)).toBeInTheDocument();
    expect(screen.queryByText(/papel conflitante/i)).not.toBeInTheDocument();
  });

  it('ação direta recusada por permissão mostra a negativa do servidor', async () => {
    const msg = 'Furar o corte de véspera é ação exclusiva do admin da plataforma (RN-376).';
    mocks.requestRefund.mockRejectedValue(erroDeCallable('functions/permission-denied', msg));
    const usuario = userEvent.setup();
    renderRoute();

    await usuario.type(screen.getByLabelText(/ID do pedido/i), 'ped-1');
    await usuario.type(screen.getByLabelText(/ID do inscrito/i), 'insc-1');
    await usuario.type(screen.getByLabelText(/^Motivo/i), 'atleta hospitalizado');
    await usuario.type(
      screen.getByLabelText(/passando por cima do corte/i),
      'ticket 4412',
    );
    await usuario.click(screen.getByRole('button', { name: 'Estornar inscrição' }));
    const modal = await screen.findByRole('dialog');
    await usuario.click(within(modal).getByRole('button', { name: 'Estornar mesmo assim' }));

    await waitFor(() => {
      expect(screen.getByText('Não foi possível estornar')).toBeInTheDocument();
    });
    // Específico de propósito: o próprio formulário já cita a RN-376 na
    // descrição do campo — a prova é a FRASE DO SERVIDOR aparecer no toast.
    expect(screen.getByText(/ação exclusiva do admin da plataforma/i)).toBeInTheDocument();
  });

  it('erro sem mensagem útil cai na rede do mapeador de plataforma', async () => {
    // Callable que estoura em 'internal' chega à tela com message 'INTERNAL' —
    // não é frase de operador; a rede genérica é que fala.
    mocks.decideRefund.mockRejectedValue(erroDeCallable('functions/internal', 'INTERNAL'));
    const usuario = userEvent.setup();
    renderRoute();

    await usuario.click(await screen.findByRole('button', { name: 'Aprovar' }));
    const modal = await screen.findByRole('dialog');
    await usuario.click(within(modal).getByRole('button', { name: 'Aprovar' }));

    await waitFor(() => {
      expect(screen.getByText('Não foi possível aprovar')).toBeInTheDocument();
    });
    expect(screen.getByText(/tente novamente em instantes/i)).toBeInTheDocument();
  });
});
