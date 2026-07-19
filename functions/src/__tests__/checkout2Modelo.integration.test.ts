/**
 * checkout2Modelo.integration.test.ts — LEELA-CK2 (lote CHECKOUT2-MODELO)
 *
 * Integração no Firestore Emulator de TESTE (lane CK2 = 8480 via
 * emulators:exec + firebase.r6.json; honra LEELA_FS_EMU_PORT; NUNCA :8180
 * do preview). Backend das decisões DEC-0719:
 *
 *   T1 · RN-173 — registry `pessoas` (CPF único global): criação, corrida
 *        concorrente do MESMO CPF (1 doc), pessoaRef nos inscritos,
 *        first-claim de conta + anti-hijack, replay idempotente.
 *   T2 · RN-154 — gênero no [reg] + prefill do PRÓPRIO (sem PII de terceiro).
 *   T3 · RN-155 — conta sem fricção (fail-closed sem chave Brevo).
 *   T4 · RN-156 — termo base sempre + termo custom aditivo com fence.
 *   T5 · RN-157 — PIX expira em 30 min + transição de expiração.
 */

import {
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import * as admin from 'firebase-admin';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { parseInscrito, parsePessoa } from '@leela/core';
import {
  createInscricaoChargeCore,
  type CreateInscricaoChargeInput,
} from '../checkout/createInscricaoCharge';
import { pessoaDocIdDoCpf } from '../checkout/pessoaRegistry';
import { MockPaymentProvider } from '../payments/mockProvider';

const PROJECT_ID = 'demo-leela-ck2';
const TENANT_ID = 'castelo-producoes';
const EVENTO_ID = 'meia-floripa-2026';
const ANA_UID = 'uid-ana-anon';

const CPF_ANA = '529.982.247-25'; // canônico 52998224725
const CPF_BRUNO = '168.995.350-09'; // canônico 16899535009

process.env['CRM_ID_PEPPER'] = 'pepper-teste-ck2-integ';

let testEnv: RulesTestEnvironment;
let db: admin.firestore.Firestore;
const provider = new MockPaymentProvider();

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: {
      host: 'localhost',
      port: Number(process.env['LEELA_FS_EMU_PORT'] ?? 8080),
    },
  });
  await testEnv.clearFirestore();
  if (!admin.apps.length) {
    process.env['FIRESTORE_EMULATOR_HOST'] =
      `localhost:${process.env['LEELA_FS_EMU_PORT'] ?? '8080'}`;
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
  const eventoRef = db.collection('eventos').doc(EVENTO_ID);
  batch.set(eventoRef, {
    id: EVENTO_ID, tenantId: TENANT_ID, organizadorId: 'uid-marina-castelo',
    nome: 'Meia de Floripa 2026',
    data: tsRel(45), local: 'Florianópolis/SC',
    modalidades: ['10k'],
    slug: EVENTO_ID, status: 'publicado', usaChip: true,
    qtdInscritos: 0, receitaConfirmada: 0,
    criadoEm: now, atualizadoEm: now,
  });
  batch.set(eventoRef.collection('lotes').doc('10k-l2'), {
    id: '10k-l2', tenantId: TENANT_ID, modalidade: '10k', ordem: 2,
    nome: 'Lote 2', inicioEm: tsRel(-1), fimEm: tsRel(30),
    quantidadeLimite: 500, preco: 189.9, vendidos: 40,
    criadoEm: now, atualizadoEm: now,
  });
  await batch.commit();
}

