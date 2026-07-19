/**
 * checkoutModelo.integration.test.ts — LEELA-CKMOD (lote CHECKOUT-MODELO)
 *
 * Integração no Firestore Emulator de TESTE (lane CKMOD = 8480 via
 * emulators:exec + firebase.r6.json; honra LEELA_FS_EMU_PORT; NUNCA :8180
 * do preview):
 *
 *   1. Checkout CKMOD completo — endereço persistido no PEDIDO (CEP
 *      canônico), aceites carimbados PELO SERVIDOR (termos = versão vigente
 *      da politicaVendas lida in-tx; saúde = TERMO_SAUDE_VERSAO_VIGENTE),
 *      telefone do responsável no pedido E no [reg] do inscrito-responsável,
 *      nascimento por atleta no [reg] parcial — TUDO provado pelos parses
 *      fail-fast do core (contrato provado, não assumido).
 *   2. Sem doc de política ⇒ aceite carimba versão 1 (defaults legais).
 *   3. COMPAT (UI antiga): input sem os campos novos ⇒ docs idênticos ao
 *      vigente (sem endereco/aceites/dadosPessoais) — schema evolution.
 *   4. ATAQUES: aceite parcial, CEP torto, nascimento futuro/inválido,
 *      telefone torto ⇒ invalid-argument e NADA escrito (fail-closed).
 *   5. versionarPoliticaVendasCore — bump só em mudança MATERIAL (baseline
 *      de doc novo = defaults legais), idempotente por hash, no-op em doc
 *      inválido e em edição não-material.
 */

import { initializeTestEnvironment, type RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import * as admin from 'firebase-admin';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import {
  parseInscrito,
  parsePedido,
  politicaVendasPadrao,
  TERMO_SAUDE_VERSAO_VIGENTE,
} from '@leela/core';
import {
  createInscricaoChargeCore,
  type CreateInscricaoChargeInput,
} from '../checkout/createInscricaoCharge';
import {
  hashPoliticaPadrao,
  hashPoliticaVendas,
  versionarPoliticaVendasCore,
} from '../eventos/versionarPoliticaVendas';
import { MockPaymentProvider } from '../payments/mockProvider';

const PROJECT_ID = 'demo-leela-ckmod';

const TENANT_ID = 'castelo-producoes';
const EVENTO_ID = 'meia-floripa-2026';
const EVENTO_SEM_POLITICA_ID = 'trail-serra-2026';
const ANA_UID = 'uid-ana-atleta';

let testEnv: RulesTestEnvironment;
let db: admin.firestore.Firestore;

const provider = new MockPaymentProvider();

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: { host: 'localhost', port: Number(process.env['LEELA_FS_EMU_PORT'] ?? 8080) },
  });
  await testEnv.clearFirestore();
  if (!admin.apps.length) {
    process.env['FIRESTORE_EMULATOR_HOST'] = `localhost:${process.env['LEELA_FS_EMU_PORT'] ?? '8080'}`;
    admin.initializeApp({ projectId: PROJECT_ID });
  }
  db = admin.firestore();
  await seedBase();
}, 30_000);

afterAll(async () => {
  await testEnv?.cleanup();
});

const DIA_MS = 24 * 60 * 60 * 1000;
const tsRel = (deltaDias: number): Timestamp =>
  Timestamp.fromDate(new Date(Date.now() + deltaDias * DIA_MS));

