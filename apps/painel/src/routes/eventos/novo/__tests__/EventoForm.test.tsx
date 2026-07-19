import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
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

// A "Data da prova" agora é o DatePicker do DS (§8/F-01) — não há mais input
// nativo p/ setar valor via fireEvent. O relógio é congelado em abr/2099
// (beforeEach) para o calendário abrir nesse mês; clicar o dia 27 reproduz o
// mesmo '2099-04-27' que as asserções já esperavam — asserções intocadas.
async function escolherDataDaProva(): Promise<void> {
  await userEvent.click(screen.getByRole('button', { name: 'Data da prova' }));
  await userEvent.click(screen.getByRole('button', { name: /27 de abril de 2099/ }));
}

describe('EventoForm (REVISÃO RN-153 — cadastro enriquecido)', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(new Date(2099, 3, 15, 12, 0, 0));
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('bloqueia o submit e mostra erro inline quando falta campo obrigatório', async () => {
    const { onCriarEvento } = renderForm();
    await userEvent.click(screen.getByRole('button', { name: 'Criar rascunho' }));
    expect(await screen.findByText('Informe o nome do evento.')).toBeInTheDocument();
    expect(onCriarEvento).not.toHaveBeenCalled();
  });

  it('cria rascunho com dados válidos e DERIVA percursos das modalidades (preço 0)', async () => {
    const { onCriarEvento, onSuccess } = renderForm();

    await userEvent.type(screen.getByLabelText('Nome do evento'), 'Corrida do Campeche');
    await escolherDataDaProva();
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
    await escolherDataDaProva();
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
    await escolherDataDaProva();
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
    await escolherDataDaProva();
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
    await escolherDataDaProva();
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
    await escolherDataDaProva();
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
    await escolherDataDaProva();
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
