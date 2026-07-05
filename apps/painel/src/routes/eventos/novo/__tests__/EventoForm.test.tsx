import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ToastProvider } from '@leela/design-system';
import { EventoForm } from '../EventoForm';

function renderForm(onCriarEvento = vi.fn().mockResolvedValue({ eventoId: 'e1', slug: 'e1' })) {
  const onSuccess = vi.fn();
  render(
    <ToastProvider>
      <EventoForm onCriarEvento={onCriarEvento} onSuccess={onSuccess} />
    </ToastProvider>,
  );
  return { onCriarEvento, onSuccess };
}

describe('EventoForm', () => {
  it('bloqueia o submit e mostra erro inline quando falta campo obrigatório', async () => {
    const { onCriarEvento } = renderForm();
    await userEvent.click(screen.getByRole('button', { name: 'Criar rascunho' }));
    expect(await screen.findByText('Informe o nome do evento.')).toBeInTheDocument();
    expect(onCriarEvento).not.toHaveBeenCalled();
  });

  it('cria rascunho com dados válidos e dispara onSuccess', async () => {
    const { onCriarEvento, onSuccess } = renderForm();

    await userEvent.type(screen.getByLabelText('Nome do evento'), 'Meia Floripa 2026');
    fireEvent.change(screen.getByLabelText('Data da prova'), { target: { value: '2099-04-27' } });
    await userEvent.type(screen.getByLabelText('Local'), 'Florianópolis');

    await userEvent.type(screen.getByLabelText('Adicionar modalidade'), '10k');
    await userEvent.click(screen.getByRole('button', { name: 'Adicionar' }));

    await userEvent.type(screen.getByLabelText('Nome do percurso 1'), '10k');
    await userEvent.type(screen.getByLabelText('Preço do percurso 1'), '120');

    await userEvent.click(screen.getByRole('button', { name: 'Criar rascunho' }));

    await waitFor(() => expect(onCriarEvento).toHaveBeenCalledTimes(1));
    expect(onCriarEvento).toHaveBeenCalledWith(
      expect.objectContaining({
        nome: 'Meia Floripa 2026',
        local: 'Florianópolis',
        data: '2099-04-27',
        modalidades: ['10k'],
        percursos: [{ nome: '10k', preco: 120 }],
      }),
    );
    await waitFor(() => expect(onSuccess).toHaveBeenCalledWith({ eventoId: 'e1', slug: 'e1' }));
    expect(await screen.findByText('Rascunho criado')).toBeInTheDocument();
  });

  it('mostra Toast de erro quando a criação falha', async () => {
    renderForm(vi.fn().mockRejectedValue(new Error('backend off')));

    await userEvent.type(screen.getByLabelText('Nome do evento'), 'Evento X');
    fireEvent.change(screen.getByLabelText('Data da prova'), { target: { value: '2099-04-27' } });
    await userEvent.type(screen.getByLabelText('Local'), 'SP');
    await userEvent.type(screen.getByLabelText('Adicionar modalidade'), '5k');
    await userEvent.click(screen.getByRole('button', { name: 'Adicionar' }));
    await userEvent.type(screen.getByLabelText('Nome do percurso 1'), '5k');
    await userEvent.type(screen.getByLabelText('Preço do percurso 1'), '80');
    await userEvent.click(screen.getByRole('button', { name: 'Criar rascunho' }));

    expect(await screen.findByText('Não foi possível criar o evento')).toBeInTheDocument();
  });

  it('failed-precondition (RN-402) mostra toast ESPECÍFICO, não o genérico (review #34)', async () => {
    renderForm(
      vi.fn().mockRejectedValue({
        code: 'functions/failed-precondition',
        message: "Tenant 'castelo' não está ativo — operação bloqueada (RN-402).",
      }),
    );

    await userEvent.type(screen.getByLabelText('Nome do evento'), 'Evento Y');
    fireEvent.change(screen.getByLabelText('Data da prova'), { target: { value: '2099-04-27' } });
    await userEvent.type(screen.getByLabelText('Local'), 'SP');
    await userEvent.type(screen.getByLabelText('Adicionar modalidade'), '5k');
    await userEvent.click(screen.getByRole('button', { name: 'Adicionar' }));
    await userEvent.type(screen.getByLabelText('Nome do percurso 1'), '5k');
    await userEvent.type(screen.getByLabelText('Preço do percurso 1'), '80');
    await userEvent.click(screen.getByRole('button', { name: 'Criar rascunho' }));

    expect(
      await screen.findByText('Sua conta não pode criar eventos agora'),
    ).toBeInTheDocument();
    expect(screen.queryByText('Tente novamente em instantes.')).not.toBeInTheDocument();
  });
});
