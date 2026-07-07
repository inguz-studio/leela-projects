import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ToastProvider } from '@leela/design-system';
import { AtendimentoPanel } from '../AtendimentoPanel';
import { mkEvento, mkInscrito } from '../../_test/fixtures';
import type { Evento, Inscrito, ItemKit } from '@leela/core';

function setup(opts: {
  evento?: Partial<Evento>;
  inscrito?: Partial<Inscrito>;
  itensKit?: ItemKit[];
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
        itensKit={opts.itensKit ?? []}
        onVincular={vincular}
        onRegistrar={registrar}
      />
    </ToastProvider>,
  );
  return { vincular, registrar };
}

function mkItem(over: Partial<ItemKit> = {}): ItemKit {
  return {
    id: over.id ?? 'item-1',
    tenantId: 'castelo',
    eventoId: 'meia-floripa-2026',
    nome: over.nome ?? 'Camiseta técnica',
    tamanhado: over.tamanhado ?? false,
    origem: over.origem ?? 'organizador',
    exibirLogo: over.exibirLogo ?? false,
    kits: over.kits ?? ['kit-ouro'],
    criadoEm: mkInscrito().criadoEm,
    atualizadoEm: mkInscrito().atualizadoEm,
    ...over,
  };
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

  it('checklist do kit: renderiza os itens reais do kit do atleta (RN-215)', async () => {
    setup({
      evento: { usaChip: true },
      inscrito: { kit: 'kit_ouro' },
      itensKit: [
        mkItem({ id: 'camiseta', nome: 'Camiseta técnica', tamanhado: true, kits: ['kit-ouro'] }),
        mkItem({
          id: 'whey',
          nome: 'Sachê de whey',
          origem: 'patrocinador',
          marca: 'Growth',
          kits: ['kit-ouro'],
        }),
        mkItem({ id: 'outro', nome: 'Item de outro kit', kits: ['kit-basico'] }),
      ],
    });
    await selecionar('Marina Silva');
    expect(screen.getByText('Camiseta técnica')).toBeInTheDocument();
    expect(screen.getByText('Sachê de whey')).toBeInTheDocument();
    expect(screen.getByText('Growth')).toBeInTheDocument();
    // Item que não pertence ao kit do atleta não aparece.
    expect(screen.queryByText('Item de outro kit')).not.toBeInTheDocument();
  });

  it('checklist do kit: sem_kit não mostra checklist', async () => {
    setup({
      evento: { usaChip: false },
      inscrito: { kit: 'sem_kit' },
      itensKit: [mkItem({ id: 'camiseta', nome: 'Camiseta técnica', kits: ['kit-basico'] })],
    });
    await selecionar('Marina Silva');
    expect(screen.queryByText('Camiseta técnica')).not.toBeInTheDocument();
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
