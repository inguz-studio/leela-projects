import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MembrosList } from '../MembrosList';
import { mkMembro } from '../../../_test/fixtures';

const AGORA = new Date('2026-04-20T12:00:00Z');
const noop = () => {};

const LISTA = [
  mkMembro({ id: '1', atletaNome: 'Camila Ramos', papel: 'admin', status: 'ativo' }),
  mkMembro({ id: '2', atletaNome: 'Felipe Martins', papel: 'owner', status: 'ativo' }),
  mkMembro({ id: '3', atletaNome: 'Larissa Heidrich', papel: 'membro', status: 'novo' }),
  mkMembro({ id: '4', atletaNome: 'Thiago Bittencourt', papel: 'membro', status: 'inativo' }),
];

function renderList(over = {}) {
  return render(
    <MembrosList
      membros={LISTA}
      loading={false}
      error={null}
      onConvidar={noop}
      agora={AGORA}
      {...over}
    />,
  );
}

describe('MembrosList', () => {
  it('renderiza KPIs e a tabela densa de membros', () => {
    renderList();
    expect(screen.getByRole('table')).toBeInTheDocument();
    expect(screen.getByText('Total de membros')).toBeInTheDocument();
    expect(screen.getByText('Camila Ramos')).toBeInTheDocument();
    expect(screen.getByText('Mostrando 4 de 4 membros')).toBeInTheDocument();
  });

  it('busca "Camila" filtra a tabela e atualiza o contador', async () => {
    renderList();
    await userEvent.type(screen.getByRole('searchbox', { name: 'Buscar membro por nome' }), 'Camila');
    expect(screen.getByText('Camila Ramos')).toBeInTheDocument();
    expect(screen.queryByText('Felipe Martins')).not.toBeInTheDocument();
    expect(screen.getByText('Mostrando 1 de 4 membros')).toBeInTheDocument();
  });

  // As duas facetas são LISTA desde 17/08 (leva 20): o teste abre o gatilho da
  // faceta e escolhe o valor, em vez de clicar num chip solto. Foi esta tela que
  // o dono usou para cobrar — ela mostrava `Todos · Ativos · Novos · Inativos ·
  // Todos · Owner · Admins · Membros` em duas fileiras, com dois "Todos"
  // colados e o nome de cada faceta só no `aria-label`.
  it('status × papel é interseção (Ativos ∩ Membros)', async () => {
    renderList();
    await userEvent.click(screen.getByRole('button', { name: 'Status' }));
    await userEvent.click(await screen.findByRole('option', { name: 'Ativos' }));
    await userEvent.click(screen.getByRole('button', { name: 'Papel' }));
    await userEvent.click(await screen.findByRole('option', { name: 'Membros' }));
    // Ativos = {Camila(admin), Felipe(owner)}; Membros = {Larissa(novo), Thiago(inativo)}
    // Interseção vazia → EmptyState.
    expect(screen.getByText(/nenhum membro encontrado/i)).toBeInTheDocument();
  });

  it('filtro que zera mostra EmptyState', async () => {
    renderList();
    await userEvent.type(screen.getByRole('searchbox', { name: 'Buscar membro por nome' }), 'zzz');
    expect(screen.getByText(/nenhum membro encontrado/i)).toBeInTheDocument();
  });

  it('remover abre ConfirmModal §2.15 e confirma chama onRemover', async () => {
    const onRemover = vi.fn();
    renderList({ onRemover });
    // abre o popover da 1ª linha (Camila)
    await userEvent.click(screen.getByRole('button', { name: 'Ações de Camila Ramos' }));
    await userEvent.click(screen.getByRole('menuitem', { name: 'Remover do clube' }));
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText('Remover membro do clube')).toBeInTheDocument();
    await userEvent.click(within(dialog).getByRole('button', { name: 'Remover membro' }));
    expect(onRemover).toHaveBeenCalledWith(expect.objectContaining({ id: '1' }));
  });

  it('convidar dispara o callback', async () => {
    const onConvidar = vi.fn();
    renderList({ onConvidar });
    await userEvent.click(screen.getByRole('button', { name: '+ Convidar membros' }));
    expect(onConvidar).toHaveBeenCalledOnce();
  });

  it('mostra skeleton no load e erro no fail', () => {
    const { rerender } = render(
      <MembrosList membros={null} loading error={null} onConvidar={noop} />,
    );
    expect(screen.getByRole('status', { name: 'Carregando membros' })).toBeInTheDocument();
    rerender(<MembrosList membros={null} loading={false} error={new Error('x')} onConvidar={noop} />);
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });
});
