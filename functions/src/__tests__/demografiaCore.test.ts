/**
 * demografiaCore.test.ts — LEELA-BEPEND-T1 (E11 §RN-820) + RN-822 (bandas de
 * 5 anos, matriz idade×sexo e salvaguarda de k-anonimato)
 *
 * Domínio PURO da demografia agregada (@leela/core) — sem Emulator:
 *   - idadeCivil: aritmética civil ISO×ISO determinística (aniversário
 *     inclusive), rejeição de data inválida;
 *   - faixaEtariaDaIdade: fronteiras exatas das 10 bandas RN-822;
 *   - computeDemografia: recontagem íntegra (Σ buckets + semDado == total),
 *     matriz faixaXGenero (célula exige AMBOS os dados), determinismo,
 *     NENHUM dado individual no resultado;
 *   - demografiaInalterada: no-op de idempotência campo a campo (matriz
 *     inclusa);
 *   - suprimirCohortPorK: regras R1 (célula 1..k-1), R2 (linha inteira) e
 *     R3 (complementar anti-diferenciação contra o marginal porGenero).
 */
import { describe, expect, it } from 'vitest';
import {
  computeDemografia,
  demografiaInalterada,
  demografiaVazia,
  faixaEtariaDaIdade,
  FAIXAS_ETARIAS,
  GENEROS_INSCRITO,
  idadeCivil,
  K_MIN_COHORT,
  matrizFaixaGeneroVazia,
  somarMatrizes,
  suprimirCohortPorK,
  type MatrizFaixaGenero,
} from '@leela/core';

const REF = '2026-04-25'; // data civil da prova (referência determinística)

describe('idadeCivil (ISO × ISO — determinístico)', () => {
  it('idade completa antes/depois do aniversário no ano de referência', () => {
    expect(idadeCivil('1990-04-25', REF)).toBe(36); // aniversário NO dia
    expect(idadeCivil('1990-04-26', REF)).toBe(35); // ainda não fez
    expect(idadeCivil('1990-04-24', REF)).toBe(36); // já fez
  });

  it('data inválida (formato/lixo/ausente) → null, nunca idade fabricada', () => {
    expect(idadeCivil('25/04/1990', REF)).toBeNull();
    expect(idadeCivil('1990-13-40', REF)).toBeNull();
    expect(idadeCivil(undefined, REF)).toBeNull();
    expect(idadeCivil(42, REF)).toBeNull();
    expect(idadeCivil('1990-04-25', '')).toBeNull(); // referência inválida
  });
});

describe('faixaEtariaDaIdade (fronteiras das 10 bandas RN-822)', () => {
  it('mapeia as fronteiras exatas das bandas de 5 anos', () => {
    expect(faixaEtariaDaIdade(0)).toBe('ate_17');
    expect(faixaEtariaDaIdade(17)).toBe('ate_17');
    expect(faixaEtariaDaIdade(18)).toBe('18_24');
    expect(faixaEtariaDaIdade(24)).toBe('18_24');
    expect(faixaEtariaDaIdade(25)).toBe('25_29');
    expect(faixaEtariaDaIdade(29)).toBe('25_29');
    expect(faixaEtariaDaIdade(30)).toBe('30_34');
    expect(faixaEtariaDaIdade(34)).toBe('30_34');
    expect(faixaEtariaDaIdade(35)).toBe('35_39');
    expect(faixaEtariaDaIdade(39)).toBe('35_39');
    expect(faixaEtariaDaIdade(40)).toBe('40_44');
    expect(faixaEtariaDaIdade(44)).toBe('40_44');
    expect(faixaEtariaDaIdade(45)).toBe('45_49');
    expect(faixaEtariaDaIdade(49)).toBe('45_49');
    expect(faixaEtariaDaIdade(50)).toBe('50_54');
    expect(faixaEtariaDaIdade(54)).toBe('50_54');
    expect(faixaEtariaDaIdade(55)).toBe('55_59');
    expect(faixaEtariaDaIdade(59)).toBe('55_59');
    expect(faixaEtariaDaIdade(60)).toBe('60_mais');
    expect(faixaEtariaDaIdade(90)).toBe('60_mais');
  });

  it('toda idade 0..120 cai numa faixa CANÔNICA (união fechada)', () => {
    for (let idade = 0; idade <= 120; idade += 1) {
      const faixa = faixaEtariaDaIdade(idade);
      expect(faixa, `idade ${idade}`).not.toBeNull();
      expect(FAIXAS_ETARIAS).toContain(faixa);
    }
  });

  it('idade negativa/NaN (nascimento no futuro = corrompido) → null', () => {
    expect(faixaEtariaDaIdade(-1)).toBeNull();
    expect(faixaEtariaDaIdade(Number.NaN)).toBeNull();
  });

  it('idade fracionária trunca para anos completos — nunca chave fora do union (review F6)', () => {
    expect(faixaEtariaDaIdade(24.5)).toBe('18_24'); // sem guarda viraria '20_24'
    expect(faixaEtariaDaIdade(25.9)).toBe('25_29');
    expect(faixaEtariaDaIdade(59.99)).toBe('55_59');
    expect(faixaEtariaDaIdade(17.9)).toBe('ate_17');
    for (let d = 0; d <= 120; d += 0.25) {
      const faixa = faixaEtariaDaIdade(d);
      expect(FAIXAS_ETARIAS, `idade ${d}`).toContain(faixa);
    }
  });
});

