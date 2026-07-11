// =============================================================================
// InscritoSlideIn (presentational) — S203-T3. Testa comportamento do usuário:
// máscara de PII + revelação, disclosure de saúde, abas no DOM, pagamento real
// e EmptyStates honestos. Sem QueryClient (dados chegam por props).
// =============================================================================

import { describe, it, expect } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Inscrito, Pagamento, Pedido } from '@leela/core';
import type { PedidoEPagamentoDoInscrito } from '@leela/api-client';
import { InscritoSlideIn } from '../InscritoSlideIn';
import { mkInscrito, ts } from '../../_test/fixtures';

const AGORA = new Date('2026-07-11T12:00:00Z');

function inscritoComDados(over: Partial<Inscrito> = {}): Inscrito {
  return mkInscrito({
    atletaNome: 'Marina Silva',
    modalidade: '10k',
    tamanhos: { 'camiseta-tecnica': 'M' },
    dadosPessoais: {
      cpf: '529.982.247-25',
      telefone: '(48) 99999-0001',
      nascimento: '1990-03-12',
      genero: 'feminino',
      cidade: 'Florianópolis',
      uf: 'SC',
      contatoEmergencia: { nome: 'João', telefone: '(48) 98888-1234' },
      restricoesMedicas: 'Asma leve — usa bombinha',
    },
    ...over,
  });
}

function pedidoPago(): Pedido {
  return {
    id: 'ped-abc123',
    tenantId: 'castelo',
    eventoId: 'meia-floripa-2026',
    responsavel: { atletaId: 'atl-1', nome: 'Marina Silva', email: 'm@x.com' },
    inscritoRefs: ['ins-1'],
    pagamentoRef: 'pag-1',
    valorTotal: 189,
    status: 'pago',
    criadoEm: ts(new Date('2026-02-01T00:00:00Z')),
    atualizadoEm: ts(new Date('2026-02-01T00:00:00Z')),
  };
}

function pagamentoCartao(): Pagamento {
  return {
    id: 'pag-1',
    tenantId: 'castelo',
    eventoId: 'meia-floripa-2026',
    pedidoRef: 'ped-abc123',
    status: 'confirmado',
    forma: 'cartao_credito',
    valorBase: 189,
    loteNome: 'Lote 2 — Regular',
    desconto: 0,
    valorFinal: 189,
    cartao: { bandeira: 'Visa', ultimos4: '4821', parcelas: 12, valorParcela: 16.99, valorTotalComJuros: 203.88 },
    pagoEm: ts(new Date('2026-02-10T14:30:00Z')),
    criadoEm: ts(new Date('2026-02-10T00:00:00Z')),
    atualizadoEm: ts(new Date('2026-02-10T00:00:00Z')),
  };
}

function renderSlide(over: Partial<Parameters<typeof InscritoSlideIn>[0]> = {}) {
  const props: Parameters<typeof InscritoSlideIn>[0] = {
    inscrito: inscritoComDados(),
    pedidoEPagamento: null,
    loadingPagamento: false,
    erroPagamento: null,
    onClose: () => undefined,
    agora: AGORA,
    ...over,
  };
  return render(<InscritoSlideIn {...props} />);
}

describe('InscritoSlideIn — cabeçalho e abas', () => {
  it('mostra nome, modalidade e as 4 abas no DOM (§2.7)', () => {
    renderSlide();
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByRole('heading', { name: 'Marina Silva' })).toBeInTheDocument();
    for (const label of ['Geral', 'Pagamento', 'Comunicação', 'Histórico']) {
      expect(within(dialog).getByRole('tab', { name: label })).toBeInTheDocument();
    }
  });

  it('null → não renderiza (painel fechado)', () => {
    const { container } = renderSlide({ inscrito: null });
    expect(container).toBeEmptyDOMElement();
  });
});

