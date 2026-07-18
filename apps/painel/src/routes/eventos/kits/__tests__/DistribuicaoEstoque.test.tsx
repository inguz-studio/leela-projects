import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ToastProvider } from '@leela/design-system';
import { DistribuicaoView } from '../DistribuicaoView';
import { EstoqueView, type EstoqueViewProps } from '../EstoqueView';
import type { Aprovisionamento, ItemKit, Kit } from '@leela/core';
import { mkInscrito, ts } from '../../_test/fixtures';

const AGORA = ts(new Date('2026-04-27T09:00:00Z'));
const pool = [
  mkInscrito({ id: '1', kit: 'kit_ouro', modalidade: '21k', status: 'confirmado', checkinEm: AGORA }),
  mkInscrito({ id: '2', kit: 'kit_ouro', modalidade: '21k', status: 'confirmado' }),
];

function mkKit(over: Partial<Kit>): Kit {
  return {
    id: 'kit_ouro',
    tenantId: 'castelo',
    nome: 'Kit Ouro',
    preco: 120,
    capacidade: 100,
    modalidades: ['21k'],
    itens: [],
    criadoEm: ts(new Date()),
    atualizadoEm: ts(new Date()),
    ...over,
  };
}

// Doc REAL da subcoleção `aprovisionamento` (∑ da Function — a view só lê).
function mkAprov(over: Partial<Aprovisionamento>): Aprovisionamento {
  return {
    id: 'camiseta__M',
    tenantId: 'castelo',
    itemId: 'camiseta',
    tamanho: 'M',
    estado: 'estimativa',
    qtdVendida: 7,
    estoqueFisico: 0,
    aEncomendar: 7,
    alerta: null,
    historico: [],
    criadoEm: ts(new Date('2026-03-01T00:00:00Z')),
    atualizadoEm: ts(new Date('2026-03-01T00:00:00Z')),
    ...over,
  };
}

function mkItem(over: Partial<ItemKit>): ItemKit {
  return {
    id: 'camiseta',
    tenantId: 'castelo',
    eventoId: 'meia-floripa-2026',
    nome: 'Camiseta oficial',
    tamanhado: true,
    origem: 'organizador',
    exibirLogo: false,
    modeloEstoque: 'sob_encomenda',
    tamanhosDisponiveis: ['P', 'M', 'G', 'GG'],
    kits: ['kit_prata'],
    criadoEm: ts(new Date('2026-02-01T00:00:00Z')),
    atualizadoEm: ts(new Date('2026-02-01T00:00:00Z')),
    ...over,
  };
}

function renderEstoque(over: Partial<EstoqueViewProps> = {}) {
  const onTransicao = over.onTransicao ?? vi.fn().mockResolvedValue(undefined);
  render(
    <ToastProvider>
      <EstoqueView
        kits={[mkKit({ capacidade: 100 })]}
        inscritos={pool}
        modalidades={['21k']}
        aprovisionamento={[]}
        itens={[]}
        loading={false}
        error={null}
        {...over}
        onTransicao={onTransicao}
      />
    </ToastProvider>,
  );
  return { onTransicao };
}

describe('DistribuicaoView', () => {
  it('mostra progresso por kit refletindo as retiradas', () => {
    render(<DistribuicaoView inscritos={pool} modalidades={['21k']} loading={false} error={null} />);
    expect(screen.getByText('Retiradas por kit')).toBeInTheDocument();
    // kit_ouro e a modalidade 21k têm o mesmo 1/2 (50%) — ambos presentes
    expect(screen.getAllByText('1 / 2 (50%)').length).toBeGreaterThanOrEqual(2);
    expect(screen.getByRole('progressbar', { name: 'Retirada de Kit Ouro' })).toHaveAttribute(
      'aria-valuenow',
      '50',
    );
  });
});

