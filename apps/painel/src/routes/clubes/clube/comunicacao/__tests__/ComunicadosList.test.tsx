import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ComunicadosList } from '../ComunicadosList';
import { mkComunicado } from '../../../_test/fixtures';

const noop = () => {};

const LISTA = [
  mkComunicado({ id: 'a', titulo: 'Longão de sábado', status: 'enviado', canal: ['push'] }),
  mkComunicado({ id: 'b', titulo: 'Aviso agendado', status: 'agendado', canal: ['email'] }),
  mkComunicado({ id: 'c', titulo: 'Rascunho novo', status: 'rascunho', canal: ['push'] }),
];

function renderList(over = {}) {
  return render(
    <ComunicadosList comunicados={LISTA} loading={false} error={null} onNova={noop} {...over} />,
  );
}

describe('ComunicadosList', () => {
  it('renderiza KPIs e a lista', () => {
    renderList();
    expect(screen.getByText('Total')).toBeInTheDocument();
    expect(screen.getByText('Longão de sábado')).toBeInTheDocument();
    expect(screen.getByText('Mostrando 3 de 3 comunicados')).toBeInTheDocument();
  });

  // Três facetas em fileira de chips eram três linhas em 768px — a prova
  // medida de que só a forma de lista sobrevive ao número de facetas (leva 20).
  it('filtro de status (Enviados) esconde os demais', async () => {
    renderList();
    await userEvent.click(screen.getByRole('button', { name: 'Status' }));
    await userEvent.click(await screen.findByRole('option', { name: 'Enviados' }));
    expect(screen.getByText('Longão de sábado')).toBeInTheDocument();
    expect(screen.queryByText('Aviso agendado')).not.toBeInTheDocument();
  });

  it('filtro que zera mostra EmptyState', async () => {
    renderList();
    await userEvent.type(screen.getByRole('searchbox', { name: 'Buscar comunicado por título' }), 'zzz');
    expect(screen.getByText(/nenhum comunicado encontrado/i)).toBeInTheDocument();
  });

  it('popover é contextual por status (enviado = Ver relatório, sem Editar)', async () => {
    const onAcao = vi.fn();
    renderList({ onAcao });
    await userEvent.click(screen.getByRole('button', { name: 'Ações de Longão de sábado' }));
    expect(screen.getByRole('menuitem', { name: 'Ver relatório' })).toBeInTheDocument();
    expect(screen.queryByRole('menuitem', { name: 'Editar' })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('menuitem', { name: 'Ver relatório' }));
    expect(onAcao).toHaveBeenCalledWith(expect.objectContaining({ id: 'a' }), 'relatorio');
  });

  it('nova campanha dispara o callback', async () => {
    const onNova = vi.fn();
    renderList({ onNova });
    await userEvent.click(screen.getByRole('button', { name: '+ Nova campanha' }));
    expect(onNova).toHaveBeenCalledOnce();
  });

  it('skeleton no load e erro no fail', () => {
    const { rerender } = render(
      <ComunicadosList comunicados={null} loading error={null} onNova={noop} />,
    );
    expect(screen.getByRole('status', { name: 'Carregando comunicados' })).toBeInTheDocument();
    rerender(<ComunicadosList comunicados={null} loading={false} error={new Error('x')} onNova={noop} />);
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });
});
