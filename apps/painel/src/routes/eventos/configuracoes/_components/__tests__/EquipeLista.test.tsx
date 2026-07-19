// =============================================================================
// Testes do EquipeLista (S304-T3). Aceites de UI: EmptyState quando só há o
// Organizador; troca de papel só em membro ativo gerível; administrador NÃO
// mexe no Organizador (sem Select, sem Remover) e nunca oferece o papel
// organizador; remover chama o handler.
// =============================================================================

import * as React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { MembroEquipe, PapelEvento, Timestamp } from '@leela/core';
import { EquipeLista } from '../EquipeLista';

function ts(ms: number): Timestamp {
  return { seconds: Math.floor(ms / 1000), nanoseconds: 0, toDate: () => new Date(ms), toMillis: () => ms } as Timestamp;
}

function membro(over: Partial<MembroEquipe> & { nome: string; papel: PapelEvento }): MembroEquipe {
  return {
    id: over.id ?? over.nome.toLowerCase(),
    tenantId: 'tnt',
    eventoId: 'ev',
    email: over.email ?? null,
    uid: over.uid ?? over.id ?? over.nome.toLowerCase(),
    profId: null,
    status: over.status ?? 'ativo',
    convidadoEm: ts(0),
    atualizadoEm: ts(0),
    ...over,
  };
}

function setup(props: Partial<React.ComponentProps<typeof EquipeLista>> = {}) {
  const handlers = {
    onTrocarPapel: vi.fn(),
    onRemover: vi.fn(),
    onConvidar: vi.fn(),
  };
  render(
    <EquipeLista
      membros={props.membros ?? []}
      gestor={props.gestor ?? 'organizador'}
      gestorUid={props.gestorUid ?? 'dono'}
      trocandoUid={props.trocandoUid ?? null}
      {...handlers}
    />,
  );
  return handlers;
}

const organizador = membro({ id: 'dono', uid: 'dono', nome: 'Dona', papel: 'organizador' });

describe('EquipeLista (S304-T3)', () => {
  it('EmptyState quando só há o Organizador', async () => {
    const { onConvidar } = setup({ membros: [organizador] });
    expect(screen.getByText('Só você por aqui')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Convidar membro' }));
    expect(onConvidar).toHaveBeenCalledTimes(1);
  });

  it('membro ativo gerível tem Combobox de papel; trocar chama o handler', async () => {
    const bruno = membro({ id: 'bruno', uid: 'bruno', nome: 'Bruno', papel: 'administrador' });
    const { onTrocarPapel } = setup({ membros: [organizador, bruno], gestor: 'organizador' });
    // §8: papel abre o painel do DS (Combobox), não o listbox do SO.
    await userEvent.click(screen.getByLabelText('Papel de Bruno'));
    await userEvent.click(screen.getByRole('option', { name: 'Financeiro' }));
    expect(onTrocarPapel).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'bruno' }),
      'financeiro',
    );
  });

  it('administrador não mexe no Organizador (sem Combobox, sem Remover) e não oferece papel organizador', async () => {
    const carla = membro({ id: 'carla', uid: 'carla', nome: 'Carla', papel: 'operador' });
    setup({ membros: [organizador, carla], gestor: 'administrador', gestorUid: 'adm' });

    // Linha do Organizador: read-only, sem controles de gestão.
    expect(screen.queryByLabelText('Papel de Dona')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Remover Dona' })).toBeNull();

    // Linha da Carla: gerível pelo admin, mas o painel nunca oferece "Organizador".
    await userEvent.click(screen.getByLabelText('Papel de Carla'));
    const opcoes = screen.getAllByRole('option').map((o) => o.textContent);
    expect(opcoes).not.toContain('Organizador');
    expect(screen.getByRole('button', { name: 'Remover Carla' })).toBeInTheDocument();
  });

  it('convite pendente mostra papel read-only (Badge, sem Select)', () => {
    const convite = membro({ id: 'c1', uid: null, nome: 'Duda', papel: 'operador', status: 'convidado' });
    setup({ membros: [organizador, convite], gestor: 'organizador' });
    expect(screen.queryByLabelText('Papel de Duda')).toBeNull();
    expect(screen.getByText('Convidado')).toBeInTheDocument();
  });

  it('remover chama o handler com o membro', async () => {
    const bruno = membro({ id: 'bruno', uid: 'bruno', nome: 'Bruno', papel: 'administrador' });
    const { onRemover } = setup({ membros: [organizador, bruno], gestor: 'organizador' });
    await userEvent.click(screen.getByRole('button', { name: 'Remover Bruno' }));
    expect(onRemover).toHaveBeenCalledWith(expect.objectContaining({ id: 'bruno' }));
  });
});
