/**
 * estornosAdmin.test.tsx — LEELA-ESTORNO-T4 (RN-376/377)
 *
 * O que estas provas prendem na tela do admin:
 *   1. a fila não oferece botão para o que está AGUARDANDO O GATEWAY — clicar
 *      de novo é o estorno duplo que a RN-371 existe para matar;
 *   2. a coluna "aberto por" separa organizador de plataforma e denuncia o
 *      furo da véspera (sem isso a fila mente por omissão sobre a autoria);
 *   3. furar a véspera exige DUAS justificativas — a do reembolso e a do furo;
 *      sem a segunda o botão não habilita (RN-376).
 */

import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { Timestamp } from '@leela/core';
import { parseReembolso } from '@leela/api-client';
import { EstornosFilaView, avisosDaFila, rotuloEstadoFila, rotuloOrigem } from '../EstornosFilaView';
import { formularioCompleto } from '../EstornosAdminRoute';
import type { EstornoFilaItem, FilaEstornosAdmin } from '../../../../lib/query/queries';

const ts = { toMillis: () => 1_700_000_000_000, toDate: () => new Date(1_700_000_000_000) };

function item(over: Record<string, unknown> = {}): EstornoFilaItem {
  return {
    tenantId: 'castelo',
    tenantNome: 'Castelo Produções',
    eventoId: 'meia-floripa-2026',
    eventoNome: 'Meia Floripa 2026',
    reembolso: {
      id: 'insc-1',
      tenantId: 'castelo',
      eventoId: 'meia-floripa-2026',
      pedidoId: 'ped-1',
      inscritoId: 'insc-1',
      motivo: 'desistência',
      estado: 'em_analise',
      origem: 'organizador',
      valorSolicitado: 188.86,
      transicoes: [],
      criadoEm: ts as unknown as Timestamp,
      atualizadoEm: ts as unknown as Timestamp,
      ...over,
    },
  } as unknown as EstornoFilaItem;
}

/** Fila completa (nada cortado, nada falhou) — o caso feliz das provas antigas. */
function fila(
  itens: EstornoFilaItem[],
  over: Partial<FilaEstornosAdmin> = {},
): FilaEstornosAdmin {
  return {
    itens,
    ramosComFalha: 0,
    tenantsNoTeto: false,
    tenantsComEventosNoTeto: [],
    ...over,
  };
}

describe('fila de estornos da plataforma', () => {
  it('em análise oferece decisão; aguardando o gateway NÃO oferece botão', () => {
    render(
      <EstornosFilaView
        fila={fila([item(), item({ id: 'insc-2', inscritoId: 'insc-2', estado: 'aprovado_auto' })])}
        loading={false}
        error={null}
        running={false}
        onRetry={vi.fn()}
        onAprovar={vi.fn()}
        onRecusar={vi.fn()}
      />,
    );
    expect(screen.getAllByRole('button', { name: 'Aprovar' })).toHaveLength(1);
    expect(screen.getAllByRole('button', { name: 'Recusar' })).toHaveLength(1);
    expect(screen.getByText(/fecha sozinho quando o gateway confirmar/i)).toBeInTheDocument();
  });

  it('o estado executável na fila é dito como "aguardando", não como "aprovado"', () => {
    expect(rotuloEstadoFila(item({ estado: 'aprovado_auto' })).texto).toMatch(/aguardando/i);
    expect(rotuloEstadoFila(item({ estado: 'em_analise' })).texto).toMatch(/em análise/i);
  });

  it('a origem denuncia a plataforma e o furo da véspera', () => {
    expect(rotuloOrigem(item()).texto).toBe('Organizador');
    expect(rotuloOrigem(item({ origem: 'plataforma' })).texto).toBe('Plataforma');
    const furado = rotuloOrigem(item({ origem: 'plataforma', overrideCorte: true }));
    expect(furado.furou).toBe(true);
    expect(furado.texto).toMatch(/furou a véspera/i);
  });

  it('o parser não apaga a mão da plataforma: origem e furo sobrevivem à leitura (RN-376)', () => {
    // O doc que requestRefund grava na rota admin com override — se o parser
    // coagir a origem ou dropar o furo, a coluna "aberto por" mente em
    // produção mesmo com a view certa (era exatamente o bug: 'plataforma'
    // virava 'organizador' e overrideCorte era descartado na leitura).
    const doc = {
      tenantId: 'castelo',
      eventoId: 'meia-floripa-2026',
      pedidoId: 'ped-1',
      inscritoId: 'insc-9',
      motivo: 'atleta hospitalizado',
      estado: 'em_analise',
      origem: 'plataforma',
      valorSolicitado: 188.86,
      transicoes: [],
      criadoEm: ts,
      atualizadoEm: ts,
      overrideCorte: true,
      motivoOverride: 'ticket 4412',
      overridePor: 'uid-admin',
      corteHorasNoOverride: 48,
    };
    const r = parseReembolso('insc-9', doc);
    expect(r).not.toBeNull();
    expect(r?.origem).toBe('plataforma');
    expect(r?.overrideCorte).toBe(true);
    expect(r?.motivoOverride).toBe('ticket 4412');
    expect(r?.overridePor).toBe('uid-admin');
    expect(r?.corteHorasNoOverride).toBe(48);
    // E o rótulo da fila, alimentado pelo doc PARSEADO, denuncia o furo:
    const rotulo = rotuloOrigem({ ...item(), reembolso: r! } as EstornoFilaItem);
    expect(rotulo.furou).toBe(true);
    expect(rotulo.texto).toBe('Plataforma · furou a véspera');
  });

  it('fila vazia diz que não há pendência, não mostra zero ambíguo', () => {
    render(
      <EstornosFilaView
        fila={fila([])}
        loading={false}
        error={null}
        running={false}
        onRetry={vi.fn()}
        onAprovar={vi.fn()}
        onRecusar={vi.fn()}
      />,
    );
    expect(screen.getByText(/nenhum estorno pendente/i)).toBeInTheDocument();
    // Fila completa: nada de aviso inventado.
    expect(screen.queryByText(/esta fila pode estar incompleta/i)).not.toBeInTheDocument();
  });
});

