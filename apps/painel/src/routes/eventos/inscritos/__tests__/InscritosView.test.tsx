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
    await userEvent.type(screen.getByLabelText('Buscar atleta'), 'Marina');
    expect(screen.getByText('Mostrando 1 de 50')).toBeInTheDocument();
    expect(screen.getByText('Marina Silva')).toBeInTheDocument();
  });

  it('filtro sem correspondência mostra EmptyState', async () => {
    renderView({ inscritos: muitosInscritos(20), loading: false, error: null, modalidades: ['10k'] });
    await userEvent.type(screen.getByLabelText('Buscar atleta'), 'Zzzzz');
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
