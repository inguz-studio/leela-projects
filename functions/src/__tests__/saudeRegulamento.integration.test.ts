/**
 * saudeRegulamento.integration.test.ts — LEELA-S306-T1/T3 (RN-146/147/149 · LGPD Art. 11)
 * (⚠️ EXIGE Firestore Emulator 8080.)
 *
 * Saúde + regulamento×versionamento contra o Emulator + Rules REAIS:
 *   - RULES evento: cliente NÃO nasce/toca `regulamentoVersao`/
 *     `regulamentoAtualizadoEm`/`saudeExpurgadaEm`; `exigenciasSaude` só com
 *     shape EXATO {atestado,parq} booleans (lixo rejeitado);
 *   - RULES `saude`: leitura SÓ gestão restrita (owner/staff, organizador/
 *     administrador de evento, platform_admin) — operador/financeiro/
 *     promoter/athlete NEGADOS; escrita de cliente NEGADA para todos;
 *   - VERSIONAMENTO (núcleo): 1º texto ⇒ v1; mudança ⇒ v2; idêntico/apagar
 *     ⇒ no-op; corrida (texto do disco difere) ⇒ não escreve;
 *   - `precisaNovoAceite` (RN-149): aceite antigo < vigente ⇒ true; doc do
 *     inscrito antigo NUNCA reescrito;
 *   - EXPURGO (núcleo, relógio injetado): evento encerrado além da retenção
 *     ⇒ saude apagada + carimbo; recente/não-encerrado intactos; idempotente;
 *   - parse: saúde sem consentimento LANÇA (Art. 11).
 *
 * Comando: npx firebase-tools@13 emulators:exec --only firestore --project demo-leela \
 *   "npx vitest run src/__tests__/saudeRegulamento.integration.test.ts"
 */
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { deleteDoc, doc, getDoc, setDoc, updateDoc, type Firestore } from 'firebase/firestore';
import * as admin from 'firebase-admin';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import {
  exigenciasSaudePadrao,
  parseEvento,
  parseSaudeInscrito,
  precisaNovoAceite,
  RETENCAO_SAUDE_DIAS_POS_EVENTO,
  SAUDE_DOC_ID,
  SAUDE_SUBCOL,
} from '@leela/core';
import { versionarRegulamentoCore } from '../eventos/versionarRegulamento';
import { expurgarSaudeCore } from '../eventos/expurgarSaude';

const PROJECT_ID = 'demo-leela-saude';
const RULES_PATH = resolve(__dirname, '../../../firestore.rules');
const TENANT_ID = 'castelo-producoes';
const EVENTO_ID = 'meia-floripa-2026';
const MARINA_UID = 'uid-marina';

let testEnv: RulesTestEnvironment;
let db: admin.firestore.Firestore;

const DIA_MS = 24 * 60 * 60 * 1000;
const tsRel = (d: number): Timestamp =>
  Timestamp.fromDate(new Date(Date.now() + d * DIA_MS));

function dbAs(uid: string, claims: Record<string, unknown>): Firestore {
  return testEnv.authenticatedContext(uid, claims).firestore() as unknown as Firestore;
}

async function seed(): Promise<void> {
  const now = FieldValue.serverTimestamp();
  const batch = db.batch();
  batch.set(db.collection('tenants').doc(TENANT_ID), {
    id: TENANT_ID, nome: 'Castelo Produções', slug: TENANT_ID,
    status: 'ativo', ownerUid: MARINA_UID, tipo: 'produtor', criadoEm: now, atualizadoEm: now,
  });
  const eventoRef = db.collection('eventos').doc(EVENTO_ID);
  batch.set(eventoRef, {
    id: EVENTO_ID, tenantId: TENANT_ID, organizadorId: MARINA_UID,
    nome: 'Meia Maratona Floripa 2026', data: tsRel(45), local: 'Florianópolis/SC',
    modalidades: ['10k'], slug: EVENTO_ID, status: 'publicado', usaChip: false,
    qtdInscritos: 0, receitaConfirmada: 0, criadoEm: now, atualizadoEm: now,
  });
  batch.set(eventoRef.collection('inscritos').doc('insc-0001'), {
    id: 'insc-0001', tenantId: TENANT_ID, atletaId: 'uid-ana', atletaNome: 'Ana Souza',
    kit: 'sem_kit', chipNumero: null, status: 'confirmado', modalidade: '10k',
    criadoEm: now, atualizadoEm: now,
  });
  batch.set(
    eventoRef.collection('inscritos').doc('insc-0001').collection(SAUDE_SUBCOL).doc(SAUDE_DOC_ID),
    {
      id: SAUDE_DOC_ID, tenantId: TENANT_ID, eventoId: EVENTO_ID, inscritoId: 'insc-0001',
      parqRespostas: { q1: false, q2: false }, baseLegal: 'consentimento_destacado',
      consentimentoSaudeEm: Timestamp.now(), criadoEm: now,
    }
  );
  // Vínculos de EQUIPE vivos (papelEventoAtivo exige claim + doc `equipe`)
  for (const [uid, papel] of [
    ['uid-org-ev', 'organizador'],
    ['uid-adm-ev', 'administrador'],
    ['uid-op', 'operador'],
    ['uid-fin', 'financeiro'],
  ] as const) {
    batch.set(eventoRef.collection('equipe').doc(uid), {
      id: uid, tenantId: TENANT_ID, uid, papel, status: 'ativo',
      criadoEm: now, atualizadoEm: now,
    });
  }
  await batch.commit();
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
  db = admin.firestore();
  await testEnv.clearFirestore();
  await seed();
}, 60_000);

