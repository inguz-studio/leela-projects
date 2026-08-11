// =============================================================================
// MarcasPage (E10 · S811 seed · RN-171) — estados do módulo Marcas: vazio
// honesto, erro, dados + contador, criar, editar e excluir (ConfirmModal com
// consequências). api-client mockado (sem Firestore); core real (validação
// condicional RN-123 roda de verdade). useToast exige ToastProvider real.
// =============================================================================
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { ToastProvider } from '@leela/design-system';
import type { Marca } from '@leela/core';
import { MarcasPage } from '../MarcasPage';

const mocks = vi.hoisted(() => ({
  onSessionChange: vi.fn(),
  listarMarcas: vi.fn(),
  salvarMarca: vi.fn(),
  excluirMarca: vi.fn(),
  uploadLogoMarca: vi.fn(),
}));

vi.mock('@leela/api-client', () => ({
  onSessionChange: mocks.onSessionChange,
  listarMarcas: mocks.listarMarcas,
  salvarMarca: mocks.salvarMarca,
  excluirMarca: mocks.excluirMarca,
  uploadLogoMarca: mocks.uploadLogoMarca,
  marcaIdDoNome: (nome: string) => nome.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-'),
  getLeelaDb: () => ({}),
}));

function marca(over: Partial<Marca> = {}): Marca {
  return {
    id: 'cdl-wellness',
    nome: 'CDL Wellness',
    modeloComercial: 'financeiro',
    valorAnual: 12000,
    status: 'ativa',
    criadoEm: { seconds: 0, nanoseconds: 0 } as unknown as Marca['criadoEm'],
    atualizadoEm: { seconds: 0, nanoseconds: 0 } as unknown as Marca['atualizadoEm'],
    ...over,
  };
}

function setSession(uid: string | null): void {
  mocks.onSessionChange.mockImplementation((cb: (u: unknown) => void) => {
    cb(uid === null ? null : { uid, email: 'org@demo.dev' });
    return () => {};
  });
}

function renderPage(): void {
  render(
    <MemoryRouter initialEntries={['/parcerias']}>
      <ToastProvider>
        <MarcasPage />
      </ToastProvider>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  mocks.onSessionChange.mockReset();
  mocks.listarMarcas.mockReset();
  mocks.salvarMarca.mockReset();
  mocks.excluirMarca.mockReset();
  mocks.uploadLogoMarca.mockReset();
});

