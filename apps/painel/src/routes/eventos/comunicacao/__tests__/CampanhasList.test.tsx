// =============================================================================
// CampanhasList (S401-T2 · E06-L3) — cobre: 3 grupos por estado (enviadas com
// alcance, agendadas com "disparo em", rascunhos com "criado em"), contador
// "mostrando X de Y", filtro que zera → EmptyState honesto, popover contextual
// por estado e "+ Nova campanha".
// =============================================================================

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Campanha, Timestamp } from '@leela/core';
import { CampanhasList } from '../CampanhasList';

const noop = (): void => {};

const ts = (ms: number): Timestamp =>
  ({ toDate: () => new Date(ms), toMillis: () => ms }) as unknown as Timestamp;

function mk(over: Partial<Campanha> = {}): Campanha {
  return {
    id: 'c1',
    tenantId: 't1',
    titulo: 'Campanha',
    conteudo: 'Conteúdo da campanha para os inscritos.',
    canal: ['push'],
    origem: 'manual',
    status: 'rascunho',
    segmento: { tipo: 'todos_inscritos' },
    criadoEm: ts(new Date('2026-04-01T10:00:00').getTime()),
    atualizadoEm: ts(1),
    alcance: 0,
    ...over,
  };
}

const LISTA = [
  mk({ id: 'a', titulo: 'Kit pronto', status: 'enviado', alcance: 48, enviadoEm: ts(2), canal: ['push'] }),
  mk({ id: 'b', titulo: 'Cupom amigos', status: 'agendado', agendadoPara: ts(new Date('2026-04-20T09:00:00').getTime()), canal: ['email'] }),
  mk({ id: 'c', titulo: 'Boas-vindas', status: 'rascunho', canal: ['push', 'email'] }),
];

function renderList(over = {}): ReturnType<typeof render> {
  return render(
    <CampanhasList campanhas={LISTA} loading={false} error={null} onNova={noop} {...over} />,
  );
}

describe('CampanhasList', () => {
  it('3 grupos por estado + metadado do estado + contador', () => {
    renderList();
    expect(screen.getByRole('region', { name: 'Enviadas' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Agendadas' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Rascunhos' })).toBeInTheDocument();
    expect(screen.getByText('48 alcançados')).toBeInTheDocument();
    expect(screen.getByText(/disparo em/)).toBeInTheDocument();
    expect(screen.getByText(/criado em/)).toBeInTheDocument();
    expect(screen.getByText('Mostrando 3 de 3 campanhas')).toBeInTheDocument();
  });

  it('filtro de canal (e-mail) restringe a interseção', async () => {
    renderList();
    await userEvent.click(screen.getByRole('button', { name: 'E-mail' }));
    expect(screen.getByText('Cupom amigos')).toBeInTheDocument(); // email
    expect(screen.getByText('Boas-vindas')).toBeInTheDocument(); // push+email
    expect(screen.queryByText('Kit pronto')).not.toBeInTheDocument(); // só push
  });

  it('filtro que zera → EmptyState honesto', async () => {
    renderList();
    await userEvent.type(screen.getByRole('searchbox', { name: 'Buscar campanha por título' }), 'zzz');
    expect(screen.getByText('Nenhuma campanha encontrada')).toBeInTheDocument();
    expect(screen.getByText(/com os filtros aplicados/i)).toBeInTheDocument();
  });

  it('popover contextual por estado (enviada = relatório + duplicar, sem editar)', async () => {
    const onAcao = vi.fn();
    renderList({ onAcao });
    await userEvent.click(screen.getByRole('button', { name: 'Ações de Kit pronto' }));
    expect(screen.getByRole('menuitem', { name: 'Ver relatório de envios' })).toBeInTheDocument();
    expect(screen.queryByRole('menuitem', { name: 'Editar' })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('menuitem', { name: 'Duplicar' }));
    expect(onAcao).toHaveBeenCalledWith(expect.objectContaining({ id: 'a' }), 'duplicar');
  });

  it('"+ Nova campanha" dispara o callback', async () => {
    const onNova = vi.fn();
    renderList({ onNova });
    await userEvent.click(screen.getByRole('button', { name: '+ Nova campanha' }));
    expect(onNova).toHaveBeenCalledOnce();
  });

  it('etiqueta "Automática" só nas campanhas origem=automatizada (RN-132)', () => {
    render(
      <CampanhasList
        campanhas={[
          mk({ id: 'auto', titulo: 'Boas-vindas ao inscrito', origem: 'automatizada' }),
          mk({ id: 'man', titulo: 'Aviso manual', origem: 'manual' }),
        ]}
        loading={false}
        error={null}
        onNova={noop}
      />,
    );
    // 1 etiqueta no total (a manual não recebe) — sem ruído no caso comum.
    expect(screen.getAllByText('Automática')).toHaveLength(1);
  });

  it('lista vazia → EmptyState de primeira campanha (não "com filtros")', () => {
    render(<CampanhasList campanhas={[]} loading={false} error={null} onNova={noop} />);
    expect(screen.getByText(/crie a primeira campanha/i)).toBeInTheDocument();
  });

  it('skeleton no load e erro no fail', () => {
    const { rerender } = render(
      <CampanhasList campanhas={null} loading error={null} onNova={noop} />,
    );
    expect(screen.getByRole('status', { name: 'Carregando campanhas' })).toBeInTheDocument();
    rerender(<CampanhasList campanhas={null} loading={false} error={new Error('x')} onNova={noop} />);
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });
});
