/**
 * equipeRules.integration.test.ts — LEELA-S304-T1 (Emulator · Firestore 8080)
 *
 * Security Rules por PAPEL DE EVENTO (RN-320 · ADR-008) nas coleções do
 * evento + bloco `equipe`.
 *
 * Cobre (aceite E04-L4):
 *   - Varredura MATRIZ-DRIVEN: para cada papel × área com probe de Rules
 *     (6 das 7 áreas — `configuracoes` não tem probe client-side em T1,
 *     a escrita do doc de evento segue isTenantWriter), o emulator prova
 *     allow/deny EXATAMENTE como a célula da matriz 4×7 de @leela/core;
 *   - Aceites nominais: operador × financeiro NEGA; financeiro lê financeiro
 *     PERMITE; financeiro edita paginaVendas NEGA;
 *   - ATAQUES: auto-promoção via doc, âncora forjada, claims de outro
 *     evento/tenant, token velho pós-remoção (âncora fecha a janela),
 *     claim×doc divergentes, claims malformadas, catch-all não re-concede;
 *   - Bloco `equipe`: convite válido/inválido, update negado a TODOS os
 *     clientes, delete só de convite;
 *   - Regressões: financeiro/current e agregados de evento seguem
 *     write:false para QUALQUER cliente (papel de evento não muda isso).
 *
 * Pré-requisito: Firestore Emulator na porta 8080 (via emulators:exec).
 */
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { deleteDoc, doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import * as admin from 'firebase-admin';
import { Timestamp } from 'firebase-admin/firestore';
import { papeisComAcesso, type AreaEvento, type PapelEvento } from '@leela/core';
import { seedTenants, CASTELO_TENANT_ID, MARINA_CASTELO_UID } from '../seed/tenants.seed';
import { seedEventos, MEIA_FLORIPA_ID, MARATONA_2027_ID } from '../seed/eventos.seed';
import { seedEquipeDocs, EQUIPE_SEEDS } from '../seed/equipe.seed';

const PROJECT_ID = 'demo-leela';
const RULES_PATH = resolve(__dirname, '../../../firestore.rules');

const PASSO_ID = 'passo-certo';
const EV = MEIA_FLORIPA_ID;

// uids canônicos do seed (1 por papel)
const UID_POR_PAPEL: Record<PapelEvento, string> = {
  organizador: 'uid-equipe-organizador',
  administrador: 'uid-equipe-administrador',
  operador: 'uid-equipe-operador',
  financeiro: 'uid-equipe-financeiro',
};

let testEnv: RulesTestEnvironment;
let adminDb: admin.firestore.Firestore;

/** Contexto de MEMBRO DE EQUIPE puro: athlete + claim de papel no evento. */
function ctxPapel(papel: PapelEvento, overrides?: Record<string, unknown>) {
  return testEnv
    .authenticatedContext(UID_POR_PAPEL[papel], {
      role: 'athlete',
      eventos: { [EV]: papel },
      ...(overrides ?? {}),
    })
    .firestore();
}

function ctxMarina() {
  return testEnv
    .authenticatedContext(MARINA_CASTELO_UID, {
      role: 'tenant_owner',
      tenantId: CASTELO_TENANT_ID,
    })
    .firestore();
}

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: {
      rules: readFileSync(RULES_PATH, 'utf8'),
      host: 'localhost',
      port: 8080,
    },
  });
  if (!admin.apps.length) {
    process.env['FIRESTORE_EMULATOR_HOST'] = 'localhost:8080';
    admin.initializeApp({ projectId: PROJECT_ID });
  }
  adminDb = admin.firestore();
});

afterAll(async () => {
  await testEnv.cleanup();
});

