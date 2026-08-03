// =============================================================================
// PROVA da forma da galeria do kit (S212-T1 · RN-425/427) — núcleo puro.
//
// A tese da RN-425 é que "exatamente uma principal" não é validação, é FORMA:
// existe um campo só para a principal, então o estado de zero ou de duas não é
// representável. O que ainda dá para errar é o que este arquivo cobre:
//
//   1. um doc envenenado derrubar o parse (Postel do campo decorativo);
//   2. a mesma foto aparecer duas vezes na tela;
//   3. a operação "tornar principal" COPIAR em vez de trocar — o único
//      caminho capaz de violar a forma por descuido (RN-427);
//   4. um kit ficar com galeria e sem principal, estado que a listagem da
//      RN-426 não sabe exibir.
//
// A `imagemUrl` legada e toda leitura que já existe dela seguem intactas: os
// dois primeiros casos do `parseKit` provam que doc sem `fotosSecundarias`
// continua sendo, byte a byte, o objeto que sempre foi.
// =============================================================================

import { describe, expect, it } from 'vitest';
import {
  parseKit,
  fotosDoKit,
  promoverFotoPrincipal,
  removerFotoPrincipal,
  normalizarFotosSecundarias,
  KIT_FOTOS_SECUNDARIAS_MAX,
} from '@leela/core';

const P = 'https://cdn.leela.test/kits/ouro.jpg';
const S2 = 'https://cdn.leela.test/kits/ouro-2.jpg';
const S3 = 'https://cdn.leela.test/kits/ouro-3.jpg';

/** Doc mínimo que o `parseKit` aceita — só os campos fail-fast. */
function doc(extra: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    tenantId: 't1',
    nome: 'Kit Ouro',
    preco: 120,
    capacidade: 50,
    modalidades: ['21k'],
    ...extra,
  };
}

describe('normalizarFotosSecundarias — Postel do campo decorativo (RN-425)', () => {
  it('entrada que não é lista vira lista vazia', () => {
    expect(normalizarFotosSecundarias(undefined)).toEqual([]);
    expect(normalizarFotosSecundarias(null)).toEqual([]);
    expect(normalizarFotosSecundarias('https://x.test/a.jpg')).toEqual([]);
    expect(normalizarFotosSecundarias({ 0: S2 })).toEqual([]);
  });

  it('descarta esquema perigoso item a item, e mantém o resto da lista', () => {
    const entrada = ['javascript:alert(1)', S2, 'data:image/png;base64,AAA', S3];
    expect(normalizarFotosSecundarias(entrada)).toEqual([S2, S3]);
  });

  it('descarta a URL igual à principal — repetir a foto grande é defeito visível', () => {
    expect(normalizarFotosSecundarias([P, S2], P)).toEqual([S2]);
  });

  it('descarta repetição dentro da própria lista', () => {
    expect(normalizarFotosSecundarias([S2, S2, S3])).toEqual([S2, S3]);
  });

  it('corta no teto DEPOIS de filtrar — URL podre não rouba vaga de boa', () => {
    const entrada = ['nao-e-url', 'javascript:x', S2, S3, 'https://x.test/4.jpg'];
    const saida = normalizarFotosSecundarias(entrada);
    expect(saida).toEqual([S2, S3]);
    expect(saida).toHaveLength(KIT_FOTOS_SECUNDARIAS_MAX);
  });
});

describe('parseKit — a galeria entra sem migrar doc nenhum (RN-425)', () => {
  it('doc SEM fotosSecundarias não ganha o campo (kit de uma foto continua o que era)', () => {
    const kit = parseKit('kit_ouro', doc({ imagemUrl: P }));
    expect(kit.imagemUrl).toBe(P);
    expect(kit.fotosSecundarias).toBeUndefined();
    expect('fotosSecundarias' in kit).toBe(false);
  });

  it('doc com lista podre inteira não ganha o campo e NÃO derruba o parse', () => {
    const kit = parseKit(
      'kit_ouro',
      doc({ imagemUrl: P, fotosSecundarias: ['javascript:alert(1)', 42, null] }),
    );
    expect(kit.imagemUrl).toBe(P);
    expect(kit.fotosSecundarias).toBeUndefined();
  });

  it('doc com galeria válida parseia com as duas secundárias, na ordem do array', () => {
    const kit = parseKit('kit_ouro', doc({ imagemUrl: P, fotosSecundarias: [S3, S2] }));
    expect(kit.fotosSecundarias).toEqual([S3, S2]);
  });

  it('secundária igual à principal é descartada NO PARSE', () => {
    const kit = parseKit('kit_ouro', doc({ imagemUrl: P, fotosSecundarias: [P, S2] }));
    expect(kit.fotosSecundarias).toEqual([S2]);
  });

  it('doc envenenado com 50 fotos vira 2 — teto no parse, não na tela', () => {
    const muitas = Array.from({ length: 50 }, (_, i) => `https://x.test/${i}.jpg`);
    const kit = parseKit('kit_ouro', doc({ imagemUrl: P, fotosSecundarias: muitas }));
    expect(kit.fotosSecundarias).toHaveLength(KIT_FOTOS_SECUNDARIAS_MAX);
  });
});

