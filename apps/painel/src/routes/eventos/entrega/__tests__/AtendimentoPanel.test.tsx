import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ToastProvider } from '@leela/design-system';
import { AtendimentoPanel } from '../AtendimentoPanel';
import { mkEvento, mkInscrito, mkKit, mkPagamento, mkPedido } from '../../_test/fixtures';
import type { Evento, Inscrito, ItemKit, Kit } from '@leela/core';

// O card de conferência (CRED-BUSCA) busca o join `[pag]` via TanStack Query —
// mesmo molde do slide-in dos Inscritos. Stub padrão = "sem pedido", que é o
// caminho degradado; os testes do card injetam o pedido real quando precisam.
const joinPedido = vi.fn().mockResolvedValue({ pedido: null, pagamento: null });

vi.mock('@leela/api-client', () => ({
  INSCRITOS_PAGE_SIZE: 200,
  getLeelaDb: () => ({}),
  getPedidoEPagamentoDoInscrito: (...args: unknown[]) => joinPedido(...args),
}));

function setup(opts: {
  evento?: Partial<Evento>;
  inscrito?: Partial<Inscrito>;
  itensKit?: ItemKit[];
  kits?: Kit[];
  vincular?: ReturnType<typeof vi.fn>;
  registrar?: ReturnType<typeof vi.fn>;
}) {
  const inscrito = mkInscrito({ atletaNome: 'Marina Silva', chipNumero: null, ...opts.inscrito });
  const vincular =
    opts.vincular ?? vi.fn().mockResolvedValue({ ok: true, chip: 'ABC123' });
  const registrar = opts.registrar ?? vi.fn().mockResolvedValue({ ok: true, jaRegistrado: false });
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  render(
    <QueryClientProvider client={client}>
      <ToastProvider>
        <AtendimentoPanel
          evento={mkEvento(opts.evento)}
          inscritos={[inscrito]}
          itensKit={opts.itensKit ?? []}
          kits={opts.kits ?? []}
          onVincular={vincular}
          onRegistrar={registrar}
        />
      </ToastProvider>
    </QueryClientProvider>,
  );
  return { vincular, registrar };
}

function mkItem(over: Partial<ItemKit> = {}): ItemKit {
  return {
    id: over.id ?? 'item-1',
    tenantId: 'castelo',
    eventoId: 'meia-floripa-2026',
    nome: over.nome ?? 'Camiseta técnica',
    tamanhado: over.tamanhado ?? false,
    origem: over.origem ?? 'organizador',
    exibirLogo: over.exibirLogo ?? false,
    modeloEstoque: over.modeloEstoque ?? 'sob_encomenda',
    tamanhosDisponiveis: over.tamanhosDisponiveis ?? [],
    // Chave canônica Kit↔enum (FABLE-E-T1): item referencia o id do enum
    kits: over.kits ?? ['kit_ouro'],
    criadoEm: mkInscrito().criadoEm,
    atualizadoEm: mkInscrito().atualizadoEm,
    ...over,
  };
}

async function selecionar(nome: string) {
  await userEvent.type(screen.getByLabelText('Buscar atleta'), nome);
  // A linha de resultado agora carrega nome + modalidade, então o nome
  // acessível do botão é os dois — casa por conteúdo, não por igualdade.
  await userEvent.click(screen.getByRole('button', { name: new RegExp(nome) }));
}

