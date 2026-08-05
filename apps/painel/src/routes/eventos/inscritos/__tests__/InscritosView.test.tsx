import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ToastProvider } from '@leela/design-system';
import type { StatusInscrito } from '@leela/core';
import { InscritosView } from '../InscritosView';
import { mkInscrito } from '../../_test/fixtures';

// O slide-in (S203-T3) busca o join `[pag]` via TanStack Query. Mock só do que
// o grafo desta tela usa do api-client: INSCRITOS_PAGE_SIZE (18, §2.5) + o
// gateway de leitura do join, stubado para "sem pedido" (os demais imports do
// gateway de queries são lazy e não são chamados aqui).
vi.mock('@leela/api-client', () => ({
  INSCRITOS_PAGE_SIZE: 18,
  getLeelaDb: () => ({}),
  getPedidoEPagamentoDoInscrito: vi.fn().mockResolvedValue({ pedido: null, pagamento: null }),
}));

// A view usa useToast() → precisa do provider (como em produção: EventosRoutes).
// O slide-in usa useQuery → precisa do QueryClientProvider (raiz em produção).
function renderView(
  props: Omit<Parameters<typeof InscritosView>[0], 'eventoId'> & { eventoId?: string },
) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return render(
    <QueryClientProvider client={client}>
      <ToastProvider>
        <InscritosView eventoId="meia-floripa-2026" {...props} />
      </ToastProvider>
    </QueryClientProvider>,
  );
}

/**
 * O rótulo da caixa de busca nomeia os TRÊS campos que ela casa (RN-397 +
 * RN-475). Ele mora numa constante aqui porque é aceite, não detalhe: busca
 * que ninguém sabe que existe não é busca.
 */
const LABEL_BUSCA = 'Buscar atleta pelo nome, código do ingresso ou código da compra';

function muitosInscritos(n: number, status: StatusInscrito = 'confirmado') {
  return Array.from({ length: n }, (_, i) =>
    mkInscrito({
      id: `i${i}`,
      atletaNome: i === 0 ? 'Marina Silva' : `Atleta ${String(i).padStart(3, '0')}`,
      modalidade: '10k',
      status,
    }),
  );
}