async function seedBase(): Promise<void> {
  const now = FieldValue.serverTimestamp();
  const batch = db.batch();

  batch.set(db.collection('tenants').doc(TENANT_ID), {
    id: TENANT_ID, nome: 'Castelo Produções', slug: TENANT_ID,
    status: 'ativo', ownerUid: 'uid-marina-castelo', tipo: 'produtor',
    criadoEm: now, atualizadoEm: now,
  });
  batch.set(db.doc(`tenants/${TENANT_ID}/commercialTerms/current`), {
    platformFeePct: 10.5,
    installmentRules: { maxParcelas: 12, jurosAoMes: 0, parcelaMinima: 20 },
    anticipation: { disponivel: false },
    communityMonthlyEnabled: false,
    saasMonthlyFee: 0,
    versao: 1, atualizadoPor: 'seed', atualizadoEm: now,
  });

  for (const eventoId of [EVENTO_ID, EVENTO_SEM_POLITICA_ID]) {
    const eventoRef = db.collection('eventos').doc(eventoId);
    batch.set(eventoRef, {
      id: eventoId, tenantId: TENANT_ID, organizadorId: 'uid-marina-castelo',
      nome: `Prova ${eventoId}`,
      data: tsRel(45), local: 'Florianópolis/SC',
      modalidades: ['10k'],
      slug: eventoId, status: 'publicado', usaChip: true,
      qtdInscritos: 0, receitaConfirmada: 0,
      criadoEm: now, atualizadoEm: now,
    });
    batch.set(eventoRef.collection('lotes').doc('10k-l2'), {
      id: '10k-l2', tenantId: TENANT_ID, modalidade: '10k', ordem: 2,
      nome: 'Lote 2', inicioEm: tsRel(-1), fimEm: tsRel(30),
      quantidadeLimite: 100, preco: 189.9, vendidos: 40,
      criadoEm: now, atualizadoEm: now,
    });
  }

  // Política do EVENTO_ID com versão VIGENTE 3 (bump prévio simulado pelo
  // trigger — Admin SDK, como em produção). O aceite deve carimbar 3.
  batch.set(
    db.collection('eventos').doc(EVENTO_ID).collection('politicaVendas').doc('config'),
    {
      id: 'config', tenantId: TENANT_ID,
      ...politicaVendasPadrao(),
      versao: 3, politicaTextoHash: 'hash-seed', versaoAtualizadaEm: now,
      atualizadoEm: now,
    }
  );

  await batch.commit();
}

function inputCkmod(
  eventoId: string,
  key: string,
  extra: Partial<CreateInscricaoChargeInput> = {}
): CreateInscricaoChargeInput {
  return {
    eventoId,
    inscritos: [
      {
        nome: 'Ana Atleta',
        email: 'ana@exemplo.com.br',
        cpf: '529.982.247-25',
        modalidade: '10k',
        nascimento: '1990-05-17',
      },
      {
        nome: 'Bruno Convidado',
        email: 'bruno@exemplo.com.br',
        cpf: '168.995.350-09',
        modalidade: '10k',
        nascimento: '1985-11-02',
      },
    ],
    responsavelIndex: 0,
    responsavel: {
      nome: 'Ana Atleta',
      email: 'ana@exemplo.com.br',
      telefone: '(48) 99999-0001',
    },
    endereco: {
      cep: '88015-600',
      logradouro: 'Rua Bocaiúva',
      bairro: 'Centro',
      cidade: 'Florianópolis',
      uf: 'SC',
      numero: '2468',
      complemento: 'ap 301',
    },
    aceites: { termos: true, saude: true },
    forma: 'pix',
    parcelas: 1,
    idempotencyKey: key,
    ...extra,
  };
}

