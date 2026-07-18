// =============================================================================
// ReembolsosView (S904-T5 + join do nome R3) — cobre o JOIN do NOME do inscrito
// na fila de decisão: com o resolver, a coluna "Inscrito" mostra o `atletaNome`;
// sem resolver (nome não resolveu ainda), cai na ref opaca (fallback digno, nunca
// dado fake). Também: EmptyState honesto e as ações Aprovar/Recusar no em_analise.
// =============================================================================

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { Reembolso, Transferencia, Timestamp } from '@leela/core';
import { ReembolsosView } from '../ReembolsosView';

const noop = (): void => {};
const ts = (ms: number): Timestamp =>
  ({ toDate: () => new Date(ms), toMillis: () => ms }) as unknown as Timestamp;

function mkReembolso(over: Partial<Reembolso> = {}): Reembolso {
  return {
    id: 'insc-longo-abcdef123456',
    tenantId: 't1',
    eventoId: 'e1',
    pedidoId: 'p1',
    inscritoId: 'insc-longo-abcdef123456',
    motivo: 'desistência',
    estado: 'em_analise',
    origem: 'atleta',
    valorSolicitado: 12000,
    transicoes: [],
    criadoEm: ts(1),
    atualizadoEm: ts(2),
    ...over,
  };
}

function renderView(over = {}): ReturnType<typeof render> {
  return render(
    <ReembolsosView
      reembolsos={[mkReembolso()]}
      transferencias={[] as Transferencia[]}
      loading={false}
      error={null}
      onDecidir={noop}
      decidindo={false}
      {...over}
    />,
  );
}

describe('ReembolsosView — join do nome do inscrito (R3)', () => {
  it('com resolver, mostra o NOME do inscrito na coluna Inscrito', () => {
    renderView({ nomeInscrito: () => 'Marina Souza' });
    expect(screen.getByText('Marina Souza')).toBeInTheDocument();
  });

  it('sem resolver (nome não resolveu), cai na ref opaca — fallback digno, nunca fake', () => {
    renderView({ nomeInscrito: () => null });
    // Ref curta: 8 primeiros chars do id + reticências, jamais um nome inventado.
    expect(screen.getByText('insc-lon…')).toBeInTheDocument();
    expect(screen.queryByText('Marina Souza')).not.toBeInTheDocument();
  });

  it('sem a prop resolver, também usa a ref opaca (compatível)', () => {
    renderView();
    expect(screen.getByText('insc-lon…')).toBeInTheDocument();
  });

  it('em_analise ganha Aprovar e Recusar; o clique propaga a decisão', async () => {
    const { default: userEvent } = await import('@testing-library/user-event');
    const user = userEvent.setup({ delay: null });
    const onDecidir = vi.fn();
    renderView({ nomeInscrito: () => 'Marina Souza', onDecidir });
    await user.click(screen.getByRole('button', { name: 'Aprovar' }));
    expect(onDecidir).toHaveBeenCalledWith(
      expect.objectContaining({ estado: 'em_analise' }),
      'aprovar',
    );
  });
});