describe('a fila declara o que NÃO está mostrando (item 52 · E-1/E-2)', () => {
  it('lista VAZIA com corte ainda avisa — "nada pendente" mudo era a mentira', () => {
    render(
      <EstornosFilaView
        fila={fila([], { tenantsNoTeto: true })}
        loading={false}
        error={null}
        running={false}
        onRetry={vi.fn()}
        onAprovar={vi.fn()}
        onRecusar={vi.fn()}
      />,
    );
    expect(screen.getByText(/esta fila pode estar incompleta/i)).toBeInTheDocument();
    expect(screen.getByText(/100 produtores mais recentes/i)).toBeInTheDocument();
  });

  it('ramo que falhou aparece no topo, junto com as linhas que carregaram', () => {
    render(
      <EstornosFilaView
        fila={fila([item()], { ramosComFalha: 2 })}
        loading={false}
        error={null}
        running={false}
        onRetry={vi.fn()}
        onAprovar={vi.fn()}
        onRecusar={vi.fn()}
      />,
    );
    expect(screen.getByText(/2 leituras falharam/i)).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Aprovar' })).toHaveLength(1);
  });

  it('avisosDaFila cobre as três omissões e cala quando a lista é completa', () => {
    expect(avisosDaFila(fila([]))).toEqual([]);
    expect(avisosDaFila(fila([], { ramosComFalha: 1 }))[0]).toMatch(/uma leitura falhou/i);
    expect(avisosDaFila(fila([], { tenantsNoTeto: true }))[0]).toMatch(/produtores mais recentes/i);
    const porEvento = avisosDaFila(fila([], { tenantsComEventosNoTeto: ['Castelo Produções'] }));
    expect(porEvento[0]).toMatch(/50 eventos por produtor/i);
    expect(porEvento[0]).toMatch(/Castelo Produções/);
    // As três omissões são independentes: acumulam, não se sobrescrevem.
    expect(
      avisosDaFila(
        fila([], { ramosComFalha: 3, tenantsNoTeto: true, tenantsComEventosNoTeto: ['Arena'] }),
      ),
    ).toHaveLength(3);
  });

  it('o corte NÃO é dito enquanto carrega nem por cima do erro da tela', () => {
    const cortada = fila([], { tenantsNoTeto: true });
    const { rerender } = render(
      <EstornosFilaView
        fila={cortada}
        loading
        error={null}
        running={false}
        onRetry={vi.fn()}
        onAprovar={vi.fn()}
        onRecusar={vi.fn()}
      />,
    );
    expect(screen.queryByText(/esta fila pode estar incompleta/i)).not.toBeInTheDocument();
    rerender(
      <EstornosFilaView
        fila={cortada}
        loading={false}
        error={new Error('boom')}
        running={false}
        onRetry={vi.fn()}
        onAprovar={vi.fn()}
        onRecusar={vi.fn()}
      />,
    );
    expect(screen.queryByText(/esta fila pode estar incompleta/i)).not.toBeInTheDocument();
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });
});

describe('ação direta — o que o formulário exige', () => {
  const base = { pedidoId: 'ped-1', inscritoId: 'insc-1', motivo: 'atleta hospitalizado' };

  it('furar a véspera SEM justificar o furo não habilita a ação (RN-376)', () => {
    expect(formularioCompleto('estornar', { ...base, motivoOverride: '' })).toBe(false);
    expect(formularioCompleto('estornar', { ...base, motivoOverride: 'ticket 4412' })).toBe(true);
  });

  it('cancelar sem estornar não pede o motivo do furo — não há furo', () => {
    expect(formularioCompleto('cancelar', { ...base, motivoOverride: '' })).toBe(true);
  });

  it('alvo incompleto ou motivo curto barram as duas ações', () => {
    expect(
      formularioCompleto('cancelar', { ...base, inscritoId: '', motivoOverride: '' }),
    ).toBe(false);
    expect(
      formularioCompleto('cancelar', { ...base, motivo: 'x', motivoOverride: '' }),
    ).toBe(false);
  });
});