beforeEach(async () => {
  await testEnv.clearFirestore();
  await seedTenants(adminDb);
  await seedEventos(adminDb);
  await seedEquipeDocs(adminDb);

  const agora = Timestamp.now();
  const ev = adminDb.collection('eventos').doc(EV);

  // Probes por área (docs mínimos via Admin SDK — bypassa Rules)
  await ev.collection('financeiro').doc('current').set({
    tenantId: CASTELO_TENANT_ID,
    receitaBruta: 85617,
    taxaValor: 12842.55,
    receitaLiquida: 72774.45,
    atualizadoEm: agora,
  });
  await ev.collection('comunicacoes').doc('atleta1_conf_email').set({
    tenantId: CASTELO_TENANT_ID,
    eventoId: EV,
    destinatario: 'atleta1',
    canal: 'email',
    status: 'entregue',
    criadoEm: agora,
  });
  await ev.collection('comunicacoesResumo').doc('current').set({
    tenantId: CASTELO_TENANT_ID,
    total: 1,
    atualizadoEm: agora,
  });
  await ev.collection('inscritos').doc('inscrito-1').set({
    tenantId: CASTELO_TENANT_ID,
    nome: 'Atleta Um',
    kit: 'kit_basico',
    status: 'confirmado',
    chipNumero: null,
  });
  await ev.collection('kits').doc('kit-basico').set({
    tenantId: CASTELO_TENANT_ID,
    nome: 'Kit Básico',
    preco: 0,
    capacidade: 100,
    modalidades: ['5k'],
  });
  await ev.collection('lotes').doc('lote-1').set({
    tenantId: CASTELO_TENANT_ID,
    modalidade: '5k',
    ordem: 1,
    preco: 120,
    vendidos: 0,
  });
  await ev.collection('cupons').doc('CORRE10').set({
    tenantId: CASTELO_TENANT_ID,
    codigo: 'CORRE10',
    tipo: 'percentual',
    valor: 10,
    usos: 0,
    inicioEm: agora,
    fimEm: Timestamp.fromMillis(agora.toMillis() + 86_400_000),
  });
  await ev.collection('paginaVendas').doc('config').set({
    tenantId: CASTELO_TENANT_ID,
    eventoId: EV,
    secoes: [],
    seo: { titulo: 'Meia Floripa', slugAmigavel: 'meia-floripa-2026' },
    publicada: false,
  });
});

// ---------------------------------------------------------------------------
// Varredura matriz-driven — 6 áreas com probe de leitura × 4 papéis
// ---------------------------------------------------------------------------

/** Probe de LEITURA representativa de cada área (coleção → doc). */
const PROBES: Array<{
  area: AreaEvento;
  colecao: string;
  docId: string;
  permitidos: PapelEvento[];
}> = [
  {
    area: 'pagina_vendas',
    colecao: 'paginaVendas',
    docId: 'config',
    permitidos: ['organizador', 'administrador'],
  },
  {
    area: 'comunicacao',
    colecao: 'comunicacoes',
    docId: 'atleta1_conf_email',
    permitidos: ['organizador', 'administrador'],
  },
  {
    area: 'financeiro',
    colecao: 'financeiro',
    docId: 'current',
    permitidos: ['organizador', 'financeiro'],
  },
  {
    area: 'entrega',
    colecao: 'kits',
    docId: 'kit-basico',
    permitidos: ['organizador', 'administrador', 'operador'],
  },
  {
    area: 'inscritos',
    colecao: 'inscritos',
    docId: 'inscrito-1',
    permitidos: ['organizador', 'administrador', 'operador'],
  },
  {
    area: 'equipe',
    colecao: 'equipe',
    docId: 'uid-equipe-operador',
    permitidos: ['organizador', 'administrador'],
  },
];

