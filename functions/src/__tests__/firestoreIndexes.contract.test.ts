// =============================================================================
// functions/src/__tests__/firestoreIndexes.contract.test.ts
//
// A GUARDA CONTRA O `fieldOverride` QUE APAGA O ÍNDICE QUE JÁ EXISTIA
// (REV-B4 · 2026-08-05). Estático: não sobe Emulator, não fala com rede.
//
// O DEFEITO. Em `firestore.indexes.json`, um item de `fieldOverrides` NÃO é
// "mais um índice": é uma ISENÇÃO da política automática de índice de campo
// único daquele campo, e o array `indexes` é a lista COMPLETA do que passa a
// existir. Declarar só
//
//     { "queryScope": "COLLECTION_GROUP", "order": "ASCENDING" }
//
// habilita a query de grupo E REMOVE os índices de escopo COLLECTION que o
// Firestore criava sozinho. Toda query de coleção sobre aquele campo passa a
// falhar com `FAILED_PRECONDITION` — no PRÓXIMO `firebase deploy --only
// firestore:indexes`, não no deploy do código, o que separa a causa do efeito
// por quanto tempo o maestro quiser.
//
// FOI EXATAMENTE O QUE ACONTECEU. A B4 (`4b72c556`) acrescentou três overrides
// só com COLLECTION_GROUP. Um deles é `membros.atletaId` — e
// `jornada/entrarNoDesafio.ts` faz
// `clubes/{id}/membros.where('atletaId','==',uid).limit(1)`, escopo COLLECTION.
// O deploy de índices que o handoff manda rodar ANTES das functions teria
// derrubado a entrada em desafio de toda a plataforma, sem tocar uma linha de
// código do desafio.
//
// O EMULATOR NÃO PEGA: ele não cobra índice nenhum. A prova precisa ser sobre
// o ARQUIVO, não sobre a execução — a mesma razão do `secretsBinding.contract`.
//
// A REGRA, FAIL-CLOSED: todo `fieldOverride` mantém escopo COLLECTION, a menos
// que esteja em `SEM_ESCOPO_DE_COLECAO` com motivo escrito. Override novo
// nasce reprovado até alguém declarar que a remoção é deliberada.
//
// Referência: Firestore, "single-field index exemptions" — o exemplo oficial
// de habilitar collection group re-lista as entradas COLLECTION justamente
// porque o override substitui, e não soma.
// =============================================================================

import { readFileSync } from 'fs';
import { resolve } from 'path';
import { describe, expect, it } from 'vitest';

const RAIZ = resolve(__dirname, '../../..');

interface IndiceDeCampo {
  queryScope?: string;
  order?: string;
  arrayConfig?: string;
}
interface FieldOverride {
  collectionGroup: string;
  fieldPath: string;
  indexes?: IndiceDeCampo[];
  ttl?: boolean;
}

function lerOverrides(): FieldOverride[] {
  const bruto = readFileSync(resolve(RAIZ, 'firestore.indexes.json'), 'utf8');
  const doc = JSON.parse(bruto) as { fieldOverrides?: FieldOverride[] };
  return doc.fieldOverrides ?? [];
}

const chave = (o: FieldOverride): string => `${o.collectionGroup}.${o.fieldPath}`;

/**
 * Overrides em que a remoção do escopo COLLECTION é DELIBERADA — o campo não
 * é consultado por query de coleção em lugar nenhum do produto, e o índice a
 * menos é armazenamento a menos.
 *
 * Entrar aqui exige a varredura: `where('<campo>'` fora de `collectionGroup`.
 * Sair daqui é de graça; entrar sem varrer é como o defeito volta.
 */
const SEM_ESCOPO_DE_COLECAO: Record<string, string> = {
  'afiliados.responsavelUid':
    'só `getMinhasAfiliacoes` (affiliation/readers.ts:222) — collectionGroup',
  'afiliados.tenantId':
    'só `getAfiliadosDoTenant` (affiliation/readers.ts:268) — collectionGroup',
};

/**
 * Queries de escopo COLLECTION que o produto realmente faz sobre campos que
 * TÊM override. Cada linha é uma âncora no código: se o arquivo deixar de
 * conter a query, a linha some daqui — e não antes.
 */
const QUERIES_DE_COLECAO: ReadonlyArray<{
  override: string;
  arquivo: string;
  colecao: string;
  campo: string;
}> = [
  {
    override: 'membros.atletaId',
    arquivo: 'functions/src/jornada/entrarNoDesafio.ts',
    colecao: 'membros',
    campo: 'atletaId',
  },
];

describe('firestore.indexes.json · fieldOverride não apaga índice existente', () => {
  it('todo override mantém escopo COLLECTION, salvo isenção declarada', () => {
    const faltando: string[] = [];
    for (const o of lerOverrides()) {
      const k = chave(o);
      if (k in SEM_ESCOPO_DE_COLECAO) continue;
      // `ttl` sem `indexes` é outra classe de override (expiração), não isenção
      // de índice — não julga.
      if (o.indexes === undefined) continue;
      const temColecao = o.indexes.some((i) => i.queryScope === 'COLLECTION');
      if (!temColecao) faltando.push(k);
    }
    expect(
      faltando,
      'fieldOverride sem escopo COLLECTION REMOVE o índice automático do campo ' +
        '(toda query de coleção sobre ele passa a dar FAILED_PRECONDITION no ' +
        'próximo deploy de índices). Ou re-liste COLLECTION ASC/DESC, ou ' +
        'declare a remoção em SEM_ESCOPO_DE_COLECAO com a varredura feita.'
    ).toEqual([]);
  });

  it('a query de coleção que depende de cada override continua no código', () => {
    for (const q of QUERIES_DE_COLECAO) {
      const fonte = readFileSync(resolve(RAIZ, q.arquivo), 'utf8');
      expect(fonte, `${q.arquivo} deveria consultar ${q.colecao}`).toContain(
        `.collection('${q.colecao}')`
      );
      expect(fonte, `${q.arquivo} deveria filtrar por ${q.campo}`).toContain(
        `.where('${q.campo}'`
      );
      const override = lerOverrides().find((o) => chave(o) === q.override);
      expect(override, `override ${q.override} sumiu de firestore.indexes.json`).toBeDefined();
      expect(
        override?.indexes?.some((i) => i.queryScope === 'COLLECTION' && i.order === 'ASCENDING'),
        `${q.override} precisa de COLLECTION ASCENDING — ${q.arquivo} faz ` +
          `\`.collection('${q.colecao}').where('${q.campo}', '==', …)\``
      ).toBe(true);
    }
  });

  it('os três overrides da B4 habilitam a query de GRUPO que a área do cliente faz', () => {
    const overrides = lerOverrides();
    for (const k of ['membros.atletaId', 'afiliados.responsavelEmail', 'convites.email']) {
      const o = overrides.find((x) => chave(x) === k);
      expect(o, `override ${k} ausente`).toBeDefined();
      expect(
        o?.indexes?.some(
          (i) => i.queryScope === 'COLLECTION_GROUP' && i.order === 'ASCENDING'
        ),
        `${k} precisa de COLLECTION_GROUP ASCENDING — getMeusClubesEConvites usa collectionGroup`
      ).toBe(true);
    }
  });
});