describe('InscritoSlideIn — Aba Geral / PII (LGPD)', () => {
  it('mascara CPF por padrão e revela no toggle', async () => {
    renderSlide();
    // Mascarado: dígitos iniciais não aparecem; só os 5 últimos.
    expect(screen.getByText('•••.•••.247-25')).toBeInTheDocument();
    expect(screen.queryByText('529.982.247-25')).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Mostrar CPF' }));
    expect(screen.getByText('529.982.247-25')).toBeInTheDocument();
  });

  it('mascara telefone por padrão e revela no toggle', async () => {
    renderSlide();
    expect(screen.getByText('(••) •••••-0001')).toBeInTheDocument();
    expect(screen.queryByText('(48) 99999-0001')).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Mostrar Telefone' }));
    expect(screen.getByText('(48) 99999-0001')).toBeInTheDocument();
  });

  it('nascimento com idade (fuso pinado, agora injetável)', () => {
    renderSlide();
    expect(screen.getByText('12/03/1990 (36 anos)')).toBeInTheDocument();
  });

  it('dados de saúde ficam atrás de disclosure (não renderizados de cara)', async () => {
    renderSlide();
    expect(screen.queryByText(/Asma leve/)).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Ver dados de saúde' }));
    expect(screen.getByText('Asma leve — usa bombinha')).toBeInTheDocument();
  });

  it('sem dadosPessoais → EmptyState honesto na aba Geral', () => {
    renderSlide({ inscrito: mkInscrito({ atletaNome: 'Legado' }) });
    expect(screen.getByText('Dados pessoais indisponíveis')).toBeInTheDocument();
  });
});

describe('InscritoSlideIn — Aba Pagamento [pag]', () => {
  function abrirPagamento() {
    return userEvent.click(screen.getByRole('tab', { name: 'Pagamento' }));
  }

  it('loading → status de carregamento', async () => {
    renderSlide({ loadingPagamento: true });
    await abrirPagamento();
    expect(screen.getByRole('status', { name: 'Carregando pagamento' })).toBeInTheDocument();
  });

  it('pedido null → EmptyState "Sem pedido vinculado"', async () => {
    renderSlide({ pedidoEPagamento: { pedido: null, pagamento: null } });
    await abrirPagamento();
    expect(screen.getByText('Sem pedido vinculado')).toBeInTheDocument();
  });

  it('erro → mensagem honesta sem vazar detalhe', async () => {
    renderSlide({ erroPagamento: new Error('permission-denied ref pendurada') });
    await abrirPagamento();
    expect(screen.getByText('Não foi possível carregar o pedido deste inscrito.')).toBeInTheDocument();
    expect(screen.queryByText(/permission-denied/)).not.toBeInTheDocument();
  });

  it('pedido pago + cartão → valores, forma, parcelamento e estorno desabilitado', async () => {
    const dados: PedidoEPagamentoDoInscrito = { pedido: pedidoPago(), pagamento: pagamentoCartao() };
    renderSlide({ pedidoEPagamento: dados });
    await abrirPagamento();
    expect(screen.getByText('ped-abc123')).toBeInTheDocument();
    expect(screen.getByText('R$ 189,00 · Lote 2 — Regular')).toBeInTheDocument();
    expect(screen.getByText('Visa •••• 4821 · 12× de R$ 16,99')).toBeInTheDocument();
    // Estorno é B-T2: presente mas desabilitado, com aviso honesto.
    const estorno = screen.getByRole('button', { name: 'Reembolsar inscrição' });
    expect(estorno).toBeDisabled();
    expect(screen.getByText(/próximo lote \(B-T2\)/)).toBeInTheDocument();
  });
});

describe('InscritoSlideIn — abas dependentes de FABLE-G', () => {
  it('Comunicação e Histórico mostram EmptyState honesto', async () => {
    renderSlide();
    await userEvent.click(screen.getByRole('tab', { name: 'Comunicação' }));
    expect(screen.getByText('Comunicação indisponível')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('tab', { name: 'Histórico' }));
    expect(screen.getByText('Histórico indisponível')).toBeInTheDocument();
  });
});
