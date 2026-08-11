/**
 * faceMinimaVenda.test.ts — RN-559 (unit puro, sem emulator)
 *
 * A venda PAGA tem face mínima de R$ 10,00 (decisão do dono em 2026-08-11,
 * item SERV-2). Três fatos que este arquivo prova, e que a lane inteira repete
 * nas outras duas camadas:
 *
 *   R$ 9,99  → RECUSA, e a recusa é a NOMEADA ('face_abaixo_da_minima')
 *   R$ 10,00 → passa (a fronteira é inclusiva)
 *   R$ 0,00  → passa (inscrição gratuita continua permitida)
 *
 * FALSIFICAÇÃO do valor: se alguém trocar o mínimo de 10 para 5, o caso de
 * R$ 5,00 abaixo quebra. Se alguém tornar o gratuito proibido, o caso de
 * R$ 0,00 quebra. Se alguém trocar a recusa nomeada por uma genérica, os
 * casos de motivo quebram.
 */
import { describe, expect, it } from 'vitest';
import {
  FACE_MINIMA_VENDA_PAGA_CENTAVOS,
  FACE_MINIMA_VENDA_PAGA_REAIS,
  MSG_FACE_MINIMA_VENDA_PAGA,
  faceMinimaVendaPagaValida,
  validarFaceMinimaVendaPaga,
} from '@leela/core';
import {
  CODIGO_RECUSA_FACE_MINIMA,
  assertFaceMinimaVendaPaga,
} from '../eventos/guardPrecoLote';
import { readFileSync } from 'fs';
import { resolve } from 'path';

describe('RN-559 — a constante', () => {
  it('o mínimo da venda paga é R$ 10,00', () => {
    expect(FACE_MINIMA_VENDA_PAGA_REAIS).toBe(10);
  });

  it('a mesma face em centavos inteiros é 1000', () => {
    expect(FACE_MINIMA_VENDA_PAGA_CENTAVOS).toBe(1000);
    expect(FACE_MINIMA_VENDA_PAGA_CENTAVOS).toBe(FACE_MINIMA_VENDA_PAGA_REAIS * 100);
  });
});

describe('RN-559 — faceMinimaVendaPagaValida', () => {
  it('R$ 9,99 é recusado (a venda paga barata que a regra existe para matar)', () => {
    expect(faceMinimaVendaPagaValida(9.99)).toBe(false);
  });

  it('R$ 10,00 passa — a fronteira é inclusiva', () => {
    expect(faceMinimaVendaPagaValida(10)).toBe(true);
  });

  it('R$ 0,00 passa — gratuidade não é venda', () => {
    expect(faceMinimaVendaPagaValida(0)).toBe(true);
  });

  it('o centavo acima de zero já é venda paga, e já é recusado', () => {
    expect(faceMinimaVendaPagaValida(0.01)).toBe(false);
  });

  it('R$ 5,00 é recusado — falsifica o mínimo trocado para 5', () => {
    expect(faceMinimaVendaPagaValida(5)).toBe(false);
  });

  it('R$ 10,01 e faces grandes passam', () => {
    expect(faceMinimaVendaPagaValida(10.01)).toBe(true);
    expect(faceMinimaVendaPagaValida(120)).toBe(true);
  });

  it('a faixa inteira de R$ 0,01 a R$ 9,99, centavo a centavo, é recusada', () => {
    const recusados: number[] = [];
    for (let centavos = 1; centavos <= 999; centavos++) {
      if (!faceMinimaVendaPagaValida(centavos / 100)) recusados.push(centavos);
    }
    expect(recusados).toHaveLength(999);
  });

  it('a faixa de R$ 10,00 a R$ 20,00, centavo a centavo, passa inteira', () => {
    const aceitos: number[] = [];
    for (let centavos = 1000; centavos <= 2000; centavos++) {
      if (faceMinimaVendaPagaValida(centavos / 100)) aceitos.push(centavos);
    }
    expect(aceitos).toHaveLength(1001);
  });

  it('não-número, infinito e negativo são recusados (shape, não faixa)', () => {
    expect(faceMinimaVendaPagaValida('10')).toBe(false);
    expect(faceMinimaVendaPagaValida(null)).toBe(false);
    expect(faceMinimaVendaPagaValida(undefined)).toBe(false);
    expect(faceMinimaVendaPagaValida(Number.POSITIVE_INFINITY)).toBe(false);
    expect(faceMinimaVendaPagaValida(Number.NaN)).toBe(false);
    expect(faceMinimaVendaPagaValida(-5)).toBe(false);
  });
});