describe('matriz 4×7 nas Rules — leitura por papel (célula a célula)', () => {
  it('as listas de papéis das probes ESPELHAM papeisComAcesso (fonte única)', () => {
    for (const probe of PROBES) {
      expect(probe.permitidos, `área ${probe.area}`).toEqual(papeisComAcesso(probe.area));
    }
  });

  it('seed canônico: 4 membros, 1 por papel, uids casados com este teste', () => {
    expect(EQUIPE_SEEDS).toHaveLength(4);
    for (const seed of EQUIPE_SEEDS) {
      expect(seed.uid).toBe(UID_POR_PAPEL[seed.papel]);
      expect(seed.status).toBe('ativo');
    }
    expect(new Set(EQUIPE_SEEDS.map((s) => s.papel)).size).toBe(4);
  });

  const PAPEIS: PapelEvento[] = ['organizador', 'administrador', 'operador', 'financeiro'];
  for (const probe of PROBES) {
    for (const papel of PAPEIS) {
      const esperado = probe.permitidos.includes(papel);
      it(`${papel} lê ${probe.colecao} → ${esperado ? 'PERMITE' : 'NEGA'}`, async () => {
        const leitura = getDoc(
          doc(ctxPapel(papel), 'eventos', EV, probe.colecao, probe.docId)
        );
        if (esperado) {
          await assertSucceeds(leitura);
        } else {
          await assertFails(leitura);
        }
      });
    }
  }

  it('pagina_vendas: lotes e cupons seguem a MESMA célula (org/adm sim; op/fin não)', async () => {
    await assertSucceeds(getDoc(doc(ctxPapel('administrador'), 'eventos', EV, 'lotes', 'lote-1')));
    await assertSucceeds(getDoc(doc(ctxPapel('administrador'), 'eventos', EV, 'cupons', 'CORRE10')));
    await assertFails(getDoc(doc(ctxPapel('operador'), 'eventos', EV, 'lotes', 'lote-1')));
    await assertFails(getDoc(doc(ctxPapel('financeiro'), 'eventos', EV, 'lotes', 'lote-1')));
    await assertFails(getDoc(doc(ctxPapel('operador'), 'eventos', EV, 'cupons', 'CORRE10')));
    await assertFails(getDoc(doc(ctxPapel('financeiro'), 'eventos', EV, 'cupons', 'CORRE10')));
  });

  it('doc do EVENTO é legível pelos 4 papéis (toda área depende dele)', async () => {
    for (const papel of PAPEIS) {
      await assertSucceeds(getDoc(doc(ctxPapel(papel), 'eventos', EV)));
    }
  });

  it('papel em um evento NÃO abre OUTRO evento (nem o doc, nem subcoleções)', async () => {
    await assertFails(getDoc(doc(ctxPapel('organizador'), 'eventos', MARATONA_2027_ID)));
  });
});

// ---------------------------------------------------------------------------
// Aceites nominais E04-L4 (redundância deliberada com a varredura)
// ---------------------------------------------------------------------------

describe('aceites nominais E04-L4', () => {
  it('Operador de balcão lendo Financeiro → Rule NEGA', async () => {
    await assertFails(getDoc(doc(ctxPapel('operador'), 'eventos', EV, 'financeiro', 'current')));
  });

  it('Financeiro lê financeiro → PERMITE; edita página de vendas → NEGA', async () => {
    await assertSucceeds(
      getDoc(doc(ctxPapel('financeiro'), 'eventos', EV, 'financeiro', 'current'))
    );
    await assertFails(
      updateDoc(doc(ctxPapel('financeiro'), 'eventos', EV, 'paginaVendas', 'config'), {
        secoes: [],
      })
    );
  });

  it('ESCRITA por papel de evento NÃO existe em T1 — nem administrador salva paginaVendas', async () => {
    await assertFails(
      updateDoc(doc(ctxPapel('administrador'), 'eventos', EV, 'paginaVendas', 'config'), {
        secoes: [],
      })
    );
  });

  it('REGRESSÃO: financeiro/current segue write:false p/ TODO cliente', async () => {
    const payload = { tenantId: CASTELO_TENANT_ID, receitaBruta: 1 };
    await assertFails(
      setDoc(doc(ctxMarina(), 'eventos', EV, 'financeiro', 'current'), payload)
    );
    await assertFails(
      setDoc(doc(ctxPapel('organizador'), 'eventos', EV, 'financeiro', 'current'), payload)
    );
    await assertFails(
      setDoc(doc(ctxPapel('financeiro'), 'eventos', EV, 'financeiro', 'current'), payload)
    );
  });

  it('REGRESSÃO: agregados ∑ do evento seguem intocáveis (writer e papel)', async () => {
    await assertFails(updateDoc(doc(ctxMarina(), 'eventos', EV), { qtdInscritos: 9999 }));
    await assertFails(
      updateDoc(doc(ctxPapel('organizador'), 'eventos', EV), { qtdInscritos: 9999 })
    );
  });
});

// ---------------------------------------------------------------------------
// Ataques (postura antagonista do lote)
// ---------------------------------------------------------------------------