describe('EstoqueView', () => {
  it('kit esgotado dispara alerta crítico', () => {
    renderEstoque({ kits: [mkKit({ capacidade: 1 })] });
    expect(screen.getByRole('alert')).toHaveTextContent('sem saldo');
    expect(screen.getByText('Esgotado')).toBeInTheDocument();
  });

  it('capacidade ausente degrada para "—" sem fabricar número', () => {
    renderEstoque({ kits: [mkKit({ capacidade: 0 })] });
    expect(screen.getByText('Sem capacidade')).toBeInTheDocument();
  });

  it('mostra KPIs de estoque a partir do dado real (capacidade + presença)', () => {
    renderEstoque();
    // pool: 2 confirmados em kit_ouro/21k, 1 com presença → retirados = 1
    // "Retirados" é label de KPI e header de coluna → mais de um nó
    expect(screen.getAllByText('Retirados').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Disponíveis')).toBeInTheDocument();
    // saldo = 100 − 1 = 99 (KPI de disponíveis e coluna de saldo)
    expect(screen.getAllByText('99').length).toBeGreaterThanOrEqual(1);
  });

  it('matriz kit × modalidade mostra retirados / confirmados por célula', () => {
    renderEstoque();
    expect(screen.getByText('Kit por modalidade')).toBeInTheDocument();
    // Kit Ouro em 21k: 1 retirado / 2 confirmados — aparece na célula e no total
    expect(screen.getAllByText('1 / 2').length).toBeGreaterThanOrEqual(1);
  });

  it('sem kits cadastrados mostra empty state (não inventa linhas)', () => {
    renderEstoque({ kits: [], inscritos: [] });
    expect(screen.getByText('Nenhum kit para controlar')).toBeInTheDocument();
  });

  // ---------------------------------------------------------------------------
  // S210-T4 — estoque por SKU (dado REAL da subcoleção `aprovisionamento`)
  // ---------------------------------------------------------------------------

  it('sem SKU tamanhado: EmptyState honesto; movimentações seguem como dependência', () => {
    renderEstoque({ aprovisionamento: [] });
    expect(screen.getByText('Nenhum SKU de tamanho neste evento')).toBeInTheDocument();
    expect(screen.getByText('Movimentações ainda não disponíveis')).toBeInTheDocument();
  });

  it('renderiza os ∑ do doc por SKU (vendido/físico/a-encomendar) SEM recalcular', () => {
    renderEstoque({
      aprovisionamento: [
        // ∑ vêm carimbados pela Function: a view exibe EXATAMENTE estes valores.
        mkAprov({ id: 'camiseta__M', tamanho: 'M', qtdVendida: 7, estoqueFisico: 0, aEncomendar: 7 }),
        mkAprov({
          id: 'camiseta__G',
          tamanho: 'G',
          estado: 'em_estoque',
          qtdVendida: 2,
          estoqueFisico: 12,
          aEncomendar: 0,
          historico: [{ estado: 'encomendado', qtd: 12, em: AGORA }, { estado: 'em_estoque', qtd: 12, em: AGORA }],
        }),
      ],
      itens: [mkItem({})],
    });
    // Nome do item via catálogo (join visual) + tamanhos como linhas
    expect(screen.getAllByText('Camiseta oficial').length).toBeGreaterThanOrEqual(2);
    // vendido M = 7 E a-encomendar M = 7 — os DOIS ∑ vêm do doc, célula a célula
    expect(screen.getAllByText('7').length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText('12')).toBeInTheDocument(); // físico G
    // Estados da máquina como Badge (RN-226)
    expect(screen.getByText('Estimativa')).toBeInTheDocument();
    expect(screen.getByText('Em estoque')).toBeInTheDocument();
  });

  it('ordena tamanhos pela ordem canônica do catálogo (P antes de M antes de G)', () => {
    renderEstoque({
      aprovisionamento: [
        mkAprov({ id: 'camiseta__G', tamanho: 'G' }),
        mkAprov({ id: 'camiseta__P', tamanho: 'P' }),
        mkAprov({ id: 'camiseta__M', tamanho: 'M' }),
      ],
      itens: [mkItem({})],
    });
    // Os spans de VALOR da coluna Tamanho (o rótulo do card-mode fica em span
    // separado) — ordem no documento = ordem das linhas.
    const tamanhos = screen.getAllByText(/^(P|M|G)$/).map((n) => n.textContent);
    expect(tamanhos).toEqual(['P', 'M', 'G']);
  });

  it('alerta de baixa vem do doc (limiar do servidor) e fica visível em banner + badge', () => {
    renderEstoque({
      aprovisionamento: [
        mkAprov({
          id: 'camiseta__M',
          estado: 'em_estoque',
          qtdVendida: 8,
          estoqueFisico: 10,
          aEncomendar: 0,
          alerta: 'baixa',
        }),
      ],
      itens: [mkItem({})],
    });
    // Banner role=alert com o SKU nomeado
    const alerts = screen.getAllByRole('alert');
    expect(alerts.some((a) => a.textContent?.includes('SKU(s) em alerta'))).toBe(true);
    // Badge "Baixa" na linha
    expect(screen.getByText('Baixa')).toBeInTheDocument();
  });

  it('sem catálogo carregado o nome degrada para o itemId (ausência honesta)', () => {
    renderEstoque({ aprovisionamento: [mkAprov({})], itens: [] });
    expect(screen.getAllByText('camiseta').length).toBeGreaterThanOrEqual(1);
  });

  it('estimativa → "Encomendar" abre modal com sugestão = aEncomendar do doc e chama a transição', async () => {
    const onTransicao = vi.fn().mockResolvedValue(undefined);
    renderEstoque({
      aprovisionamento: [mkAprov({ aEncomendar: 7 })],
      itens: [mkItem({})],
      onTransicao,
    });

    await userEvent.click(screen.getByRole('button', { name: 'Encomendar' }));
    const input = screen.getByLabelText('Quantidade a encomendar');
    expect(input).toHaveValue(7); // sugestão lida do doc, não recalculada
    await userEvent.click(screen.getByRole('button', { name: 'Confirmar' }));

    await waitFor(() =>
      expect(onTransicao).toHaveBeenCalledWith('camiseta__M', 'encomendado', 7),
    );
  });

  it('encomendado → "Receber" sugere a qtd da última encomenda e declara estoque', async () => {
    const onTransicao = vi.fn().mockResolvedValue(undefined);
    renderEstoque({
      aprovisionamento: [
        mkAprov({
          estado: 'encomendado',
          historico: [{ estado: 'encomendado', qtd: 10, em: AGORA }],
        }),
      ],
      itens: [mkItem({})],
      onTransicao,
    });

    await userEvent.click(screen.getByRole('button', { name: 'Receber' }));
    const input = screen.getByLabelText('Quantidade recebida');
    expect(input).toHaveValue(10); // última encomenda do historico (RN-226)
    await userEvent.clear(input);
    await userEvent.type(input, '9');
    await userEvent.click(screen.getByRole('button', { name: 'Confirmar' }));

    await waitFor(() =>
      expect(onTransicao).toHaveBeenCalledWith('camiseta__M', 'em_estoque', 9),
    );
  });

  it('em_estoque é terminal (RN-226): linha sem botão de ação', () => {
    renderEstoque({
      aprovisionamento: [
        mkAprov({ estado: 'em_estoque', qtdVendida: 2, estoqueFisico: 20, aEncomendar: 0 }),
      ],
      itens: [mkItem({})],
    });
    expect(screen.queryByRole('button', { name: 'Encomendar' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Receber' })).not.toBeInTheDocument();
  });

  it('erro do servidor na transição vira Toast (mensagem sobe intacta)', async () => {
    const onTransicao = vi
      .fn()
      .mockRejectedValue(new Error("Transição 'em_estoque' → 'encomendado' inválida (RN-226)"));
    renderEstoque({
      aprovisionamento: [mkAprov({})],
      itens: [mkItem({})],
      onTransicao,
    });

    await userEvent.click(screen.getByRole('button', { name: 'Encomendar' }));
    await userEvent.click(screen.getByRole('button', { name: 'Confirmar' }));

    await waitFor(() =>
      expect(screen.getByText('Falha na transição do SKU')).toBeInTheDocument(),
    );
  });
});