describe('computeDemografia (recontagem íntegra, sem PII)', () => {
  const inscritos = [
    { nascimento: '2000-01-01', genero: 'feminino' }, // 26 → 25_29
    { nascimento: '2004-06-01', genero: 'masculino' }, // 21 → 18_24
    { nascimento: '1980-04-25', genero: 'feminino' }, // 46 → 45_49
    { nascimento: '2010-01-01', genero: 'outro' }, // 16 → ate_17
    { genero: 'nao_informado' }, // sem nascimento
    {}, // checkout mínimo — sem nada
    { nascimento: 'lixo', genero: 'invalido' }, // corrompido
  ];

  it('Σ faixas + semNascimento == total; Σ gêneros + semGenero == total', () => {
    const d = computeDemografia(inscritos, REF);
    expect(d.totalConfirmados).toBe(7);
    const somaFaixas = FAIXAS_ETARIAS.reduce((acc, f) => acc + d.faixasEtarias[f], 0);
    const somaGeneros = GENEROS_INSCRITO.reduce((acc, g) => acc + d.porGenero[g], 0);
    expect(somaFaixas + d.semNascimento).toBe(7);
    expect(somaGeneros + d.semGenero).toBe(7);
    expect(d.faixasEtarias['25_29']).toBe(1);
    expect(d.faixasEtarias['18_24']).toBe(1);
    expect(d.faixasEtarias['45_49']).toBe(1);
    expect(d.faixasEtarias.ate_17).toBe(1);
    expect(d.semNascimento).toBe(3);
    expect(d.porGenero.feminino).toBe(2);
    expect(d.porGenero.nao_informado).toBe(1);
    expect(d.semGenero).toBe(2); // {} + genero inválido
  });

  it('matriz faixaXGenero (RN-822): célula exige AMBOS; Σ matriz ≤ marginais', () => {
    const d = computeDemografia(inscritos, REF);
    expect(d.faixaXGenero['25_29'].feminino).toBe(1);
    expect(d.faixaXGenero['18_24'].masculino).toBe(1);
    expect(d.faixaXGenero['45_49'].feminino).toBe(1);
    expect(d.faixaXGenero.ate_17.outro).toBe(1);
    // Quem tem só gênero (sem nascimento) NÃO entra na matriz.
    const somaMatriz = FAIXAS_ETARIAS.reduce(
      (acc, f) => acc + GENEROS_INSCRITO.reduce((a, g) => a + d.faixaXGenero[f][g], 0),
      0,
    );
    expect(somaMatriz).toBe(4); // i1..i4 (os que têm idade E gênero)
    const somaFaixas = FAIXAS_ETARIAS.reduce((acc, f) => acc + d.faixasEtarias[f], 0);
    expect(somaMatriz).toBeLessThanOrEqual(somaFaixas);
    // Linha da matriz nunca excede o marginal 1D da faixa.
    for (const f of FAIXAS_ETARIAS) {
      const linha = GENEROS_INSCRITO.reduce((a, g) => a + d.faixaXGenero[f][g], 0);
      expect(linha).toBeLessThanOrEqual(d.faixasEtarias[f]);
    }
  });

  it('determinismo: mesma entrada ⇒ resultado idêntico (recontagem, não incremento)', () => {
    const a = computeDemografia(inscritos, REF);
    const b = computeDemografia(inscritos, REF);
    expect(b).toEqual(a);
    expect(demografiaInalterada(a, b)).toBe(true);
  });

  it('resultado carrega SÓ contagens — nenhuma data de nascimento sai (LGPD)', () => {
    const d = computeDemografia(inscritos, REF);
    const serializado = JSON.stringify(d);
    expect(serializado).not.toContain('2000-01-01');
    expect(serializado).not.toContain('1980-04-25');
    expect(Object.keys(d).sort()).toEqual([
      'faixaXGenero',
      'faixasEtarias',
      'porGenero',
      'referencia',
      'semGenero',
      'semNascimento',
      'totalConfirmados',
    ]);
  });

  it('referência inválida (evento sem data) → todos em semNascimento, nada inventado', () => {
    const d = computeDemografia(inscritos, '');
    expect(d.semNascimento).toBe(7);
    const somaFaixas = FAIXAS_ETARIAS.reduce((acc, f) => acc + d.faixasEtarias[f], 0);
    expect(somaFaixas).toBe(0);
  });
});

