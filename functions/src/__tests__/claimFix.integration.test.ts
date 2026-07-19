/**
 * claimFix.integration.test.ts — lote CLAIM-FIX (RN-174 · DEC-0719-ret)
 *
 * Integração no Firestore+Auth Emulator de TESTE (lane = 8480/9598 via
 * emulators:exec + firebase.r6.json; honra LEELA_FS_EMU_PORT/
 * LEELA_AUTH_EMU_PORT; NUNCA 8180/9198 do preview).
 *
 * Prova a RN-174 (fecha o F1 do report CHECKOUT2-MODELO e mitiga o F2):
 * claim da ficha de pessoa SÓ na CONFIRMAÇÃO de pagamento (escritor único,
 * com carimbo `contaEmail` da compra) e leitura de prefill SÓ com e-mail do
 * token VERIFICADO + IGUAL ao da compra. Testes NEGATIVOS obrigatórios do
 * brief:
 *   1. "não reivindico CPF que não é meu" (criação nunca vincula);
 *   2. ordem "vítima anônima primeiro → atacante autenticado" AGORA NEGA;
 *   3. "e-mail do responsável ≠ caller" (claim segue o e-mail da compra);
 *   4. replay de webhook não re-clama; pagamento posterior de outro e-mail
 *      com o MESMO CPF não rouba o vínculo (first-claim);
 *   5. corrida claim×webhook (confirmadores concorrentes) e claim×checkout.
 */

import {
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import * as admin from 'firebase-admin';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { parsePessoa } from '@leela/core';
import {
  createInscricaoChargeCore,
  type CreateInscricaoChargeInput,
} from '../checkout/createInscricaoCharge';
import { pessoaDocIdDoCpf } from '../checkout/pessoaRegistry';
import { getCheckoutPrefillCore } from '../checkout/prefillCheckout';
import {
  contaSemFriccaoAuthAdmin,
  garantirContaSemFriccao,
} from '../checkout/contaSemFriccao';
import { confirmarPagamentoSandboxCore } from '../checkout/confirmarPagamentoSandbox';
import { MockPaymentProvider } from '../payments/mockProvider';

const PROJECT_ID = 'demo-leela-claimfix';

process.env['FIREBASE_AUTH_EMULATOR_HOST'] =
  `localhost:${process.env['LEELA_AUTH_EMU_PORT'] ?? '9099'}`;
process.env['CRM_ID_PEPPER'] = 'pepper-teste-claimfix';

const TENANT_ID = 'castelo-producoes';
const EVENTO_ID = 'meia-claimfix-2026';

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
    nome: 'Meia do Claim-Fix 2026',
    data: tsRel(45), local: 'Florianópolis/SC',
    modalidades: ['10k'],
    slug: EVENTO_ID, status: 'publicado', usaChip: true,
    qtdInscritos: 0, receitaConfirmada: 0,
    criadoEm: now, atualizadoEm: now,
  });
  batch.set(eventoRef.collection('lotes').doc('10k-l1'), {
    id: '10k-l1', tenantId: TENANT_ID, modalidade: '10k', ordem: 1,
    nome: 'Lote 1', inicioEm: tsRel(-1), fimEm: tsRel(30),
    quantidadeLimite: 500, preco: 189.9, vendidos: 10,
    criadoEm: now, atualizadoEm: now,
  });
  await batch.commit();
}

/** Input de checkout de UM inscrito-responsável (CPF/e-mail/nome dados). */
function inputSolo(
  key: string,
  p: {
    nome: string; email: string; cpf: string;
    responsavelEmail?: string; nascimento?: string; telefone?: string;
  }
): CreateInscricaoChargeInput {
  return {
    eventoId: EVENTO_ID,
    inscritos: [{
      nome: p.nome, email: p.email, cpf: p.cpf, modalidade: '10k',
      ...(p.nascimento !== undefined ? { nascimento: p.nascimento } : {}),
    }],
    responsavelIndex: 0,
    responsavel: {
      nome: p.nome,
      email: p.responsavelEmail ?? p.email,
      ...(p.telefone !== undefined ? { telefone: p.telefone } : {}),
    },
    endereco: {
      cep: '88015-600', logradouro: 'Rua Bocaiúva', bairro: 'Centro',
      cidade: 'Florianópolis', uf: 'SC', numero: '100',
    },
    aceites: { termos: true, saude: true },
    forma: 'pix',
    parcelas: 1,
    idempotencyKey: key,
  };
}

