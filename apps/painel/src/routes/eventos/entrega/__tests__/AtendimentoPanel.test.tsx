import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ToastProvider } from '@leela/design-system';
import { AtendimentoPanel } from '../AtendimentoPanel';
import { mkEvento, mkInscrito } from '../../_test/fixtures';
import type { Evento, Inscrito } from '@leela/core';

function setup(opts: {
  evento?: Partial<Evento>;
  inscrito?: Partial<Inscrito>;
  vincular?: ReturnType<typeof vi.fn>;
  registrar?: ReturnType<typeof vi.fn>;
}) {
  const inscrito = mkInscrito({ atletaNome: 'Marina Silva', chipNumero: null, ...opts.inscrito });
  const vincular =
    opts.vincular ?? vi.fn().mockResolvedValue({ ok: true, chip: 'ABC123' });
  const registrar = opts.registrar ?? vi.fn().mockResolvedValue({ ok: true, jaRegistrado: false });
  render(
    <ToastProvider>
      <AtendimentoPanel
        evento={mkEvento(opts.evento)}
        inscritos={[inscrito]}
        onVincular={vincular}
        onRegistrar={registrar}
      />
    </ToastProvider>,
  );
  return { vincular, registrar };
}

async function selecionar(nome: string) {
  await userEvent.type(screen.getByLabelText('Buscar atleta'), nome);
  await userEvent.click(screen.getByRole('button', { name: nome }));
}

describe('AtendimentoPanel', () => {
  it('sem_kit + usaChip=false: sem passo de chip, botão registra presença', async () => {
    const { registrar } = setup({ evento: { usaChip: false }, inscrito: { kit: 'sem_kit' } });
    await selecionar('Marina Silva');
    expect(screen.queryByLabelText('Número do chip')).not.toBeInTheDocument();
    const btn = screen.getByRole('button', { name: 'Registrar presença' });
    await userEvent.click(btn);
    await waitFor(() => expect(registrar).toHaveBeenCalledTimes(1));
    expect(await screen.findByText('Presença registrada')).toBeInTheDocument();
  });

  it('usaChip=false + kit: botão entrega kit e registra presença', async () => {
    setup({ evento: { usaChip: false }, inscrito: { kit: 'kit_ouro' } });
    await selecionar('Marina Silva');
    expect(
      screen.getByRole('button', { name: 'Entregar kit e registrar presença' }),
    ).toBeInTheDocument();
  });

  // QA m3: a escrita do kit acontece no fechamento (RN-205) — com chip
  // pendente e SEM kitEntregueEm, NENHUM passo pode aparecer concluído.
  it('chip pendente sem entrega: passo "Entregar kit" NÃO aparece concluído (m3)', async () => {
    setup({
      evento: { usaChip: true },
      inscrito: { kit: 'kit_ouro', chipNumero: null },
    });
    await selecionar('Marina Silva');
    expect(screen.getByLabelText('Número do chip')).toBeInTheDocument();
    // Antes do fix, o passo 1 herdava ✓ da derivação linear (current no chip).
    expect(screen.queryByText('(concluída)')).not.toBeInTheDocument();
  });

  it('usaChip=true: exibe input de chip e vincula', async () => {
    const { vincular } = setup({ evento: { usaChip: true }, inscrito: { kit: 'kit_ouro' } });
    await selecionar('Marina Silva');
    await userEvent.type(screen.getByLabelText('Número do chip'), 'ABC123');
    await userEvent.click(screen.getByRole('button', { name: 'Vincular chip' }));
    await waitFor(() => expect(vincular).toHaveBeenCalledWith('ins-1', 'ABC123', false));
  });

  it('conflito de chip abre ConfirmModal e sobrescreve (RN-206)', async () => {
    const vincular = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, conflito: { inscritoId: 'x', atletaNome: 'Outro Atleta' } })
      .mockResolvedValueOnce({ ok: true, chip: 'ABC123' });
    setup({ evento: { usaChip: true }, inscrito: { kit: 'kit_ouro' }, vincular });
    await selecionar('Marina Silva');
    await userEvent.type(screen.getByLabelText('Número do chip'), 'ABC123');
    await userEvent.click(screen.getByRole('button', { name: 'Vincular chip' }));
    expect(await screen.findByText('Chip já vinculado a outro atleta')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Sobrescrever chip' }));
    await waitFor(() => expect(vincular).toHaveBeenLastCalledWith('ins-1', 'ABC123', true));
  });
});