describe('demografiaInalterada (no-op de idempotência)', () => {
  it('qualquer contagem diferente quebra a igualdade', () => {
    const a = computeDemografia([{ nascimento: '2000-01-01', genero: 'feminino' }], REF);
    const b = { ...a, faixasEtarias: { ...a.faixasEtarias, '25_29': 99 } };
    expect(demografiaInalterada(a, b)).toBe(false);
    const c = { ...a, referencia: '2027-01-01' };
    expect(demografiaInalterada(a, c)).toBe(false);
  });

  it('célula da MATRIZ diferente quebra a igualdade (RN-822 — doc antigo sem matriz nunca "iguala")', () => {
    const a = computeDemografia([{ nascimento: '2000-01-01', genero: 'feminino' }], REF);
    const matriz = {
      ...a.faixaXGenero,
      '25_29': { ...a.faixaXGenero['25_29'], masculino: 7 },
    };
    expect(demografiaInalterada(a, { ...a, faixaXGenero: matriz })).toBe(false);
  });

  it('vazia == vazia (shape estável com todas as chaves canônicas)', () => {
    expect(demografiaInalterada(demografiaVazia(REF), demografiaVazia(REF))).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Salvaguarda de k-anonimato (RN-822 · minimização RN-820/RN-172)
// ---------------------------------------------------------------------------

/** Matriz com linhas dadas (demais faixas zeradas). */
function matriz(
  linhas: Partial<Record<(typeof FAIXAS_ETARIAS)[number], Partial<Record<(typeof GENEROS_INSCRITO)[number], number>>>>,
): MatrizFaixaGenero {
  const m = matrizFaixaGeneroVazia();
  for (const [f, linha] of Object.entries(linhas)) {
    for (const [g, v] of Object.entries(linha as Record<string, number>)) {
      m[f as keyof MatrizFaixaGenero][g as keyof MatrizFaixaGenero[keyof MatrizFaixaGenero]] = v;
    }
  }
  return m;
}

describe('suprimirCohortPorK (k-anonimato do cohort — RN-822/LGPD)', () => {
  it('k default é 5 (documentado)', () => {
    expect(K_MIN_COHORT).toBe(5);
  });

  it('R1: células 0 e ≥k expõem; faixa sem ninguém é omitida', () => {
    const vis = suprimirCohortPorK(
      matriz({
        '25_29': { feminino: 8, masculino: 12 }, // tudo ≥k (0 nas demais células)
        '30_34': { feminino: 5, masculino: 0 },
      }),
    );
    expect(vis).toHaveLength(2);
    expect(vis[0]).toEqual({
      faixa: '25_29',
      total: 20,
      porGenero: { feminino: 8, masculino: 12, outro: 0, nao_informado: 0 },
    });
    expect(vis[1]!.porGenero).not.toBeNull();
  });

  it('R2: UMA célula em 1..k-1 suprime a linha INTEIRA (total permanece)', () => {
    const vis = suprimirCohortPorK(
      matriz({
        '25_29': { feminino: 8, masculino: 3 }, // 3 < k → linha suprimida
        '30_34': { feminino: 6, masculino: 9 },
        '35_39': { feminino: 10, masculino: 10 },
      }),
    );
    const l25 = vis.find((v) => v.faixa === '25_29')!;
    expect(l25.porGenero).toBeNull(); // suprimida — 8 NÃO vaza (subtração)
    expect(l25.total).toBe(11);
    // R3 complementar: com 1 única linha suprimida, a exposta de MENOR total
    // também é suprimida (30_34: 15 < 35_39: 20) — anti-diferenciação contra
    // o marginal público porGenero.
    expect(vis.find((v) => v.faixa === '30_34')!.porGenero).toBeNull();
    expect(vis.find((v) => v.faixa === '35_39')!.porGenero).not.toBeNull();
  });

  it('R3 não dispara com 2+ linhas já suprimidas (só a soma delas é inferível)', () => {
    const vis = suprimirCohortPorK(
      matriz({
        '25_29': { feminino: 2 },
        '30_34': { masculino: 1 },
        '35_39': { feminino: 7, masculino: 6 },
      }),
    );
    expect(vis.filter((v) => v.porGenero === null).map((v) => v.faixa)).toEqual([
      '25_29',
      '30_34',
    ]);
    expect(vis.find((v) => v.faixa === '35_39')!.porGenero).not.toBeNull();
  });

  it('evento pequeno: TODAS as linhas suprimidas — nada do cruzamento vaza', () => {
    const vis = suprimirCohortPorK(
      matriz({ '25_29': { feminino: 1 }, '40_44': { masculino: 2, outro: 1 } }),
    );
    expect(vis).toHaveLength(2);
    expect(vis.every((v) => v.porGenero === null)).toBe(true);
    expect(vis.map((v) => v.total)).toEqual([1, 3]); // totais 1D seguem visíveis
  });

  it('matriz vazia → nenhuma linha (EmptyState na UI)', () => {
    expect(suprimirCohortPorK(matrizFaixaGeneroVazia())).toEqual([]);
  });

  it('determinística e pura (mesma entrada ⇒ mesma saída; entrada intocada)', () => {
    const m = matriz({ '25_29': { feminino: 8, masculino: 3 }, '30_34': { feminino: 6 } });
    const antes = JSON.stringify(m);
    const a = suprimirCohortPorK(m);
    const b = suprimirCohortPorK(m);
    expect(b).toEqual(a);
    expect(JSON.stringify(m)).toBe(antes);
  });

  it('somarMatrizes: células <k em N eventos somam ≥k no tenant e EXPÕEM (a supressão é pós-soma)', () => {
    const ev1 = matriz({ '25_29': { feminino: 3, masculino: 5 } });
    const ev2 = matriz({ '25_29': { feminino: 4, masculino: 6 } });
    const soma = somarMatrizes([ev1, ev2]);
    expect(soma['25_29'].feminino).toBe(7);
    const vis = suprimirCohortPorK(soma);
    expect(vis.find((v) => v.faixa === '25_29')!.porGenero).toEqual({
      feminino: 7,
      masculino: 11,
      outro: 0,
      nao_informado: 0,
    });
  });
});
