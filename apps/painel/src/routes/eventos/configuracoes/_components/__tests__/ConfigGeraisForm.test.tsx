// =============================================================================
// Testes do ConfigGeraisForm (S304-T2). Aceites de UI: usaChip=false persiste
// (RN-207), URL pública read-only usa {DOMINIO_LEELA}, papel sem permissão vê
// leitura (sem Salvar), nome vazio bloqueia (§2.12).
// =============================================================================

import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ToastProvider } from '@leela/design-system';
import type { Evento, Timestamp } from '@leela/core';
import { ConfigGeraisForm } from '../ConfigGeraisForm';

function ts(ms: number): Timestamp {
  return {
    seconds: Math.floor(ms / 1000),
    nanoseconds: 0,
    toDate: () => new Date(ms),
    toMillis: () => ms,
  } as Timestamp;
}

function fakeEvento(over: Partial<Evento> = {}): Evento {
  return {
    id: 'meia-floripa-2026',
    tenantId: 'tnt',
    organizadorId: 'uid-dono',
    nome: 'Meia Floripa 2026',
    data: ts(Date.UTC(2026, 3, 19, 12)),
    local: 'Florianópolis, SC',
    modalidades: ['5k', '10k', '21k'],
    percursos: [],
    slug: 'meia-floripa-2026',
    status: 'rascunho',
    usaChip: true,
    criadoEm: ts(0),
    atualizadoEm: ts(0),
    qtdInscritos: 0,
    receitaConfirmada: 0,
    capacidade: 500,
    janelasEntrega: [],
    faixaChips: null,
    ...over,
  };
}

function setup(opts: { evento?: Evento; podeEditar?: boolean } = {}) {
  const onSalvar = vi.fn().mockResolvedValue(undefined);
  render(
    <ToastProvider>
      <ConfigGeraisForm
        evento={opts.evento ?? fakeEvento()}
        podeEditar={opts.podeEditar ?? true}
        onSalvar={onSalvar}
      />
    </ToastProvider>,
  );
  return { onSalvar };
}

describe('ConfigGeraisForm (S304-T2)', () => {
  it('salva usaChip=false → payload reflete (RN-207)', async () => {
    const { onSalvar } = setup();
    await userEvent.click(screen.getByRole('switch', { name: /Usa chip/ }));
    await userEvent.click(screen.getByRole('button', { name: 'Salvar configurações' }));
    await waitFor(() => expect(onSalvar).toHaveBeenCalledTimes(1));
    expect(onSalvar).toHaveBeenCalledWith(expect.objectContaining({ usaChip: false }));
  });

  it('URL pública read-only usa {DOMINIO_LEELA} e nunca o host legado', () => {
    setup();
    const url = screen.getByLabelText('URL pública') as HTMLInputElement;
    expect(url.value).toBe('{DOMINIO_LEELA}/meia-floripa-2026');
    expect(url.value).not.toContain('be-hero');
    expect(url).toHaveAttribute('readonly');
  });

  it('papel sem permissão vê leitura: sem botão Salvar, campos desabilitados', () => {
    setup({ podeEditar: false });
    expect(screen.queryByRole('button', { name: 'Salvar configurações' })).toBeNull();
    expect(screen.getByLabelText('Nome do evento')).toBeDisabled();
    expect(screen.getByText(/Seu papel não permite editar/)).toBeInTheDocument();
  });

  it('nome vazio bloqueia o submit (§2.12)', async () => {
    const { onSalvar } = setup();
    await userEvent.clear(screen.getByLabelText('Nome do evento'));
    await userEvent.click(screen.getByRole('button', { name: 'Salvar configurações' }));
    expect(await screen.findByText('Informe o nome do evento.')).toBeInTheDocument();
    expect(onSalvar).not.toHaveBeenCalled();
  });
});