afterAll(async () => {
  await testEnv?.cleanup();
  await Promise.all(admin.apps.map((app) => app?.delete()));
});

// ─────────────────────────────────────────────────────────────────────────────
// Rules — evento: versão congelada p/ cliente; exigenciasSaude shape exato
// ─────────────────────────────────────────────────────────────────────────────

describe('Rules evento — campos S306 (RN-149/146)', () => {
  const ownerDb = () => dbAs(MARINA_UID, { role: 'tenant_owner', tenantId: TENANT_ID });
  const eventoDoc = (d: Firestore) => doc(d, 'eventos', EVENTO_ID);

  it('cliente NÃO toca regulamentoVersao/regulamentoAtualizadoEm/saudeExpurgadaEm', async () => {
    await assertFails(updateDoc(eventoDoc(ownerDb()), { regulamentoVersao: 99 }));
    await assertFails(updateDoc(eventoDoc(ownerDb()), { regulamentoAtualizadoEm: new Date() }));
    await assertFails(updateDoc(eventoDoc(ownerDb()), { saudeExpurgadaEm: new Date() }));
  });

  it('cliente NÃO cria evento já carimbado com versão (create nega)', async () => {
    await assertFails(
      setDoc(doc(ownerDb(), 'eventos', 'evento-forjado'), {
        id: 'evento-forjado', tenantId: TENANT_ID, organizadorId: MARINA_UID,
        nome: 'Forjado', data: new Date(Date.now() + 30 * DIA_MS), local: 'X',
        modalidades: ['10k'], slug: 'evento-forjado', status: 'rascunho',
        usaChip: false, qtdInscritos: 0, receitaConfirmada: 0,
        regulamentoVersao: 7,
        criadoEm: new Date(), atualizadoEm: new Date(),
      })
    );
  });

  it('exigenciasSaude: shape exato passa; lixo (string/chave extra/não-bool) nega', async () => {
    await assertSucceeds(
      updateDoc(eventoDoc(ownerDb()), { exigenciasSaude: { atestado: true, parq: false } })
    );
    await assertFails(updateDoc(eventoDoc(ownerDb()), { exigenciasSaude: 'sim' }));
    await assertFails(
      updateDoc(eventoDoc(ownerDb()), { exigenciasSaude: { atestado: true } })
    );
    await assertFails(
      updateDoc(eventoDoc(ownerDb()), {
        exigenciasSaude: { atestado: true, parq: false, tipoSanguineo: 'O+' },
      })
    );
    await assertFails(
      updateDoc(eventoDoc(ownerDb()), { exigenciasSaude: { atestado: 1, parq: false } })
    );
    // Regulamento (texto) segue editável pelo organizador (EVENTO-CAMPOS)
    await assertSucceeds(
      updateDoc(eventoDoc(ownerDb()), { regulamento: 'Regulamento v1 — texto.' })
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Rules — subcoleção saude (RN-147 · Art. 11)
// ─────────────────────────────────────────────────────────────────────────────

describe('Rules saude — acesso restrito (RN-147)', () => {
  const caminho = ['eventos', EVENTO_ID, 'inscritos', 'insc-0001', SAUDE_SUBCOL, SAUDE_DOC_ID] as const;

  it('LÊ: owner/staff, organizador/administrador de evento, platform_admin', async () => {
    await assertSucceeds(getDoc(doc(dbAs(MARINA_UID, { role: 'tenant_owner', tenantId: TENANT_ID }), ...caminho)));
    await assertSucceeds(getDoc(doc(dbAs('uid-staff', { role: 'tenant_staff', tenantId: TENANT_ID }), ...caminho)));
    await assertSucceeds(getDoc(doc(dbAs('uid-admin', { role: 'platform_admin' }), ...caminho)));
    await assertSucceeds(getDoc(doc(dbAs('uid-org-ev', { role: 'athlete', eventos: { [EVENTO_ID]: 'organizador' } }), ...caminho)));
    await assertSucceeds(getDoc(doc(dbAs('uid-adm-ev', { role: 'athlete', eventos: { [EVENTO_ID]: 'administrador' } }), ...caminho)));
  });

  it('NEGA leitura: athlete (o próprio), promoter, operador, financeiro', async () => {
    await assertFails(getDoc(doc(dbAs('uid-ana', { role: 'athlete' }), ...caminho)));
    await assertFails(getDoc(doc(dbAs('uid-prom', { role: 'promoter', tenantId: TENANT_ID }), ...caminho)));
    await assertFails(getDoc(doc(dbAs('uid-op', { role: 'athlete', eventos: { [EVENTO_ID]: 'operador' } }), ...caminho)));
    await assertFails(getDoc(doc(dbAs('uid-fin', { role: 'athlete', eventos: { [EVENTO_ID]: 'financeiro' } }), ...caminho)));
  });

  it('NEGA query collectionGroup("saude") de QUALQUER cliente (vazamento em massa)', async () => {
    // Gap #1 da review: a defesa é estrutural (nenhum match /{path=**}/saude
    // ⇒ deny-all global) — este teste a EXERCITA de verdade.
    const { collectionGroup, getDocs, query, where } = await import('firebase/firestore');
    for (const [uid, claims] of [
      ['uid-ana', { role: 'athlete' }],
      [MARINA_UID, { role: 'tenant_owner', tenantId: TENANT_ID }],
      ['uid-admin', { role: 'platform_admin' }],
    ] as const) {
      const fs = dbAs(uid, claims as Record<string, unknown>);
      await assertFails(
        getDocs(query(collectionGroup(fs, SAUDE_SUBCOL), where('eventoId', '==', EVENTO_ID)))
      );
    }
  });

  it('NEGA escrita de cliente para TODOS (owner incluso) — create/update/delete', async () => {
    const ownerDb = dbAs(MARINA_UID, { role: 'tenant_owner', tenantId: TENANT_ID });
    await assertFails(updateDoc(doc(ownerDb, ...caminho), { parqRespostas: { q1: true } }));
    await assertFails(deleteDoc(doc(ownerDb, ...caminho)));
    await assertFails(
      setDoc(
        doc(ownerDb, 'eventos', EVENTO_ID, 'inscritos', 'insc-0001', SAUDE_SUBCOL, 'forjado'),
        { atestadoUrl: 'https://x.dev/a.pdf' }
      )
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Versionamento (RN-149) — núcleo
// ─────────────────────────────────────────────────────────────────────────────

describe('versionarRegulamentoCore — bump monotônico (RN-149)', () => {
  const REG_ID = 'evento-regulamento';

  beforeAll(async () => {
    const now = FieldValue.serverTimestamp();
    await db.collection('eventos').doc(REG_ID).set({
      id: REG_ID, tenantId: TENANT_ID, organizadorId: MARINA_UID,
      nome: 'Prova Regulamento', data: tsRel(30), local: 'X', modalidades: ['10k'],
      slug: REG_ID, status: 'publicado', usaChip: false,
      qtdInscritos: 0, receitaConfirmada: 0, criadoEm: now, atualizadoEm: now,
    });
  });

  it('1º texto ⇒ v1; mudança ⇒ v2; idêntico ⇒ no-op; apagar ⇒ não bumpa', async () => {
    const ref = db.collection('eventos').doc(REG_ID);

    await ref.update({ regulamento: 'Texto v1' });
    const r1 = await versionarRegulamentoCore(db, REG_ID, undefined, 'Texto v1');
    expect(r1).toEqual({ bumpado: true, versao: 1 });
    expect((await ref.get()).get('regulamentoVersao')).toBe(1);
    expect((await ref.get()).get('regulamentoAtualizadoEm')).toBeTruthy();

    await ref.update({ regulamento: 'Texto v2' });
    const r2 = await versionarRegulamentoCore(db, REG_ID, 'Texto v1', 'Texto v2');
    expect(r2).toEqual({ bumpado: true, versao: 2 });

    // Reprocesso do MESMO par (retry do trigger) — texto idêntico, no-op
    const r3 = await versionarRegulamentoCore(db, REG_ID, 'Texto v2', 'Texto v2');
    expect(r3).toEqual({ bumpado: false, versao: 2 });

    // REVIEW F1 — REDELIVERY at-least-once do MESMO evento (antes≠depois):
    // reprocessar a transição 'Texto v1'→'Texto v2' NÃO re-bumpa (hash do
    // texto já versionado é a chave de idempotência).
    const rRedelivery = await versionarRegulamentoCore(db, REG_ID, 'Texto v1', 'Texto v2');
    expect(rRedelivery).toEqual({ bumpado: false, versao: 2 });
    expect((await ref.get()).get('regulamentoVersao')).toBe(2);

    // Apagar o texto não bumpa (remoção não é versão nova a aceitar)
    await ref.update({ regulamento: FieldValue.delete() });
    const r4 = await versionarRegulamentoCore(db, REG_ID, 'Texto v2', undefined);
    expect(r4).toEqual({ bumpado: false, versao: 2 });
  });

  it('corrida: texto do disco difere do visto pelo trigger ⇒ NÃO escreve', async () => {
    const ref = db.collection('eventos').doc(REG_ID);
    await ref.update({ regulamento: 'Texto v3 (mais novo)' });
    // Trigger atrasado ainda "vê" a transição p/ 'Texto v2-tarde'
    const r = await versionarRegulamentoCore(db, REG_ID, 'Texto v2', 'Texto v2-tarde');
    expect(r.bumpado).toBe(false);
    expect((await ref.get()).get('regulamentoVersao')).toBe(2); // intacta
  });

  it('precisaNovoAceite: aceite antigo < vigente ⇒ true; aceite vigente ⇒ false', () => {
    expect(precisaNovoAceite(1, 2)).toBe(true);
    expect(precisaNovoAceite(2, 2)).toBe(false);
    expect(precisaNovoAceite(undefined, 2)).toBe(true); // nunca aceitou
    expect(precisaNovoAceite(undefined, undefined)).toBe(false); // sem regulamento
    expect(precisaNovoAceite(1, 0)).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Expurgo (RN-147) — núcleo com relógio injetado
// ─────────────────────────────────────────────────────────────────────────────

describe('expurgarSaudeCore — retenção + expurgo (RN-147)', () => {
  const VELHO_ID = 'evento-velho-expurgo';
  const RECENTE_ID = 'evento-recente-retido';

  beforeAll(async () => {
    const now = FieldValue.serverTimestamp();
    const alem = tsRel(-(RETENCAO_SAUDE_DIAS_POS_EVENTO + 5)); // além da retenção
    const dentro = tsRel(-10); // encerrado, mas dentro da retenção
    const batch = db.batch();
    for (const [id, data, status] of [
      [VELHO_ID, alem, 'encerrado'],
      [RECENTE_ID, dentro, 'encerrado'],
    ] as const) {
      const ref = db.collection('eventos').doc(id);
      batch.set(ref, {
        id, tenantId: TENANT_ID, organizadorId: MARINA_UID, nome: id,
        data, local: 'X', modalidades: ['10k'], slug: id, status, usaChip: false,
        qtdInscritos: 2, receitaConfirmada: 0, criadoEm: now, atualizadoEm: now,
      });
      for (const insc of ['i1', 'i2']) {
        batch.set(ref.collection('inscritos').doc(insc), {
          id: insc, tenantId: TENANT_ID, atletaId: `uid-${insc}`, atletaNome: insc,
          kit: 'sem_kit', chipNumero: null, status: 'confirmado', modalidade: '10k',
          criadoEm: now, atualizadoEm: now,
        });
        batch.set(ref.collection('inscritos').doc(insc).collection(SAUDE_SUBCOL).doc(SAUDE_DOC_ID), {
          id: SAUDE_DOC_ID, tenantId: TENANT_ID, eventoId: id, inscritoId: insc,
          parqRespostas: { q1: true }, baseLegal: 'consentimento_destacado',
          consentimentoSaudeEm: Timestamp.now(), criadoEm: now,
        });
      }
    }
    await batch.commit();
  });

  it('apaga saúde do evento além da retenção, carimba, e preserva o recente', async () => {
    const r = await expurgarSaudeCore(db, new Date());
    expect(r.eventosExpurgados).toBe(1);
    expect(r.docsApagados).toBe(2);

    const velho = db.collection('eventos').doc(VELHO_ID);
    expect((await velho.get()).get('saudeExpurgadaEm')).toBeTruthy();
    for (const insc of ['i1', 'i2']) {
      const snap = await velho.collection('inscritos').doc(insc)
        .collection(SAUDE_SUBCOL).doc(SAUDE_DOC_ID).get();
      expect(snap.exists).toBe(false);
      // O doc OPERACIONAL do inscrito permanece (só o dado sensível expurga)
      expect((await velho.collection('inscritos').doc(insc).get()).exists).toBe(true);
    }
    // Evento dentro da retenção: intacto
    const recente = db.collection('eventos').doc(RECENTE_ID);
    expect((await recente.get()).get('saudeExpurgadaEm')).toBeUndefined();
    expect(
      (await recente.collection('inscritos').doc('i1')
        .collection(SAUDE_SUBCOL).doc(SAUDE_DOC_ID).get()).exists
    ).toBe(true);
  });

  it('IDEMPOTENTE: rodar de novo não expurga nada (carimbo pula o evento)', async () => {
    const r = await expurgarSaudeCore(db, new Date());
    expect(r.eventosExpurgados).toBe(0);
    expect(r.docsApagados).toBe(0);
  });

  it('REVIEW F2: saúde NOVA coletada após o expurgo (ciclo reaberto) é re-expurgada', async () => {
    // Simula um 2º ciclo: dado sensível novo aparece num evento JÁ carimbado
    const ref = db.collection('eventos').doc(VELHO_ID)
      .collection('inscritos').doc('i1').collection(SAUDE_SUBCOL).doc(SAUDE_DOC_ID);
    await ref.set({
      id: SAUDE_DOC_ID, tenantId: TENANT_ID, eventoId: VELHO_ID, inscritoId: 'i1',
      parqRespostas: { q1: true }, baseLegal: 'consentimento_destacado',
      consentimentoSaudeEm: Timestamp.now(), criadoEm: Timestamp.now(),
    });
    const r = await expurgarSaudeCore(db, new Date());
    expect(r.docsApagados).toBe(1); // NUNCA retenção eterna (LGPD Art. 11)
    expect((await ref.get()).exists).toBe(false);
  });

  it('evento publicado (não encerrado) além da data NÃO é varrido', async () => {
    // O evento canônico (publicado, data futura) nunca entra na query;
    // prova negativa: saude do insc-0001 segue viva após os expurgos acima.
    const snap = await db.doc(
      `eventos/${EVENTO_ID}/inscritos/insc-0001/${SAUDE_SUBCOL}/${SAUDE_DOC_ID}`
    ).get();
    expect(snap.exists).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Parse fail-fast (Art. 11) + defaults (RN-146)
// ─────────────────────────────────────────────────────────────────────────────

describe('parse — consentimento obrigatório + defaults', () => {
  it('saude sem consentimentoSaudeEm LANÇA (Art. 11)', () => {
    expect(() =>
      parseSaudeInscrito('current', {
        tenantId: TENANT_ID, eventoId: EVENTO_ID, inscritoId: 'insc-0001',
        parqRespostas: { q1: true },
      })
    ).toThrow(/consentimento/i);
  });

  it('exigenciasSaudePadrao = tudo OFF (RN-146); parseEvento descarta lixo', () => {
    expect(exigenciasSaudePadrao()).toEqual({ atestado: false, parq: false });
    const base = {
      tenantId: TENANT_ID, organizadorId: MARINA_UID, nome: 'X', data: tsRel(1),
      local: 'X', modalidades: ['10k'], slug: 'x', status: 'rascunho', usaChip: false,
      qtdInscritos: 0, receitaConfirmada: 0, criadoEm: tsRel(0), atualizadoEm: tsRel(0),
    };
    // lixo no campo NÃO liga coleta de dado sensível
    const comLixo = parseEvento('x', { ...base, exigenciasSaude: 'sim', regulamentoVersao: -3 });
    expect(comLixo.exigenciasSaude).toBeUndefined();
    expect(comLixo.regulamentoVersao).toBeUndefined();
    const valido = parseEvento('x', {
      ...base, exigenciasSaude: { atestado: true, parq: false }, regulamentoVersao: 2,
    });
    expect(valido.exigenciasSaude).toEqual({ atestado: true, parq: false });
    expect(valido.regulamentoVersao).toBe(2);
  });
});
