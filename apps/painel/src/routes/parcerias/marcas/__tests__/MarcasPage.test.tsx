// =============================================================================
// MarcasPage (E10 · S811 seed · RN-171) — estados do módulo Marcas: vazio
// honesto, erro, dados + contador, criar, editar e o interruptor que substituiu
// a exclusão (PATROCINADOR-TOGGLE). api-client mockado (sem Firestore); core
// real (validação condicional RN-123 roda de verdade). useToast exige
// ToastProvider real.
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
  definirStatusDaMarca: vi.fn(),
  uploadLogoMarca: vi.fn(),
}));

vi.mock('@leela/api-client', () => ({
  onSessionChange: mocks.onSessionChange,
  listarMarcas: mocks.listarMarcas,
  salvarMarca: mocks.salvarMarca,
  definirStatusDaMarca: mocks.definirStatusDaMarca,
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
  mocks.definirStatusDaMarca.mockReset();
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

  it('R-3 (REV-FINAL): descrição do modal não expõe jargão interno (RN-XXX)', async () => {
    setSession('u1');
    mocks.listarMarcas.mockResolvedValue([]);
    renderPage();
    await screen.findByText('Nenhuma marca cadastrada ainda');

    await userEvent.click(screen.getByRole('button', { name: 'Nova marca' }));
    const dialog = await screen.findByRole('dialog');
    expect(dialog).not.toHaveTextContent(/RN-\d+/);
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

  // ── PATROCINADOR-TOGGLE (decisão do dono de 09/08 §20) ──────────────────
  // O job: tirar uma marca do autocomplete sem perder o registro dela.
  describe('interruptor no lugar da exclusão', () => {
    it('não existe mais caminho de tela que apague uma marca', async () => {
      setSession('u1');
      mocks.listarMarcas.mockResolvedValue([marca()]);
      renderPage();
      await screen.findByText('CDL Wellness');

      // Nem o botão, nem o rótulo do modal que ele abria.
      expect(screen.queryByRole('button', { name: /excluir/i })).toBeNull();
      expect(screen.queryByText(/excluir marca/i)).toBeNull();
      // E a porta do api-client foi junto: se alguém religar o botão, o
      // import não existe mais. Aqui provamos o que a tela alcança.
      expect(screen.getByRole('button', { name: 'Editar' })).toBeInTheDocument();
    });

    it('desligar chama definirStatusDaMarca com "inativa" e avisa o que muda', async () => {
      setSession('u1');
      mocks.listarMarcas.mockResolvedValue([marca()]);
      mocks.definirStatusDaMarca.mockResolvedValue(undefined);
      renderPage();
      await screen.findByText('CDL Wellness');

      const interruptor = screen.getByRole('switch', {
        name: 'CDL Wellness: aparecer no autocomplete de patrocínios novos',
      });
      expect(interruptor).toBeChecked();

      await userEvent.click(interruptor);
      await waitFor(() => expect(mocks.definirStatusDaMarca).toHaveBeenCalled());
      const [, uid, marcaId, status] = mocks.definirStatusDaMarca.mock.calls[0]!;
      expect(uid).toBe('u1');
      expect(marcaId).toBe('cdl-wellness');
      expect(status).toBe('inativa');

      // O "avisando" do dono: a frase genérica, na tela, dizendo o que muda…
      expect(
        await screen.findByText(
          /não aparece mais no autocomplete ao cadastrar patrocínios novos/i,
        ),
      ).toBeInTheDocument();
      // …e o que NÃO muda — os patrocínios já cadastrados são cópias.
      expect(
        screen.getByText(
          /patrocínios já cadastrados em eventos e clubes continuam intactos/i,
        ),
      ).toBeInTheDocument();
    });

    it('marca desligada continua listada, com o estado visível e o caminho de volta', async () => {
      setSession('u1');
      mocks.listarMarcas.mockResolvedValue([marca()]);
      mocks.definirStatusDaMarca.mockResolvedValue(undefined);
      renderPage();
      await screen.findByText('CDL Wellness');

      await userEvent.click(
        screen.getByRole('switch', {
          name: 'CDL Wellness: aparecer no autocomplete de patrocínios novos',
        }),
      );
      await waitFor(() => expect(mocks.definirStatusDaMarca).toHaveBeenCalledTimes(1));

      // Continua na lista, e o estado é legível sem interpretar a posição do
      // controle — é o que permite achá-la para religar.
      expect(screen.getByText('CDL Wellness')).toBeInTheDocument();
      expect(screen.getByText('Mostrando 1 de 1 marca')).toBeInTheDocument();
      const interruptor = await screen.findByRole('switch', {
        name: 'CDL Wellness: aparecer no autocomplete de patrocínios novos',
      });
      await waitFor(() => expect(interruptor).not.toBeChecked());
      expect(screen.getByText('Inativa')).toBeInTheDocument();

      // E o caminho de volta funciona: religar escreve 'ativa'.
      await userEvent.click(interruptor);
      await waitFor(() => expect(mocks.definirStatusDaMarca).toHaveBeenCalledTimes(2));
      expect(mocks.definirStatusDaMarca.mock.calls[1]![3]).toBe('ativa');
    });

    it('falha ao desligar não mente: o estado na tela não muda', async () => {
      setSession('u1');
      mocks.listarMarcas.mockResolvedValue([marca()]);
      mocks.definirStatusDaMarca.mockRejectedValue(new Error('permission-denied'));
      renderPage();
      await screen.findByText('CDL Wellness');

      await userEvent.click(
        screen.getByRole('switch', {
          name: 'CDL Wellness: aparecer no autocomplete de patrocínios novos',
        }),
      );
      expect(
        await screen.findByText('Não foi possível desativar a marca'),
      ).toBeInTheDocument();
      expect(
        screen.getByRole('switch', {
          name: 'CDL Wellness: aparecer no autocomplete de patrocínios novos',
        }),
      ).toBeChecked();
      expect(screen.getByText('Ativa')).toBeInTheDocument();
    });

    it('editar uma marca DESLIGADA não a religa em silêncio', async () => {
      setSession('u1');
      mocks.listarMarcas.mockResolvedValue([marca({ status: 'inativa' })]);
      mocks.salvarMarca.mockResolvedValue('cdl-wellness');
      renderPage();
      await screen.findByText('CDL Wellness');

      await userEvent.click(screen.getByRole('button', { name: 'Editar' }));
      const dialog = await screen.findByRole('dialog');
      await userEvent.click(within(dialog).getByRole('button', { name: 'Salvar alterações' }));

      await waitFor(() => expect(mocks.salvarMarca).toHaveBeenCalled());
      const [, , input] = mocks.salvarMarca.mock.calls[0]!;
      expect(input).toMatchObject({ status: 'inativa' });
    });
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