describe('fotosDoKit — acessor canônico, principal primeiro (RN-425)', () => {
  it('devolve principal + secundárias, nessa ordem', () => {
    expect(fotosDoKit({ imagemUrl: P, fotosSecundarias: [S2, S3] })).toEqual([P, S2, S3]);
  });

  it('kit de uma foto devolve uma entrada', () => {
    expect(fotosDoKit({ imagemUrl: P })).toEqual([P]);
  });

  it('SEM principal devolve lista vazia mesmo com secundárias — o acessor não inventa principal', () => {
    expect(fotosDoKit({ fotosSecundarias: [S2, S3] })).toEqual([]);
  });

  it('nunca devolve a mesma foto duas vezes, mesmo se o objeto vier sujo em memória', () => {
    const saida = fotosDoKit({ imagemUrl: P, fotosSecundarias: [P, S2] });
    expect(saida).toEqual([P, S2]);
    expect(new Set(saida).size).toBe(saida.length);
  });

  it('teto de três: objeto com 5 secundárias em memória ainda sai com 3 fotos', () => {
    const saida = fotosDoKit({
      imagemUrl: P,
      fotosSecundarias: [S2, S3, 'https://x.test/4.jpg', 'https://x.test/5.jpg', 'https://x.test/6.jpg'],
    });
    expect(saida).toHaveLength(1 + KIT_FOTOS_SECUNDARIAS_MAX);
  });
});

describe('promoverFotoPrincipal — TROCA, nunca copia (RN-427)', () => {
  it('promover a posição 0 troca com a principal', () => {
    const depois = promoverFotoPrincipal({ imagemUrl: P, fotosSecundarias: [S2, S3] }, 0);
    expect(depois.imagemUrl).toBe(S2);
    expect(depois.fotosSecundarias).toEqual([P, S3]);
  });

  it('promover a posição 1 troca com a principal e não mexe na 0', () => {
    const depois = promoverFotoPrincipal({ imagemUrl: P, fotosSecundarias: [S2, S3] }, 1);
    expect(depois.imagemUrl).toBe(S3);
    expect(depois.fotosSecundarias).toEqual([S2, P]);
  });

  it('a troca CONSERVA o conjunto de fotos — nada some, nada duplica', () => {
    const antes = { imagemUrl: P, fotosSecundarias: [S2, S3] };
    const depois = promoverFotoPrincipal(antes, 0);
    expect(new Set(fotosDoKit(depois))).toEqual(new Set(fotosDoKit(antes)));
    expect(fotosDoKit(depois)).toHaveLength(3);
  });

  it('se COPIASSE, a principal apareceria duas vezes — a asserção que morde', () => {
    const depois = promoverFotoPrincipal({ imagemUrl: P, fotosSecundarias: [S2, S3] }, 0);
    expect(depois.fotosSecundarias).not.toContain(S2);
    expect(fotosDoKit(depois).filter((f) => f === S2)).toHaveLength(1);
  });

  it('sem principal, a secundária SOBE e sai da lista — sem buraco, sem undefined', () => {
    const depois = promoverFotoPrincipal({ fotosSecundarias: [S2, S3] }, 0);
    expect(depois.imagemUrl).toBe(S2);
    expect(depois.fotosSecundarias).toEqual([S3]);
    expect(depois.fotosSecundarias).not.toContain(undefined);
  });

  it('índice fora da faixa devolve a galeria inalterada', () => {
    const antes = { imagemUrl: P, fotosSecundarias: [S2] };
    for (const i of [-1, 1, 9, 1.5, Number.NaN]) {
      const depois = promoverFotoPrincipal(antes, i);
      expect(depois.imagemUrl).toBe(P);
      expect(depois.fotosSecundarias).toEqual([S2]);
    }
  });

  it('não muta a entrada', () => {
    const antes = { imagemUrl: P, fotosSecundarias: [S2, S3] };
    promoverFotoPrincipal(antes, 0);
    expect(antes.imagemUrl).toBe(P);
    expect(antes.fotosSecundarias).toEqual([S2, S3]);
  });
});

describe('removerFotoPrincipal — kit nunca fica com galeria e sem principal (RN-427)', () => {
  it('remover a principal promove a primeira secundária', () => {
    const depois = removerFotoPrincipal({ imagemUrl: P, fotosSecundarias: [S2, S3] });
    expect(depois.imagemUrl).toBe(S2);
    expect(depois.fotosSecundarias).toEqual([S3]);
    expect(fotosDoKit(depois)).toEqual([S2, S3]);
  });

  it('sem secundárias o kit fica sem foto — estado legítimo e antigo', () => {
    const depois = removerFotoPrincipal({ imagemUrl: P });
    expect(depois.imagemUrl).toBeUndefined();
    expect(fotosDoKit(depois)).toEqual([]);
  });

  it('o estado "galeria sem principal" NÃO é alcançável por remoção', () => {
    const depois = removerFotoPrincipal({ imagemUrl: P, fotosSecundarias: [S2] });
    expect(fotosDoKit(depois).length).toBeGreaterThan(0);
  });

  it('não muta a entrada', () => {
    const antes = { imagemUrl: P, fotosSecundarias: [S2, S3] };
    removerFotoPrincipal(antes);
    expect(antes.imagemUrl).toBe(P);
    expect(antes.fotosSecundarias).toEqual([S2, S3]);
  });
});
