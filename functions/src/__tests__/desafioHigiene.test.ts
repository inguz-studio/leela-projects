/**
 * desafioHigiene.test.ts — LEELA-S105-hig (E15 higiene · Onda 2 T2-L3 ·
 * decisão 7)
 *
 * Aceite falsificável do brief:
 *   - `Desafio` tem `autorId: string` OBRIGATÓRIO e `anexo?` opcional —
 *     "type-check falha se autorId ausente num literal de desafio".
 *
 * A parte de TIPO é verificada pelo `tsc --noEmit` (os @ts-expect-error
 * abaixo FALHAM o build se o erro esperado sumir — ou seja, se alguém
 * tornar autorId opcional, o type-check acusa AQUI). O runtime só confere
 * que os literais válidos compilam e carregam os campos.
 */
import { describe, expect, it } from 'vitest';
import type { Desafio, DesafioAnexo, Timestamp } from '@leela/core';

const ts: Timestamp = {
  seconds: 1770000000,
  nanoseconds: 0,
  toDate: () => new Date(1770000000000),
  toMillis: () => 1770000000000,
};

function base() {
  return {
    id: 'd1',
    tenantId: 'castelo',
    nome: 'Desafio',
    descricao: 'teste',
    modelo: 'B',
    dataInicio: ts,
    dataFim: ts,
    status: 'ativo',
    recompensaTipo: 'medalha_digital',
    visibilidade: 'membros',
    criadoEm: ts,
    atualizadoEm: ts,
    qtdParticipantes: 0,
    progressoPct: 0,
  } as const;
}

describe('Desafio — autorId obrigatório + anexo opcional (S105-hig)', () => {
  it('literal COM autorId compila e carrega o campo', () => {
    const desafio: Desafio = { ...base(), autorId: 'uid-felipe-martins' };
    expect(desafio.autorId).toBe('uid-felipe-martins');
    expect(desafio.anexo).toBeUndefined(); // opcional — ausente é válido
  });

  it('literal SEM autorId FALHA o type-check (aceite do brief)', () => {
    // @ts-expect-error — autorId é OBRIGATÓRIO: se este erro sumir
    // (alguém tornou o campo opcional), o tsc reprova este arquivo.
    const invalido: Desafio = { ...base() };
    expect(invalido).toBeDefined();
  });

  it('anexo? aceita DesafioAnexo (tipo previsto, sem fluxo na V1)', () => {
    const anexo: DesafioAnexo = {
      tipo: 'pdf',
      url: 'https://exemplo.com/plano-treino.pdf',
      titulo: 'Plano de treino',
    };
    const desafio: Desafio = {
      ...base(),
      autorId: 'uid-felipe-martins',
      anexo,
    };
    expect(desafio.anexo?.tipo).toBe('pdf');

    // @ts-expect-error — anexo sem url não é um DesafioAnexo válido
    const anexoInvalido: DesafioAnexo = { tipo: 'pdf' };
    expect(anexoInvalido).toBeDefined();
  });
});
