// =============================================================================
// Testes do CupomModal (S300-T5). Cobrem os aceites de UI: código duplicado →
// erro inline (unicidade), percentual fora de 0–100 → bloqueia, campos opcionais
// (teto) persistem, código imutável em edição, e uma das 4 vias de fechamento.
// =============================================================================

import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ToastProvider } from '@leela/design-system';
import type { Cupom, Timestamp } from '@leela/core';
import { CupomModal } from '../CupomModal';

function ts(ms: number): Timestamp {
  return {
    seconds: Math.floor(ms / 1000),
    nanoseconds: 0,
    toDate: () => new Date(ms),
    toMillis: () => ms,
  } as Timestamp;
}

interface SetupOpts {
  cupom?: Cupom | null;
  codigosExistentes?: readonly string[];
}

function setup(opts: SetupOpts = {}) {
  const onSalvar = vi.fn().mockResolvedValue(undefined);
  const onOpenChange = vi.fn();
  render(
    <ToastProvider>
      <CupomModal
        open
        onOpenChange={onOpenChange}
        cupom={opts.cupom ?? null}
        codigosExistentes={opts.codigosExistentes ?? []}
        onSalvar={onSalvar}
      />
    </ToastProvider>,
  );
  return { onSalvar, onOpenChange };
}

