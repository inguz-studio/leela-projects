// =============================================================================
// GUARDA DE REGRESSÃO da review KITCUPOM-REV — o cache do cupom do link.
//
// O DEFEITO. O `Map` do `verificarCupomDoLink` nasceu como MITIGAÇÃO de
// raspagem (⚔ 12 · RN-432) e era, ele próprio, o caminho de exaustão. A chave é
// `{slug}|{código}` e vinha DIRETO do chamador: `verificarCupomLinkAction` é uma
// ação de servidor, endereçável por qualquer um com os argumentos que quiser. O
// código passava por `isCodigoCupomValido`; o slug não passava por guarda
// nenhuma além de "não vazio". Nada evictava, nem a entrada vencida.
//
// Medido antes do fix, com o duplo de Firestore deste arquivo:
//   - 2.000 códigos distintos + 2.000 slugs distintos ⇒ 4.000 entradas
//     PERMANENTES no Map (agora: teto de 500);
//   - slug de 200.000 caracteres ⇒ aceito, 1 leitura, e a chave inteira
//     guardada (agora: 0 leituras, 0 entradas).
//
// O alvo do estrago é o `ssrleelalanding`, que serve TAMBÉM a página de compra:
// derrubar a instância por memória derruba o checkout junto.
//
// O que estes casos travam: o teto existe, a evicção é da entrada mais antiga
// (o sondador é quem cai primeiro), o slug fora de forma não custa leitura nem
// entrada, e o ganho que a mitigação vendeu (o mesmo código repetido custa as
// leituras de UMA vez) continua de pé.
// =============================================================================

import { beforeEach, describe, expect, it, vi } from 'vitest';

// ── Duplo do Firestore: conta cada `.get()` por path ────────────────────────
const docs = new Map<string, Record<string, unknown>>();
const leituras: string[] = [];

function snapshotDe(path: string) {
  const data = docs.get(path);
  return {
    exists: data !== undefined,
    id: path.split('/').pop() ?? '',
    data: () => data,
    get: (campo: string) => data?.[campo],
  };
}
function docRef(path: string) {
  return {
    path,
    get: async () => {
      leituras.push(path);
      return snapshotDe(path);
    },
    collection: (nome: string) => colecaoRef(`${path}/${nome}`),
  };
}
function colecaoRef(path: string) {
  return { doc: (id: string) => docRef(`${path}/${id}`) };
}
const dbFake = {
  collection: (nome: string) => colecaoRef(nome),
  doc: (path: string) => docRef(path),
};
vi.mock('@/lib/firebaseAdmin', () => ({ getDb: () => dbFake }));

import {
  CUPOM_LINK_CACHE_MAX,
  limparCacheCupomLink,
  tamanhoCacheCupomLink,
  verificarCupomDoLink,
} from '@/lib/leitor';

const SLUG = 'meia-floripa-2026';
const TENANT = 'castelo-producoes';

/** Código válido e determinístico para o i-ésimo tiro do sondador. */
function codigoSonda(i: number): string {
  return `SONDA${String(i).padStart(6, '0')}`;
}

beforeEach(() => {
  docs.clear();
  leituras.length = 0;
  limparCacheCupomLink();
  docs.set(`eventos/${SLUG}`, { status: 'publicado', tenantId: TENANT, nome: 'Meia' });
});

describe('KITCUPOM-REV · o cache do cupom do link é limitado', () => {
  it('mil códigos distintos não passam do teto de entradas', async () => {
    const tiros = CUPOM_LINK_CACHE_MAX * 2;
    for (let i = 0; i < tiros; i++) {
      await verificarCupomDoLink(SLUG, codigoSonda(i));
    }
    expect(tamanhoCacheCupomLink()).toBe(CUPOM_LINK_CACHE_MAX);
    // A raspagem continua custando leitura — o teto protege MEMÓRIA, não é uma
    // promessa de que sondar é de graça (o custo por código é o que a RN-432
    // aceita, e vem com resposta uniforme).
    expect(leituras.length).toBe(tiros * 2);
  }, 30_000);

  it('slugs distintos também não fazem o Map crescer sem fim', async () => {
    for (let i = 0; i < CUPOM_LINK_CACHE_MAX * 2; i++) {
      await verificarCupomDoLink(`evento-que-nao-existe-${i}`, 'SONDA000000');
    }
    expect(tamanhoCacheCupomLink()).toBe(CUPOM_LINK_CACHE_MAX);
  }, 30_000);

  it('a evicção é da entrada mais ANTIGA — quem sonda é quem cai primeiro', async () => {
    docs.set(`eventos/${SLUG}/cupons/VALIDO10`, {
      tenantId: TENANT,
      codigo: 'VALIDO10',
      tipo: 'percentual',
      valor: 10,
      tetoUso: null,
      usos: 0,
      inicioEm: { toMillis: () => Date.now() - 1000, toDate: () => new Date(Date.now() - 1000) },
      fimEm: { toMillis: () => Date.now() + 1000, toDate: () => new Date(Date.now() + 1000) },
    });
    // O cupom de verdade entra PRIMEIRO e depois é revisitado: revisitar não
    // reinsere (a entrada mantém a posição), então ele É o mais antigo e a
    // enxurrada seguinte o despeja. O que isso custa é UMA leitura a mais na
    // próxima visita — nunca um número errado, porque o valor da faixa não sai
    // daqui.
    await verificarCupomDoLink(SLUG, 'VALIDO10');
    for (let i = 0; i < CUPOM_LINK_CACHE_MAX; i++) {
      await verificarCupomDoLink(SLUG, codigoSonda(i));
    }
    expect(tamanhoCacheCupomLink()).toBe(CUPOM_LINK_CACHE_MAX);
    const antes = leituras.length;
    await expect(verificarCupomDoLink(SLUG, 'VALIDO10')).resolves.toEqual({
      codigo: 'VALIDO10',
      promotor: null,
    });
    expect(leituras.length).toBeGreaterThan(antes);
  }, 30_000);

  it('slug fora de forma NÃO custa leitura nem entrada de cache', async () => {
    const fora = ['x'.repeat(200_000), 'a/b/c', '', '   ', 'x'.repeat(101)];
    for (const slug of fora) {
      await expect(verificarCupomDoLink(slug, 'SONDA000000')).resolves.toBeNull();
    }
    expect(leituras).toHaveLength(0);
    expect(tamanhoCacheCupomLink()).toBe(0);
  });

  it('o ganho declarado da mitigação continua de pé: o MESMO código, 50 vezes, custa 2 leituras', async () => {
    for (let i = 0; i < 50; i++) {
      await verificarCupomDoLink(SLUG, 'NAOEXISTE');
    }
    expect(leituras).toHaveLength(2);
    expect(tamanhoCacheCupomLink()).toBe(1);
  });
});
