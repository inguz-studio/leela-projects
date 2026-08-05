/**
 * codigoPedidoCore.test.ts — LEELA-S1228-T1 (RN-474/RN-475)
 *
 * Unit PURO do código identificador da COMPRA (core/pedidos/codigoPedido):
 *   - alfabeto: nenhum caractere ambíguo (0/O/1/I/L) SAI, em amostra grande —
 *     é assim que a propriedade compartilhada com o código do ingresso é
 *     garantida, e NÃO por constante comum (doutrina do core);
 *   - formato: cinco símbolos maiúsculos; minúscula e ruído recusados;
 *   - normalização da busca: tira prefixo e ruído, e NÃO "conserta" ambíguo
 *     (adivinhar `O`→`0` devolveria a compra de outra pessoa);
 *   - prefixo: é apresentação, nunca faz parte do valor canônico, e ausência
 *     é ausência (`formatarCodigoPedido` devolve vazio, nunca o id);
 *   - RNG hostil (fora de [0,1)) não produz código torto.
 *
 * A unicidade GLOBAL não é testada aqui de propósito: sorteio não é unicidade,
 * quem garante é a reserva na tx da venda
 * (codigoPedidoReserva.integration.test.ts).
 *
 * Sem emulator — tudo puro.
 */

import { describe, expect, it } from 'vitest';
import {
  ALFABETO_CODIGO_INGRESSO,
  ALFABETO_CODIGO_PEDIDO,
  CARACTERES_AMBIGUOS_PEDIDO,
  PREFIXO_CODIGO_PEDIDO,
  TAMANHO_CODIGO_PEDIDO,
  formatarCodigoPedido,
  gerarCodigoPedido,
  isCodigoPedidoValido,
  normalizarCodigoPedido,
} from '@leela/core';

describe('alfabeto (RN-474) — os dois lados de cada par confundível ficam de fora', () => {
  it('o alfabeto NÃO contém 0, O, 1, I nem L', () => {
    for (const ch of CARACTERES_AMBIGUOS_PEDIDO) {
      expect(ALFABETO_CODIGO_PEDIDO.includes(ch)).toBe(false);
    }
  });

  it('é maiúsculo, sem repetição, e tem os 31 símbolos da casa', () => {
    expect(ALFABETO_CODIGO_PEDIDO).toBe(ALFABETO_CODIGO_PEDIDO.toUpperCase());
    expect(new Set(ALFABETO_CODIGO_PEDIDO).size).toBe(
      ALFABETO_CODIGO_PEDIDO.length
    );
    // 26 letras − 3 (O, I, L) + 10 dígitos − 2 (0, 1) = 31
    expect(ALFABETO_CODIGO_PEDIDO.length).toBe(31);
  });

  it('o VALOR coincide com o do ingresso, mas por PROPRIEDADE provada — não por constante compartilhada', () => {
    // A igualdade é intencional (decisão COD-1: um alfabeto só na casa, para
    // que o operador aprenda uma frase só). O acoplamento é que é recusado —
    // este teste é a rede que a doutrina do core prometeu no lugar dele.
    expect(ALFABETO_CODIGO_PEDIDO).toBe(ALFABETO_CODIGO_INGRESSO);
  });

  it('caractere ambíguo NUNCA sai do gerador (amostra de 20 mil)', () => {
    const proibidos = new Set(CARACTERES_AMBIGUOS_PEDIDO);
    for (let i = 0; i < 20_000; i++) {
      for (const ch of gerarCodigoPedido()) {
        expect(proibidos.has(ch)).toBe(false);
      }
    }
  });
});

