import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CardConferencia } from '../CardConferencia';
import { conferenciaDoInscrito, type EstadoCompra } from '../../_lib/conferenciaBalcao';
import { mkInscrito, mkKit, mkPagamento, mkPedido } from '../../_test/fixtures';

const kits = [mkKit({ id: 'kit-ouro-2026', itens: ['Camiseta técnica', 'Medalha', 'Sacola'] })];

const inscrito = mkInscrito({
  atletaNome: 'Marina Silva',
  modalidade: '21k',
  kit: 'kit_ouro',
  kitId: 'kit-ouro-2026',
  tamanhos: { camiseta: 'feminina__M' },
});

function renderCard(
  over: Parameters<typeof conferenciaDoInscrito>[0] | null = null,
  estado: EstadoCompra = 'lida',
) {
  const conferencia = conferenciaDoInscrito(
    over ?? { inscrito, kits, pedido: mkPedido(), pagamento: mkPagamento() },
  );
  render(
    <CardConferencia conferencia={conferencia} kit={inscrito.kit} estadoCompra={estado} />,
  );
}

describe('CardConferencia', () => {
  it('mostra os seis campos que o dono pediu, com rótulo lido em voz alta', () => {
    renderCard();

    expect(screen.getByRole('heading', { name: 'Marina Silva' })).toBeInTheDocument();
    expect(screen.getByText('Modalidade').nextSibling).toHaveTextContent('21k');
    expect(screen.getByText('Lote').nextSibling).toHaveTextContent('Lote 2 — Regular');
    expect(screen.getByText('Kit inclui').nextSibling).toHaveTextContent(
      'Camiseta técnica · Medalha · Sacola',
    );
    expect(screen.getByText('Tamanho escolhido').nextSibling).toHaveTextContent('Feminina M');
    expect(screen.getByText('E-mail de compra').nextSibling).toHaveTextContent(
      'marina@exemplo.com',
    );
    expect(screen.getByText('Telefone de compra').nextSibling).toHaveTextContent(
      '(48) 99999-0001',
    );
  });

  it('o telefone sai formatado — dígito cru não se lê num balcão barulhento', () => {
    renderCard();
    expect(screen.queryByText('48999990001')).not.toBeInTheDocument();
  });

  it('o selo do kit fica no cabeçalho, junto do nome', () => {
    renderCard();
    expect(screen.getByText('Kit Ouro')).toBeInTheDocument();
  });

  it('tem nome acessível — é uma seção, não um bloco anônimo', () => {
    renderCard();
    expect(screen.getByRole('region', { name: 'Conferência do participante' })).toBeInTheDocument();
  });

  it('CPF nunca aparece, nem quando o inscrito tem o bloco [reg] cheio', () => {
    renderCard({
      inscrito: mkInscrito({
        ...inscrito,
        dadosPessoais: {
          cpf: '52998224725',
          telefone: '48988887777',
          nascimento: '1990-05-14',
          genero: 'nao_informado',
          cidade: '',
          uf: '',
        },
      }),
      kits,
      pedido: mkPedido(),
      pagamento: mkPagamento(),
    });
    expect(screen.queryByText(/52998224725|529\.982\.247-25/)).not.toBeInTheDocument();
    expect(screen.queryByText(/CPF/)).not.toBeInTheDocument();
  });

  it('sem permissão para a compra: os três campos dizem a CAUSA, e o resto fica', () => {
    renderCard({ inscrito, kits, pedido: null, pagamento: null }, 'negada');

    // O que o operador ainda lê.
    expect(screen.getByRole('heading', { name: 'Marina Silva' })).toBeInTheDocument();
    expect(screen.getByText('Modalidade').nextSibling).toHaveTextContent('21k');
    expect(screen.getByText('Tamanho escolhido').nextSibling).toHaveTextContent('Feminina M');

    // E o que ele lê no lugar dos três — três vezes a mesma causa, nunca um traço.
    expect(screen.getAllByText('Sem permissão para ler a compra')).toHaveLength(3);
  });

  it('inscrição sem compra registrada não vira "sem permissão"', () => {
    renderCard({ inscrito, kits, pedido: null, pagamento: null }, 'sem_pedido');
    expect(screen.getAllByText('Inscrição sem compra registrada')).toHaveLength(3);
    expect(screen.queryByText('Sem permissão para ler a compra')).not.toBeInTheDocument();
  });

  it('inscrição sem kit declara isso nos dois campos do kit', () => {
    renderCard({
      inscrito: mkInscrito({ ...inscrito, kit: 'sem_kit', kitId: null }),
      kits,
      pedido: mkPedido(),
      pagamento: mkPagamento(),
    });
    expect(screen.getAllByText('Inscrição sem kit')).toHaveLength(2);
  });

  it('catálogo indisponível não leva o tamanho junto', () => {
    renderCard({ inscrito, kits: [], pedido: mkPedido(), pagamento: mkPagamento() });
    expect(screen.getByText('Kit inclui').nextSibling).toHaveTextContent(
      'Kit sem itens cadastrados',
    );
    expect(screen.getByText('Tamanho escolhido').nextSibling).toHaveTextContent('Feminina M');
  });
});
