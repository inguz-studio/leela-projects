import { describe, it, expect, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ToastProvider } from '@leela/design-system';
import { DistribuicaoView, type DistribuicaoViewProps } from '../DistribuicaoView';
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
    corte: 'unissex',
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

function renderAba(over: Partial<DistribuicaoViewProps> = {}) {
  const onTransicao = over.onTransicao ?? vi.fn().mockResolvedValue(undefined);
  const onEncerrarEncomendas =
    over.onEncerrarEncomendas ??
    vi.fn().mockResolvedValue({ encerrados: [], jaEncerrados: [] });
  render(
    <ToastProvider>
      <DistribuicaoView
        kits={[mkKit({ capacidade: 100 })]}
        inscritos={pool}
        modalidades={['21k']}
        aprovisionamento={[]}
        itens={[]}
        loading={false}
        error={null}
        {...over}
        onTransicao={onTransicao}
        onEncerrarEncomendas={onEncerrarEncomendas}
      />
    </ToastProvider>,
  );
  return { onTransicao, onEncerrarEncomendas };
}

describe('DistribuicaoView · o lado da retirada', () => {
  it('mostra progresso por kit refletindo as retiradas', () => {
    renderAba();
    expect(screen.getByText('Retirada por kit')).toBeInTheDocument();
    // kit_ouro e a modalidade 21k têm o mesmo 1/2 (50%) — ambos presentes
    expect(screen.getAllByText('1 / 2 (50%)').length).toBeGreaterThanOrEqual(2);
    expect(screen.getByRole('progressbar', { name: 'Retirada de Kit Ouro' })).toHaveAttribute(
      'aria-valuenow',
      '50',
    );
  });

  it('a retirada por modalidade vem na MESMA aba que o estoque (S1258)', () => {
    renderAba();
    expect(screen.getByText('Retirada por modalidade')).toBeInTheDocument();
    // As duas metades convivem: progresso E tabela de SKU, sem trocar de aba.
    expect(screen.getByText('Estoque por tamanho')).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// S1258 — a convergência para UMA fonte.
//
// A medição da leva 11 achou TRÊS cortes do mesmo número (presença registrada):
// as barras de progresso, o KPI "Retirados" e a coluna Retirados/confirmados da
// matriz. Estes testes fixam onde a retirada passou a morar — e onde ela parou
// de aparecer —, porque um "volta rapidinho a coluna" desfaz a decisão sem que
// nada mais quebre.
// ---------------------------------------------------------------------------

describe('S1258 · a retirada tem UMA fonte por leitura', () => {
  it('a matriz de estoque NÃO tem mais coluna "Retirados"', () => {
    renderAba();
    const cabecalhos = screen
      .getAllByRole('columnheader')
      .map((c) => c.textContent?.trim());
    expect(cabecalhos).not.toContain('Retirados');
    expect(cabecalhos).toContain('Confirmados');
  });

  it('a célula da matriz diz a DEMANDA (confirmados), não retirados/confirmados', () => {
    renderAba();
    expect(screen.getByText('Estoque por kit e modalidade')).toBeInTheDocument();
    // Kit Ouro em 21k: 2 confirmados, 1 retirado. A célula mostra só a demanda.
    expect(screen.queryByText('1 / 2')).toBeNull();
  });

  it('"Retirados" sobrou só como manchete — o KPI', () => {
    renderAba();
    // Um nó de texto, e ele é o rótulo do KPI (não header de coluna).
    const retirados = screen.getAllByText('Retirados');
    expect(retirados).toHaveLength(1);
    expect(retirados[0]?.closest('th')).toBeNull();
  });

  it('a tabela de SKU/aprovisionamento vem inteira (nenhum dado se perde)', () => {
    renderAba({ aprovisionamento: [mkAprov({})], itens: [mkItem({})] });
    const cabecalhos = screen
      .getAllByRole('columnheader')
      .map((c) => c.textContent?.trim());
    for (const coluna of ['Vendido', 'Físico', 'A encomendar', 'Entregues', 'Estado', 'Alerta']) {
      expect(cabecalhos).toContain(coluna);
    }
  });
});

describe('DistribuicaoView · o lado do estoque', () => {
  it('kit esgotado dispara alerta crítico', () => {
    renderAba({ kits: [mkKit({ capacidade: 1 })] });
    expect(screen.getByRole('alert')).toHaveTextContent('sem saldo');
    expect(screen.getByText('Esgotado')).toBeInTheDocument();
  });

  it('capacidade ausente degrada para "—" sem fabricar número', () => {
    renderAba({ kits: [mkKit({ capacidade: 0 })] });
    expect(screen.getByText('Sem capacidade')).toBeInTheDocument();
  });

  it('mostra KPIs de estoque a partir do dado real (capacidade + presença)', () => {
    renderAba();
    // pool: 2 confirmados em kit_ouro/21k, 1 com presença → retirados = 1
    expect(screen.getByText('Retirados')).toBeInTheDocument();
    expect(screen.getByText('Disponíveis')).toBeInTheDocument();
    // saldo = 100 − 1 = 99 (KPI de disponíveis e coluna de saldo)
    expect(screen.getAllByText('99').length).toBeGreaterThanOrEqual(1);
  });

  it('matriz kit × modalidade mantém capacidade, saldo e status', () => {
    renderAba();
    expect(screen.getByText('Estoque por kit e modalidade')).toBeInTheDocument();
    expect(screen.getByText('Disponível')).toBeInTheDocument();
    // capacidade 100 segue legível por kit (e no KPI de total — 2 nós)
    expect(screen.getAllByText('100').length).toBeGreaterThanOrEqual(1);
  });

  it('sem kits cadastrados mostra empty state (não inventa linhas)', () => {
    renderAba({ kits: [], inscritos: [] });
    expect(screen.getByText('Nenhum kit para controlar')).toBeInTheDocument();
  });

  // ---------------------------------------------------------------------------
  // S210-T4 — estoque por SKU (dado REAL da subcoleção `aprovisionamento`)
  // ---------------------------------------------------------------------------

  it('sem SKU tamanhado: EmptyState honesto; movimentações seguem como dependência', () => {
    renderAba({ aprovisionamento: [] });
    expect(screen.getByText('Nenhum SKU de tamanho neste evento')).toBeInTheDocument();
    expect(screen.getByText('Movimentações ainda não disponíveis')).toBeInTheDocument();
  });

  it('renderiza os ∑ do doc por SKU (vendido/físico/a-encomendar) SEM recalcular', () => {
    renderAba({
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
    renderAba({
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
    renderAba({
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
    renderAba({ aprovisionamento: [mkAprov({})], itens: [] });
    expect(screen.getAllByText('camiseta').length).toBeGreaterThanOrEqual(1);
  });

  it('estimativa → "Encomendar" abre modal com sugestão = aEncomendar do doc e chama a transição', async () => {
    const onTransicao = vi.fn().mockResolvedValue(undefined);
    renderAba({
      aprovisionamento: [mkAprov({ aEncomendar: 7 })],
      itens: [mkItem({})],
      onTransicao,
    });

    await userEvent.click(screen.getByRole('button', { name: 'Encomendar' }));
    const input = screen.getByLabelText('Quantidade a encomendar');
    // String, e não número: o campo é de TEXTO com teclado numérico desde o
    // PARSE-1 — como `type="number"` a recusa do parser não tinha onde aparecer.
    expect(input).toHaveValue('7'); // sugestão lida do doc, não recalculada
    await userEvent.click(screen.getByRole('button', { name: 'Confirmar' }));

    await waitFor(() =>
      expect(onTransicao).toHaveBeenCalledWith('camiseta__M', 'encomendado', 7),
    );
  });

  it('encomendado → "Receber" sugere a qtd da última encomenda e declara estoque', async () => {
    const onTransicao = vi.fn().mockResolvedValue(undefined);
    renderAba({
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
    expect(input).toHaveValue('10'); // última encomenda do historico (RN-226)
    await userEvent.clear(input);
    await userEvent.type(input, '9');
    await userEvent.click(screen.getByRole('button', { name: 'Confirmar' }));

    await waitFor(() =>
      expect(onTransicao).toHaveBeenCalledWith('camiseta__M', 'em_estoque', 9),
    );
  });

  it('em_estoque é terminal (RN-226): linha sem botão de ação', () => {
    renderAba({
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
    renderAba({
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

describe('DistribuicaoView — grade por corte (RN-231/232 · TAMANHOS-GRADE)', () => {
  const aprovGrade = [
    mkAprov({ id: 'camiseta__feminina__M', corte: 'feminina', tamanho: 'M', qtdVendida: 3, aEncomendar: 3 }),
    mkAprov({ id: 'camiseta__masculina__G', corte: 'masculina', tamanho: 'G', qtdVendida: 1, aEncomendar: 1 }),
  ];

  it('SKU com corte mostra a coluna Corte com o rotulo pt-BR', () => {
    renderAba({ aprovisionamento: aprovGrade, itens: [mkItem({})] });
    expect(screen.getAllByText('Corte').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Feminina').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Masculina').length).toBeGreaterThanOrEqual(1);
  });

  it('evento 100% unissex/legado NAO mostra a coluna Corte (tabela enxuta)', () => {
    renderAba({ aprovisionamento: [mkAprov({})], itens: [mkItem({})] });
    expect(screen.queryAllByText('Corte')).toHaveLength(0);
  });

  it('coluna Entregues acompanha a retirada por corte x tamanho (fulfillment do balcao)', () => {
    const inscritos = [
      // entregue (presenca registrada) — SKU feminina M
      mkInscrito({ id: 'e1', kit: 'kit_ouro', modalidade: '21k', status: 'confirmado', checkinEm: AGORA, tamanhos: { camiseta: 'feminina__M' } }),
      // pendente — mesmo SKU
      mkInscrito({ id: 'e2', kit: 'kit_ouro', modalidade: '21k', status: 'confirmado', tamanhos: { camiseta: 'feminina__M' } }),
    ];
    renderAba({ inscritos, aprovisionamento: aprovGrade, itens: [mkItem({})] });
    expect(screen.getAllByText('Entregues').length).toBeGreaterThanOrEqual(1);
    // 1 entregue de 2 escolhidos no SKU feminina M
    expect(screen.getAllByText('/ 2').length).toBeGreaterThanOrEqual(1);
  });

  it('ENCERRAR ENCOMENDAS: confirma no modal e chama a callable com o itemId', async () => {
    const onEncerrarEncomendas = vi.fn().mockResolvedValue({
      encerrados: ['camiseta__feminina__M', 'camiseta__masculina__G'],
      jaEncerrados: [],
    });
    renderAba({ aprovisionamento: aprovGrade, itens: [mkItem({})], onEncerrarEncomendas });

    await userEvent.click(
      screen.getByRole('button', { name: /Encerrar encomendas · Camiseta oficial/ }),
    );
    // Semantica explicita no modal: vendas continuam abertas
    expect(await screen.findByText(/continuam abertas/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Encerrar encomendas' }));

    await waitFor(() => expect(onEncerrarEncomendas).toHaveBeenCalledWith('camiseta'));
    await waitFor(() =>
      expect(screen.getByText('Encomendas encerradas')).toBeInTheDocument(),
    );
  });

  it('item sem SKU em estimativa NAO oferece encerrar encomendas', () => {
    renderAba({
      aprovisionamento: [
        mkAprov({ id: 'camiseta__feminina__M', corte: 'feminina', estado: 'encomendado' }),
      ],
      itens: [mkItem({})],
    });
    expect(
      screen.queryByRole('button', { name: /Encerrar encomendas/ }),
    ).not.toBeInTheDocument();
  });

  it('falha do servidor no encerramento vira Toast (mensagem intacta)', async () => {
    const onEncerrarEncomendas = vi
      .fn()
      .mockRejectedValue(new Error('Evento pertence a outro tenant (RN-400).'));
    renderAba({ aprovisionamento: aprovGrade, itens: [mkItem({})], onEncerrarEncomendas });
    await userEvent.click(
      screen.getByRole('button', { name: /Encerrar encomendas · Camiseta oficial/ }),
    );
    await userEvent.click(screen.getByRole('button', { name: 'Encerrar encomendas' }));
    await waitFor(() =>
      expect(screen.getByText('Falha ao encerrar encomendas')).toBeInTheDocument(),
    );
  });
});

// =============================================================================
// PARSE-1 · o campo de quantidade do estoque (um dos dezoito).
//
// Era `type="number"`, e a recusa era uma frase só ("Informe um número inteiro
// maior ou igual a zero") para casa decimal, para letra e para campo em branco.
// =============================================================================

describe('PARSE-1 · a recusa do parser tem onde aparecer no estoque', () => {
  it('é campo de TEXTO com teclado numérico', async () => {
    renderAba({ aprovisionamento: [mkAprov({ aEncomendar: 7 })], itens: [mkItem({})] });
    await userEvent.click(screen.getByRole('button', { name: 'Encomendar' }));
    const campo = screen.getByLabelText('Quantidade a encomendar');
    expect(campo).toHaveAttribute('type', 'text');
    expect(campo).toHaveAttribute('inputmode', 'numeric');
  });

  it('casa decimal na quantidade diz o que fazer, e nada é chamado', async () => {
    const onTransicao = vi.fn().mockResolvedValue(undefined);
    renderAba({
      aprovisionamento: [mkAprov({ aEncomendar: 7 })],
      itens: [mkItem({})],
      onTransicao,
    });
    await userEvent.click(screen.getByRole('button', { name: 'Encomendar' }));
    const campo = screen.getByLabelText('Quantidade a encomendar');
    fireEvent.change(campo, { target: { value: '2,5' } });
    expect(campo).toHaveValue('2,5');
    await userEvent.click(screen.getByRole('button', { name: 'Confirmar' }));

    expect(
      await screen.findByText(
        'A quantidade é um número inteiro, sem casas decimais. Para mil, escreva 1.000 ou 1000.',
      ),
    ).toBeInTheDocument();
    expect(onTransicao).not.toHaveBeenCalled();
  });

  it('BASELINE colar de planilha: "1.000" camisetas continuam sendo mil', async () => {
    const onTransicao = vi.fn().mockResolvedValue(undefined);
    renderAba({
      aprovisionamento: [mkAprov({ aEncomendar: 7 })],
      itens: [mkItem({})],
      onTransicao,
    });
    await userEvent.click(screen.getByRole('button', { name: 'Encomendar' }));
    fireEvent.change(screen.getByLabelText('Quantidade a encomendar'), {
      target: { value: '1.000' },
    });
    await userEvent.click(screen.getByRole('button', { name: 'Confirmar' }));

    await waitFor(() =>
      expect(onTransicao).toHaveBeenCalledWith('camiseta__M', 'encomendado', 1000),
    );
  });
});