describe('formato (RN-474) — cinco símbolos, sem prefixo', () => {
  it('o tamanho é 5, como o dono pediu', () => {
    expect(TAMANHO_CODIGO_PEDIDO).toBe(5);
  });

  it('o gerador produz sempre um código canônico', () => {
    for (let i = 0; i < 5_000; i++) {
      const codigo = gerarCodigoPedido();
      expect(codigo).toHaveLength(TAMANHO_CODIGO_PEDIDO);
      expect(isCodigoPedidoValido(codigo)).toBe(true);
    }
  });

  it('recusa minúscula, tamanho errado, símbolo ambíguo, prefixo e não-string', () => {
    expect(isCodigoPedidoValido('a2b3c')).toBe(false);
    expect(isCodigoPedidoValido('A2B3')).toBe(false);
    expect(isCodigoPedidoValido('A2B3CD')).toBe(false);
    expect(isCodigoPedidoValido('A0B3C')).toBe(false); // zero
    expect(isCodigoPedidoValido('AIB3C')).toBe(false); // I
    expect(isCodigoPedidoValido('ALB3C')).toBe(false); // L
    // O prefixo NÃO faz parte do valor canônico — o que está gravado no doc e
    // o que a reserva chaveia são os cinco símbolos limpos.
    expect(isCodigoPedidoValido('PED-A2B3C')).toBe(false);
    expect(isCodigoPedidoValido('')).toBe(false);
    expect(isCodigoPedidoValido(undefined)).toBe(false);
    expect(isCodigoPedidoValido(null)).toBe(false);
    expect(isCodigoPedidoValido(42)).toBe(false);
  });

  it('o espaço é 31⁵ = 28.629.151 — a conta que a spec registrou', () => {
    expect(ALFABETO_CODIGO_PEDIDO.length ** TAMANHO_CODIGO_PEDIDO).toBe(
      28_629_151
    );
  });
});

describe('normalização da busca (RN-475) — sem adivinhar', () => {
  it('sobe caixa e tira espaço e hífen', () => {
    expect(normalizarCodigoPedido(' a2b3c ')).toBe('A2B3C');
    expect(normalizarCodigoPedido('a2-b3c')).toBe('A2B3C');
  });

  it('tira o prefixo, porque quem dita lê "PED-A2B3C" e digita o que leu', () => {
    expect(normalizarCodigoPedido('PED-A2B3C')).toBe('A2B3C');
    expect(normalizarCodigoPedido('ped-a2b3c')).toBe('A2B3C');
    expect(normalizarCodigoPedido('  ped a2b3c ')).toBe('A2B3C');
  });

  it('NÃO come as três primeiras letras de um código que começa por PED', () => {
    // `PEDXY` é código legítimo (P, E e D estão no alfabeto). O prefixo só cai
    // quando o que sobra tem exatamente o tamanho do código.
    expect(normalizarCodigoPedido('PEDXY')).toBe('PEDXY');
    expect(isCodigoPedidoValido(normalizarCodigoPedido('PEDXY'))).toBe(true);
    // E com o prefixo de verdade na frente, cai só o prefixo.
    expect(normalizarCodigoPedido('PED-PEDXY')).toBe('PEDXY');
  });

  it('NÃO conserta caractere ambíguo — adivinhar devolveria a compra de outra pessoa', () => {
    expect(normalizarCodigoPedido('A0B3C')).toBe('A0B3C');
    expect(normalizarCodigoPedido('AOB3C')).toBe('AOB3C');
    expect(normalizarCodigoPedido('AIB3C')).toBe('AIB3C');
    // …e o que sai da normalização segue inválido: a busca não acha nada, em
    // vez de achar a compra errada.
    expect(isCodigoPedidoValido(normalizarCodigoPedido('AOB3C'))).toBe(false);
  });

  it('não-string vira string vazia (nunca "undefined")', () => {
    expect(normalizarCodigoPedido(undefined)).toBe('');
    expect(normalizarCodigoPedido(null)).toBe('');
    expect(normalizarCodigoPedido(7)).toBe('');
  });
});

