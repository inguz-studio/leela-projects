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

interface CampoComposto {
  fieldPath: string;
  order?: string;
  arrayConfig?: string;
}
interface IndiceComposto {
  collectionGroup: string;
  queryScope?: string;
  fields: CampoComposto[];
}

function lerArquivo(): {
  indexes?: IndiceComposto[];
  fieldOverrides?: FieldOverride[];
} {
  const bruto = readFileSync(resolve(RAIZ, 'firestore.indexes.json'), 'utf8');
  return JSON.parse(bruto) as {
    indexes?: IndiceComposto[];
    fieldOverrides?: FieldOverride[];
  };
}

function lerOverrides(): FieldOverride[] {
  return lerArquivo().fieldOverrides ?? [];
}

function lerCompostos(): IndiceComposto[] {
  return lerArquivo().indexes ?? [];
}

/** Assinatura estável de um composto: coleção, escopo e campos EM ORDEM. */
function assinatura(i: IndiceComposto): string {
  const campos = i.fields
    .map((f) => `${f.fieldPath}:${f.order ?? f.arrayConfig ?? '?'}`)
    .join(',');
  return `${i.collectionGroup}|${i.queryScope ?? 'COLLECTION'}|${campos}`;
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

  it('nenhum composto duplicado (o arquivo é a lista completa do servidor)', () => {
    const assinaturas = lerCompostos().map(assinatura);
    const repetidos = assinaturas.filter((a, i) => assinaturas.indexOf(a) !== i);
    expect(repetidos, 'composto declarado duas vezes').toEqual([]);
  });
});

// =============================================================================
// O CRON DE LGPD QUE FALHAVA TODO DIA POR FALTA DE ÍNDICE
// (BUILD-EXPURGO · 2026-08-05)
//
// Outra classe de defeito que o mesmo arquivo produz: aqui nada foi APAGADO,
// simplesmente nunca foi DECLARADO. `expurgarSaude` (LGPD Art. 11 · RN-147)
// falhou 8 madrugadas seguidas em produção com `FAILED_PRECONDITION` porque a
// varredura de eventos vencidos exige um composto que ninguém escreveu.
//
// A falta de índice é INVISÍVEL para todo teste de execução deste repositório
// — o Emulator não cobra índice nenhum. A única prova possível antes do deploy
// é sobre o ARQUIVO, ancorada na query que está no código. É o que segue.
// =============================================================================
describe('firestore.indexes.json · o expurgo de saúde (LGPD) tem índice declarado', () => {
  const FONTE = resolve(RAIZ, 'functions/src/eventos/expurgarSaude.ts');

  it('a query de varredura continua sendo eventos(status ==, data <)', () => {
    const fonte = readFileSync(FONTE, 'utf8');
    expect(fonte, 'expurgarSaude deveria varrer a coleção eventos').toContain(
      ".collection('eventos')"
    );
    expect(fonte, 'o filtro de status saiu do código — reveja o índice').toContain(
      ".where('status', '==', 'encerrado')"
    );
    expect(fonte, 'o filtro de data saiu do código — reveja o índice').toContain(
      ".where('data', '<', corte)"
    );
  });

  it('o composto eventos(status ASC, data ASC) está declarado', () => {
    // Assinatura idêntica à que o próprio Firestore pediu no erro de produção:
    // collectionGroups/eventos/indexes/_  status  data  __name__
    expect(
      lerCompostos().map(assinatura),
      'sem `eventos|COLLECTION|status:ASCENDING,data:ASCENDING` o cron de LGPD ' +
        'falha com FAILED_PRECONDITION em TODA execução e nenhum dado de saúde ' +
        'é apagado. Igualdade + desigualdade em campos diferentes exige composto.'
    ).toContain('eventos|COLLECTION|status:ASCENDING,data:ASCENDING');
  });

  it('a busca dos docs de saúde é por collectionGroup e o override existe', () => {
    const fonte = readFileSync(FONTE, 'utf8');
    expect(fonte, 'a localização dos docs de saúde é por collection group').toContain(
      '.collectionGroup(SAUDE_SUBCOL)'
    );
    expect(fonte, 'o filtro do collection group é por eventoId').toContain(
      ".where('eventoId', '==', evento.id)"
    );
    const o = lerOverrides().find((x) => chave(x) === 'saude.eventoId');
    expect(
      o,
      'override `saude.eventoId` ausente: query de collection group com ' +
        'igualdade NÃO é coberta pelo índice automático (que é COLLECTION). ' +
        'Sem ele o expurgo estoura no segundo passo, depois de o primeiro passar.'
    ).toBeDefined();
    expect(
      o?.indexes?.some(
        (i) => i.queryScope === 'COLLECTION_GROUP' && i.order === 'ASCENDING'
      ),
      'saude.eventoId precisa de COLLECTION_GROUP ASCENDING'
    ).toBe(true);
  });

  it('o override de saude.eventoId não apaga o escopo COLLECTION (regra D1)', () => {
    const o = lerOverrides().find((x) => chave(x) === 'saude.eventoId');
    // A coleta (E12-S1207/E13) ainda não existe; quando existir, ela vai ler
    // `inscritos/{i}/saude` em escopo COLLECTION. Re-listar aqui custa
    // armazenamento de um doc por inscrito e evita repetir o defeito D1 — com
    // a diferença de que ninguém estaria olhando, porque não há query hoje.
    for (const ordem of ['ASCENDING', 'DESCENDING']) {
      expect(
        o?.indexes?.some((i) => i.queryScope === 'COLLECTION' && i.order === ordem),
        `saude.eventoId precisa manter COLLECTION ${ordem} — fieldOverride ` +
          'substitui a política automática, não soma a ela'
      ).toBe(true);
    }
  });
});
