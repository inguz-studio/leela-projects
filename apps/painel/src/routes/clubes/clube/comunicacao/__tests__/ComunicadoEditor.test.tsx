import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ToastProvider } from '@leela/design-system';
import type { AgregadosSegmentacao } from '@leela/core';
import { ComunicadoEditor } from '../ComunicadoEditor';

const AGREGADOS: AgregadosSegmentacao = {
  totalMembrosAtivos: 120,
  participantesPorDesafio: {},
  ativosPorJanela: {},
  membrosPorPilar: {},
};

const noop = () => {};

function renderEditor(over: Record<string, unknown> = {}) {
  return render(
    <ToastProvider>
      <ComunicadoEditor modo="create" agregados={AGREGADOS} onSalvar={noop} onCancelar={noop} {...over} />
    </ToastProvider>,
  );
}

describe('ComunicadoEditor', () => {
  it('mostra os 4 cards e a prévia por canal', () => {
    renderEditor();
    expect(screen.getByRole('heading', { name: 'Nova campanha', level: 1 })).toBeInTheDocument();
    expect(screen.getByLabelText('Prévia do comunicado')).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Push' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Email' })).toBeInTheDocument();
    expect(screen.getByText(/Alcance estimado: 120 membros/)).toBeInTheDocument();
  });

  it('preview push reflete o conteúdo e conta caracteres', async () => {
    renderEditor();
    await userEvent.type(screen.getByLabelText('Título'), 'Longão');
    await userEvent.type(screen.getByLabelText('Conteúdo'), 'Nos vemos às 7h.');
    const previa = screen.getByLabelText('Prévia do comunicado');
    // Contador de chars da prévia push (16 caracteres) — único no bloco de prévia.
    expect(within(previa).getByText(/16\/160 caracteres/)).toBeInTheDocument();
  });

  it('capa aparece só quando email está selecionado (RN-135)', async () => {
    renderEditor();
    expect(screen.queryByLabelText(/Imagem de capa/)).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Email' }));
    expect(screen.getByLabelText(/Imagem de capa/)).toBeInTheDocument();
  });

  it('agendar revela data e hora', async () => {
    renderEditor();
    expect(screen.queryByLabelText('Data')).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Agendar' }));
    expect(screen.getByLabelText('Data')).toBeInTheDocument();
    expect(screen.getByLabelText('Hora')).toBeInTheDocument();
  });

  it('salvar válido chama onSalvar com status rascunho', async () => {
    const onSalvar = vi.fn();
    renderEditor({ onSalvar });
    await userEvent.type(screen.getByLabelText('Título'), 'Aviso importante');
    await userEvent.type(screen.getByLabelText('Conteúdo'), 'Conteúdo com mais de dez chars.');
    await userEvent.click(screen.getByRole('button', { name: 'Salvar comunicado' }));
    expect(onSalvar).toHaveBeenCalledWith(
      expect.objectContaining({ titulo: 'Aviso importante' }),
      'rascunho',
    );
  });

  it('segmentação são radio-cards de decisão (não chips) e revelam a referência ao marcar', async () => {
    renderEditor();
    // Cada segmento é um radio (card), não um button (chip).
    expect(screen.getByRole('radio', { name: 'Todos os membros' })).toBeChecked();
    expect(screen.getByRole('radio', { name: 'Por desafio' })).toBeInTheDocument();
    // A referência só aparece quando um segmento != todos é escolhido.
    expect(screen.queryByLabelText('Referência do segmento')).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('radio', { name: 'Por desafio' }));
    expect(screen.getByLabelText('Referência do segmento')).toBeInTheDocument();
  });

  it('cancelar dispara o callback', async () => {
    const onCancelar = vi.fn();
    renderEditor({ onCancelar });
    await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(onCancelar).toHaveBeenCalledOnce();
  });
});
