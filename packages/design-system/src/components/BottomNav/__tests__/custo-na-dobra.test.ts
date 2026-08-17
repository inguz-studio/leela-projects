// =============================================================================
// O custo da barra na dobra (NAV-MOBILE · leva 20).
//
// ⛔ ESTE ARQUIVO EXISTE PARA IMPEDIR UM ANÚNCIO FALSO.
//
// A rodada `2026-08-17-carga-cognitiva` mediu a Visão geral do evento em três
// larguras e deixou a linha de base escrita. Em 373 × 810 o header ocupa 345 px,
// o countdown 330 px, e o primeiro número não duplicado nasce em y = 870 — 60 px
// ABAIXO da dobra. Os Movimentos 1 e 3 daquela spec existem para devolver essa
// altura.
//
// A barra inferior COBRA do mesmo recurso. Ela é `fixed`, então ocupa altura
// permanente na dobra em toda tela e toda rolagem, e o handoff da rodada nomeou
// isso como a armadilha desta lane: *"a barra devolve em altura fixa o que o
// header devolveu em altura removida"*. Anunciar ganho de mobile com a régua
// dizendo o contrário é o que este arquivo torna impossível — o número fica
// pinado, e quem mexer na altura da barra vê o custo mudar aqui.
//
// MÉTODO. O custo não é estimado sobre imagem: ele é RESOLVIDO do CSS gerado.
// O resolvedor abaixo lê `themes/brasa.css`, segue a cadeia de `var()` até os
// primitivos e avalia o `calc()`. É a mesma aritmética que o navegador faz, com
// a vantagem de não depender de janela nenhuma — jsdom não tem motor de layout,
// e `getBoundingClientRect` ali devolveria zero para tudo. O que um navegador
// ainda acrescenta é a conferência visual, e essa é o gate do maestro.
//
// O que este arquivo NÃO prova: que a barra melhora a dobra. Ela piora, e o
// número está na tabela do fim. O ganho desta lane é de TOQUES (quatro destinos
// de dois toques para um, mais os 800 ms da abertura do drawer eliminados), não
// de altura.
// =============================================================================

import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const css = readFileSync(resolve(__dirname, '../../../../themes/brasa.css'), 'utf8');

// ---------------------------------------------------------------------------
// Resolvedor de token → px
// ---------------------------------------------------------------------------

/** Mapa `--token` → valor cru, tal como o gerador escreveu. */
function lerCustomProps(fonte: string): Map<string, string> {
  const mapa = new Map<string, string>();
  const re = /^\s*(--[\w-]+):\s*([^;]+);/gm;
  let m: RegExpExecArray | null;
  while ((m = re.exec(fonte)) !== null) {
    // Primeira definição vence: é a do bloco do tema, e as de baixo são
    // sobreposições de `[data-glass]` / `@supports`, que não tocam medida.
    if (!mapa.has(m[1]!)) mapa.set(m[1]!, m[2]!.trim());
  }
  return mapa;
}

const PROPS = lerCustomProps(css);

/**
 * Substitui `var(--x)` pelo valor de `--x`, recursivamente, e resolve o
 * `env(safe-area-inset-bottom)` pelo entalhe que o chamador quiser simular.
 */
function expandir(valor: string, entalhe: string): string {
  let atual = valor;
  for (let i = 0; i < 20 && atual.includes('var('); i += 1) {
    atual = atual.replace(/var\((--[\w-]+)(?:,[^)]*)?\)/g, (_todo, nome: string) => {
      const achado = PROPS.get(nome);
      if (achado === undefined) throw new Error(`token não definido: ${nome}`);
      return achado;
    });
  }
  // O `env()` só aparece DEPOIS de a cadeia de `var()` abrir: `--bottomnav-space`
  // chega aqui como `calc(... + var(--bottomnav-safe-b))` e é o passo acima que
  // revela o entalhe. Substituir antes não encontrava nada.
  return atual.replace(/env\(safe-area-inset-bottom[^)]*\)/g, entalhe);
}

