// =============================================================================
// O custo REAL da barra inferior na dobra (V2708-04).
//
// ⛔ ESTE ARQUIVO EXISTE PORQUE O NÚMERO DO DS DEIXOU DE SER O NÚMERO DO PRODUTO.
//
// O dono, em 27/08: *"revise o tamanho do menu bar de footer, pois está muito
// grande"* — o que DECIDE a NAV-MOBILE-5 na direção compacta. O encolhimento foi
// feito por sobreposição de token em `apps/painel/src/globals.css`, e não nos
// temas do `@leela/design-system`, porque a rodada despachou aquele pacote para
// outra lane (a razão longa está escrita no próprio bloco de CSS).
//
// A consequência que este arquivo cobre: o
// `BottomNav/__tests__/custo-na-dobra.test.ts` do DS continua verde cravando
// 58/12/82/116, porque ele lê `themes/brasa.css`, que não mudou. Aquele arquivo
// deixou de descrever o que o painel entrega. Se o número efetivo ficasse sem
// prova, o projeto teria uma régua pinada apontando para um valor que nenhuma
// tela mostra — exatamente o "anúncio falso" que o arquivo do DS foi escrito
// para impedir, só que invertido.
//
// MÉTODO. O mesmo do DS, com um passo a mais: resolve a cadeia de `var()` sobre
// os temas E DEPOIS aplica a sobreposição do painel, na ordem em que o navegador
// aplica (`main.tsx` importa o tema e, na linha seguinte, o `globals.css`). O
// que sai daqui é o px que o aparelho realmente reserva.
//
// ⚠️ Quem mover os valores para os temas do DS apaga a sobreposição, atualiza o
// arquivo de lá e pode apagar este — mas não antes.
// =============================================================================

import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const TEMA = readFileSync(
  resolve(__dirname, '../../../../../packages/design-system/themes/brasa.css'),
  'utf8',
);
const GLOBAIS = readFileSync(resolve(__dirname, '../../globals.css'), 'utf8');

/** Mapa `--token` → valor cru. Primeira definição do arquivo vence. */
function lerCustomProps(fonte: string): Map<string, string> {
  const mapa = new Map<string, string>();
  const re = /^\s*(--[\w-]+):\s*([^;]+);/gm;
  let m: RegExpExecArray | null;
  while ((m = re.exec(fonte)) !== null) {
    if (!mapa.has(m[1]!)) mapa.set(m[1]!, m[2]!.trim());
  }
  return mapa;
}

// A ordem é a da cascata real: o tema entra primeiro, o painel sobrepõe.
const PROPS = new Map([...lerCustomProps(TEMA), ...lerCustomProps(GLOBAIS)]);

function expandir(valor: string, entalhe: string): string {
  let atual = valor;
  for (let i = 0; i < 20 && atual.includes('var('); i += 1) {
    atual = atual.replace(/var\((--[\w-]+)(?:,[^)]*)?\)/g, (_todo, nome: string) => {
      const achado = PROPS.get(nome);
      if (achado === undefined) throw new Error(`token não definido: ${nome}`);
      return achado;
    });
  }
  return atual.replace(/env\(safe-area-inset-bottom[^)]*\)/g, entalhe);
}