function inputCk2(
  key: string,
  extra: Partial<CreateInscricaoChargeInput> = {}
): CreateInscricaoChargeInput {
  return {
    eventoId: EVENTO_ID,
    inscritos: [
      {
        nome: 'Ana Atleta',
        email: 'ana@exemplo.com.br',
        cpf: CPF_ANA,
        modalidade: '10k',
        nascimento: '1990-05-17',
      },
      {
        nome: 'Bruno Convidado',
        email: 'bruno@exemplo.com.br',
        cpf: CPF_BRUNO,
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
    },
    aceites: { termos: true, saude: true },
    forma: 'pix',
    parcelas: 1,
    idempotencyKey: key,
    ...extra,
  };
}

// ---------------------------------------------------------------------------
// T1 — RN-173 · registry de pessoas (CPF único global)
// ---------------------------------------------------------------------------

describe('CK2-T1 — RN-173: registry global de pessoa por CPF', () => {
  it('checkout cria pessoa por CPF distinto + pessoaRef nos inscritos (parses do core provam)', async () => {
    const r = await createInscricaoChargeCore(
      db, provider, inputCk2('ck2-t1-base-01'), { uid: ANA_UID, ehAnonimo: true }
    );

    const idAna = pessoaDocIdDoCpf(CPF_ANA);
    const idBruno = pessoaDocIdDoCpf(CPF_BRUNO);
    expect(idAna).not.toBe(idBruno);

    const pessoaAna = parsePessoa(
      idAna, (await db.doc(`pessoas/${idAna}`).get()).data() ?? {}
    );
    expect(pessoaAna.cpf).toBe('52998224725'); // canônico, sem máscara
    expect(pessoaAna.contaUid).toBeNull(); // anônimo NUNCA reivindica
    expect(pessoaAna.dadosConhecidos?.nome).toBe('Ana Atleta');
    expect(pessoaAna.dadosConhecidos?.nascimento).toBe('1990-05-17');
    expect(pessoaAna.dadosConhecidos?.telefone).toBe('48999990001');
    expect(pessoaAna.dadosConhecidos?.endereco?.cep).toBe('88015600');

    const pessoaBruno = parsePessoa(
      idBruno, (await db.doc(`pessoas/${idBruno}`).get()).data() ?? {}
    );
    // PII do PAGADOR nunca vaza para a pessoa do convidado
    expect(pessoaBruno.dadosConhecidos?.telefone).toBe('');
    expect(pessoaBruno.dadosConhecidos?.endereco).toBeUndefined();

    // pessoaRef carimbado nos DOIS inscritos (parse do core valida o shape)
    const [respId, convId] = r.inscritoIds;
    const resp = parseInscrito(
      String(respId),
      (await db.doc(`eventos/${EVENTO_ID}/inscritos/${respId}`).get()).data() ?? {}
    );
    const conv = parseInscrito(
      String(convId),
      (await db.doc(`eventos/${EVENTO_ID}/inscritos/${convId}`).get()).data() ?? {}
    );
    expect(resp.pessoaRef).toBe(idAna);
    expect(conv.pessoaRef).toBe(idBruno);
  });

  it('CORRIDA: dois checkouts CONCORRENTES com o MESMO CPF ⇒ 1 pessoa, ambos linkados (nunca duplica)', async () => {
    const cpfCorrida = '111.444.777-35';
    const idPessoa = pessoaDocIdDoCpf(cpfCorrida);
    const fazerCheckout = (uid: string, key: string) =>
      createInscricaoChargeCore(
        db,
        provider,
        inputCk2(key, {
          inscritos: [{
            nome: `Titular ${uid}`,
            email: `${uid}@exemplo.com.br`,
            cpf: cpfCorrida,
            modalidade: '10k',
          }],
          responsavelIndex: 0,
          responsavel: { nome: `Titular ${uid}`, email: `${uid}@exemplo.com.br` },
        }),
        { uid, ehAnonimo: true }
      );

    const [r1, r2] = await Promise.all([
      fazerCheckout('uid-corrida-a', 'ck2-t1-race-0a'),
      fazerCheckout('uid-corrida-b', 'ck2-t1-race-0b'),
    ]);

    // Ambos os pedidos existem (a corrida nunca bloqueia dinheiro)
    expect(r1.pedidoId).not.toBe(r2.pedidoId);

    // UMA pessoa só — unicidade estrutural pela chave
    const snapPessoas = await db
      .collection('pessoas')
      .where('cpf', '==', '11144477735')
      .get();
    expect(snapPessoas.size).toBe(1);
    expect(snapPessoas.docs[0]?.id).toBe(idPessoa);

    // Os DOIS inscritos apontam o MESMO doc (colisão = mesma pessoa, linka)
    const i1 = (await db.doc(`eventos/${EVENTO_ID}/inscritos/${r1.inscritoIds[0]}`).get()).get('pessoaRef');
    const i2 = (await db.doc(`eventos/${EVENTO_ID}/inscritos/${r2.inscritoIds[0]}`).get()).get('pessoaRef');
    expect(i1).toBe(idPessoa);
    expect(i2).toBe(idPessoa);
  });

  it('REPLAY (mesma idempotencyKey) não retoca a pessoa (linking idempotente)', async () => {
    const key = 'ck2-t1-replay-01';
    await createInscricaoChargeCore(db, provider, inputCk2(key), {
      uid: ANA_UID, ehAnonimo: true,
    });
    const ref = db.doc(`pessoas/${pessoaDocIdDoCpf(CPF_ANA)}`);
    const antes = (await ref.get()).data();

    await createInscricaoChargeCore(db, provider, inputCk2(key), {
      uid: ANA_UID, ehAnonimo: true,
    });
    const depois = (await ref.get()).data();
    expect(depois).toEqual(antes); // byte-idêntico — replay não escreve
  });

  it('FIRST-CLAIM + ANTI-HIJACK: conta autenticada reivindica; terceiro nunca troca vínculo nem dados', async () => {
    const cpf = '390.533.447-05';
    const idPessoa = pessoaDocIdDoCpf(cpf);
    const inputDe = (nome: string, key: string, nascimento?: string) =>
      inputCk2(key, {
        inscritos: [{
          nome, email: 'dona@exemplo.com.br', cpf, modalidade: '10k',
          ...(nascimento !== undefined ? { nascimento } : {}),
        }],
        responsavelIndex: 0,
        responsavel: { nome, email: 'dona@exemplo.com.br', telefone: '(48) 98888-0001' },
      });

    // 1. Dona compra AUTENTICADA (não-anônima) → first-claim
    await createInscricaoChargeCore(db, provider, inputDe('Dona Original', 'ck2-t1-claim-01', '1991-01-01'), {
      uid: 'conta-dona', ehAnonimo: false,
    });
    let pessoa = parsePessoa(idPessoa, (await db.doc(`pessoas/${idPessoa}`).get()).data() ?? {});
    expect(pessoa.contaUid).toBe('conta-dona');
    expect(pessoa.dadosConhecidos?.nome).toBe('Dona Original');

    // 2. ATACANTE autenticado compra com o CPF da dona → NADA muda no vínculo
    //    nem nos dados conhecidos (anti-hijack)
    await createInscricaoChargeCore(db, provider, inputDe('Atacante Forjado', 'ck2-t1-claim-02', '1970-12-31'), {
      uid: 'conta-atacante', ehAnonimo: false,
    });
    pessoa = parsePessoa(idPessoa, (await db.doc(`pessoas/${idPessoa}`).get()).data() ?? {});
    expect(pessoa.contaUid).toBe('conta-dona'); // vínculo intocado
    expect(pessoa.dadosConhecidos?.nome).toBe('Dona Original'); // dados intocados
    expect(pessoa.dadosConhecidos?.nascimento).toBe('1991-01-01');

    // 3. A PRÓPRIA dona compra de novo → dados atualizam (correção vence)
    await createInscricaoChargeCore(db, provider, inputDe('Dona Corrigida', 'ck2-t1-claim-03'), {
      uid: 'conta-dona', ehAnonimo: false,
    });
    pessoa = parsePessoa(idPessoa, (await db.doc(`pessoas/${idPessoa}`).get()).data() ?? {});
    expect(pessoa.dadosConhecidos?.nome).toBe('Dona Corrigida');
    // Campo não coletado no novo checkout PRESERVA o conhecido (merge Postel)
    expect(pessoa.dadosConhecidos?.nascimento).toBe('1991-01-01');
  });

  it('compra anônima sobre pessoa NÃO reivindicada atualiza dados sem criar vínculo', async () => {
    const cpf = '963.074.185-75';
    const idPessoa = pessoaDocIdDoCpf(cpf);
    const inputDe = (key: string, nome: string) =>
      inputCk2(key, {
        inscritos: [{ nome, email: 'x@exemplo.com.br', cpf, modalidade: '10k' }],
        responsavelIndex: 0,
        responsavel: { nome, email: 'x@exemplo.com.br' },
      });
    await createInscricaoChargeCore(db, provider, inputDe('ck2-anon-1', 'Primeiro Nome'), {
      uid: 'anon-x1', ehAnonimo: true,
    });
    await createInscricaoChargeCore(db, provider, inputDe('ck2-anon-2', 'Nome Atualizado'), {
      uid: 'anon-x2', ehAnonimo: true,
    });
    const pessoa = parsePessoa(idPessoa, (await db.doc(`pessoas/${idPessoa}`).get()).data() ?? {});
    expect(pessoa.contaUid).toBeNull();
    expect(pessoa.dadosConhecidos?.nome).toBe('Nome Atualizado');
  });
});