describe('RN-559 — a recusa é NOMEADA, não genérica', () => {
  it('R$ 9,99 recusa com motivo "face_abaixo_da_minima"', () => {
    const veredito = validarFaceMinimaVendaPaga(9.99);
    expect(veredito.ok).toBe(false);
    if (veredito.ok) throw new Error('R$ 9,99 não pode passar');
    expect(veredito.motivo).toBe('face_abaixo_da_minima');
    expect(veredito.mensagem).toBe(MSG_FACE_MINIMA_VENDA_PAGA);
  });

  it('a mensagem diz o número e a saída, em português comum', () => {
    expect(MSG_FACE_MINIMA_VENDA_PAGA).toContain('R$ 10,00');
    expect(MSG_FACE_MINIMA_VENDA_PAGA).toContain('R$ 0,00');
  });

  it('número inválido recusa com OUTRO motivo — os dois consertos são diferentes', () => {
    const veredito = validarFaceMinimaVendaPaga(-1);
    expect(veredito.ok).toBe(false);
    if (veredito.ok) throw new Error('face negativa não pode passar');
    expect(veredito.motivo).toBe('face_nao_e_numero_valido');
  });

  it('R$ 10,00 e R$ 0,00 passam sem motivo nenhum', () => {
    expect(validarFaceMinimaVendaPaga(10)).toEqual({ ok: true });
    expect(validarFaceMinimaVendaPaga(0)).toEqual({ ok: true });
  });
});

// ---------------------------------------------------------------------------
// Camada 3 do servidor — o guard que o Admin SDK não pode contornar
// ---------------------------------------------------------------------------
//
// A Rule fecha a porta do cliente; este guard fecha a porta do Admin SDK, que
// bypassa as Rules por construção. Ele é PURO (não toca o Firestore), então a
// prova roda no gate rápido, sem emulador.

describe('RN-559 — assertFaceMinimaVendaPaga (guard de Function)', () => {
  it('R$ 9,99 lança invalid-argument com o motivo NOMEADO no código e no detalhe', () => {
    let capturado: unknown = null;
    try {
      assertFaceMinimaVendaPaga(9.99, 'lote-teste');
    } catch (e) {
      capturado = e;
    }
    expect(capturado).toMatchObject({
      code: 'invalid-argument',
      details: {
        regra: CODIGO_RECUSA_FACE_MINIMA,
        motivo: 'face_abaixo_da_minima',
        loteId: 'lote-teste',
      },
    });
    // A recusa é NOMEADA, não genérica: a mensagem carrega a regra e o motivo.
    expect((capturado as Error).message).toContain('RN-559/face_abaixo_da_minima');
    expect((capturado as Error).message).toContain('lote-teste');
  });

  it('R$ 10,00 e R$ 0,00 passam sem lançar', () => {
    expect(() => assertFaceMinimaVendaPaga(10, 'lote-teste')).not.toThrow();
    expect(() => assertFaceMinimaVendaPaga(0, 'lote-teste')).not.toThrow();
  });

  it('número inválido lança com o OUTRO motivo — a recusa distingue os dois consertos', () => {
    let capturado: unknown = null;
    try {
      assertFaceMinimaVendaPaga(-1, 'lote-teste');
    } catch (e) {
      capturado = e;
    }
    expect(capturado).toMatchObject({
      code: 'invalid-argument',
      details: { motivo: 'face_nao_e_numero_valido' },
    });
  });

  it('a faixa proibida inteira lança, e nenhuma face ≥ R$ 10,00 lança', () => {
    let lancaram = 0;
    for (let centavos = 1; centavos <= 999; centavos++) {
      try {
        assertFaceMinimaVendaPaga(centavos / 100, 'l');
      } catch {
        lancaram++;
      }
    }
    expect(lancaram).toBe(999);

    let passaram = 0;
    for (let centavos = 1000; centavos <= 1500; centavos++) {
      try {
        assertFaceMinimaVendaPaga(centavos / 100, 'l');
        passaram++;
      } catch {
        /* nenhuma deve cair aqui */
      }
    }
    expect(passaram).toBe(501);
  });
});