describe('MarcasPage', () => {
  it('sem sessão mostra estado honesto e não lista', async () => {
    setSession(null);
    renderPage();
    expect(await screen.findByText('Entre para gerenciar suas marcas')).toBeInTheDocument();
    expect(mocks.listarMarcas).not.toHaveBeenCalled();
  });

  it('registro vazio mostra EmptyState honesto', async () => {
    setSession('u1');
    mocks.listarMarcas.mockResolvedValue([]);
    renderPage();
    expect(await screen.findByText('Nenhuma marca cadastrada ainda')).toBeInTheDocument();
  });

  it('erro do reader mostra alerta com retry', async () => {
    setSession('u1');
    mocks.listarMarcas.mockRejectedValue(new Error('permission-denied'));
    renderPage();
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Não foi possível carregar suas marcas',
    );
  });

  it('lista marcas com modelo/detalhe e contador', async () => {
    setSession('u1');
    mocks.listarMarcas.mockResolvedValue([
      marca(),
      marca({ id: 'acate', nome: 'ACATE Run Club', modeloComercial: 'permuta', contrapartida: 'Camisetas e brindes para 200 atletas do evento anual.' }),
    ]);
    renderPage();
    expect(await screen.findByText('CDL Wellness')).toBeInTheDocument();
    expect(screen.getByText('ACATE Run Club')).toBeInTheDocument();
    expect(screen.getByText('R$ 12.000/ano')).toBeInTheDocument();
    expect(screen.getByText('Mostrando 2 de 2 marcas')).toBeInTheDocument();
  });

  it('criar: preenche o form e chama salvarMarca (sem marcaId)', async () => {
    setSession('u1');
    mocks.listarMarcas.mockResolvedValue([]);
    mocks.salvarMarca.mockResolvedValue('nova-marca');
    renderPage();
    await screen.findByText('Nenhuma marca cadastrada ainda');

    await userEvent.click(screen.getByRole('button', { name: 'Nova marca' }));
    const dialog = await screen.findByRole('dialog');
    await userEvent.type(within(dialog).getByLabelText('Nome da marca'), 'Nova Marca');
    await userEvent.type(within(dialog).getByLabelText('Valor anual (R$)'), '5000');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Criar marca' }));

    await waitFor(() => expect(mocks.salvarMarca).toHaveBeenCalled());
    const [, uid, input, marcaId] = mocks.salvarMarca.mock.calls[0]!;
    expect(uid).toBe('u1');
    expect(input).toMatchObject({ nome: 'Nova Marca', modeloComercial: 'financeiro', valorAnual: 5000 });
    expect(marcaId).toBeUndefined();
  });

  it('editar: abre com o alvo e salva fixando o docId', async () => {
    setSession('u1');
    mocks.listarMarcas.mockResolvedValue([marca()]);
    mocks.salvarMarca.mockResolvedValue('cdl-wellness');
    renderPage();
    await screen.findByText('CDL Wellness');

    await userEvent.click(screen.getByRole('button', { name: 'Editar' }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('Editar marca')).toBeInTheDocument();
    await userEvent.click(within(dialog).getByRole('button', { name: 'Salvar alterações' }));

    await waitFor(() => expect(mocks.salvarMarca).toHaveBeenCalled());
    const [, , , marcaId] = mocks.salvarMarca.mock.calls[0]!;
    expect(marcaId).toBe('cdl-wellness');
  });

  it('excluir: ConfirmModal com consequências e chama excluirMarca', async () => {
    setSession('u1');
    mocks.listarMarcas.mockResolvedValue([marca()]);
    mocks.excluirMarca.mockResolvedValue(undefined);
    renderPage();
    await screen.findByText('CDL Wellness');

    await userEvent.click(screen.getByRole('button', { name: 'Excluir' }));
    expect(await screen.findByText('Excluir marca do registro?')).toBeInTheDocument();
    // Consequência honesta: patrocínios já cadastrados permanecem.
    expect(
      screen.getByText(/Patrocínios já cadastrados em eventos e clubes continuam intactos/),
    ).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Excluir marca' }));
    await waitFor(() => expect(mocks.excluirMarca).toHaveBeenCalled());
    const [, uid, marcaId] = mocks.excluirMarca.mock.calls[0]!;
    expect(uid).toBe('u1');
    expect(marcaId).toBe('cdl-wellness');
  });

  // ── Miniatura do logo (RN-171 · RN-236) ─────────────────────────────────
  // O job: reconhecer a marca DE VISTA na lista, antes de abrir para editar.
  describe('miniatura do logo 1:1 (RN-171 · RN-236)', () => {
    /** Linha da marca pelo nome — a miniatura tem de estar na MESMA linha. */
    function linhaDaMarca(nome: string): HTMLElement {
      const celula = screen.getByText(nome);
      const linha = celula.closest('tr');
      expect(linha).not.toBeNull();
      return linha as HTMLElement;
    }

    it('marca COM logo exibe a miniatura do próprio logo, adiada (lista)', async () => {
      setSession('u1');
      mocks.listarMarcas.mockResolvedValue([marca({ logoUrl: 'https://cdn.x/cdl.png' })]);
      renderPage();
      await screen.findByText('CDL Wellness');

      const img = screen.getByAltText('Logo de CDL Wellness');
      expect(img).toHaveAttribute('src', 'https://cdn.x/cdl.png');
      expect(img).toHaveAttribute('loading', 'lazy');
      // Na linha da marca, não perdida em outro canto da tabela.
      expect(linhaDaMarca('CDL Wellness')).toContainElement(img);
    });

    it('cada marca mostra o SEU logo — é isso que separa uma da outra na lista', async () => {
      setSession('u1');
      mocks.listarMarcas.mockResolvedValue([
        marca({ id: 'cdl', nome: 'CDL Wellness', logoUrl: 'https://cdn.x/cdl.png' }),
        marca({ id: 'growth', nome: 'Growth', logoUrl: 'https://cdn.x/growth.png' }),
      ]);
      renderPage();
      await screen.findByText('Growth');

      expect(linhaDaMarca('CDL Wellness').querySelector('img')).toHaveAttribute(
        'src',
        'https://cdn.x/cdl.png',
      );
      expect(linhaDaMarca('Growth').querySelector('img')).toHaveAttribute(
        'src',
        'https://cdn.x/growth.png',
      );
    });

    it('marca SEM logo cai na sigla e não renderiza img (nada de quadrado quebrado)', async () => {
      setSession('u1');
      mocks.listarMarcas.mockResolvedValue([marca()]);
      renderPage();
      await screen.findByText('CDL Wellness');

      const linha = linhaDaMarca('CDL Wellness');
      expect(linha.querySelector('img')).toBeNull();
      // Escopo na CÉLULA do logo (primeira coluna, header vazio), não na linha
      // inteira: 'C' também é a primeira letra de "CDL Wellness", que está
      // escrita na célula ao lado — a asserção na linha passava mesmo com o
      // `fallback` arrancado do Thumb, e não travava nada.
      const celulaLogo = linha.querySelector('td') as HTMLElement;
      expect(celulaLogo).toHaveTextContent('C');
    });
  });
});