describe('ataques — claims/âncora', () => {
  it('claims de OUTRO evento não abrem este (organizador da maratona ≠ meia)', async () => {
    const invasor = testEnv
      .authenticatedContext('uid-invasor-outro-evento', {
        role: 'athlete',
        eventos: { [MARATONA_2027_ID]: 'organizador' },
      })
      .firestore();
    await assertFails(getDoc(doc(invasor, 'eventos', EV, 'financeiro', 'current')));
    await assertFails(getDoc(doc(invasor, 'eventos', EV, 'inscritos', 'inscrito-1')));
    await assertFails(getDoc(doc(invasor, 'eventos', EV)));
  });

  it('claims FORJADAS de papel sem âncora no doc → NEGA (cross-tenant)', async () => {
    // tenant_owner de OUTRO tenant com claim de papel forjada p/ este evento,
    // mas SEM doc equipe/{uid} — a âncora não existe, get() falha, deny.
    const forjador = testEnv
      .authenticatedContext('uid-passo-owner', {
        role: 'tenant_owner',
        tenantId: PASSO_ID,
        eventos: { [EV]: 'organizador' },
      })
      .firestore();
    await assertFails(getDoc(doc(forjador, 'eventos', EV, 'financeiro', 'current')));
    await assertFails(getDoc(doc(forjador, 'eventos', EV, 'equipe', 'uid-equipe-operador')));
  });

  it('TOKEN VELHO pós-remoção → âncora status "removido" NEGA na hora', async () => {
    // Simula o membro financeiro REMOVIDO cujo token ainda carrega o claim
    // (janela de ~1h do token ID). A âncora fecha a janela: deny imediato.
    await adminDb
      .collection('eventos')
      .doc(EV)
      .collection('equipe')
      .doc(UID_POR_PAPEL.financeiro)
      .set({ status: 'removido', atualizadoEm: Timestamp.now() }, { merge: true });
    await assertFails(
      getDoc(doc(ctxPapel('financeiro'), 'eventos', EV, 'financeiro', 'current'))
    );
    await assertFails(getDoc(doc(ctxPapel('financeiro'), 'eventos', EV)));
  });

  it('claim × doc DIVERGENTES (token velho de papel trocado) → NEGA', async () => {
    // Doc diz 'operador' (troca já aplicada); token velho ainda diz
    // 'financeiro'. A âncora exige papel do doc == papel do claim.
    const staleFinanceiro = testEnv
      .authenticatedContext(UID_POR_PAPEL.operador, {
        role: 'athlete',
        eventos: { [EV]: 'financeiro' },
      })
      .firestore();
    await assertFails(
      getDoc(doc(staleFinanceiro, 'eventos', EV, 'financeiro', 'current'))
    );
  });

  it('claims `eventos` MALFORMADAS (string) não quebram nem concedem', async () => {
    const malformado = testEnv
      .authenticatedContext('uid-malformado', {
        role: 'athlete',
        eventos: 'organizador',
      })
      .firestore();
    await assertFails(getDoc(doc(malformado, 'eventos', EV)));
    await assertFails(getDoc(doc(malformado, 'eventos', EV, 'financeiro', 'current')));
  });

  it('catch-all NÃO re-concede: papel organizador não lê subcoleção fora da lista', async () => {
    await adminDb
      .collection('eventos')
      .doc(EV)
      .collection('reembolsos')
      .doc('r1')
      .set({ tenantId: CASTELO_TENANT_ID, valor: 10 });
    await assertFails(
      getDoc(doc(ctxPapel('organizador'), 'eventos', EV, 'reembolsos', 'r1'))
    );
  });
});

describe('ataques — bloco equipe (auto-promoção / âncora forjada)', () => {
  it('AUTO-PROMOÇÃO via doc: operador não muda o PRÓPRIO papel', async () => {
    await assertFails(
      updateDoc(
        doc(ctxPapel('operador'), 'eventos', EV, 'equipe', UID_POR_PAPEL.operador),
        { papel: 'organizador' }
      )
    );
  });

  it('update de equipe é NEGADO até para tenant_owner e organizador (só Function)', async () => {
    await assertFails(
      updateDoc(doc(ctxMarina(), 'eventos', EV, 'equipe', UID_POR_PAPEL.operador), {
        papel: 'financeiro',
      })
    );
    await assertFails(
      updateDoc(
        doc(ctxPapel('organizador'), 'eventos', EV, 'equipe', UID_POR_PAPEL.operador),
        { status: 'removido' }
      )
    );
  });

  it('ÂNCORA FORJADA: ninguém cria doc status "ativo" (nem com uid) pelo cliente', async () => {
    const invasorUid = 'uid-invasor-ancora';
    const invasor = testEnv
      .authenticatedContext(invasorUid, {
        role: 'athlete',
        eventos: { [EV]: 'organizador' }, // claim forjada — sem âncora ainda
      })
      .firestore();
    // forjar a própria âncora p/ "ativar" a claim forjada → deny (create de
    // cliente exige status 'convidado' e SEM uid — e invasor nem gere equipe)
    await assertFails(
      setDoc(doc(invasor, 'eventos', EV, 'equipe', invasorUid), {
        tenantId: CASTELO_TENANT_ID,
        eventoId: EV,
        uid: invasorUid,
        nome: 'Invasor',
        papel: 'organizador',
        status: 'ativo',
      })
    );
    // até o WRITER legítimo: âncora ativa nunca nasce pelo cliente
    await assertFails(
      setDoc(doc(ctxMarina(), 'eventos', EV, 'equipe', 'uid-novo'), {
        tenantId: CASTELO_TENANT_ID,
        eventoId: EV,
        uid: 'uid-novo',
        nome: 'Novo',
        papel: 'operador',
        status: 'ativo',
      })
    );
  });

  it('operador/financeiro NÃO criam convite (célula equipe = false)', async () => {
    const convite = {
      tenantId: CASTELO_TENANT_ID,
      eventoId: EV,
      nome: 'Convidado X',
      papel: 'operador',
      status: 'convidado',
    };
    await assertFails(
      setDoc(doc(ctxPapel('operador'), 'eventos', EV, 'equipe', 'convite-x'), convite)
    );
    await assertFails(
      setDoc(doc(ctxPapel('financeiro'), 'eventos', EV, 'equipe', 'convite-x'), convite)
    );
  });
});