describe('CupomModal (S300-T5)', () => {
  it('bloqueia código duplicado com erro inline (unicidade por evento)', async () => {
    const { onSalvar } = setup({ codigosExistentes: ['CORRIDA10'] });
    await userEvent.type(screen.getByLabelText('Código'), 'corrida10');
    await userEvent.type(screen.getByLabelText('Desconto (%)'), '10');
    await userEvent.click(screen.getByRole('button', { name: 'Salvar cupom' }));
    expect(await screen.findByText(/Já existe um cupom com o código CORRIDA10/)).toBeInTheDocument();
    expect(onSalvar).not.toHaveBeenCalled();
  });

  it('bloqueia percentual fora de 0–100', async () => {
    const { onSalvar } = setup();
    await userEvent.type(screen.getByLabelText('Código'), 'PROMO50');
    await userEvent.type(screen.getByLabelText('Desconto (%)'), '120');
    await userEvent.click(screen.getByRole('button', { name: 'Salvar cupom' }));
    expect(await screen.findByText(/entre 0 e 100/)).toBeInTheDocument();
    expect(onSalvar).not.toHaveBeenCalled();
  });

  it('salva com teto de usos opcional (persiste)', async () => {
    const { onSalvar } = setup();
    await userEvent.type(screen.getByLabelText('Código'), 'NEWCODE');
    await userEvent.type(screen.getByLabelText('Desconto (%)'), '10');
    await userEvent.type(screen.getByLabelText('Limite de usos (opcional)'), '50');
    await userEvent.click(screen.getByRole('button', { name: 'Salvar cupom' }));
    await waitFor(() => expect(onSalvar).toHaveBeenCalledTimes(1));
    const [cupomId, input, criar] = onSalvar.mock.calls[0]!;
    expect(cupomId).toBe('NEWCODE');
    expect(criar).toBe(true);
    expect(input).toMatchObject({ codigo: 'NEWCODE', tipo: 'percentual', valor: 10, tetoUso: 50 });
    expect(input.inicioEm).toBeInstanceOf(Date);
    expect(input.fimEm).toBeInstanceOf(Date);
  });

  it('salva desconto fixo em R$ (tetoUso null quando vazio)', async () => {
    const { onSalvar } = setup();
    await userEvent.type(screen.getByLabelText('Código'), 'FIXO50');
    await userEvent.click(screen.getByRole('radio', { name: 'Valor fixo (R$)' }));
    await userEvent.type(screen.getByLabelText('Desconto (R$)'), '50,00');
    await userEvent.click(screen.getByRole('button', { name: 'Salvar cupom' }));
    await waitFor(() => expect(onSalvar).toHaveBeenCalledTimes(1));
    const [, input] = onSalvar.mock.calls[0]!;
    expect(input).toMatchObject({ tipo: 'fixo', valor: 50, tetoUso: null });
  });

  it('em edição o código é imutável (input desabilitado)', () => {
    const cupom: Cupom = {
      id: 'EDIT10',
      tenantId: 't1',
      codigo: 'EDIT10',
      tipo: 'percentual',
      valor: 10,
      tetoUso: null,
      inicioEm: ts(Date.parse('2026-08-01T00:00:00Z')),
      fimEm: ts(Date.parse('2026-09-01T00:00:00Z')),
      usos: 0,
      criadoEm: ts(0),
      atualizadoEm: ts(0),
    };
    setup({ cupom });
    expect(screen.getByLabelText('Código')).toBeDisabled();
    expect(screen.getByText('O código não pode ser alterado depois de criado.')).toBeInTheDocument();
  });

  // REV-PARSE · defeito achado na review antagonista. `valorCupomValido` não
  // limita casa decimal no percentual (só 0 < v ≤ 100), então 12,345% é
  // gravável. O form semeava o percentual com `String(cupom.valor)` cru —
  // "12.345" — e o `parseValorPtBr` lê ponto com grupo final de três dígitos
  // como MILHAR (FIX-PARSE-MILHAR): 12345%, que a própria validação recusa.
  // O organizador reabria um cupom seu e o form acusava um campo que ele não
  // tinha tocado, travando qualquer edição de janela ou de teto. O ramo `fixo`
  // já se protegia com a vírgula; o percentual não.
  it('cupom percentual de três casas reabre editável e salva o mesmo valor', async () => {
    const cupom: Cupom = {
      id: 'PCT3',
      tenantId: 't1',
      codigo: 'PCT3',
      tipo: 'percentual',
      valor: 12.345,
      tetoUso: null,
      inicioEm: ts(Date.parse('2026-08-01T00:00:00Z')),
      fimEm: ts(Date.parse('2026-09-01T00:00:00Z')),
      usos: 0,
      criadoEm: ts(0),
      atualizadoEm: ts(0),
    };
    const { onSalvar } = setup({ cupom });
    // Salvar sem tocar em nada. Sem o conserto o form recusa aqui, com
    // "Valor de desconto inconsistente com o tipo", e `onSalvar` nunca corre.
    await userEvent.click(screen.getByRole('button', { name: 'Salvar cupom' }));
    await waitFor(() => expect(onSalvar).toHaveBeenCalledTimes(1));
    const [, input] = onSalvar.mock.calls[0]!;
    expect(input.valor).toBe(12.345);
    expect(input.valor).not.toBe(12345);
    expect(screen.getByLabelText('Desconto (%)')).toHaveValue('12,345');
  });

  it('cupom fixo de milhar reabre com vírgula e salva o mesmo valor', async () => {
    const cupom: Cupom = {
      id: 'FIX1234',
      tenantId: 't1',
      codigo: 'FIX1234',
      tipo: 'fixo',
      valor: 1234.56,
      tetoUso: null,
      inicioEm: ts(Date.parse('2026-08-01T00:00:00Z')),
      fimEm: ts(Date.parse('2026-09-01T00:00:00Z')),
      usos: 0,
      criadoEm: ts(0),
      atualizadoEm: ts(0),
    };
    const { onSalvar } = setup({ cupom });
    await userEvent.click(screen.getByRole('button', { name: 'Salvar cupom' }));
    await waitFor(() => expect(onSalvar).toHaveBeenCalledTimes(1));
    const [, input] = onSalvar.mock.calls[0]!;
    expect(input.valor).toBe(1234.56);
    expect(screen.getByLabelText('Desconto (R$)')).toHaveValue('1234,56');
  });

  it('fecha pelo Cancelar (uma das 4 vias)', async () => {
    const { onOpenChange } = setup();
    await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
