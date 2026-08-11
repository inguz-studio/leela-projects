import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HubClubes } from '../HubClubes';
import { mkClube } from '../../_test/fixtures';

const noop = () => {};

describe('HubClubes', () => {
  it('mostra EmptyState + CTA quando zero clubs', async () => {
    const onCriarClube = vi.fn();
    render(
      <HubClubes
        clubes={[]}
        loading={false}
        error={null}
        ownUserId="felipe"
        onCriarClube={onCriarClube}
        onAbrirClube={noop}
      />,
    );
    expect(screen.getByText(/ainda não tem nenhum club/i)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Criar club' }));
    expect(onCriarClube).toHaveBeenCalledOnce();
  });

  it('separa Zona A (owner) e Zona B (parceiros) por ownUserId (RN-100)', () => {
    render(
      <HubClubes
        clubes={[
          mkClube({ id: 'meu', slug: 'meu', nome: 'Meu Clube', ownerId: 'felipe' }),
          mkClube({ id: 'parc', slug: 'parc', nome: 'Clube Parceiro', ownerId: 'outro' }),
        ]}
        loading={false}
        error={null}
        ownUserId="felipe"
        onCriarClube={noop}
        onAbrirClube={noop}
      />,
    );
    expect(screen.getByRole('heading', { name: 'Meu Clube' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Clube Parceiro' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Meus clubs' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Clubs parceiros' })).toBeInTheDocument();
  });

  /**
   * BLQ-01 + BLQ-20. O card somava certo e nomeava errado: "Atletas" era a
   * categoria da plataforma para as pessoas da comunidade (D-0802-1 crava que
   * atleta é instância, nunca categoria), e o hint dizia "clubes" enquanto o
   * menu que abre esta tela diz "Clubs". O campo interno segue `atletasAlcancados`.
   */
  it('KPI de pessoas alcançadas soma qtdMembrosAtivos, com o rótulo do cânone', () => {
    render(
      <HubClubes
        clubes={[
          mkClube({ id: 'a', slug: 'a', ownerId: 'felipe', qtdMembrosAtivos: 120 }),
          mkClube({ id: 'b', slug: 'b', ownerId: 'outro', qtdMembrosAtivos: 45 }),
        ]}
        loading={false}
        error={null}
        ownUserId="felipe"
        onCriarClube={noop}
        onAbrirClube={noop}
      />,
    );
    expect(screen.getByText('165')).toBeInTheDocument();
    expect(screen.getByText('Pessoas alcançadas')).toBeInTheDocument();
    expect(screen.getByText('somadas entre os clubs')).toBeInTheDocument();
    expect(screen.queryByText(/atletas/i)).not.toBeInTheDocument();
  });

  /**
   * BLQ-20 · default do maestro. A área tem UMA grafia: "Clubs" no plural,
   * "club" no singular — a do menu principal, a da vitrine e a que o dono
   * escreve. A rota `/clubes` não entra na conta: endereço não é copy.
   */
  it('a tela inteira fala "Clubs"/"club" — nenhuma sobra de "Clubes"/"clube"', () => {
    const { container } = render(
      <HubClubes
        clubes={[mkClube({ id: 'a', slug: 'a', nome: 'Wiser Trilhas', ownerId: 'felipe' })]}
        loading={false}
        error={null}
        ownUserId="felipe"
        onCriarClube={noop}
        onAbrirClube={noop}
      />,
    );
    expect(screen.getByRole('heading', { name: 'Clubs', level: 1 })).toBeInTheDocument();
    expect(container.textContent ?? '').not.toMatch(/\bclubes?\b/i);
  });

  it('busca filtra clubs parceiros por nome', async () => {
    render(
      <HubClubes
        clubes={[
          mkClube({ id: 'a', slug: 'a', nome: 'Assessoria Floripa Run', ownerId: 'outro' }),
          mkClube({ id: 'b', slug: 'b', nome: 'Wiser Trilhas', ownerId: 'outro' }),
        ]}
        loading={false}
        error={null}
        ownUserId="felipe"
        onCriarClube={noop}
        onAbrirClube={noop}
      />,
    );
    await userEvent.type(screen.getByRole('searchbox', { name: 'Buscar club parceiro' }), 'Wiser');
    expect(screen.getByRole('heading', { name: 'Wiser Trilhas' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Assessoria Floripa Run' })).not.toBeInTheDocument();
  });

  it('busca sem resultado mostra EmptyState', async () => {
    render(
      <HubClubes
        clubes={[mkClube({ id: 'a', slug: 'a', nome: 'Wiser Trilhas', ownerId: 'outro' })]}
        loading={false}
        error={null}
        ownUserId="felipe"
        onCriarClube={noop}
        onAbrirClube={noop}
      />,
    );
    await userEvent.type(screen.getByRole('searchbox', { name: 'Buscar club parceiro' }), 'zzz');
    expect(screen.getByText(/nenhum club encontrado/i)).toBeInTheDocument();
  });

  it('mostra skeleton no carregamento e erro no fail', () => {
    const { rerender } = render(
      <HubClubes clubes={null} loading error={null} ownUserId="felipe" onCriarClube={noop} onAbrirClube={noop} />,
    );
    expect(screen.getByRole('status', { name: 'Carregando clubs' })).toBeInTheDocument();
    rerender(
      <HubClubes clubes={null} loading={false} error={new Error('boom')} ownUserId="felipe" onCriarClube={noop} onAbrirClube={noop} />,
    );
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('navega ao clicar em Acessar painel', async () => {
    const onAbrirClube = vi.fn();
    render(
      <HubClubes
        clubes={[mkClube({ id: 'a', slug: 'corrida-perfeita-sul', nome: 'CPS', ownerId: 'felipe' })]}
        loading={false}
        error={null}
        ownUserId="felipe"
        onCriarClube={noop}
        onAbrirClube={onAbrirClube}
      />,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Acessar painel' }));
    expect(onAbrirClube).toHaveBeenCalledWith('corrida-perfeita-sul');
  });
});