describe('bloco equipe — convites (caminho feliz + shape)', () => {
  const conviteValido = {
    tenantId: CASTELO_TENANT_ID,
    eventoId: EV,
    nome: 'Bruna Costa',
    email: 'bruna@x.dev',
    papel: 'operador',
    status: 'convidado',
  };

  it('tenant writer cria convite válido; organizador/administrador também', async () => {
    await assertSucceeds(
      setDoc(doc(ctxMarina(), 'eventos', EV, 'equipe', 'convite-1'), conviteValido)
    );
    await assertSucceeds(
      setDoc(
        doc(ctxPapel('organizador'), 'eventos', EV, 'equipe', 'convite-2'),
        conviteValido
      )
    );
    await assertSucceeds(
      setDoc(
        doc(ctxPapel('administrador'), 'eventos', EV, 'equipe', 'convite-3'),
        conviteValido
      )
    );
  });

  it("convite NUNCA nasce com papel 'organizador' (transferência é da Function)", async () => {
    await assertFails(
      setDoc(doc(ctxMarina(), 'eventos', EV, 'equipe', 'convite-org'), {
        ...conviteValido,
        papel: 'organizador',
      })
    );
  });

  it('convite não nasce com uid, nem com status ≠ convidado, nem papel fora do enum', async () => {
    await assertFails(
      setDoc(doc(ctxMarina(), 'eventos', EV, 'equipe', 'c1'), {
        ...conviteValido,
        uid: 'uid-qualquer',
      })
    );
    await assertFails(
      setDoc(doc(ctxMarina(), 'eventos', EV, 'equipe', 'c2'), {
        ...conviteValido,
        status: 'ativo',
      })
    );
    await assertFails(
      setDoc(doc(ctxMarina(), 'eventos', EV, 'equipe', 'c3'), {
        ...conviteValido,
        papel: 'root',
      })
    );
  });

  it('delete: convite pode (writer/gestor); membro ATIVO nunca pelo cliente', async () => {
    await assertSucceeds(
      setDoc(doc(ctxMarina(), 'eventos', EV, 'equipe', 'convite-del'), conviteValido)
    );
    await assertSucceeds(
      deleteDoc(doc(ctxMarina(), 'eventos', EV, 'equipe', 'convite-del'))
    );
    await assertFails(
      deleteDoc(doc(ctxMarina(), 'eventos', EV, 'equipe', UID_POR_PAPEL.operador))
    );
    await assertFails(
      deleteDoc(
        doc(ctxPapel('organizador'), 'eventos', EV, 'equipe', UID_POR_PAPEL.operador)
      )
    );
  });

  it('leitura de equipe: writer lê; anônimo não', async () => {
    await assertSucceeds(
      getDoc(doc(ctxMarina(), 'eventos', EV, 'equipe', UID_POR_PAPEL.operador))
    );
    await assertFails(
      getDoc(
        doc(
          testEnv.unauthenticatedContext().firestore(),
          'eventos',
          EV,
          'equipe',
          UID_POR_PAPEL.operador
        )
      )
    );
  });
});