// ---------------------------------------------------------------------------
// Camada 2 do servidor — o ESPELHO da Rule não pode derivar do core
// ---------------------------------------------------------------------------
//
// A fechadura de verdade é a Security Rule, e ela é exercitada por ataque em
// `vendasRules.integration.test.ts` (⚠️ exige Firestore Emulator, que por sua
// vez exige JDK 21+). Este bloco é a prova que roda em QUALQUER máquina, e ela
// cobre o defeito que a suíte de ataque não cobriria de graça: o número do
// mínimo está escrito DUAS vezes — em TypeScript, no core, e em CEL, dentro do
// arquivo de Rules, que não importa o core. Duas fontes do mesmo número
// derivam em silêncio. Aqui elas são amarradas.
//
// Leitura por LINHA, nunca por regex com `\n`: o repositório grava CRLF, e um
// padrão multilinha com `\n` passa verde sem casar com nada.

const RULES_PATH = resolve(__dirname, '../../../firestore.rules');

/** Linhas do bloco `match /lotes/{loteId}` do arquivo de Rules. */
function linhasDoBlocoDeLotes(): string[] {
  const linhas = readFileSync(RULES_PATH, 'utf8').split(/\r?\n/);
  const inicio = linhas.findIndex((l) => l.includes('match /lotes/{loteId}'));
  const fim = linhas.findIndex((l, i) => i > inicio && l.includes('match /cupons/{cupomId}'));
  if (inicio === -1 || fim === -1) {
    throw new Error('firestore.rules: bloco de lotes não encontrado — o espelho perdeu o alvo');
  }
  return linhas.slice(inicio, fim);
}

describe('RN-559 — a Rule espelha o core, e o espelho é amarrado', () => {
  it('o bloco de lotes declara o predicado da face mínima', () => {
    const bloco = linhasDoBlocoDeLotes();
    expect(bloco.some((l) => l.includes('function faceMinimaVendaPagaOk()'))).toBe(true);
  });

  it('o número na Rule é o MESMO do core — se um mudar sozinho, isto quebra', () => {
    const bloco = linhasDoBlocoDeLotes();
    const corpo = bloco
      .slice(bloco.findIndex((l) => l.includes('function faceMinimaVendaPagaOk()')))
      .slice(0, 5)
      .join(' ');
    expect(corpo).toContain('request.resource.data.preco == 0');
    expect(corpo).toContain(`request.resource.data.preco >= ${FACE_MINIMA_VENDA_PAGA_REAIS}`);
  });

  it('o predicado está ligado no `allow create` do lote', () => {
    const bloco = linhasDoBlocoDeLotes();
    const create = bloco.slice(bloco.findIndex((l) => l.includes('allow create:')));
    const ateUpdate = create.slice(0, create.findIndex((l) => l.includes('allow update:')));
    expect(ateUpdate.some((l) => l.includes('faceMinimaVendaPagaOk()'))).toBe(true);
  });

  it('o predicado está ligado no `allow update`, condicionado ao toque no preço', () => {
    const bloco = linhasDoBlocoDeLotes();
    const update = bloco.slice(bloco.findIndex((l) => l.includes('allow update:')));
    const ateDelete = update.slice(0, update.findIndex((l) => l.includes('allow delete:')));
    const linha = ateDelete.find((l) => l.includes('faceMinimaVendaPagaOk()'));
    expect(linha).toBeDefined();
    // A condição é o que impede o deadlock com a RN-200 num lote legado vendido.
    expect(linha).toContain('!precoTocadoNoUpdate()');
  });
});