describe('InscritosView', () => {
  it('mostra ~18 linhas por página e contador com o total', () => {
    renderView({ inscritos: muitosInscritos(453), loading: false, error: null, modalidades: ['10k'] });
    // header + 18 linhas de dados
    expect(screen.getAllByRole('row')).toHaveLength(19);
    expect(screen.getByText('Mostrando 453 de 453')).toBeInTheDocument();
  });

  it('busca "Marina" filtra e atualiza o contador', async () => {
    renderView({ inscritos: muitosInscritos(50), loading: false, error: null, modalidades: ['10k'] });
    await userEvent.type(screen.getByLabelText(LABEL_BUSCA), 'Marina');
    expect(screen.getByText('Mostrando 1 de 50')).toBeInTheDocument();
    expect(screen.getByText('Marina Silva')).toBeInTheDocument();
  });

  // A ponte que a spec do código da compra exige: quem recebe um `PED-` do
  // comprador acha a compra na busca que já existe, sem query, índice ou tela
  // nova — o espelho do código no inscrito é o que paga isso (RN-475).
  it('busca acha a compra pelo código que a pessoa dita, com prefixo e em minúsculas', async () => {
    const inscritos = [
      mkInscrito({ id: 'a', atletaNome: 'Marina Silva', modalidade: '10k', codigoPedido: 'A2B3C' }),
      mkInscrito({ id: 'b', atletaNome: 'João Pereira', modalidade: '10k', codigoPedido: 'K7MPQ' }),
    ];
    renderView({ inscritos, loading: false, error: null, modalidades: ['10k'] });
    await userEvent.type(screen.getByLabelText(LABEL_BUSCA), 'ped-k7mpq');
    expect(screen.getByText('Mostrando 1 de 2')).toBeInTheDocument();
    expect(screen.getByText('João Pereira')).toBeInTheDocument();
    expect(screen.queryByText('Marina Silva')).not.toBeInTheDocument();
  });

  it('filtro sem correspondência mostra EmptyState', async () => {
    renderView({ inscritos: muitosInscritos(20), loading: false, error: null, modalidades: ['10k'] });
    await userEvent.type(screen.getByLabelText(LABEL_BUSCA), 'Zzzzz');
    expect(screen.getByText('Nenhum inscrito encontrado')).toBeInTheDocument();
  });

  it('clicar em Detalhe abre o slide-in do inscrito', async () => {
    renderView({ inscritos: muitosInscritos(3), loading: false, error: null, modalidades: ['10k'] });
    await userEvent.click(screen.getByRole('button', { name: 'Ver detalhe de Marina Silva' }));
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText('Marina Silva')).toBeInTheDocument();
  });

  it('clicar na LINHA abre o slide-in (S203 critério 5)', async () => {
    renderView({ inscritos: muitosInscritos(3), loading: false, error: null, modalidades: ['10k'] });
    // clica na célula do nome (não num controle interativo)
    await userEvent.click(screen.getByText('Marina Silva'));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('mantém as 4 tabs no DOM (§2.7)', () => {
    renderView({ inscritos: muitosInscritos(3), loading: false, error: null, modalidades: ['10k'] });
    for (const label of ['Geral', 'Pagamento', 'Comunicação', 'Histórico']) {
      expect(screen.getByRole('tab', { name: label })).toBeInTheDocument();
    }
  });

  it('renderiza skeleton enquanto carrega', () => {
    renderView({ inscritos: [], loading: true, error: null, modalidades: [] });
    expect(screen.getByRole('status', { name: 'Carregando inscritos' })).toBeInTheDocument();
  });

  // ── Visibilidade de pagamento (dor #1) ────────────────────────────────────
  it('mostra contagens de status nos filtros (Todos/Confirmado/Pendente/Cancelado)', () => {
    const inscritos = [
      ...muitosInscritos(3, 'confirmado'),
      mkInscrito({ id: 'p1', atletaNome: 'Pedro Pendente', status: 'pendente' }),
      mkInscrito({ id: 'c1', atletaNome: 'Carla Cancel', status: 'cancelado' }),
    ];
    renderView({ inscritos, loading: false, error: null, modalidades: ['10k'] });
    expect(screen.getByText('Todos · 5')).toBeInTheDocument();
    expect(screen.getByText('Pendente · 1')).toBeInTheDocument();
    expect(screen.getByText('Cancelado · 1')).toBeInTheDocument();
  });

  it('banner de inadimplência aparece com N pendentes e filtra ao clicar em "Ver pendentes"', async () => {
    const inscritos = [
      ...muitosInscritos(2, 'confirmado'),
      mkInscrito({ id: 'p1', atletaNome: 'Pedro Pendente', status: 'pendente' }),
      mkInscrito({ id: 'p2', atletaNome: 'Paula Pendente', status: 'pendente' }),
    ];
    renderView({ inscritos, loading: false, error: null, modalidades: ['10k'] });
    expect(screen.getByText('2 inscrição(ões) com pagamento pendente')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Ver pendentes' }));
    expect(screen.getByText('Mostrando 2 de 4')).toBeInTheDocument();
  });

  it('aba Pagamento lista os inadimplentes (não é mais placeholder)', async () => {
    const inscritos = [
      ...muitosInscritos(2, 'confirmado'),
      mkInscrito({ id: 'p1', atletaNome: 'Pedro Pendente', status: 'pendente' }),
    ];
    renderView({ inscritos, loading: false, error: null, modalidades: ['10k'] });
    await userEvent.click(screen.getByRole('tab', { name: 'Pagamento' }));
    expect(screen.getByText(/aguardando pagamento \(1\)/i)).toBeInTheDocument();
  });

  // ── Seleção em massa ──────────────────────────────────────────────────────
  it('selecionar uma linha revela a barra de ação com a contagem', async () => {
    renderView({ inscritos: muitosInscritos(3), loading: false, error: null, modalidades: ['10k'] });
    await userEvent.click(screen.getByRole('checkbox', { name: 'Selecionar Marina Silva' }));
    expect(screen.getByText('1 selecionado(s)')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Enviar mensagem' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Exportar' })).toBeInTheDocument();
  });

  it('"selecionar todos" da página marca todas as linhas visíveis', async () => {
    renderView({ inscritos: muitosInscritos(3), loading: false, error: null, modalidades: ['10k'] });
    await userEvent.click(
      screen.getByRole('checkbox', { name: 'Selecionar todos os inscritos da página' }),
    );
    expect(screen.getByText('3 selecionado(s)')).toBeInTheDocument();
  });

  // A1 (revisão r1): o "selecionar todos" do desktop vive no thead da Table, que
  // some no card-mode (<lg). Reexpomos um controle só-mobile (lg:hidden) ligado
  // ao MESMO handler — a seleção em massa (P5 inadimplência) sobrevive no celular.
  it('A1 · reexpõe "selecionar todos da página" no mobile (lg:hidden), mesmo handler', async () => {
    renderView({ inscritos: muitosInscritos(3), loading: false, error: null, modalidades: ['10k'] });
    const mobileSelectAll = screen.getByRole('checkbox', { name: 'Selecionar todos da página' });
    // vive num container só-mobile (some no desktop via lg:hidden)
    expect(mobileSelectAll.closest('label')?.className).toContain('lg:hidden');
    // opera a MESMA seleção em massa da página que o header do desktop
    await userEvent.click(mobileSelectAll);
    expect(screen.getByText('3 selecionado(s)')).toBeInTheDocument();
  });

  it('exportar seleção gera CSV (dispara download) e confirma por toast', async () => {
    // jsdom não implementa URL.createObjectURL / anchor.click — stub determinístico.
    const createUrl = vi.fn().mockReturnValue('blob:mock');
    const revokeUrl = vi.fn();
    (URL as unknown as { createObjectURL: unknown }).createObjectURL = createUrl;
    (URL as unknown as { revokeObjectURL: unknown }).revokeObjectURL = revokeUrl;
    const clickSpy = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => undefined);

    renderView({ inscritos: muitosInscritos(2), loading: false, error: null, modalidades: ['10k'] });
    await userEvent.click(screen.getByRole('checkbox', { name: 'Selecionar Marina Silva' }));
    await userEvent.click(screen.getByRole('button', { name: 'Exportar' }));
    expect(createUrl).toHaveBeenCalled();
    expect(screen.getByText(/exportado\(s\) em CSV/i)).toBeInTheDocument();

    clickSpy.mockRestore();
  });
});