describe('AtendimentoPanel', () => {
  it('sem_kit + usaChip=false: sem passo de chip, botão registra presença', async () => {
    const { registrar } = setup({ evento: { usaChip: false }, inscrito: { kit: 'sem_kit' } });
    await selecionar('Marina Silva');
    expect(screen.queryByLabelText('Número do chip')).not.toBeInTheDocument();
    const btn = screen.getByRole('button', { name: 'Registrar presença' });
    await userEvent.click(btn);
    await waitFor(() => expect(registrar).toHaveBeenCalledTimes(1));
    expect(await screen.findByText('Presença registrada')).toBeInTheDocument();
  });

  it('usaChip=false + kit: botão entrega kit e registra presença', async () => {
    setup({ evento: { usaChip: false }, inscrito: { kit: 'kit_ouro' } });
    await selecionar('Marina Silva');
    expect(
      screen.getByRole('button', { name: 'Entregar kit e registrar presença' }),
    ).toBeInTheDocument();
  });

  // QA m3: a escrita do kit acontece no fechamento (RN-205) — com chip
  // pendente e SEM kitEntregueEm, NENHUM passo pode aparecer concluído.
  it('chip pendente sem entrega: passo "Entregar kit" NÃO aparece concluído (m3)', async () => {
    setup({
      evento: { usaChip: true },
      inscrito: { kit: 'kit_ouro', chipNumero: null },
    });
    await selecionar('Marina Silva');
    expect(screen.getByLabelText('Número do chip')).toBeInTheDocument();
    // Antes do fix, o passo 1 herdava ✓ da derivação linear (current no chip).
    expect(screen.queryByText('(concluída)')).not.toBeInTheDocument();
  });

  it('usaChip=true: exibe input de chip e vincula', async () => {
    const { vincular } = setup({ evento: { usaChip: true }, inscrito: { kit: 'kit_ouro' } });
    await selecionar('Marina Silva');
    await userEvent.type(screen.getByLabelText('Número do chip'), 'ABC123');
    await userEvent.click(screen.getByRole('button', { name: 'Vincular chip' }));
    await waitFor(() => expect(vincular).toHaveBeenCalledWith('ins-1', 'ABC123', false));
  });

  it('checklist do kit: renderiza os itens reais do kit do atleta (RN-215)', async () => {
    setup({
      evento: { usaChip: true },
      inscrito: { kit: 'kit_ouro' },
      itensKit: [
        mkItem({ id: 'camiseta', nome: 'Camiseta técnica', tamanhado: true, kits: ['kit_ouro'] }),
        mkItem({
          id: 'whey',
          nome: 'Sachê de whey',
          origem: 'patrocinador',
          marca: 'Growth',
          kits: ['kit_ouro'],
        }),
        mkItem({ id: 'outro', nome: 'Item de outro kit', kits: ['kit_basico'] }),
      ],
    });
    await selecionar('Marina Silva');
    expect(screen.getByText('Camiseta técnica')).toBeInTheDocument();
    expect(screen.getByText('Sachê de whey')).toBeInTheDocument();
    expect(screen.getByText('Growth')).toBeInTheDocument();
    // Item que não pertence ao kit do atleta não aparece.
    expect(screen.queryByText('Item de outro kit')).not.toBeInTheDocument();
  });

  it('checklist do kit: sem_kit não mostra checklist', async () => {
    setup({
      evento: { usaChip: false },
      inscrito: { kit: 'sem_kit' },
      itensKit: [mkItem({ id: 'camiseta', nome: 'Camiseta técnica', kits: ['kit_basico'] })],
    });
    await selecionar('Marina Silva');
    expect(screen.queryByText('Camiseta técnica')).not.toBeInTheDocument();
  });

  it('conflito de chip abre ConfirmModal e sobrescreve (RN-206)', async () => {
    const vincular = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, conflito: { inscritoId: 'x', atletaNome: 'Outro Atleta' } })
      .mockResolvedValueOnce({ ok: true, chip: 'ABC123' });
    setup({ evento: { usaChip: true }, inscrito: { kit: 'kit_ouro' }, vincular });
    await selecionar('Marina Silva');
    await userEvent.type(screen.getByLabelText('Número do chip'), 'ABC123');
    await userEvent.click(screen.getByRole('button', { name: 'Vincular chip' }));
    expect(await screen.findByText('Chip já vinculado a outro atleta')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Sobrescrever chip' }));
    await waitFor(() => expect(vincular).toHaveBeenLastCalledWith('ins-1', 'ABC123', true));
  });
});