describe('prefixo e exibição (RN-475) — ausência é ausência', () => {
  it('o prefixo default é `PED-` e vive numa constante só', () => {
    expect(PREFIXO_CODIGO_PEDIDO).toBe('PED-');
  });

  it('formata o código válido COM o prefixo', () => {
    expect(formatarCodigoPedido('A2B3C')).toBe('PED-A2B3C');
  });

  it('código ausente ou torto devolve VAZIO — nunca o id interno', () => {
    // É a fronteira da RN-475: a superfície que recebe '' não escreve nada.
    // Exibir o id publicaria o uid da conta do comprador.
    expect(formatarCodigoPedido(undefined)).toBe('');
    expect(formatarCodigoPedido(null)).toBe('');
    expect(formatarCodigoPedido('')).toBe('');
    expect(formatarCodigoPedido('a2b3c')).toBe('');
    expect(formatarCodigoPedido('ped-wNXRTvMM3vc7Boyi91vRgx3DBQy2-chk-x')).toBe(
      ''
    );
  });

  it('formatar → normalizar é ida e volta', () => {
    for (let i = 0; i < 500; i++) {
      const codigo = gerarCodigoPedido();
      expect(normalizarCodigoPedido(formatarCodigoPedido(codigo))).toBe(codigo);
    }
  });
});

describe('RNG hostil — o gerador não produz código torto', () => {
  const hostis: Array<[string, () => number]> = [
    ['sempre 1 (fora do intervalo, teto)', () => 1],
    ['sempre 1.5', () => 1.5],
    ['negativo', () => -0.1],
    ['NaN', () => Number.NaN],
    ['Infinity', () => Number.POSITIVE_INFINITY],
    ['zero', () => 0],
  ];
  for (const [nome, random] of hostis) {
    it(`${nome} ⇒ código canônico mesmo assim`, () => {
      const codigo = gerarCodigoPedido(random);
      expect(codigo).toHaveLength(TAMANHO_CODIGO_PEDIDO);
      expect(isCodigoPedidoValido(codigo)).toBe(true);
      expect(codigo.includes('undefined')).toBe(false);
    });
  }

  it('RNG determinístico permite forçar o MESMO código (é o que a prova de colisão usa)', () => {
    const fixo = () => 0.5;
    expect(gerarCodigoPedido(fixo)).toBe(gerarCodigoPedido(fixo));
  });
});

describe('sorteio default — entropia do sistema, uniforme sobre o alfabeto', () => {
  it('os 31 símbolos aparecem; nenhum índice cai fora da faixa', () => {
    // O default deixou de ser `Math.random` (PRNG do V8, estado recuperável a
    // partir de poucas saídas — quem compra prevê os códigos seguintes) e
    // passou a ser a entropia do sistema com rejeição de viés. O que este
    // teste prende é o efeito OBSERVÁVEL: a faixa continua sendo o alfabeto
    // inteiro e nada indexa fora dele. Numa amostra de 20 mil × 5 símbolos, a
    // chance de um símbolo faltar é ~31 · (30/31)^100000 — zero na prática, e
    // um símbolo faltando significa faixa quebrada, não azar.
    const vistos = new Set<string>();
    for (let i = 0; i < 20_000; i++) {
      for (const ch of gerarCodigoPedido()) vistos.add(ch);
    }
    expect(vistos.size).toBe(ALFABETO_CODIGO_PEDIDO.length);
    for (const ch of vistos) {
      expect(ALFABETO_CODIGO_PEDIDO.includes(ch)).toBe(true);
    }
  });

  it('dois códigos seguidos do default não são iguais (a fonte não travou)', () => {
    // Rede contra o modo de falha mais burro de uma troca de RNG: uma fonte
    // que devolve sempre o mesmo valor produziria `AAAAA` para todo mundo e
    // faria toda venda colidir na reserva.
    const amostra = new Set<string>();
    for (let i = 0; i < 50; i++) amostra.add(gerarCodigoPedido());
    expect(amostra.size).toBe(50);
  });
});
