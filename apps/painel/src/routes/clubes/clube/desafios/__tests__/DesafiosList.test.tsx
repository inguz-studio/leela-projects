import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DesafiosList } from '../DesafiosList';
import { mkDesafio } from '../../../_test/fixtures';

const noop = () => {};

const LISTA = [
  mkDesafio({ id: 'a', nome: 'Meia Maratona Floripa', modelo: 'C', status: 'ativo' }),
  mkDesafio({ id: 'b', nome: 'Constância 30 dias', modelo: 'B', status: 'ativo' }),
  mkDesafio({ id: 'c', nome: 'Foco Run', modelo: 'A', status: 'encerrado' }),
];

function renderList(over = {}) {
  return render(
    <DesafiosList desafios={LISTA} loading={false} error={null} onCriar={noop} {...over} />,
  );
}

describe('DesafiosList', () => {
  it('renderiza KPIs e as seções de cards', () => {
    renderList();
    expect(screen.getByText('Total de desafios')).toBeInTheDocument();
    expect(screen.getByText('Meia Maratona Floripa')).toBeInTheDocument();
    expect(screen.getByLabelText('Desafios em andamento')).toBeInTheDocument();
    expect(screen.getByLabelText('Desafios encerrados')).toBeInTheDocument();
    expect(screen.getByText('Mostrando 3 de 3 desafios')).toBeInTheDocument();
  });

  // Desafios foi a tela que o dono nomeou como referência ("assim como em
  // DEsafios"). Ela acertava a POSIÇÃO — facetas ao lado da busca, fileira
  // única — e errava a FORMA: as duas facetas eram fileira de chips. Por isso
  // a referência também converteu (leva 20, cânone §1.1).
  it('modelo "C" + busca "Floripa" → só a Meia Maratona Floripa (aceite)', async () => {
    renderList();
    await userEvent.click(screen.getByRole('button', { name: /Modelo: Todos/ }));
    await userEvent.click(await screen.findByRole('menuitemcheckbox', { name: 'Modelo C' }));
    await userEvent.type(screen.getByRole('searchbox', { name: 'Buscar desafio por nome' }), 'Floripa');
    expect(screen.getByText('Meia Maratona Floripa')).toBeInTheDocument();
    expect(screen.queryByText('Constância 30 dias')).not.toBeInTheDocument();
    expect(screen.getByText('Mostrando 1 de 3 desafios')).toBeInTheDocument();
  });

  it('status é exclusivo (Encerrados esconde os ativos)', async () => {
    renderList();
    await userEvent.click(screen.getByRole('button', { name: /^Status:/ }));
    await userEvent.click(await screen.findByRole('option', { name: 'Encerrados' }));
    expect(screen.getByText('Foco Run')).toBeInTheDocument();
    expect(screen.queryByText('Meia Maratona Floripa')).not.toBeInTheDocument();
  });

  it('filtro que zera mostra EmptyState', async () => {
    renderList();
    await userEvent.type(screen.getByRole('searchbox', { name: 'Buscar desafio por nome' }), 'zzz');
    expect(screen.getByText(/nenhum desafio encontrado/i)).toBeInTheDocument();
  });

  it('popover expõe 6 ações e dispara onAcao', async () => {
    const onAcao = vi.fn();
    renderList({ onAcao });
    await userEvent.click(screen.getByRole('button', { name: 'Ações de Meia Maratona Floripa' }));
    const itens = screen.getAllByRole('menuitem');
    expect(itens).toHaveLength(6);
    await userEvent.click(screen.getByRole('menuitem', { name: 'Editar desafio' }));
    expect(onAcao).toHaveBeenCalledWith(expect.objectContaining({ id: 'a' }), 'editar');
  });

  it('criar dispara o callback', async () => {
    const onCriar = vi.fn();
    renderList({ onCriar });
    await userEvent.click(screen.getByRole('button', { name: '+ Criar desafio' }));
    expect(onCriar).toHaveBeenCalledOnce();
  });

  it('skeleton no load e erro no fail', () => {
    const { rerender } = render(
      <DesafiosList desafios={null} loading error={null} onCriar={noop} />,
    );
    expect(screen.getByRole('status', { name: 'Carregando desafios' })).toBeInTheDocument();
    rerender(<DesafiosList desafios={null} loading={false} error={new Error('x')} onCriar={noop} />);
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });
});
