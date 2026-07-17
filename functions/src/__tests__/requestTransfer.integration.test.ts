/**
 * requestTransfer.integration.test.ts — LEELA-S904-T4 (RN-343/344/345 · ADR-011)
 * (⚠️ EXIGE Firestore Emulator 8080.)
 *
 * Transferência de titularidade / troca de ingresso contra o Emulator + Rules:
 *   - TITULARIDADE executa: novo nome + tamanhos RECOLETADOS +
 *     titularHistorico[] append-only + doc 'concluida' com a taxa da política;
 *     pagamento permanece na MESMA inscrição (ADR-011);
 *   - BLOQUEIOS RN-345/A5: kit entregue, chip vinculado, check-in, flag off,
 *     janela fechada; recoleta de tamanho OBRIGATÓRIA (chaves exatas);
 *   - REPLAY idempotente (retry não duplica trilha) + retransfer B→C encadeia;
 *   - INGRESSO só REGISTRA: diff pelo lote vigente do destino (ADR-012),
 *     downgrade trava em 0 (RN-344), inscrito INTOCADO;
 *   - GUARDS: athlete/promoter/cross-tenant; Rules — cliente não escreve
 *     `transferencias` nem forja `titularHistorico`; athlete não lê.
 *
 * Comando: npx firebase-tools@13 emulators:exec --only firestore --project demo-leela \
 *   "npx vitest run src/__tests__/requestTransfer.integration.test.ts"
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
import { parseInscrito, type AuthClaims, type TitularHistoricoEntry } from '@leela/core';
import {
  createInscricaoChargeCore,
  type CreateInscricaoChargeInput,
  type CreateInscricaoChargeResult,
} from '../checkout/createInscricaoCharge';
import { confirmarPagamentoSandboxCore } from '../checkout/confirmarPagamentoSandbox';
import {
  requestTransferCore,
  TRANSFERENCIAS_SUBCOL,
} from '../finance/requestTransfer';
import { MockPaymentProvider } from '../payments/mockProvider';
import type { EventoCaller } from '../eventos/criarEvento';

const PROJECT_ID = 'demo-leela-transfer';
const RULES_PATH = resolve(__dirname, '../../../firestore.rules');
const TENANT_ID = 'castelo-producoes';
const OUTRO_TENANT_ID = 'passo-certo';
const EVENTO_ID = 'meia-floripa-2026';
const ANA_UID = 'uid-ana-atleta';
const MARINA_UID = 'uid-marina';

const organizador: EventoCaller = {
  uid: MARINA_UID,
  claims: { role: 'tenant_owner', tenantId: TENANT_ID } as AuthClaims,
};

let testEnv: RulesTestEnvironment;
let db: admin.firestore.Firestore;
const provider = new MockPaymentProvider();

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
  batch.set(db.collection('tenants').doc(OUTRO_TENANT_ID), {
    id: OUTRO_TENANT_ID, nome: 'Passo Certo Eventos', slug: OUTRO_TENANT_ID,
    status: 'ativo', ownerUid: 'uid-passo-owner', tipo: 'promotor', criadoEm: now, atualizadoEm: now,
  });
  batch.set(db.doc(`tenants/${TENANT_ID}/commercialTerms/current`), {
    platformFeePct: 10.5,
    installmentRules: { maxParcelas: 12, jurosAoMes: 3.49, parcelaMinima: 20 },
    anticipation: { disponivel: false }, communityMonthlyEnabled: false, saasMonthlyFee: 0,
    versao: 1, atualizadoPor: 'seed', atualizadoEm: now,
  });
  const eventoRef = db.collection('eventos').doc(EVENTO_ID);
  batch.set(eventoRef, {
    id: EVENTO_ID, tenantId: TENANT_ID, organizadorId: MARINA_UID,
    nome: 'Meia Maratona Floripa 2026', data: tsRel(45), local: 'Florianópolis/SC',
    modalidades: ['5k', '10k', '21k'], slug: EVENTO_ID, status: 'publicado', usaChip: true,
    qtdInscritos: 0, receitaConfirmada: 0, criadoEm: now, atualizadoEm: now,
  });
  batch.set(eventoRef.collection('lotes').doc('10k-l2'), {
    id: '10k-l2', tenantId: TENANT_ID, modalidade: '10k', ordem: 2, nome: 'Lote 2',
    inicioEm: tsRel(-1), fimEm: tsRel(30), quantidadeLimite: 100, preco: 189.9, vendidos: 40,
    criadoEm: now, atualizadoEm: now,
  });
  batch.set(eventoRef.collection('lotes').doc('21k-l1'), {
    id: '21k-l1', tenantId: TENANT_ID, modalidade: '21k', ordem: 1, nome: 'Lote 1',
    inicioEm: tsRel(-1), fimEm: tsRel(30), quantidadeLimite: 100, preco: 249.9, vendidos: 10,
    criadoEm: now, atualizadoEm: now,
  });
  batch.set(eventoRef.collection('lotes').doc('5k-l1'), {
    id: '5k-l1', tenantId: TENANT_ID, modalidade: '5k', ordem: 1, nome: 'Lote 1',
    inicioEm: tsRel(-1), fimEm: tsRel(30), quantidadeLimite: 100, preco: 99.9, vendidos: 5,
    criadoEm: now, atualizadoEm: now,
  });
  // Política S305: transferência LIGADA (72h, taxa R$25) + troca LIGADA (48h)
  batch.set(eventoRef.collection('politicaVendas').doc('config'), {
    id: 'config', tenantId: TENANT_ID,
    reembolso: { janelaArrependimentoDias: 7, corteHoras: 48, slaAnaliseDias: 3 },
    transferencia: { habilitada: true, janelaHoras: 72, taxa: 25 },
    trocaIngresso: { habilitada: true, janelaHoras: 48, permiteReembolsoDowngrade: false },
    atualizadoEm: now,
  });
  await batch.commit();
}

async function criarPedidoPago(key: string, n: number): Promise<CreateInscricaoChargeResult> {
  const input: CreateInscricaoChargeInput = {
    eventoId: EVENTO_ID,
    inscritos: Array.from({ length: n }, (_, i) => ({
      nome: `Atleta ${key} ${i + 1}`,
      email: `a${i + 1}.${key}@exemplo.com`,
      cpf: '529.982.247-25',
      modalidade: '10k',
    })),
    responsavelIndex: 0,
    responsavel: { nome: 'Ana Souza', email: 'ana@exemplo.com' },
    forma: 'pix',
    parcelas: 1,
    idempotencyKey: key,
  };
  const charge = await createInscricaoChargeCore(db, provider, input, { uid: ANA_UID });
  await confirmarPagamentoSandboxCore(db, provider, { pedidoId: charge.pedidoId }, { uid: ANA_UID });
  return charge;
}

const inscritoRefDe = (inscritoId: string) =>
  db.doc(`eventos/${EVENTO_ID}/inscritos/${inscritoId}`);
const transferenciaRefDe = (id: string) =>
  db.doc(`eventos/${EVENTO_ID}/${TRANSFERENCIAS_SUBCOL}/${id}`);

/** Simula kit com item tamanhado (RN-223) — Admin SDK, campo de Function. */
async function marcarTamanhos(inscritoId: string): Promise<void> {
  await inscritoRefDe(inscritoId).update({ tamanhos: { 'camiseta-tecnica': 'M' } });
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
// Titularidade — executa com recoleta + trilha (RN-343/345)
// ─────────────────────────────────────────────────────────────────────────────

describe('titularidade — caminho feliz + trilha + idempotência', () => {
  let pedidoId = '';
  let alvo = '';
  let intacto = '';
  let nomeOriginal = '';

  beforeAll(async () => {
    const charge = await criarPedidoPago('transfer-ok-0001', 2);
    pedidoId = charge.pedidoId;
    alvo = charge.inscritoIds[0]!;
    intacto = charge.inscritoIds[1]!;
    await marcarTamanhos(alvo);
    nomeOriginal = (await inscritoRefDe(alvo).get()).get('atletaNome') as string;
  }, 60_000);

  it('recoleta OBRIGATÓRIA: sem tamanhos ⇒ invalid-argument; chave errada ⇒ idem', async () => {
    await expect(
      requestTransferCore(db, {
        pedidoId, inscritoId: alvo, tipo: 'titularidade',
        novoTitular: { nome: 'Bruno Silva' },
      }, organizador)
    ).rejects.toMatchObject({ code: 'invalid-argument' });
    await expect(
      requestTransferCore(db, {
        pedidoId, inscritoId: alvo, tipo: 'titularidade',
        novoTitular: { nome: 'Bruno Silva', tamanhos: { bermuda: 'G' } },
      }, organizador)
    ).rejects.toMatchObject({ code: 'invalid-argument' });
    // Nada mudou
    expect((await inscritoRefDe(alvo).get()).get('atletaNome')).toBe(nomeOriginal);
  });

  it('executa: novo nome + tamanho recoletado + trilha + doc concluída (taxa 25)', async () => {
    const r = await requestTransferCore(db, {
      pedidoId, inscritoId: alvo, tipo: 'titularidade',
      novoTitular: { nome: 'Bruno Silva', tamanhos: { 'camiseta-tecnica': 'G' } },
    }, organizador);

    expect(r.estado).toBe('concluida');
    expect(r.replay).toBe(false);
    expect(r.diffCobrada).toBe(25); // taxa da política (RN-343)
    expect(r.transferenciaId).toBe(`${alvo}-t1`);

    const inscrito = await inscritoRefDe(alvo).get();
    expect(inscrito.get('atletaNome')).toBe('Bruno Silva');
    expect(inscrito.get('tamanhos')).toEqual({ 'camiseta-tecnica': 'G' });
    const trilha = inscrito.get('titularHistorico') as TitularHistoricoEntry[];
    expect(trilha).toHaveLength(1);
    expect(trilha[0]!.nomeAnterior).toBe(nomeOriginal);
    expect(trilha[0]!.nomeNovo).toBe('Bruno Silva');
    expect(trilha[0]!.por).toBe(MARINA_UID);
    expect(trilha[0]!.transferenciaRef).toBe(`${alvo}-t1`);
    // O doc do inscrito continua PASSANDO no parse canônico
    expect(() => parseInscrito(inscrito.id, inscrito.data() as Record<string, unknown>)).not.toThrow();

    const transferencia = await transferenciaRefDe(`${alvo}-t1`).get();
    expect(transferencia.get('estado')).toBe('concluida');
    expect(transferencia.get('tipo')).toBe('titularidade');
    expect(transferencia.get('titularAnterior.nome')).toBe(nomeOriginal);
    expect(transferencia.get('diffCobrada')).toBe(25);

    // PAGAMENTO na MESMA inscrição (ADR-011): chip segue null; pedido intacto
    expect(inscrito.get('chipNumero')).toBeNull();
    expect(inscrito.get('pedidoRef')).toBe(pedidoId);
    expect((await db.doc(`pedidos/${pedidoId}`).get()).get('status')).toBe('pago');
  });

  it('REPLAY: repetir a MESMA transferência não duplica trilha nem doc', async () => {
    const r = await requestTransferCore(db, {
      pedidoId, inscritoId: alvo, tipo: 'titularidade',
      novoTitular: { nome: 'Bruno Silva', tamanhos: { 'camiseta-tecnica': 'G' } },
    }, organizador);
    expect(r.replay).toBe(true);
    expect(r.transferenciaId).toBe(`${alvo}-t1`);
    const trilha = (await inscritoRefDe(alvo).get()).get('titularHistorico') as unknown[];
    expect(trilha).toHaveLength(1);
  });

  it('retransfer B→C encadeia: trilha vira 2 entradas append-only (-t2)', async () => {
    const r = await requestTransferCore(db, {
      pedidoId, inscritoId: alvo, tipo: 'titularidade',
      novoTitular: { nome: 'Carla Souza', tamanhos: { 'camiseta-tecnica': 'P' } },
    }, organizador);
    expect(r.replay).toBe(false);
    expect(r.transferenciaId).toBe(`${alvo}-t2`);
    const inscrito = await inscritoRefDe(alvo).get();
    expect(inscrito.get('atletaNome')).toBe('Carla Souza');
    const trilha = inscrito.get('titularHistorico') as TitularHistoricoEntry[];
    expect(trilha.map((t) => `${t.nomeAnterior}>${t.nomeNovo}`)).toEqual([
      `${nomeOriginal}>Bruno Silva`,
      'Bruno Silva>Carla Souza',
    ]);
  });

  it('ISOLAMENTO ADR-011: o outro inscrito do pedido segue intocado', async () => {
    const snap = await inscritoRefDe(intacto).get();
    expect(snap.get('titularHistorico')).toBeUndefined();
    expect(snap.get('atletaNome')).toContain('Atleta transfer-ok-0001');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Bloqueios RN-345/A5 + política (RN-343)
// ─────────────────────────────────────────────────────────────────────────────

describe('titularidade — bloqueios', () => {
  it('kit entregue / chip vinculado / check-in ⇒ failed-precondition', async () => {
    const charge = await criarPedidoPago('transfer-blk-0001', 3);
    const [a, b, c] = charge.inscritoIds as [string, string, string];
    await inscritoRefDe(a).update({ kitEntregueEm: Timestamp.now() });
    await inscritoRefDe(b).update({ chipNumero: 'CHIP-777' });
    await inscritoRefDe(c).update({ checkinEm: Timestamp.now() });
    for (const inscritoId of [a, b, c]) {
      await expect(
        requestTransferCore(db, {
          pedidoId: charge.pedidoId, inscritoId, tipo: 'titularidade',
          novoTitular: { nome: 'Novo Titular' },
        }, organizador)
      ).rejects.toMatchObject({ code: 'failed-precondition' });
      // Nada registrado
      expect((await transferenciaRefDe(`${inscritoId}-t1`).get()).exists).toBe(false);
    }
  });

  it('flag desligada e janela fechada ⇒ failed-precondition (RN-343)', async () => {
    const charge = await criarPedidoPago('transfer-blk-0002', 1);
    const alvo = charge.inscritoIds[0]!;
    const politicaRef = db.doc(`eventos/${EVENTO_ID}/politicaVendas/config`);

    await politicaRef.update({ 'transferencia.habilitada': false });
    try {
      await expect(
        requestTransferCore(db, {
          pedidoId: charge.pedidoId, inscritoId: alvo, tipo: 'titularidade',
          novoTitular: { nome: 'Novo Titular' },
        }, organizador)
      ).rejects.toMatchObject({ code: 'failed-precondition' });
    } finally {
      await politicaRef.update({ 'transferencia.habilitada': true });
    }

    // Evento daqui a 48h < janela 72h ⇒ fechada (restaura no fim)
    await db.doc(`eventos/${EVENTO_ID}`).update({ data: tsRel(2) });
    try {
      await expect(
        requestTransferCore(db, {
          pedidoId: charge.pedidoId, inscritoId: alvo, tipo: 'titularidade',
          novoTitular: { nome: 'Novo Titular' },
        }, organizador)
      ).rejects.toMatchObject({ code: 'failed-precondition' });
    } finally {
      await db.doc(`eventos/${EVENTO_ID}`).update({ data: tsRel(45) });
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Troca de ingresso — só registro (RN-344 · ADR-012)
// ─────────────────────────────────────────────────────────────────────────────

describe('ingresso — registro com diff do lote vigente', () => {
  let pedidoId = '';
  let alvo = '';

  beforeAll(async () => {
    const charge = await criarPedidoPago('transfer-ing-0001', 1);
    pedidoId = charge.pedidoId;
    alvo = charge.inscritoIds[0]!;
  }, 60_000);

  it('upgrade 10k→21k: registra diff 60 (249,90−189,90) e NÃO toca o inscrito', async () => {
    const r = await requestTransferCore(db, {
      pedidoId, inscritoId: alvo, tipo: 'ingresso', novaModalidade: '21k',
    }, organizador);
    expect(r.estado).toBe('registrada');
    expect(r.diffCobrada).toBe(60);
    expect(r.transferenciaId).toBe(`${alvo}-ing-21k`);

    // DIRECTIVE: aplicação é do checkout — modalidade INTOCADA
    const inscrito = await inscritoRefDe(alvo).get();
    expect(inscrito.get('modalidade')).toBe('10k');
    expect(inscrito.get('titularHistorico')).toBeUndefined();

    // Replay idempotente
    const r2 = await requestTransferCore(db, {
      pedidoId, inscritoId: alvo, tipo: 'ingresso', novaModalidade: '21k',
    }, organizador);
    expect(r2.replay).toBe(true);
    expect(r2.diffCobrada).toBe(60);
  });

  it('downgrade 10k→5k sem flag: diff trava em 0 (RN-344)', async () => {
    const r = await requestTransferCore(db, {
      pedidoId, inscritoId: alvo, tipo: 'ingresso', novaModalidade: '5k',
    }, organizador);
    expect(r.estado).toBe('registrada');
    expect(r.diffCobrada).toBe(0);
  });

  it('modalidade inexistente / sem lote vigente ⇒ failed-precondition', async () => {
    await expect(
      requestTransferCore(db, {
        pedidoId, inscritoId: alvo, tipo: 'ingresso', novaModalidade: '42k',
      }, organizador)
    ).rejects.toMatchObject({ code: 'failed-precondition' });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Guards + ataques via Rules
// ─────────────────────────────────────────────────────────────────────────────

describe('guards e ataques', () => {
  let pedidoId = '';
  let alvo = '';

  beforeAll(async () => {
    const charge = await criarPedidoPago('transfer-guard-0001', 1);
    pedidoId = charge.pedidoId;
    alvo = charge.inscritoIds[0]!;
  }, 60_000);

  it('papel/tenant: athlete, promoter e owner de OUTRO tenant negados', async () => {
    const casos: EventoCaller[] = [
      { uid: ANA_UID, claims: { role: 'athlete' } as AuthClaims },
      { uid: 'uid-prom', claims: { role: 'promoter', tenantId: TENANT_ID } as AuthClaims },
      { uid: 'uid-passo-owner', claims: { role: 'tenant_owner', tenantId: OUTRO_TENANT_ID } as AuthClaims },
    ];
    for (const caller of casos) {
      await expect(
        requestTransferCore(db, {
          pedidoId, inscritoId: alvo, tipo: 'titularidade',
          novoTitular: { nome: 'Ataque Papel' },
        }, caller)
      ).rejects.toMatchObject({ code: 'permission-denied' });
    }
  });

  it('input malformado: tipo inválido, ids com "/", nome curto, sem modalidade', async () => {
    await expect(
      requestTransferCore(db, { pedidoId, inscritoId: alvo, tipo: 'clonagem' }, organizador)
    ).rejects.toMatchObject({ code: 'invalid-argument' });
    await expect(
      requestTransferCore(db, {
        pedidoId: 'pedidos/hack', inscritoId: alvo, tipo: 'titularidade',
        novoTitular: { nome: 'Nome Ok' },
      }, organizador)
    ).rejects.toMatchObject({ code: 'invalid-argument' });
    await expect(
      requestTransferCore(db, {
        pedidoId, inscritoId: alvo, tipo: 'titularidade', novoTitular: { nome: 'ab' },
      }, organizador)
    ).rejects.toMatchObject({ code: 'invalid-argument' });
    await expect(
      requestTransferCore(db, { pedidoId, inscritoId: alvo, tipo: 'ingresso' }, organizador)
    ).rejects.toMatchObject({ code: 'invalid-argument' });
  });

  it('Rules: cliente NÃO escreve transferencias nem forja titularHistorico', async () => {
    // Semeia uma transferência real p/ leitura
    await requestTransferCore(db, {
      pedidoId, inscritoId: alvo, tipo: 'titularidade',
      novoTitular: { nome: 'Titular Rules' },
    }, organizador);

    const ownerDb = dbAs(MARINA_UID, { role: 'tenant_owner', tenantId: TENANT_ID });
    const athleteDb = dbAs(ANA_UID, { role: 'athlete' });
    const caminho = ['eventos', EVENTO_ID, TRANSFERENCIAS_SUBCOL, `${alvo}-t1`] as const;

    // Escrita: negada para TODOS os clientes (owner incluso)
    await assertFails(setDoc(doc(ownerDb, ...caminho), { estado: 'concluida' }));
    await assertFails(updateDoc(doc(ownerDb, ...caminho), { diffCobrada: 0 }));
    await assertFails(deleteDoc(doc(ownerDb, ...caminho)));
    await assertFails(
      setDoc(doc(athleteDb, 'eventos', EVENTO_ID, TRANSFERENCIAS_SUBCOL, 'forjada'), {
        tipo: 'titularidade', estado: 'concluida',
      })
    );

    // H1 (review antagonista): burlar a máquina por escrita direta no
    // inscrito — renomear titular (pós-chip corromperia resultado, A5) ou
    // trocar modalidade (corromperia vendidos/capacidade) — NEGADO p/ owner.
    await assertFails(
      updateDoc(doc(ownerDb, 'eventos', EVENTO_ID, 'inscritos', alvo), {
        atletaNome: 'Titular Sem Guardas',
      })
    );
    await assertFails(
      updateDoc(doc(ownerDb, 'eventos', EVENTO_ID, 'inscritos', alvo), {
        modalidade: '21k',
      })
    );
    await assertFails(
      updateDoc(doc(ownerDb, 'eventos', EVENTO_ID, 'inscritos', alvo), {
        atletaId: 'uid-outra-conta',
      })
    );

    // Forjar titularHistorico por escrita direta no inscrito: NEGADO (owner)
    await assertFails(
      updateDoc(doc(ownerDb, 'eventos', EVENTO_ID, 'inscritos', alvo), {
        titularHistorico: [],
      })
    );
    await assertFails(
      updateDoc(doc(ownerDb, 'eventos', EVENTO_ID, 'inscritos', alvo), {
        titularHistorico: [{ nomeAnterior: 'X', nomeNovo: 'Y' }],
      })
    );

    // Leitura: gestão sim; athlete não
    await assertSucceeds(getDoc(doc(ownerDb, ...caminho)));
    await assertFails(getDoc(doc(athleteDb, ...caminho)));
  });
});