/**
 * Avalia a expressão já expandida. Só `+`, `-` e `*` aparecem nestes tokens, e
 * um avaliador de três operadores é preferível a `Function`: a régua não precisa
 * de um interpretador para dizer quanto mede uma barra.
 */
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
    // `*` liga mais forte: consome o produto inteiro antes de somar.
    while (termos[i + 1] === '*') {
      n *= Number(termos[i + 2]);
      i += 2;
    }
    total += sinal * n;
    i += 1;
  }
  return total;
}

/** Quantos px o token vale, com o entalhe do aparelho simulado. */
function px(token: string, entalhe = '0px'): number {
  return avaliar(expandir(`var(${token})`, entalhe));
}

// ---------------------------------------------------------------------------

describe('a barra cobra altura permanente, e quanto', () => {
  it('a pílula mede 58 px, com 12 px de respiro de cada borda', () => {
    expect(px('--bottomnav-height')).toBe(58);
    expect(px('--bottomnav-margin')).toBe(12);
  });

  it('o espaço que a página reserva é 82 px num aparelho SEM entalhe', () => {
    // 58 (pílula) + 12 × 2 (respiro de cima e de baixo) + 0 (sem entalhe).
    expect(px('--bottomnav-space')).toBe(82);
  });

  it('e 116 px num iPhone COM indicador de home (entalhe de 34)', () => {
    expect(px('--bottomnav-space', '34px')).toBe(116);
  });

  it('a altura NÃO cresce com o entalhe — quem sobe é a pílula inteira', () => {
    // A safe-area entra na MARGEM, não no padding da pílula: o alvo de toque
    // mede o mesmo no iPhone com entalhe e no sem, e é isso que mantém a barra
    // previsível entre aparelhos.
    expect(px('--bottomnav-height', '34px')).toBe(58);
  });
});

describe('a barra superior não engordou na troca', () => {
  it('o hambúrguer saiu e o perfil entrou — os dois são IconButton de 36 px', () => {
    expect(px('--iconbtn-size')).toBe(36);
  });

  it('a marca que entrou à esquerda é MAIS BAIXA que o botão, então não manda', () => {
    // 34 < 36: quem define a altura da barra superior segue sendo o IconButton,
    // como antes da troca. A barra de cima custa o mesmo de ontem, e por isso
    // todo o custo desta lane está embaixo.
    expect(px('--rail-brand-logo-h')).toBeLessThan(px('--iconbtn-size'));
  });
});

describe('⛔ o balanço em 375, contra a linha de base da rodada', () => {
  // Linha de base medida em `02-rodadas/2026-08-17-carga-cognitiva/` a
  // 373 × 810, por getBoundingClientRect dentro do iframe — não por estimativa.
  const DOBRA_BASE = 810;
  const Y_PRIMEIRO_NUMERO_NOVO = 870;

  it('a dobra útil ENCOLHE de 810 para 728 px', () => {
    const dobraUtil = DOBRA_BASE - px('--bottomnav-space');
    expect(dobraUtil).toBe(728);
  });

  it('o primeiro número novo afunda de 60 px para 142 px abaixo da dobra', () => {
    const antes = Y_PRIMEIRO_NUMERO_NOVO - DOBRA_BASE;
    const depois = Y_PRIMEIRO_NUMERO_NOVO - (DOBRA_BASE - px('--bottomnav-space'));
    expect(antes).toBe(60);
    expect(depois).toBe(142);
    // ⛔ A prova de que esta lane NÃO pode anunciar ganho de dobra: ela piora a
    // altura, e o conserto é dos Movimentos 1 e 3, que não são desta lane.
    expect(depois).toBeGreaterThan(antes);
  });

  it('o Movimento 1 sozinho não paga a barra — nem perto', () => {
    // O handoff da rodada mediu o Movimento 1 (header do evento cede inscritos e
    // dias) em 36 px devolvidos. A barra cobra 82. Quem fechar a conta só com o
    // header estará 46 px no vermelho, e o handoff já avisava que o Movimento 3
    // é quem paga o resto.
    const DEVOLVIDO_PELO_MOVIMENTO_1 = 36;
    expect(px('--bottomnav-space') - DEVOLVIDO_PELO_MOVIMENTO_1).toBe(46);
  });
});