describe('CKMOD — persistência do modelo novo no fluxo do checkout', () => {
  it('endereço/aceites/telefone no pedido + [reg] parcial nos inscritos — parses do core provam', async () => {
    const r = await createInscricaoChargeCore(
      db, provider, inputCkmod(EVENTO_ID, 'ckmod-full-0001'), { uid: ANA_UID }
    );

    const pedidoSnap = await db.collection('pedidos').doc(r.pedidoId).get();
    const pedido = parsePedido(pedidoSnap.id, pedidoSnap.data() ?? {});

    // Endereço: persistido no PEDIDO com CEP CANÔNICO (8 dígitos)
    expect(pedido.endereco?.cep).toBe('88015600');
    expect(pedido.endereco?.uf).toBe('SC');
    expect(pedido.endereco?.complemento).toBe('ap 301');

    // Telefone do responsável: canal de contato do pedido (canônico — F-3)
    expect(pedido.responsavel.telefone).toBe('48999990001');

    // Aceites: versão dos TERMOS = vigente da política (3, lida in-tx);
    // saúde = constante vigente do produto; carimbo de servidor presente.
    // F-1: a prova carrega o HASH do material lido NA MESMA tx (o seed usa
    // o material padrão) — autossuficiente na janela do trigger.
    expect(pedido.aceites?.termos.versao).toBe(3);
    expect(pedido.aceites?.termos.materialHash).toBe(
      hashPoliticaVendas(politicaVendasPadrao())
    );
    expect(pedido.aceites?.saude.versao).toBe(TERMO_SAUDE_VERSAO_VIGENTE);
    expect(pedido.aceites?.termos.aceiteEm).toBeTruthy();

    // [reg] parcial POR INSCRITO: cpf+nascimento; telefone SÓ no responsável.
    // F-3: PII persistida CANÔNICA (só dígitos — máscara é da UI).
    const [respId, convidadoId] = r.inscritoIds;
    const respSnap = await db
      .doc(`eventos/${EVENTO_ID}/inscritos/${respId}`).get();
    const resp = parseInscrito(respSnap.id, respSnap.data() ?? {});
    expect(resp.dadosPessoais?.cpf).toBe('52998224725');
    expect(resp.dadosPessoais?.nascimento).toBe('1990-05-17');
    expect(resp.dadosPessoais?.telefone).toBe('48999990001');
    expect(resp.dadosPessoais?.genero).toBe('nao_informado'); // Postel

    const convSnap = await db
      .doc(`eventos/${EVENTO_ID}/inscritos/${convidadoId}`).get();
    const conv = parseInscrito(convSnap.id, convSnap.data() ?? {});
    expect(conv.dadosPessoais?.nascimento).toBe('1985-11-02');
    expect(conv.dadosPessoais?.telefone).toBe(''); // telefone é do responsável

    // Minimização LGPD: endereço NUNCA vaza para os inscritos
    expect(respSnap.get('endereco')).toBeUndefined();
    expect(convSnap.get('endereco')).toBeUndefined();
  });

  it('sem doc de política ⇒ aceite dos termos carimba versão 1 (defaults CDC)', async () => {
    const r = await createInscricaoChargeCore(
      db, provider, inputCkmod(EVENTO_SEM_POLITICA_ID, 'ckmod-semdoc-01'), { uid: ANA_UID }
    );
    const pedido = parsePedido(
      r.pedidoId,
      (await db.collection('pedidos').doc(r.pedidoId).get()).data() ?? {}
    );
    expect(pedido.aceites?.termos.versao).toBe(1);
    // F-1: sem doc, o material aceito são os defaults legais — hash coerente
    // com o que o leitor público renderiza no modal.
    expect(pedido.aceites?.termos.materialHash).toBe(hashPoliticaPadrao());
  });

  it('F-4b: replay trazendo aceites sobre pedido SEM o bloco COMPLETA a prova (e nunca a reescreve)', async () => {
    const key = 'ckmod-f4b-0001';
    // Tentativa 1: UI antiga (sem aceites) cria o pedido
    const semAceites = inputCkmod(EVENTO_ID, key);
    delete semAceites.aceites;
    await createInscricaoChargeCore(db, provider, semAceites, { uid: ANA_UID });
    const pedidoRef = db.collection('pedidos').doc(`ped-${ANA_UID}-${key}`);
    expect((await pedidoRef.get()).get('aceites')).toBeUndefined();

    // Retry (mesma chave) COM aceites: prova é completada com o vigente
    await createInscricaoChargeCore(db, provider, inputCkmod(EVENTO_ID, key), {
      uid: ANA_UID,
    });
    const completado = parsePedido(
      `ped-${ANA_UID}-${key}`,
      (await pedidoRef.get()).data() ?? {}
    );
    expect(completado.aceites?.termos.versao).toBe(3);
    expect(completado.aceites?.termos.materialHash).toBe(
      hashPoliticaVendas(politicaVendasPadrao())
    );
    const carimbo1 = completado.aceites?.termos.aceiteEm;

    // 3ª chamada com aceites: prova EXISTENTE fica intocada
    await createInscricaoChargeCore(db, provider, inputCkmod(EVENTO_ID, key), {
      uid: ANA_UID,
    });
    const depois = parsePedido(
      `ped-${ANA_UID}-${key}`,
      (await pedidoRef.get()).data() ?? {}
    );
    expect(depois.aceites?.termos.aceiteEm).toEqual(carimbo1);
  });

  it('REPLAY (mesma chave) preserva endereco/aceites — nada recomputado', async () => {
    const key = 'ckmod-replay-01';
    await createInscricaoChargeCore(db, provider, inputCkmod(EVENTO_ID, key), { uid: ANA_UID });
    // Bump da política ENTRE a criação e o replay — o aceite NÃO muda
    // (prova congelada no doc; replay nunca reescreve).
    await db
      .doc(`eventos/${EVENTO_ID}/politicaVendas/config`)
      .update({ versao: 9 });
    const r2 = await createInscricaoChargeCore(
      db, provider, inputCkmod(EVENTO_ID, key), { uid: ANA_UID }
    );
    const pedido = parsePedido(
      r2.pedidoId,
      (await db.collection('pedidos').doc(r2.pedidoId).get()).data() ?? {}
    );
    expect(pedido.aceites?.termos.versao).toBe(3);
    await db.doc(`eventos/${EVENTO_ID}/politicaVendas/config`).update({ versao: 3 });
  });

  it('COMPAT: input da UI antiga (sem campos novos) ⇒ docs sem endereco/aceites/[reg]', async () => {
    const input = inputCkmod(EVENTO_ID, 'ckmod-compat-01');
    delete input.endereco;
    delete input.aceites;
    input.responsavel = { nome: 'Ana Atleta', email: 'ana@exemplo.com.br' };
    input.inscritos = input.inscritos.map((i) => {
      const { nascimento: _n, ...resto } = i;
      return resto;
    });
    const r = await createInscricaoChargeCore(db, provider, input, { uid: ANA_UID });
    const pedidoSnap = await db.collection('pedidos').doc(r.pedidoId).get();
    expect(pedidoSnap.get('endereco')).toBeUndefined();
    expect(pedidoSnap.get('aceites')).toBeUndefined();
    expect(pedidoSnap.get('responsavel.telefone')).toBeUndefined();
    const inscritoSnap = await db
      .doc(`eventos/${EVENTO_ID}/inscritos/${r.inscritoIds[0]}`).get();
    expect(inscritoSnap.get('dadosPessoais')).toBeUndefined();
    // E os parses seguem aceitando (regressão de modelo)
    parsePedido(pedidoSnap.id, pedidoSnap.data() ?? {});
    parseInscrito(inscritoSnap.id, inscritoSnap.data() ?? {});
  });

  it('ATAQUES: aceite parcial/CEP torto/nascimento inválido ⇒ invalid-argument, NADA escrito', async () => {
    const casos: Array<Partial<CreateInscricaoChargeInput>> = [
      { aceites: { termos: true, saude: false } },
      { aceites: { termos: 'true', saude: true } as never },
      { endereco: { ...inputCkmod(EVENTO_ID, 'x').endereco!, cep: '123' } },
      { endereco: { ...inputCkmod(EVENTO_ID, 'x').endereco!, uf: 'XX' } },
      {
        responsavel: {
          nome: 'Ana Atleta', email: 'ana@exemplo.com.br', telefone: '12',
        },
      },
    ];
    for (const [i, extra] of casos.entries()) {
      const key = `ckmod-atq-000${i}`;
      await expect(
        createInscricaoChargeCore(db, provider, inputCkmod(EVENTO_ID, key, extra), {
          uid: ANA_UID,
        })
      ).rejects.toMatchObject({ code: 'invalid-argument' });
      const pedidoSnap = await db.collection('pedidos').doc(`ped-${ANA_UID}-${key}`).get();
      expect(pedidoSnap.exists).toBe(false); // fail-closed: nada criado
    }

    // nascimento futuro / formato errado
    const nascFuturo = inputCkmod(EVENTO_ID, 'ckmod-atq-nasc1');
    nascFuturo.inscritos[0]!.nascimento = '2099-01-01';
    await expect(
      createInscricaoChargeCore(db, provider, nascFuturo, { uid: ANA_UID })
    ).rejects.toMatchObject({ code: 'invalid-argument' });
    const nascTorto = inputCkmod(EVENTO_ID, 'ckmod-atq-nasc2');
    nascTorto.inscritos[0]!.nascimento = '17/05/1990';
    await expect(
      createInscricaoChargeCore(db, provider, nascTorto, { uid: ANA_UID })
    ).rejects.toMatchObject({ code: 'invalid-argument' });
  });
});