describe('AtendimentoPanel — entrega por corte x tamanho (RN-231 · TAMANHOS-GRADE)', () => {
  it('checklist mostra o corte+tamanho ESCOLHIDOS pelo atleta', async () => {
    setup({
      evento: { usaChip: false },
      inscrito: { kit: 'kit_ouro', tamanhos: { 'item-1': 'feminina__M' } },
      itensKit: [mkItem({ id: 'item-1', tamanhado: true })],
    });
    await selecionar('Marina Silva');
    expect(screen.getByText(/· Feminina M/)).toBeInTheDocument();
    expect(screen.queryByText('· tamanho a conferir')).not.toBeInTheDocument();
  });

  it('sufixo bare (unissex/legado) mostra so o tamanho', async () => {
    setup({
      evento: { usaChip: false },
      inscrito: { kit: 'kit_ouro', tamanhos: { 'item-1': 'GG' } },
      itensKit: [mkItem({ id: 'item-1', tamanhado: true })],
    });
    await selecionar('Marina Silva');
    expect(screen.getByText(/· GG/)).toBeInTheDocument();
  });

  it('sem escolha registrada degrada para "tamanho a conferir"', async () => {
    setup({
      evento: { usaChip: false },
      inscrito: { kit: 'kit_ouro', tamanhos: {} },
      itensKit: [mkItem({ id: 'item-1', tamanhado: true })],
    });
    await selecionar('Marina Silva');
    expect(screen.getByText('· tamanho a conferir')).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// CRED-BUSCA (17/08) — a busca conta quem é a pessoa.
// ---------------------------------------------------------------------------

describe('busca e card de conferência (CRED-BUSCA)', () => {
  const comCpf = {
    kit: 'kit_ouro' as const,
    kitId: 'kit-ouro-2026',
    modalidade: '21k',
    tamanhos: { camiseta: 'feminina__M' },
    dadosPessoais: {
      cpf: '52998224725',
      telefone: '',
      nascimento: '1990-05-14',
      genero: 'nao_informado' as const,
      cidade: '',
      uf: '',
    },
  };

  const kitsDoEvento = [
    mkKit({ id: 'kit-ouro-2026', itens: ['Camiseta técnica', 'Medalha', 'Sacola'] }),
  ];

  it('a caixa diz que aceita CPF — busca que ninguém sabe que existe não é busca', () => {
    setup({ inscrito: comCpf, kits: kitsDoEvento });
    expect(screen.getByLabelText('Buscar atleta')).toHaveAttribute(
      'placeholder',
      'Nome, CPF ou código',
    );
  });

  it('acha o participante digitando o CPF COM máscara', async () => {
    setup({ inscrito: comCpf, kits: kitsDoEvento });
    await userEvent.type(screen.getByLabelText('Buscar atleta'), '529.982.247-25');
    expect(screen.getByRole('button', { name: /Marina Silva/ })).toBeInTheDocument();
  });

  it('acha o mesmo participante digitando o CPF sem máscara', async () => {
    setup({ inscrito: comCpf, kits: kitsDoEvento });
    await userEvent.type(screen.getByLabelText('Buscar atleta'), '52998224725');
    expect(screen.getByRole('button', { name: /Marina Silva/ })).toBeInTheDocument();
  });

  it('a linha de resultado mostra a modalidade — homônimo desempatado antes do clique', async () => {
    setup({ inscrito: comCpf, kits: kitsDoEvento });
    await userEvent.type(screen.getByLabelText('Buscar atleta'), 'Marina');
    expect(screen.getByRole('button', { name: /Marina Silva.*21k/ })).toBeInTheDocument();
  });

  it('escolhido o participante, o card traz lote e contato de compra', async () => {
    joinPedido.mockResolvedValueOnce({ pedido: mkPedido(), pagamento: mkPagamento() });
    setup({ inscrito: comCpf, kits: kitsDoEvento });
    await selecionar('Marina Silva');

    await waitFor(() => {
      expect(screen.getByText('Lote 2 — Regular')).toBeInTheDocument();
    });
    expect(screen.getByText('marina@exemplo.com')).toBeInTheDocument();
    expect(screen.getByText('(48) 99999-0001')).toBeInTheDocument();
    expect(screen.getByText('Camiseta técnica · Medalha · Sacola')).toBeInTheDocument();
    // V2708-14: o tamanho "Feminina M" aparece no card de conferência E no
    // resumo de tamanhos do ChecklistKit (quando itensKit vazio mas tamanho existe).
    expect(screen.getAllByText('Feminina M').length).toBeGreaterThan(0);
  });

  it('compra negada pelas Rules não derruba o check-in', async () => {
    joinPedido.mockRejectedValueOnce(new Error('permission-denied'));
    setup({ evento: { usaChip: false }, inscrito: comCpf, kits: kitsDoEvento });
    await selecionar('Marina Silva');

    await waitFor(() => {
      expect(screen.getAllByText('Sem permissão para ler a compra').length).toBeGreaterThan(0);
    });
    // O nome, o kit e o botão de fechar o atendimento seguem de pé.
    expect(screen.getByRole('heading', { name: 'Marina Silva' })).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Entregar kit e registrar presença' }),
    ).toBeInTheDocument();
  });

  it('o CPF nunca chega à tela, nem depois de ser usado para achar a pessoa', async () => {
    joinPedido.mockResolvedValueOnce({ pedido: mkPedido(), pagamento: mkPagamento() });
    setup({ inscrito: comCpf, kits: kitsDoEvento });
    await userEvent.type(screen.getByLabelText('Buscar atleta'), '52998224725');
    await userEvent.click(screen.getByRole('button', { name: /Marina Silva/ }));

    await waitFor(() => {
      expect(screen.getByText('marina@exemplo.com')).toBeInTheDocument();
    });
    // A caixa de busca é limpa na escolha (`selecionar`), então o CPF digitado
    // também sai da tela — nada de CPF pendurado no balcão entre atendimentos.
    expect(screen.queryByText(/52998224725|529\.982\.247-25/)).not.toBeInTheDocument();
    expect(screen.getByLabelText('Buscar atleta')).toHaveValue('');
  });
});