async function pessoaDoCpf(cpf: string) {
  const id = pessoaDocIdDoCpf(cpf);
  return parsePessoa(id, (await db.doc(`pessoas/${id}`).get()).data() ?? {});
}

async function criarContaAuth(uid: string, email: string): Promise<void> {
  await admin.auth().createUser({ uid, email });
}

describe('CLAIM-FIX — RN-174: claim só na confirmação (escritor único)', () => {
  it('NEGATIVO 1 · "não reivindico CPF que não é meu": pedido NÃO-pago nunca vincula; prefill nega', async () => {
    const CPF_VITIMA = '529.982.247-25';
    await criarContaAuth('conta-atacante-1', 'atacante1@exemplo.com.br');

    // Atacante AUTENTICADO (conta real, e-mail até verificado) cria pedido
    // com o CPF da vítima — na CK2 original isto reivindicava a ficha.
    await createInscricaoChargeCore(
      db, provider,
      inputSolo('cf-neg1-01', {
        nome: 'Atacante Um', email: 'atacante1@exemplo.com.br', cpf: CPF_VITIMA,
      }),
      { uid: 'conta-atacante-1', ehAnonimo: false }
    );

    const pessoa = await pessoaDoCpf(CPF_VITIMA);
    expect(pessoa.contaUid).toBeNull(); // criação NUNCA reivindica (RN-174)
    expect(pessoa.contaEmail).toBeUndefined();

    // Prefill do atacante: null — mesmo com e-mail verificado
    const r = await getCheckoutPrefillCore(db, {
      uid: 'conta-atacante-1', ehAnonimo: false,
      email: 'atacante1@exemplo.com.br', emailVerificado: true,
    });
    expect(r.prefill).toBeNull();
  });

  it('NEGATIVO 2 · ordem "vítima anônima primeiro → atacante autenticado" AGORA NEGA (F1 fechado)', async () => {
    const CPF_VITIMA = '168.995.350-09';

    // 1. Vítima compra ANÔNIMA (não confirmada) — ficha populada com PII
    await createInscricaoChargeCore(
      db, provider,
      inputSolo('cf-neg2-vitima', {
        nome: 'Vítima Anônima', email: 'vitima@exemplo.com.br',
        cpf: CPF_VITIMA, nascimento: '1988-08-08', telefone: '(48) 91111-0001',
      }),
      { uid: 'anon-vitima-2', ehAnonimo: true }
    );
    let pessoa = await pessoaDoCpf(CPF_VITIMA);
    expect(pessoa.dadosConhecidos?.telefone).toBe('48911110001'); // populada
    expect(pessoa.contaUid).toBeNull(); // sem claim (compra anônima)

    // 2. Atacante autenticado tenta herdar a ficha criando pedido com o CPF
    //    dela (o vetor F1 do report) — NÃO PAGA nada.
    await criarContaAuth('conta-atacante-2', 'atacante2@exemplo.com.br');
    await createInscricaoChargeCore(
      db, provider,
      inputSolo('cf-neg2-atk', {
        nome: 'Atacante Dois', email: 'atacante2@exemplo.com.br', cpf: CPF_VITIMA,
      }),
      { uid: 'conta-atacante-2', ehAnonimo: false }
    );

    pessoa = await pessoaDoCpf(CPF_VITIMA);
    expect(pessoa.contaUid).toBeNull(); // nada de claim
    // PII da vítima segue no doc, mas INALCANÇÁVEL pelo atacante:
    const r = await getCheckoutPrefillCore(db, {
      uid: 'conta-atacante-2', ehAnonimo: false,
      email: 'atacante2@exemplo.com.br', emailVerificado: true,
    });
    expect(r.prefill).toBeNull();
  });

  it('NEGATIVO 3 · "e-mail do responsável ≠ caller": claim segue o E-MAIL da compra, nunca o caller', async () => {
    const CPF_XAVIER = '390.533.447-05';
    await criarContaAuth('conta-xavier', 'xavier@exemplo.com.br');

    // Xavier (autenticado) compra o PRÓPRIO CPF mas registra a compra no
    // e-mail de terceiro (ines@) — typo ou compra "para a esposa".
    const r1 = await createInscricaoChargeCore(
      db, provider,
      inputSolo('cf-neg3-01', {
        nome: 'Xavier Comprador', email: 'xavier@exemplo.com.br',
        cpf: CPF_XAVIER, responsavelEmail: 'ines@exemplo.com.br',
      }),
      { uid: 'conta-xavier', ehAnonimo: false }
    );
    await confirmarPagamentoSandboxCore(db, provider, { pedidoId: r1.pedidoId }, {
      uid: 'conta-xavier',
    });

    // Claim foi para a conta DONA do e-mail da compra (ines@, criada sem
    // fricção) — NUNCA para o caller autenticado com outro e-mail (RN-174 b)
    const uidInes = (await admin.auth().getUserByEmail('ines@exemplo.com.br')).uid;
    const pessoa = await pessoaDoCpf(CPF_XAVIER);
    expect(pessoa.contaUid).toBe(uidInes);
    expect(pessoa.contaUid).not.toBe('conta-xavier');
    expect(pessoa.contaEmail).toBe('ines@exemplo.com.br');

    // Xavier (e-mail verificado, mas ≠ e-mail da compra) → null
    expect(
      (await getCheckoutPrefillCore(db, {
        uid: 'conta-xavier', ehAnonimo: false,
        email: 'xavier@exemplo.com.br', emailVerificado: true,
      })).prefill
    ).toBeNull();

    // Ines SÓ lê após verificar o e-mail (Firebase nativo — RN-174 c)
    expect(
      (await getCheckoutPrefillCore(db, {
        uid: uidInes, ehAnonimo: false,
        email: 'ines@exemplo.com.br', emailVerificado: false,
      })).prefill
    ).toBeNull();
    const deInes = await getCheckoutPrefillCore(db, {
      uid: uidInes, ehAnonimo: false,
      email: 'ines@exemplo.com.br', emailVerificado: true,
    });
    expect(deInes.prefill?.cpf).toBe('39053344705');
  });

  it('NEGATIVO 4 · replay não re-clama; pagamento POSTERIOR de outro e-mail com o MESMO CPF não rouba o vínculo', async () => {
    const CPF_DONA = '963.074.185-75';

    // 1. Dona compra anônima e CONFIRMA → claim para a conta do e-mail dela
    const r1 = await createInscricaoChargeCore(
      db, provider,
      inputSolo('cf-neg4-dona', {
        nome: 'Dona Legítima', email: 'dona4@exemplo.com.br', cpf: CPF_DONA,
        nascimento: '1980-01-01',
      }),
      { uid: 'anon-dona-4', ehAnonimo: true }
    );
    await confirmarPagamentoSandboxCore(db, provider, { pedidoId: r1.pedidoId }, {
      uid: 'anon-dona-4',
    });
    const uidDona = (await admin.auth().getUserByEmail('dona4@exemplo.com.br')).uid;
    const antes = (await db.doc(`pessoas/${pessoaDocIdDoCpf(CPF_DONA)}`).get()).data();
    expect((antes as Record<string, unknown>)['contaUid']).toBe(uidDona);
    expect((antes as Record<string, unknown>)['contaEmail']).toBe('dona4@exemplo.com.br');

    // 2. REPLAY do webhook de confirmação (mesmo eventId determinístico do
    //    sandbox) → duplicado; e replay direto do fluxo de conta → marker.
    await confirmarPagamentoSandboxCore(db, provider, { pedidoId: r1.pedidoId }, {
      uid: 'anon-dona-4',
    });
    const replay = await garantirContaSemFriccao(
      db, r1.pedidoId, contaSemFriccaoAuthAdmin(), null
    );
    expect(replay.processado).toBe(false);
    expect(replay.motivo).toBe('ja_processado');
    const depoisReplay = (await db.doc(`pessoas/${pessoaDocIdDoCpf(CPF_DONA)}`).get()).data();
    expect(depoisReplay).toEqual(antes); // byte-idêntico — nada re-clamado

    // 3. ATACANTE PAGA um pedido com o CPF da dona e o e-mail DELE (squat
    //    pago DEPOIS do claim legítimo) → first-claim NEGA o roubo
    const r2 = await createInscricaoChargeCore(
      db, provider,
      inputSolo('cf-neg4-atk', {
        nome: 'Atacante Pagante', email: 'atacante4@exemplo.com.br', cpf: CPF_DONA,
      }),
      { uid: 'anon-atacante-4', ehAnonimo: true }
    );
    await confirmarPagamentoSandboxCore(db, provider, { pedidoId: r2.pedidoId }, {
      uid: 'anon-atacante-4',
    });
    const pessoa = await pessoaDoCpf(CPF_DONA);
    expect(pessoa.contaUid).toBe(uidDona); // vínculo da dona intocado
    expect(pessoa.contaEmail).toBe('dona4@exemplo.com.br');
    // Dados da dona intocados (pessoa reivindicada + caller ≠ dona)
    expect(pessoa.dadosConhecidos?.nome).toBe('Dona Legítima');
    // E o atacante (conta criada p/ atacante4@, e-mail até verificado) não lê
    const uidAtk = (await admin.auth().getUserByEmail('atacante4@exemplo.com.br')).uid;
    expect(
      (await getCheckoutPrefillCore(db, {
        uid: uidAtk, ehAnonimo: false,
        email: 'atacante4@exemplo.com.br', emailVerificado: true,
      })).prefill
    ).toBeNull();
  });

  it('CORRIDA 5a · dois confirmadores concorrentes: UMA conta, UM claim, carimbo consistente', async () => {
    const CPF_CAROL = '111.444.777-35';
    const r = await createInscricaoChargeCore(
      db, provider,
      inputSolo('cf-race-carol', {
        nome: 'Carol Corrida', email: 'carol@exemplo.com.br', cpf: CPF_CAROL,
      }),
      { uid: 'anon-carol', ehAnonimo: true }
    );
    // Estado 'pago' simulado (isola a corrida do PRÓPRIO garantir — a
    // confirmação real é exactly-once via ledger; aqui forçamos o pior caso)
    await db.collection('pedidos').doc(r.pedidoId).update({ status: 'pago' });

    await Promise.all([
      garantirContaSemFriccao(db, r.pedidoId, contaSemFriccaoAuthAdmin(), null),
      garantirContaSemFriccao(db, r.pedidoId, contaSemFriccaoAuthAdmin(), null),
    ]);

    // UMA conta para o e-mail (corrida do criarConta re-lê por e-mail)
    const uidCarol = (await admin.auth().getUserByEmail('carol@exemplo.com.br')).uid;
    const pessoa = await pessoaDoCpf(CPF_CAROL);
    expect(pessoa.contaUid).toBe(uidCarol);
    expect(pessoa.contaEmail).toBe('carol@exemplo.com.br');
    const marker = (await db.collection('pedidos').doc(r.pedidoId).get())
      .get('contaSemFriccao') as Record<string, unknown>;
    expect(marker['contaUid']).toBe(uidCarol);
  });

  it('CORRIDA 5b · claim (confirmação) × checkout concorrente do MESMO CPF: estado final consistente', async () => {
    const CPF_DUDA = '418.529.630-42';
    const r1 = await createInscricaoChargeCore(
      db, provider,
      inputSolo('cf-race-duda-1', {
        nome: 'Duda Dupla', email: 'duda@exemplo.com.br', cpf: CPF_DUDA,
        nascimento: '1995-05-05',
      }),
      { uid: 'anon-duda-1', ehAnonimo: true }
    );
    await db.collection('pedidos').doc(r1.pedidoId).update({ status: 'pago' });

    // Claim da confirmação CONCORRENTE com um segundo checkout (upsert de
    // dados) do MESMO CPF — ambos transacionais, nenhum estado torto nasce.
    await Promise.all([
      garantirContaSemFriccao(db, r1.pedidoId, contaSemFriccaoAuthAdmin(), null),
      createInscricaoChargeCore(
        db, provider,
        inputSolo('cf-race-duda-2', {
          nome: 'Duda Dupla Segunda', email: 'duda@exemplo.com.br', cpf: CPF_DUDA,
        }),
        { uid: 'anon-duda-2', ehAnonimo: true }
      ),
    ]);

    const uidDuda = (await admin.auth().getUserByEmail('duda@exemplo.com.br')).uid;
    const pessoa = await pessoaDoCpf(CPF_DUDA); // parse fail-fast = doc íntegro
    expect(pessoa.contaUid).toBe(uidDuda);
    expect(pessoa.contaEmail).toBe('duda@exemplo.com.br');
    expect(pessoa.dadosConhecidos?.nascimento).toBe('1995-05-05'); // preservado
  });

  it('AUTO-CURA HOSTIL · pagamento de conta DISTINTA sobre claim legado sem carimbo NÃO grava contaEmail do atacante', async () => {
    // Fix do finding #1 da review antagonista: prova executável do guard
    // `atual === contaUid` do escritor único (contaSemFriccao) no pior
    // cenário — pessoa reivindicada SEM carimbo (claim pré-RN-174) e um
    // pagamento CONFIRMADO cuja conta resolvida pelo e-mail é OUTRA.
    const CPF_LEG2 = '123.456.789-09';
    const idPessoa = pessoaDocIdDoCpf(CPF_LEG2);
    await criarContaAuth('conta-vitima-legada', 'vitima-legada@exemplo.com.br');

    // 1. Ficha nasce de compra anônima da vítima (dados dela) + claim
    //    LEGADO simulado (contaUid sem contaEmail — estado CK2 original)
    await createInscricaoChargeCore(
      db, provider,
      inputSolo('cf-heal-hostil-vitima', {
        nome: 'Vítima Legada', email: 'vitima-legada@exemplo.com.br',
        cpf: CPF_LEG2, telefone: '(48) 92222-0002',
      }),
      { uid: 'anon-vitima-leg', ehAnonimo: true }
    );
    await db.doc(`pessoas/${idPessoa}`).update({ contaUid: 'conta-vitima-legada' });

    // 2. ATACANTE PAGA um pedido com o CPF dela e o e-mail DELE — a conta
    //    resolvida pelo e-mail da compra é a do atacante (≠ contaUid)
    const r = await createInscricaoChargeCore(
      db, provider,
      inputSolo('cf-heal-hostil-atk', {
        nome: 'Atacante Curandeiro', email: 'atacante-heal@exemplo.com.br',
        cpf: CPF_LEG2,
      }),
      { uid: 'anon-atk-heal', ehAnonimo: true }
    );
    await confirmarPagamentoSandboxCore(db, provider, { pedidoId: r.pedidoId }, {
      uid: 'anon-atk-heal',
    });

    // 3. O guard NEGA: vínculo intocado, carimbo NÃO nasce do atacante,
    //    dados da vítima intocados (pessoa reivindicada + caller ≠ dona)
    const pessoa = await pessoaDoCpf(CPF_LEG2);
    expect(pessoa.contaUid).toBe('conta-vitima-legada');
    expect(pessoa.contaEmail).toBeUndefined(); // auto-cura hostil negada
    expect(pessoa.dadosConhecidos?.nome).toBe('Vítima Legada');
    expect(pessoa.dadosConhecidos?.telefone).toBe('48922220002');

    // 4. E o atacante (conta criada p/ o e-mail dele, até verificado) não lê
    const uidAtk = (await admin.auth().getUserByEmail('atacante-heal@exemplo.com.br')).uid;
    expect(
      (await getCheckoutPrefillCore(db, {
        uid: uidAtk, ehAnonimo: false,
        email: 'atacante-heal@exemplo.com.br', emailVerificado: true,
      })).prefill
    ).toBeNull();
  });

  it('AUTO-CURA · claim legado (contaUid sem contaEmail) ganha o carimbo na próxima compra confirmada da MESMA conta', async () => {
    const CPF_LEG = '529.982.247-25'; // pessoa do NEGATIVO 1 (não reivindicada)
    const idPessoa = pessoaDocIdDoCpf(CPF_LEG);
    await criarContaAuth('conta-legada', 'legada@exemplo.com.br');
    // Simula claim PRÉ-RN-174 (CK2 original): contaUid sem contaEmail
    await db.doc(`pessoas/${idPessoa}`).update({ contaUid: 'conta-legada' });

    // Leitura NEGADA enquanto não há carimbo (fail-closed)
    expect(
      (await getCheckoutPrefillCore(db, {
        uid: 'conta-legada', ehAnonimo: false,
        email: 'legada@exemplo.com.br', emailVerificado: true,
      })).prefill
    ).toBeNull();

    // Compra confirmada da MESMA conta (mesmo e-mail) cura o carimbo
    const r = await createInscricaoChargeCore(
      db, provider,
      inputSolo('cf-heal-01', {
        nome: 'Legada Curada', email: 'legada@exemplo.com.br', cpf: CPF_LEG,
      }),
      { uid: 'conta-legada', ehAnonimo: false }
    );
    await confirmarPagamentoSandboxCore(db, provider, { pedidoId: r.pedidoId }, {
      uid: 'conta-legada',
    });
    const pessoa = await pessoaDoCpf(CPF_LEG);
    expect(pessoa.contaUid).toBe('conta-legada'); // vínculo intocado
    expect(pessoa.contaEmail).toBe('legada@exemplo.com.br'); // curado
    expect(
      (await getCheckoutPrefillCore(db, {
        uid: 'conta-legada', ehAnonimo: false,
        email: 'legada@exemplo.com.br', emailVerificado: true,
      })).prefill?.cpf
    ).toBe('52998224725');
  });
});
