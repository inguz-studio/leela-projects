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

describe('EventoForm (REVISÃO RN-153 — cadastro enriquecido)', () => {
  it('bloqueia o submit e mostra erro inline quando falta campo obrigatório', async () => {
    const { onCriarEvento } = renderForm();
    await userEvent.click(screen.getByRole('button', { name: 'Criar rascunho' }));
    expect(await screen.findByText('Informe o nome do evento.')).toBeInTheDocument();
    expect(onCriarEvento).not.toHaveBeenCalled();
  });

  it('cria rascunho com dados válidos e DERIVA percursos das modalidades (preço 0)', async () => {
    const { onCriarEvento, onSuccess } = renderForm();

    await userEvent.type(screen.getByLabelText('Nome do evento'), 'Corrida do Campeche');
    fireEvent.change(screen.getByLabelText('Data da prova'), { target: { value: '2099-04-27' } });
    await userEvent.type(screen.getByLabelText('Endereço / local'), 'Av. Campeche, 1000');

    // Modalidade por entrada livre (sem preço no cadastro).
    await userEvent.type(screen.getByLabelText('Adicionar modalidade'), 'Trail 15k');
    await userEvent.click(screen.getByRole('button', { name: 'Adicionar' }));

    await userEvent.click(screen.getByRole('button', { name: 'Criar rascunho' }));

    await waitFor(() => expect(onCriarEvento).toHaveBeenCalledTimes(1));
    expect(onCriarEvento).toHaveBeenCalledWith(
      expect.objectContaining({
        nome: 'Corrida do Campeche',
        local: 'Av. Campeche, 1000',
        data: '2099-04-27',
        modalidades: ['Trail 15k'],
        percursos: [{ nome: 'Trail 15k', preco: 0 }],
      }),
    );
    await waitFor(() => expect(onSuccess).toHaveBeenCalledWith({ eventoId: 'e1', slug: 'e1' }));
    expect(await screen.findByText('Rascunho criado')).toBeInTheDocument();
  });

  it('sugestão de modalidade adiciona por clique (5k/10k/21k/42k)', async () => {
    const { onCriarEvento } = renderForm();

    await userEvent.type(screen.getByLabelText('Nome do evento'), 'Evento Z');
    fireEvent.change(screen.getByLabelText('Data da prova'), { target: { value: '2099-04-27' } });
    await userEvent.type(screen.getByLabelText('Endereço / local'), 'SP');
    await userEvent.click(screen.getByRole('button', { name: '5k' }));

    await userEvent.click(screen.getByRole('button', { name: 'Criar rascunho' }));

    await waitFor(() => expect(onCriarEvento).toHaveBeenCalledTimes(1));
    expect(onCriarEvento).toHaveBeenCalledWith(
      expect.objectContaining({ modalidades: ['5k'], percursos: [{ nome: '5k', preco: 0 }] }),
    );
  });

  it('horário opcional vira INSTANTE ISO no fuso do produto (DST-safe)', async () => {
    const { onCriarEvento } = renderForm();

    await userEvent.type(screen.getByLabelText('Nome do evento'), 'Corrida 7h');
    fireEvent.change(screen.getByLabelText('Data da prova'), { target: { value: '2099-04-27' } });
    fireEvent.change(screen.getByLabelText('Horário (opcional)'), { target: { value: '07:00' } });
    await userEvent.type(screen.getByLabelText('Endereço / local'), 'SP');
    await userEvent.type(screen.getByLabelText('Adicionar modalidade'), '5k');
    await userEvent.click(screen.getByRole('button', { name: 'Adicionar' }));

    await userEvent.click(screen.getByRole('button', { name: 'Criar rascunho' }));

    await waitFor(() => expect(onCriarEvento).toHaveBeenCalledTimes(1));
    // 07:00 em America/Sao_Paulo (UTC-3) = 10:00Z — determinístico em qualquer runner.
    expect(onCriarEvento).toHaveBeenCalledWith(
      expect.objectContaining({ data: '2099-04-27T10:00:00.000Z' }),
    );
  });

  it('a taxa (RN-347) é um toggle ATIVO; por padrão persiste taxaModo=incorporada', async () => {
    const { onCriarEvento } = renderForm();
    const toggle = screen.getByRole('switch', { name: 'Repassar a taxa de serviço ao comprador' });
    expect(toggle).toBeEnabled();

    await userEvent.type(screen.getByLabelText('Nome do evento'), 'Evento Taxa');
    fireEvent.change(screen.getByLabelText('Data da prova'), { target: { value: '2099-04-27' } });
    await userEvent.type(screen.getByLabelText('Endereço / local'), 'SP');
    await userEvent.click(screen.getByRole('button', { name: '10k' }));
    await userEvent.click(screen.getByRole('button', { name: 'Criar rascunho' }));

    await waitFor(() => expect(onCriarEvento).toHaveBeenCalledTimes(1));
    expect(onCriarEvento).toHaveBeenCalledWith(
      expect.objectContaining({ taxaModo: 'incorporada' }),
    );
  });

  it('ligar o toggle persiste taxaModo=repassada (RN-347)', async () => {
    const { onCriarEvento } = renderForm();

    await userEvent.type(screen.getByLabelText('Nome do evento'), 'Evento Repassada');
    fireEvent.change(screen.getByLabelText('Data da prova'), { target: { value: '2099-04-27' } });
    await userEvent.type(screen.getByLabelText('Endereço / local'), 'SP');
    await userEvent.click(screen.getByRole('button', { name: '10k' }));
    await userEvent.click(
      screen.getByRole('switch', { name: 'Repassar a taxa de serviço ao comprador' }),
    );
    await userEvent.click(screen.getByRole('button', { name: 'Criar rascunho' }));

    await waitFor(() => expect(onCriarEvento).toHaveBeenCalledTimes(1));
    expect(onCriarEvento).toHaveBeenCalledWith(
      expect.objectContaining({ taxaModo: 'repassada' }),
    );
  });

  it('mostra Toast de erro quando a criação falha', async () => {
    renderForm(vi.fn().mockRejectedValue(new Error('backend off')));

    await userEvent.type(screen.getByLabelText('Nome do evento'), 'Evento X');
    fireEvent.change(screen.getByLabelText('Data da prova'), { target: { value: '2099-04-27' } });
    await userEvent.type(screen.getByLabelText('Endereço / local'), 'SP');
    await userEvent.type(screen.getByLabelText('Adicionar modalidade'), '5k');
    await userEvent.click(screen.getByRole('button', { name: 'Adicionar' }));
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
    await userEvent.type(screen.getByLabelText('Endereço / local'), 'SP');
    await userEvent.type(screen.getByLabelText('Adicionar modalidade'), '5k');
    await userEvent.click(screen.getByRole('button', { name: 'Adicionar' }));
    await userEvent.click(screen.getByRole('button', { name: 'Criar rascunho' }));

    expect(
      await screen.findByText('Sua conta não pode criar eventos agora'),
    ).toBeInTheDocument();
    expect(screen.queryByText('Tente novamente em instantes.')).not.toBeInTheDocument();
  });
});