function avaliar(expr: string): number {
  const limpo = expr.replace(/calc\(/g, '(').replace(/px/g, '');
  const termos = limpo.replace(/[()]/g, ' ').trim().split(/\s+/);
  let total = 0;
  let sinal = 1;
  let i = 0;
  while (i < termos.length) {
    const t = termos[i]!;
    if (t === '+') { sinal = 1; i += 1; continue; }
    if (t === '-') { sinal = -1; i += 1; continue; }
    let n = Number(t);
    if (Number.isNaN(n)) throw new Error(`termo não numérico: "${t}" em "${expr}"`);
    while (termos[i + 1] === '*') {
      n *= Number(termos[i + 2]);
      i += 2;
    }
    total += sinal * n;
    i += 1;
  }
  return total;
}

function px(token: string, entalhe = '0px'): number {
  return avaliar(expandir(`var(${token})`, entalhe));
}

// Os números que o painel entregava antes desta rodada, para o teste falar de
// DELTA e não só de estado — régua que não guarda o antes não prova melhora.
const ANTES = { altura: 58, margem: 12, espaco: 82, espacoComEntalhe: 116 };

describe('V2708-04 — a barra encolheu, e quanto', () => {
  it('a pílula cai de 58 px para 48 px', () => {
    expect(ANTES.altura).toBe(58);
    expect(px('--bottomnav-height')).toBe(48);
  });

  it('o respiro de cada borda cai de 12 px para 8 px', () => {
    expect(ANTES.margem).toBe(12);
    expect(px('--bottomnav-margin')).toBe(8);
  });

  it('o espaço reservado na dobra cai de 82 px para 64 px (sem entalhe)', () => {
    // 48 (pílula) + 8 × 2 (respiro) + 0 (sem entalhe).
    expect(px('--bottomnav-space')).toBe(64);
    expect(ANTES.espaco - px('--bottomnav-space')).toBe(18);
  });

  it('e de 116 px para 98 px num iPhone com entalhe de 34', () => {
    expect(px('--bottomnav-space', '34px')).toBe(98);
    expect(ANTES.espacoComEntalhe - px('--bottomnav-space', '34px')).toBe(18);
  });

  it('devolve 22% da dobra que a barra cobrava', () => {
    const ganho = (ANTES.espaco - px('--bottomnav-space')) / ANTES.espaco;
    expect(Math.round(ganho * 100)).toBe(22);
  });
});

describe('⛔ o que NÃO podia encolher junto: o dedo', () => {
  it('o alvo de toque continua acima dos 44 px de régua', () => {
    // O item é `flex-1` na altura CHEIA da pílula (`items-stretch` no contêiner,
    // `flex-1` no item), então o alvo mede a altura da barra — não a da tinta.
    expect(px('--bottomnav-height')).toBeGreaterThanOrEqual(44);
  });

  it('a altura NÃO cresce com o entalhe — quem sobe é a pílula inteira', () => {
    // A safe-area segue entrando na MARGEM, não no padding: o alvo mede o mesmo
    // no iPhone com entalhe e no sem. Encolher a barra não podia custar essa
    // garantia, e não custou.
    expect(px('--bottomnav-height', '34px')).toBe(48);
  });

  it('a tinta cabe na pílula com folga em volta do indicador', () => {
    const tinta = px('--bottomnav-icon-size') + px('--bottomnav-item-gap') + 11; // rótulo 11px
    const indicador = px('--bottomnav-height') - px('--bottomnav-px') * 2;
    expect(tinta).toBe(33);
    expect(indicador).toBe(40);
    // ~3px de folga por lado — a mesma que a barra de 58px tinha (46 em volta de
    // 36). Encolher sem espremer era o ponto.
    expect((indicador - tinta) / 2).toBeGreaterThanOrEqual(3);
  });
});

describe('a régua da carga cognitiva, refeita com a barra nova', () => {
  // Mesma linha de base do arquivo do DS: 373 × 810, medida por
  // getBoundingClientRect na rodada `2026-08-17-carga-cognitiva`.
  const DOBRA_BASE = 810;
  const Y_PRIMEIRO_NUMERO_NOVO = 870;

  it('a dobra útil sobe de 728 px para 746 px', () => {
    expect(DOBRA_BASE - ANTES.espaco).toBe(728);
    expect(DOBRA_BASE - px('--bottomnav-space')).toBe(746);
  });

  it('o primeiro número novo sobe de 142 px para 124 px abaixo da dobra', () => {
    const depois = Y_PRIMEIRO_NUMERO_NOVO - (DOBRA_BASE - px('--bottomnav-space'));
    expect(depois).toBe(124);
    // ⛔ Continua ABAIXO da dobra: encolher a barra não paga os Movimentos 1 e 3,
    // e esta lane não anuncia que paga. O ganho é de 18px, não de dobra resolvida.
    expect(depois).toBeGreaterThan(Y_PRIMEIRO_NUMERO_NOVO - DOBRA_BASE);
  });

  it('agora o Movimento 1 sozinho quase paga a barra — faltam 28 px, não 46', () => {
    const DEVOLVIDO_PELO_MOVIMENTO_1 = 36;
    expect(px('--bottomnav-space') - DEVOLVIDO_PELO_MOVIMENTO_1).toBe(28);
  });
});