// ---------------------------------------------------------------------------
// Código do ingresso e QR sob demanda (S211-T1 · RN-397)
// ---------------------------------------------------------------------------

describe('InscritosView — código do ingresso e QR (RN-397)', () => {
  const comIngresso = [
    mkInscrito({
      id: 'i1',
      atletaNome: 'Marina Silva',
      codigoIngresso: 'AB2CD3',
      qrToken: 'LLQR1.k1.payload.assinatura',
    }),
    mkInscrito({
      id: 'i2',
      atletaNome: 'João Pereira',
      codigoIngresso: 'XY7ZK9',
      qrToken: 'LLQR1.k1.outro.assinatura',
    }),
    // Ingresso NÃO emitido: sem código e sem token.
    mkInscrito({ id: 'i3', atletaNome: 'Ana Costa' }),
  ];

  it('a coluna Código existe e mostra o código de quem tem ingresso emitido', () => {
    renderView({ inscritos: comIngresso, loading: false, error: null, modalidades: ['10k'] });
    expect(screen.getByRole('columnheader', { name: 'Código' })).toBeInTheDocument();
    expect(screen.getByText('AB2CD3')).toBeInTheDocument();
    expect(screen.getByText('XY7ZK9')).toBeInTheDocument();
  });

  it('inscrito SEM ingresso emitido mostra vazio honesto, nunca um traço', () => {
    renderView({ inscritos: comIngresso, loading: false, error: null, modalidades: ['10k'] });
    // A linha da Ana não pode oferecer nada que pareça um código.
    const linha = screen.getByText('Ana Costa').closest('tr') as HTMLElement;
    expect(within(linha).getByText('Ingresso ainda não emitido')).toBeInTheDocument();
    // E ela não ganha a ação de QR (abriria um modal vazio no atendimento).
    expect(
      within(linha).queryByRole('button', { name: /Ver QR/ }),
    ).not.toBeInTheDocument();
  });

  it('a TABELA nunca renderiza QR em massa — nenhuma imagem antes da ação', () => {
    const { container } = renderView({
      inscritos: comIngresso,
      loading: false,
      error: null,
      modalidades: ['10k'],
    });
    const tabela = container.querySelector('table') as HTMLElement;
    expect(tabela.querySelectorAll('img')).toHaveLength(0);
  });

  it('a busca acha pelo código, com o contador coerente', async () => {
    const user = userEvent.setup();
    renderView({ inscritos: comIngresso, loading: false, error: null, modalidades: ['10k'] });
    await user.type(
      screen.getByRole('searchbox', { name: /código do ingresso/i }),
      'xy7zk9',
    );
    expect(screen.getByText('João Pereira')).toBeInTheDocument();
    expect(screen.queryByText('Marina Silva')).not.toBeInTheDocument();
    expect(screen.getByText('Mostrando 1 de 3')).toBeInTheDocument();
  });

  it('a ação da linha abre o QR daquele inscrito, com o código junto', async () => {
    const user = userEvent.setup();
    renderView({ inscritos: comIngresso, loading: false, error: null, modalidades: ['10k'] });

    await user.click(screen.getByRole('button', { name: 'Ver QR do ingresso de João Pereira' }));

    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText(/Ingresso de João Pereira/)).toBeInTheDocument();
    expect(within(dialog).getByText('XY7ZK9')).toBeInTheDocument();
    // A promessa que o balcão precisa ouvir: o código não vale como entrada.
    expect(within(dialog).getByText(/não vale como entrada/)).toBeInTheDocument();
    // O QR aparece — desenhado a partir do token, sem ida ao servidor.
    const img = await within(dialog).findByRole('img', {
      name: 'QR do ingresso de João Pereira',
    });
    expect(img.getAttribute('src')).toMatch(/^data:image\/png;base64,/);
  });

  it('abrir o QR NÃO abre o slide-in junto (a linha inteira também é clicável)', async () => {
    const user = userEvent.setup();
    renderView({ inscritos: comIngresso, loading: false, error: null, modalidades: ['10k'] });
    await user.click(screen.getByRole('button', { name: 'Ver QR do ingresso de Marina Silva' }));
    const dialogs = await screen.findAllByRole('dialog');
    expect(dialogs).toHaveLength(1);
  });
});