describe('CKMOD — versionarPoliticaVendasCore (bump material, idempotente)', () => {
  const EVT = 'evento-versao-politica';

  async function seedEventoComPolitica(
    politica: Record<string, unknown>
  ): Promise<void> {
    await db.collection('eventos').doc(EVT).set({
      id: EVT, tenantId: TENANT_ID, nome: 'Evento Versão', slug: EVT,
      status: 'publicado', qtdInscritos: 0,
      criadoEm: FieldValue.serverTimestamp(), atualizadoEm: FieldValue.serverTimestamp(),
    });
    await db.doc(`eventos/${EVT}/politicaVendas/config`).set({
      id: 'config', tenantId: TENANT_ID,
      atualizadoEm: FieldValue.serverTimestamp(),
      ...politica,
    });
  }

  it('doc criado IGUAL aos defaults ⇒ NÃO bumpa (carimba versão 1 explícita)', async () => {
    await seedEventoComPolitica({ ...politicaVendasPadrao() });
    const r = await versionarPoliticaVendasCore(db, EVT);
    expect(r).toEqual({ bumpado: false, versao: 1 });
    const snap = await db.doc(`eventos/${EVT}/politicaVendas/config`).get();
    expect(snap.get('versao')).toBe(1);
    expect(typeof snap.get('politicaTextoHash')).toBe('string');
  });

  it('edição MATERIAL ⇒ bump 1→2; reprocessar o MESMO conteúdo ⇒ no-op (hash)', async () => {
    const padrao = politicaVendasPadrao();
    await db.doc(`eventos/${EVT}/politicaVendas/config`).update({
      reembolso: { ...padrao.reembolso, corteHoras: 24 },
    });
    const r1 = await versionarPoliticaVendasCore(db, EVT);
    expect(r1).toEqual({ bumpado: true, versao: 2 });
    // Redelivery at-least-once do trigger: mesmo conteúdo, zero re-bump
    const r2 = await versionarPoliticaVendasCore(db, EVT);
    expect(r2).toEqual({ bumpado: false, versao: 2 });
  });

  it('edição NÃO-material (carimbo) ⇒ no-op; doc INVÁLIDO ⇒ no-op logado', async () => {
    await db.doc(`eventos/${EVT}/politicaVendas/config`).update({
      atualizadoEm: FieldValue.serverTimestamp(),
    });
    const r1 = await versionarPoliticaVendasCore(db, EVT);
    expect(r1).toEqual({ bumpado: false, versao: 2 });

    // Doc corrompido (Admin) — versão NUNCA nasce de política ilegível
    const padrao = politicaVendasPadrao();
    await db.doc(`eventos/${EVT}/politicaVendas/config`).update({
      reembolso: { ...padrao.reembolso, corteHoras: 'quarenta' },
    });
    const r2 = await versionarPoliticaVendasCore(db, EVT);
    expect(r2).toEqual({ bumpado: false, versao: 2 });
  });

  it('doc ausente ⇒ vigem os defaults (versão 1, nada a escrever)', async () => {
    const r = await versionarPoliticaVendasCore(db, 'evento-sem-politica-x');
    expect(r).toEqual({ bumpado: false, versao: 1 });
  });

  it('F-5: doc LEGADO custom sem hash — re-save idêntico NÃO bumpa (baseline = material do before)', async () => {
    const EVT_LEG = 'evento-politica-legada';
    const padrao = politicaVendasPadrao();
    const materialCustom = {
      ...padrao,
      reembolso: { ...padrao.reembolso, janelaArrependimentoDias: 14 },
    };
    // Doc pré-CKMOD: material custom publicado, SEM versao/hash
    await db.doc(`eventos/${EVT_LEG}/politicaVendas/config`).set({
      id: 'config', tenantId: TENANT_ID,
      atualizadoEm: FieldValue.serverTimestamp(),
      ...materialCustom,
    });
    // Re-save idêntico (trigger passa antesHash = hash do material anterior):
    // sem bump — o material publicado JÁ ERA a versão 1 vigente.
    const antesHash = hashPoliticaVendas(materialCustom);
    const r1 = await versionarPoliticaVendasCore(db, EVT_LEG, antesHash);
    expect(r1).toEqual({ bumpado: false, versao: 1 });
    const snap1 = await db.doc(`eventos/${EVT_LEG}/politicaVendas/config`).get();
    expect(snap1.get('versao')).toBe(1);
    expect(snap1.get('politicaTextoHash')).toBe(antesHash);

    // Mudança material REAL sobre o legado ⇒ bump 1→2
    await db.doc(`eventos/${EVT_LEG}/politicaVendas/config`).update({
      reembolso: { ...padrao.reembolso, janelaArrependimentoDias: 30 },
    });
    const r2 = await versionarPoliticaVendasCore(db, EVT_LEG, antesHash);
    expect(r2).toEqual({ bumpado: true, versao: 2 });
  });
});
