/**
 * checkout2Modelo.integration.test.ts — LEELA-CK2 (lote CHECKOUT2-MODELO)
 *
 * Integração no Firestore Emulator de TESTE (lane CK2 = 8480 via
 * emulators:exec + firebase.r6.json; honra LEELA_FS_EMU_PORT; NUNCA :8180
 * do preview). Backend das decisões DEC-0719:
 *
 *   T1 · RN-173 — registry `pessoas` (CPF único global): criação, corrida
 *        concorrente do MESMO CPF (1 doc), pessoaRef nos inscritos,
 *        anti-hijack de dados, replay idempotente. Claim: RN-174 (lote
 *        CLAIM-FIX) — escritor único na CONFIRMAÇÃO, nunca na criação.
 *   T2 · RN-154 — gênero no [reg] + prefill do PRÓPRIO (sem PII de
 *        terceiro), gated pela RN-174 (pago + e-mail verificado + match).
 *   T3 · RN-155 — conta sem fricção (fail-closed sem chave Brevo).
 *   T4 · RN-156 — termo base sempre + termo custom aditivo com fence.
 *   T5 · RN-157 — PIX expira em 30 min + transição de expiração.
 */

import {
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import * as admin from 'firebase-admin';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import {
  parseInscrito,
  parsePedido,
  parsePessoa,
  TERMO_SAUDE_VERSAO_VIGENTE,
} from '@leela/core';
import {
  createInscricaoChargeCore,
  type CreateInscricaoChargeInput,
} from '../checkout/createInscricaoCharge';
import { pessoaDocIdDoCpf } from '../checkout/pessoaRegistry';
import { getCheckoutPrefillCore } from '../checkout/prefillCheckout';
import {
  hashTermoSaude,
  versionarTermoSaudeCore,
} from '../eventos/versionarTermoSaude';
import {
  contaSemFriccaoAuthAdmin,
  garantirContaSemFriccao,
} from '../checkout/contaSemFriccao';
import { confirmarPagamentoSandboxCore } from '../checkout/confirmarPagamentoSandbox';
import { expirarPixPendenteCore } from '../checkout/expirarPixPendente';
import {
  processarWebhookPagamento,
  WEBHOOK_EVENTOS_SUBCOL,
} from '../checkout/webhookPagamento';
// T5 · contrato do retardatário (item 27 · RN-379/380) — a confirmação que
// chega depois da EXPIRAÇÃO devolve o dinheiro; ver o bloco de expiração.
import {
  ESTORNOS_ORFAOS_SUBCOL,
  ESTORNO_ORFAO_DOC_ID,
  ORFAOS_PENDENTES_COL,
  refundOrfaoIdempotencyKey,
} from '../checkout/estornarPagamentoOrfao';
import {
  buildMockWebhookPayload,
  MockPaymentProvider,
} from '../payments/mockProvider';

const PROJECT_ID = 'demo-leela-ck2';

// T3 (RN-155): o adapter REAL de Auth roda contra o Auth Emulator da lane de
// teste (9598 via firebase.r6.json; honra LEELA_AUTH_EMU_PORT).
process.env['FIREBASE_AUTH_EMULATOR_HOST'] =
  `localhost:${process.env['LEELA_AUTH_EMU_PORT'] ?? '9099'}`;
const TENANT_ID = 'castelo-producoes';
const EVENTO_ID = 'meia-floripa-2026';
// S1209-PIXBE-T2 (RN-157): COMPRADOR POR TESTE. A trava server-side de
// segunda cobranca PIX viva recusa dois pedidos do MESMO comprador com o
// MESMO carrinho enquanto o primeiro segue pendente e dentro do prazo — e
// estes fixtures encadeiam compras IDENTICAS em sequencia, que em producao
// seriam justamente a cobranca duplicada. Trocar o comprador a cada teste
// devolve o cenario realista e NAO mexe em nenhuma asercao: o uid nunca e
// comparado a literal, so a ele mesmo.
// ARMADILHA (S1209-PIXREV): o Vitest roda `beforeAll` de describe ANTES do
// `beforeEach` de arquivo, entao dentro de um `beforeAll` este uid AINDA e o
// do teste anterior. Fixture semeada em hook NAO pode ser referenciada por
// este identificador nos testes — capture o comprador REAL no proprio hook
// (ver `criarPedidoPago` em estornarInscricao.integration.test.ts).
let ANA_UID = 'uid-ana-anon';
let seqCompradorPixbe = 0;
beforeEach(() => {
  seqCompradorPixbe += 1;
  ANA_UID = `uid-ana-anon-${seqCompradorPixbe}`;
});

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

/** createUser idempotente p/ re-run contra Auth Emulator QUENTE (sem reset). */
async function criarContaAuthTeste(uid: string, email: string): Promise<void> {
  try {
    await admin.auth().createUser({ uid, email });
  } catch (err) {
    const code = (err as { code?: string }).code;
    if (
      code !== 'auth/uid-already-exists' &&
      code !== 'auth/email-already-exists'
    ) {
      throw err;
    }
  }
}

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

  it('RN-174: criação NÃO reivindica; claim nasce na CONFIRMAÇÃO (escritor único) + anti-hijack preservado', async () => {
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

    // 0. A dona TEM conta real no Auth (a conta do e-mail da compra)
    await criarContaAuthTeste('conta-dona', 'dona@exemplo.com.br');

    // 1. Dona compra AUTENTICADA → a CRIAÇÃO não vincula NADA (RN-174)
    const r1 = await createInscricaoChargeCore(db, provider, inputDe('Dona Original', 'ck2-t1-claim-01', '1991-01-01'), {
      uid: 'conta-dona', ehAnonimo: false,
    });
    let pessoa = parsePessoa(idPessoa, (await db.doc(`pessoas/${idPessoa}`).get()).data() ?? {});
    expect(pessoa.contaUid).toBeNull(); // pedido não-pago NUNCA reivindica
    expect(pessoa.dadosConhecidos?.nome).toBe('Dona Original');

    // 2. CONFIRMAÇÃO do pagamento → claim pelo escritor único, para a conta
    //    DO E-MAIL da compra, com o carimbo contaEmail (RN-174 a+b)
    await confirmarPagamentoSandboxCore(db, provider, { pedidoId: r1.pedidoId }, {
      uid: 'conta-dona',
    });
    pessoa = parsePessoa(idPessoa, (await db.doc(`pessoas/${idPessoa}`).get()).data() ?? {});
    expect(pessoa.contaUid).toBe('conta-dona');
    expect(pessoa.contaEmail).toBe('dona@exemplo.com.br');

    // 3. ATACANTE autenticado compra com o CPF da dona → NADA muda no vínculo
    //    nem nos dados conhecidos (anti-hijack)
    await createInscricaoChargeCore(db, provider, inputDe('Atacante Forjado', 'ck2-t1-claim-02', '1970-12-31'), {
      uid: 'conta-atacante', ehAnonimo: false,
    });
    pessoa = parsePessoa(idPessoa, (await db.doc(`pessoas/${idPessoa}`).get()).data() ?? {});
    expect(pessoa.contaUid).toBe('conta-dona'); // vínculo intocado
    expect(pessoa.dadosConhecidos?.nome).toBe('Dona Original'); // dados intocados
    expect(pessoa.dadosConhecidos?.nascimento).toBe('1991-01-01');

    // 4. A PRÓPRIA dona compra de novo → dados atualizam (correção vence)
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

// ---------------------------------------------------------------------------
// T2 — RN-154 · gênero no [reg] + pré-preenchimento sem vazar PII
// ---------------------------------------------------------------------------

describe('CK2-T2 — RN-154: gênero + prefill do PRÓPRIO', () => {
  it('gênero persiste no [reg] do inscrito (enum reusado RN-820/822) e nos dados da pessoa', async () => {
    const input = inputCk2('ck2-t2-gen-01');
    (input.inscritos[0] as { genero?: string }).genero = 'feminino';
    (input.inscritos[1] as { genero?: string }).genero = 'nao_informado';
    const r = await createInscricaoChargeCore(db, provider, input, {
      uid: 'uid-t2-gen', ehAnonimo: true,
    });
    const resp = parseInscrito(
      String(r.inscritoIds[0]),
      (await db.doc(`eventos/${EVENTO_ID}/inscritos/${r.inscritoIds[0]}`).get()).data() ?? {}
    );
    expect(resp.dadosPessoais?.genero).toBe('feminino');
    const conv = parseInscrito(
      String(r.inscritoIds[1]),
      (await db.doc(`eventos/${EVENTO_ID}/inscritos/${r.inscritoIds[1]}`).get()).data() ?? {}
    );
    expect(conv.dadosPessoais?.genero).toBe('nao_informado');
    const pessoaAna = parsePessoa(
      pessoaDocIdDoCpf(CPF_ANA),
      (await db.doc(`pessoas/${pessoaDocIdDoCpf(CPF_ANA)}`).get()).data() ?? {}
    );
    expect(pessoaAna.dadosConhecidos?.genero).toBe('feminino');
  });

  it('gênero fora do enum ⇒ invalid-argument, NADA escrito (fail-closed)', async () => {
    const input = inputCk2('ck2-t2-gen-bad');
    (input.inscritos[0] as { genero?: string }).genero = 'forjado';
    await expect(
      createInscricaoChargeCore(db, provider, input, { uid: 'uid-t2-bad', ehAnonimo: true })
    ).rejects.toThrow(/genero/);
    expect(
      (await db.collection('pedidos').doc('ped-uid-t2-bad-ck2-t2-gen-bad').get()).exists
    ).toBe(false);
  });

  it('prefill (gate RN-174): só claim confirmado + e-mail verificado E correspondente; anônimo/terceiro null', async () => {
    const cpf = '418.529.630-42';
    await criarContaAuthTeste('conta-clara', 'clara@exemplo.com.br');
    const input = inputCk2('ck2-t2-prefill-01', {
      inscritos: [{
        nome: 'Clara Compradora', email: 'clara@exemplo.com.br', cpf,
        modalidade: '10k', nascimento: '1993-03-03', genero: 'feminino',
      }],
      responsavelIndex: 0,
      responsavel: {
        nome: 'Clara Compradora', email: 'clara@exemplo.com.br',
        telefone: '(48) 97777-0001',
      },
    });
    const r = await createInscricaoChargeCore(db, provider, input, {
      uid: 'conta-clara', ehAnonimo: false,
    });

    const claraVerificada = {
      uid: 'conta-clara', ehAnonimo: false,
      email: 'clara@exemplo.com.br', emailVerificado: true,
    };

    // ANTES da confirmação: pedido não-pago não vincula — null (RN-174 a)
    expect((await getCheckoutPrefillCore(db, claraVerificada)).prefill).toBeNull();

    await confirmarPagamentoSandboxCore(db, provider, { pedidoId: r.pedidoId }, {
      uid: 'conta-clara',
    });

    // E-mail NÃO verificado → null (RN-174 c)
    expect(
      (await getCheckoutPrefillCore(db, { ...claraVerificada, emailVerificado: false }))
        .prefill
    ).toBeNull();

    // E-mail divergente do da compra (conta trocou de e-mail) → null (RN-174 b)
    expect(
      (await getCheckoutPrefillCore(db, {
        ...claraVerificada, email: 'outra@exemplo.com.br',
      })).prefill
    ).toBeNull();

    // As TRÊS condições valem → prefill completo (CPF + [reg] + endereço)
    const meu = await getCheckoutPrefillCore(db, claraVerificada);
    expect(meu.prefill).not.toBeNull();
    expect(meu.prefill?.cpf).toBe('41852963042');
    expect(meu.prefill?.genero).toBe('feminino');
    expect(meu.prefill?.nascimento).toBe('1993-03-03');
    expect(meu.prefill?.telefone).toBe('48977770001');
    expect(meu.prefill?.endereco?.cep).toBe('88015600');

    // Sessão ANÔNIMA (mesmo uid!) → null (anônimo não tem identidade)
    const anon = await getCheckoutPrefillCore(db, {
      ...claraVerificada, ehAnonimo: true,
    });
    expect(anon.prefill).toBeNull();

    // OUTRA conta autenticada → null (PII de terceiro inalcançável — não
    // existe canal de input para pedir por CPF/e-mail alheio)
    const terceiro = await getCheckoutPrefillCore(db, {
      uid: 'conta-outra', ehAnonimo: false,
      email: 'conta-outra@exemplo.com.br', emailVerificado: true,
    });
    expect(terceiro.prefill).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// T3 — RN-155 · conta sem fricção na 1ª compra (fail-closed sem chave Brevo)
// ---------------------------------------------------------------------------

describe('CK2-T3 — RN-155: conta sem fricção', () => {
  const CPF_DAVI = '963.074.185-75';

  // Warm-safe: os testes deste describe provam CRIAÇÃO de conta — num Auth
  // Emulator quente (re-run sem reset) as contas da rodada anterior
  // existiriam e falseariam `contaCriada`. Remove antes (fresco = no-op).
  beforeAll(async () => {
    for (const email of ['davi@exemplo.com.br', 'elisa@exemplo.com.br']) {
      try {
        const { uid } = await admin.auth().getUserByEmail(email);
        await admin.auth().deleteUser(uid);
      } catch (err) {
        if ((err as { code?: string }).code !== 'auth/user-not-found') throw err;
      }
    }
  });

  function inputDavi(key: string): CreateInscricaoChargeInput {
    return inputCk2(key, {
      inscritos: [{
        nome: 'Davi Estreante', email: 'davi@exemplo.com.br', cpf: CPF_DAVI,
        modalidade: '10k', nascimento: '1992-02-02', genero: 'masculino',
      }],
      responsavelIndex: 0,
      responsavel: { nome: 'Davi Estreante', email: 'Davi@Exemplo.com.br' },
    });
  }

  it('1ª compra confirmada SEM chave Brevo: conta criada sem senha, pessoa vinculada, pendência de envio registrada — compra INTOCADA', async () => {
    delete process.env['BREVO_API_KEY']; // estado real de produção hoje
    const r = await createInscricaoChargeCore(db, provider, inputDavi('ck2-t3-first-01'), {
      uid: 'anon-davi', ehAnonimo: true,
    });
    // Confirmação pela porta única (sandbox dispara o webhook assinado) —
    // o pós-confirmação chama o fluxo de conta com o adapter REAL de Auth
    // contra o Auth Emulator.
    const conf = await confirmarPagamentoSandboxCore(db, provider, {
      pedidoId: r.pedidoId,
    }, { uid: 'anon-davi' });
    expect(conf.statusPedido).toBe('pago');

    const pedidoSnap = await db.collection('pedidos').doc(r.pedidoId).get();
    const marker = pedidoSnap.get('contaSemFriccao') as Record<string, unknown>;
    expect(marker).toBeDefined();
    expect(marker['contaCriada']).toBe(true);
    expect(marker['emailStatus']).toBe('pendente_chave'); // fail-closed RN-137
    expect(marker['pessoaVinculada']).toBe(true);
    const contaUid = marker['contaUid'] as string;
    expect(typeof contaUid).toBe('string');

    // A conta EXISTE no Auth (sem senha — link de senha é o caminho de acesso)
    const user = await admin.auth().getUserByEmail('davi@exemplo.com.br');
    expect(user.uid).toBe(contaUid);

    // Pessoa do CPF do responsável vinculada à conta nova (escritor único
    // RN-174) — com o carimbo contaEmail minúsculo da compra confirmada
    const pessoa = parsePessoa(
      pessoaDocIdDoCpf(CPF_DAVI),
      (await db.doc(`pessoas/${pessoaDocIdDoCpf(CPF_DAVI)}`).get()).data() ?? {}
    );
    expect(pessoa.contaUid).toBe(contaUid);
    expect(pessoa.contaEmail).toBe('davi@exemplo.com.br');

    // SEM e-mail verificado a conta criada NÃO lê nada (RN-174 c — a conta
    // sem fricção nasce emailVerified=false; acesso só após confirmar)
    const semVerificar = await getCheckoutPrefillCore(db, {
      uid: contaUid, ehAnonimo: false,
      email: 'davi@exemplo.com.br', emailVerificado: false,
    });
    expect(semVerificar.prefill).toBeNull();

    // Com e-mail verificado + correspondente → ponte anon→conta (RN-154)
    const prefill = await getCheckoutPrefillCore(db, {
      uid: contaUid, ehAnonimo: false,
      email: 'davi@exemplo.com.br', emailVerificado: true,
    });
    expect(prefill.prefill?.cpf).toBe('96307418575');
    expect(prefill.prefill?.genero).toBe('masculino');
  });

  it('replay do fluxo: marker existente ⇒ nenhum efeito novo (idempotente)', async () => {
    const pedidoId = 'ped-anon-davi-ck2-t3-first-01';
    const resultado = await garantirContaSemFriccao(
      db, pedidoId, contaSemFriccaoAuthAdmin(), null
    );
    expect(resultado.processado).toBe(false);
    expect(resultado.motivo).toBe('ja_processado');
  });

  it('RECOMPRA do mesmo e-mail: conta NÃO recriada, e-mail nao_aplicavel (linka via RN-173)', async () => {
    const r = await createInscricaoChargeCore(db, provider, inputDavi('ck2-t3-second-01'), {
      uid: 'anon-davi-2', ehAnonimo: true,
    });
    await confirmarPagamentoSandboxCore(db, provider, { pedidoId: r.pedidoId }, {
      uid: 'anon-davi-2',
    });
    const marker = (await db.collection('pedidos').doc(r.pedidoId).get())
      .get('contaSemFriccao') as Record<string, unknown>;
    expect(marker['contaCriada']).toBe(false);
    expect(marker['emailStatus']).toBe('nao_aplicavel'); // sem reenvio
    // Mesmo uid da primeira compra (getUserByEmail — nunca segunda conta)
    const user = await admin.auth().getUserByEmail('davi@exemplo.com.br');
    expect(marker['contaUid']).toBe(user.uid);
  });

  it('falha do provedor de e-mail NÃO quebra: carimbo falha_envio, conta criada', async () => {
    const cpf = '111.444.777-35';
    const r = await createInscricaoChargeCore(db, provider, inputCk2('ck2-t3-fail-01', {
      inscritos: [{ nome: 'Elisa Nova', email: 'elisa@exemplo.com.br', cpf, modalidade: '10k' }],
      responsavelIndex: 0,
      responsavel: { nome: 'Elisa Nova', email: 'elisa@exemplo.com.br' },
    }), { uid: 'anon-elisa', ehAnonimo: true });
    // Estado 'pago' SIMULADO por Admin (sem passar pelo disparo automático —
    // este teste isola o ramo contaCriada+provider hostil do garantir).
    await db.collection('pedidos').doc(r.pedidoId).update({ status: 'pago' });
    const hostil = {
      name: 'hostil',
      sendTransactional: async () => {
        throw new Error('provider fora do ar');
      },
    };
    const resultado = await garantirContaSemFriccao(
      db, r.pedidoId, contaSemFriccaoAuthAdmin(), hostil
    );
    expect(resultado.processado).toBe(true);
    expect(resultado.contaCriada).toBe(true);
    expect(resultado.emailStatus).toBe('falha_envio');
    // Conta EXISTE apesar da falha de envio; compra intocada
    const user = await admin.auth().getUserByEmail('elisa@exemplo.com.br');
    expect(user.uid).toBe(resultado.contaUid);
    expect((await db.collection('pedidos').doc(r.pedidoId).get()).get('status')).toBe('pago');
  });

  it('pedido NÃO pago: fluxo não roda (conta nunca nasce de compra pendente)', async () => {
    const r = await createInscricaoChargeCore(db, provider, inputCk2('ck2-t3-pend-01', {
      inscritos: [{ nome: 'Fabio Pendente', email: 'fabio@exemplo.com.br', cpf: CPF_ANA, modalidade: '10k' }],
      responsavelIndex: 0,
      responsavel: { nome: 'Fabio Pendente', email: 'fabio@exemplo.com.br' },
    }), { uid: 'anon-fabio', ehAnonimo: true });
    const resultado = await garantirContaSemFriccao(
      db, r.pedidoId, contaSemFriccaoAuthAdmin(), null
    );
    expect(resultado.processado).toBe(false);
    expect(resultado.motivo).toBe('pedido_nao_pago');
    await expect(admin.auth().getUserByEmail('fabio@exemplo.com.br')).rejects.toThrow();
  });
});

// ---------------------------------------------------------------------------
// T4 — RN-156 · termo de saúde base sempre + custom ADITIVO com fence
// ---------------------------------------------------------------------------

describe('CK2-T4 — RN-156: termo custom aditivo do organizador', () => {
  const TEXTO_TERMO = 'Declaro que estou apto conforme o regulamento médico da prova.\n';
  const termoRef = () =>
    db.doc(`eventos/${EVENTO_ID}/termoSaude/config`);

  it('termo custom ATIVO + input SEM saudeCustom ⇒ failed-precondition, NADA escrito (fence in-tx)', async () => {
    await termoRef().set({
      id: 'config', tenantId: TENANT_ID, texto: TEXTO_TERMO,
      versao: 2, termoTextoHash: hashTermoSaude(TEXTO_TERMO),
      atualizadoEm: FieldValue.serverTimestamp(),
    });
    await expect(
      createInscricaoChargeCore(db, provider, inputCk2('ck2-t4-fence-01'), {
        uid: 'uid-t4-a', ehAnonimo: true,
      })
    ).rejects.toThrow(/termo de saúde do organizador/);
    expect(
      (await db.collection('pedidos').doc('ped-uid-t4-a-ck2-t4-fence-01').get()).exists
    ).toBe(false);
  });

  it('com aceites.saudeCustom=true ⇒ prova carimbada (versão+hash do texto do organizador) + base sempre presente', async () => {
    const r = await createInscricaoChargeCore(
      db, provider,
      inputCk2('ck2-t4-ok-01', {
        aceites: { termos: true, saude: true, saudeCustom: true },
      }),
      { uid: 'uid-t4-b', ehAnonimo: true }
    );
    const pedido = parsePedido(
      r.pedidoId,
      (await db.collection('pedidos').doc(r.pedidoId).get()).data() ?? {}
    );
    // Base da plataforma: SEMPRE presente (já incondicional desde o F-4a)
    expect(pedido.aceites?.saude.versao).toBe(TERMO_SAUDE_VERSAO_VIGENTE);
    // Custom ADITIVO: versão + hash do material do organizador, carimbo servidor
    expect(pedido.aceites?.saudeCustom?.versao).toBe(2);
    expect(pedido.aceites?.saudeCustom?.materialHash).toBe(hashTermoSaude(TEXTO_TERMO));
    expect(pedido.aceites?.saudeCustom?.aceiteEm).toBeTruthy();
  });

  it('saudeCustom=false explícito ⇒ invalid-argument na fronteira (shape)', async () => {
    await expect(
      createInscricaoChargeCore(
        db, provider,
        inputCk2('ck2-t4-false-01', {
          aceites: { termos: true, saude: true, saudeCustom: false },
        }),
        { uid: 'uid-t4-c', ehAnonimo: true }
      )
    ).rejects.toThrow(/saudeCustom/);
  });

  it('termo DESATIVADO (texto vazio): saudeCustom enviado é ignorado — sem carimbo custom', async () => {
    await termoRef().set({
      id: 'config', tenantId: TENANT_ID, texto: '',
      versao: 2, termoTextoHash: hashTermoSaude(''),
      atualizadoEm: FieldValue.serverTimestamp(),
    });
    const r = await createInscricaoChargeCore(
      db, provider,
      inputCk2('ck2-t4-inativo-01', {
        aceites: { termos: true, saude: true, saudeCustom: true },
      }),
      { uid: 'uid-t4-d', ehAnonimo: true }
    );
    const pedido = parsePedido(
      r.pedidoId,
      (await db.collection('pedidos').doc(r.pedidoId).get()).data() ?? {}
    );
    expect(pedido.aceites?.saude.versao).toBe(TERMO_SAUDE_VERSAO_VIGENTE);
    expect(pedido.aceites?.saudeCustom).toBeUndefined();
    // limpeza para os demais describes (termo inativo permanece)
  });

  it('versionarTermoSaudeCore: 1ª publicação carimba v1; edição material bumpa; re-save idêntico e whitespace = no-op', async () => {
    const eventoId = 'evt-t4-versao';
    const ref = db.doc(`eventos/${eventoId}/termoSaude/config`);

    // 1ª publicação (sem versao/hash — como o painel grava): carimba v1
    await ref.set({
      id: 'config', tenantId: TENANT_ID, texto: 'Termo v1.',
      atualizadoEm: FieldValue.serverTimestamp(),
    });
    let r = await versionarTermoSaudeCore(db, eventoId);
    expect(r).toEqual({ bumpado: false, versao: 1 });
    expect((await ref.get()).get('termoTextoHash')).toBe(hashTermoSaude('Termo v1.'));

    // Redelivery/no-op: mesmo material não re-bumpa (idempotência por hash)
    r = await versionarTermoSaudeCore(db, eventoId);
    expect(r).toEqual({ bumpado: false, versao: 1 });

    // Whitespace de borda NÃO é edição material
    await ref.update({ texto: '  Termo v1.\r\n' });
    r = await versionarTermoSaudeCore(db, eventoId, hashTermoSaude('Termo v1.'));
    expect(r).toEqual({ bumpado: false, versao: 1 });

    // Edição MATERIAL bumpa 1 → 2
    await ref.update({ texto: 'Termo v2 — exige atestado.' });
    r = await versionarTermoSaudeCore(db, eventoId, hashTermoSaude('Termo v1.'));
    expect(r).toEqual({ bumpado: true, versao: 2 });
    expect((await ref.get()).get('versao')).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// T5 — RN-157 · PIX expira em 30 minutos (charge + estado de expiração)
// ---------------------------------------------------------------------------

describe('CK2-T5 — RN-157: PIX expira em 30 min', () => {
  // T0 dentro da vigência do lote do seed (inicioEm=now-1d, fimEm=now+30d):
  // relógio injetado — a aritmética do timer é exata sobre T0.
  const T0 = new Date(Date.now() + 60_000);
  const MEIA_HORA_MS = 30 * 60 * 1000;
  const relogio = (d: Date) => () => d;

  it('cobrança PIX nasce com pixExpiraEm = criação + 30min (relógio injetado); resultado expõe o timer; replay não re-estende', async () => {
    const r = await createInscricaoChargeCore(
      db, provider, inputCk2('ck2-t5-exp-01'),
      { uid: 'uid-t5-a', ehAnonimo: true }, relogio(T0)
    );
    expect(r.pixExpiraEmMillis).toBe(T0.getTime() + MEIA_HORA_MS);

    // Doc persistido (parse do core prova a coerência forma pix + Timestamp)
    const pag = (await db.collection('pagamentos').doc(r.pagamentoId).get()).data() ?? {};
    expect(
      (pag['pixExpiraEm'] as { toMillis: () => number }).toMillis()
    ).toBe(T0.getTime() + MEIA_HORA_MS);

    // Replay 10 min depois: MESMA expiração (retry nunca re-estende o prazo)
    const replay = await createInscricaoChargeCore(
      db, provider, inputCk2('ck2-t5-exp-01'),
      { uid: 'uid-t5-a', ehAnonimo: true },
      relogio(new Date(T0.getTime() + 10 * 60 * 1000))
    );
    expect(replay.pixExpiraEmMillis).toBe(T0.getTime() + MEIA_HORA_MS);
  });

  it('cartão NÃO ganha pixExpiraEm (timer é exclusivo do PIX)', async () => {
    const r = await createInscricaoChargeCore(
      db, provider,
      inputCk2('ck2-t5-card-01', { forma: 'cartao_credito', parcelas: 2 }),
      { uid: 'uid-t5-b', ehAnonimo: true }, relogio(T0)
    );
    expect(r.pixExpiraEmMillis).toBeUndefined();
    const pag = (await db.collection('pagamentos').doc(r.pagamentoId).get()).data() ?? {};
    expect(pag['pixExpiraEm']).toBeUndefined();
  });

  it('expirar ANTES da hora ⇒ failed-precondition (relógio do SERVIDOR decide, não o cliente)', async () => {
    const r = await createInscricaoChargeCore(
      db, provider, inputCk2('ck2-t5-cedo-01'),
      { uid: 'uid-t5-c', ehAnonimo: true }, relogio(T0)
    );
    await expect(
      expirarPixPendenteCore(db, provider, { pedidoId: r.pedidoId }, { uid: 'uid-t5-c' },
        relogio(new Date(T0.getTime() + MEIA_HORA_MS - 1000)))
    ).rejects.toThrow(/ainda não expirou/);
    expect(
      (await db.collection('pedidos').doc(r.pedidoId).get()).get('status')
    ).toBe('pendente');
  });

  it('expirado sem pagar ⇒ pendente → cancelado (pix_expirado) nos DOIS docs; idempotente; dono-only', async () => {
    const r = await createInscricaoChargeCore(
      db, provider, inputCk2('ck2-t5-venc-01'),
      { uid: 'uid-t5-d', ehAnonimo: true }, relogio(T0)
    );
    const depois = relogio(new Date(T0.getTime() + MEIA_HORA_MS + 1000));

    // OUTRO uid nunca expira pedido alheio
    await expect(
      expirarPixPendenteCore(db, provider, { pedidoId: r.pedidoId }, { uid: 'intruso' }, depois)
    ).rejects.toThrow(/outro pagador/);

    const res = await expirarPixPendenteCore(
      db, provider, { pedidoId: r.pedidoId }, { uid: 'uid-t5-d' }, depois
    );
    expect(res).toEqual({
      pedidoId: r.pedidoId, statusPedido: 'cancelado', expirado: true, jaFinal: false,
    });
    const pedidoSnap = await db.collection('pedidos').doc(r.pedidoId).get();
    expect(pedidoSnap.get('status')).toBe('cancelado');
    expect(pedidoSnap.get('canceladoMotivo')).toBe('pix_expirado');
    const pagSnap = await db.collection('pagamentos').doc(r.pagamentoId).get();
    expect(pagSnap.get('status')).toBe('cancelado');

    // Idempotente: segunda chamada = jaFinal, sem efeito novo
    const res2 = await expirarPixPendenteCore(
      db, provider, { pedidoId: r.pedidoId }, { uid: 'uid-t5-d' }, depois
    );
    expect(res2.jaFinal).toBe(true);
    expect(res2.expirado).toBe(false);

    // Webhook de confirmação chegando APÓS o cancelamento por EXPIRAÇÃO.
    //
    // CONTRATO ATUALIZADO (E08-REV · triagem): até o item 27 este ramo era
    // `estado_ja_final` — a entrega ficava no ledger sem efeito e o dinheiro
    // que o comprador pagou pelo QR vencido FICAVA na plataforma. A RN-379
    // (lane ESTORNO-ADMIN, `867f7dc`) trocou o contrato: expiração É
    // cancelamento, e confirmação sobre pedido cancelado vira
    // `retardatario_pos_cancelamento` com estorno TOTAL automático. O E12
    // (linha "pagamento retardatário sobre pedido EXPIRADO") já declara este
    // caminho superado — o que segue é a asserção do contrato VIVO: o pedido
    // continua cancelado, a receita continua zerada e o dinheiro VOLTA, uma
    // vez só.
    const chargeId = pagSnap.get('gatewayChargeId') as string;
    const amount = pagSnap.get('gatewayAmountCentavos') as number;
    const receitaAntes = (await db.collection('eventos').doc(EVENTO_ID).get()).get(
      'receitaConfirmada'
    ) as number;
    const tardio = await processarWebhookPagamento(
      db, provider,
      buildMockWebhookPayload('charge.confirmed', {
        chargeId, orderId: r.pedidoId, amount, eventId: `tardio-${r.pedidoId}`,
      })
    );
    expect(tardio.ignorado).toBe(true);
    expect(tardio.motivo).toBe('retardatario_pos_cancelamento');
    expect(tardio.estornoOrfao).toBe(true);
    // A entrega fica no ledger com o efeito HONESTO (não "ignorado").
    expect(
      (await db.collection('pagamentos').doc(r.pagamentoId)
        .collection(WEBHOOK_EVENTOS_SUBCOL).doc(`tardio-${r.pedidoId}`).get())
        .get('efeito')
    ).toBe('retardatario_pos_cancelamento');
    // Extrato do órfão (RN-380) — nasce na MESMA tx da entrega.
    const extrato = await db.collection(ORFAOS_PENDENTES_COL).doc(r.pagamentoId).get();
    expect(extrato.exists).toBe(true);
    expect(extrato.get('entregas')).toBe(1);
    // O DINHEIRO VOLTA — uma vez, integral, chave determinística (RN-379).
    const ledgerOrfao = await db.collection('pagamentos').doc(r.pagamentoId)
      .collection(ESTORNOS_ORFAOS_SUBCOL).doc(ESTORNO_ORFAO_DOC_ID).get();
    expect(ledgerOrfao.exists).toBe(true);
    // O MockPaymentProvider aprova o refund na hora, então aqui o livro já
    // fecha: ledger 'aprovado' + extrato resolvido. Com o gateway real o
    // desfecho vem 'pending' e quem fecha é o webhook (RN-372) — esse caminho
    // é provado em `estornoOrfao.integration.test.ts`.
    expect(ledgerOrfao.get('status')).toBe('aprovado');
    expect(extrato.get('resolvido')).toBe(true);
    expect(ledgerOrfao.get('valorCentavos')).toBe(amount);
    // O POST saiu com a chave determinística do órfão (RN-379) — o mock guarda
    // o refund por idempotencyKey, então repetir a chave devolve o MESMO id.
    const refundIdPrimeiro = ledgerOrfao.get('refundId') as string;
    expect(
      (
        await provider.refund({
          chargeId,
          tenantId: TENANT_ID,
          reason: 'reconferência da review',
          idempotencyKey: refundOrfaoIdempotencyKey(r.pagamentoId),
        })
      ).refundId
    ).toBe(refundIdPrimeiro);
    expect(typeof refundIdPrimeiro).toBe('string');
    // Nada retrocedeu: pedido cancelado, receita intocada.
    expect(
      (await db.collection('pedidos').doc(r.pedidoId).get()).get('status')
    ).toBe('cancelado');
    expect(
      (await db.collection('pagamentos').doc(r.pagamentoId).get()).get('status')
    ).toBe('cancelado');
    expect(
      (await db.collection('eventos').doc(EVENTO_ID).get()).get('receitaConfirmada')
    ).toBe(receitaAntes);

    // SEGUNDA entrega retardatária (redelivery do gateway): o extrato conta
    // mais uma, o dinheiro NÃO volta duas vezes.
    const tardio2 = await processarWebhookPagamento(
      db, provider,
      buildMockWebhookPayload('charge.confirmed', {
        chargeId, orderId: r.pedidoId, amount, eventId: `tardio2-${r.pedidoId}`,
      })
    );
    expect(tardio2.motivo).toBe('retardatario_pos_cancelamento');
    expect(
      (await db.collection(ORFAOS_PENDENTES_COL).doc(r.pagamentoId).get()).get('entregas')
    ).toBe(2);
    const ledgerOrfao2 = await db.collection('pagamentos').doc(r.pagamentoId)
      .collection(ESTORNOS_ORFAOS_SUBCOL).doc(ESTORNO_ORFAO_DOC_ID).get();
    expect(ledgerOrfao2.get('refundId')).toBe(refundIdPrimeiro);
    expect(ledgerOrfao2.get('valorCentavos')).toBe(amount);
    expect(
      (await db.collection('pagamentos').doc(r.pagamentoId)
        .collection(ESTORNOS_ORFAOS_SUBCOL).get()).size
    ).toBe(1); // docId fixo: no máximo UM estorno órfão por pagamento

    // Retry do comprador = NOVA cotação/pedido (idempotencyKey nova) — a
    // máquina existente já cobre (novo pedido nasce limpo).
    const retry = await createInscricaoChargeCore(
      db, provider, inputCk2('ck2-t5-venc-01-retry'),
      { uid: 'uid-t5-d', ehAnonimo: true }, depois
    );
    expect(retry.statusPedido).toBe('pendente');
    expect(retry.pedidoId).not.toBe(r.pedidoId);
  });

  it('PIX já PAGO nunca é cancelado pelo timer (webhook vence a corrida)', async () => {
    const r = await createInscricaoChargeCore(
      db, provider, inputCk2('ck2-t5-pago-01'),
      { uid: 'uid-t5-e', ehAnonimo: true }, relogio(T0)
    );
    await confirmarPagamentoSandboxCore(db, provider, { pedidoId: r.pedidoId }, {
      uid: 'uid-t5-e',
    });
    const res = await expirarPixPendenteCore(
      db, provider, { pedidoId: r.pedidoId }, { uid: 'uid-t5-e' },
      relogio(new Date(T0.getTime() + MEIA_HORA_MS + 1000))
    );
    expect(res.jaFinal).toBe(true);
    expect(res.statusPedido).toBe('pago');
  });

  it('MockProvider honra o contrato: expiresAt no resultado da cobrança PIX', async () => {
    const mock = new MockPaymentProvider();
    const antes = Date.now();
    const charge = await mock.createCharge({
      orderId: 'ped-contrato', tenantId: TENANT_ID, amount: 18990,
      paymentMethod: 'pix',
      customer: { name: 'X', email: 'x@exemplo.com.br' },
      items: [{ id: 'i', description: 'd', amount: 18990, quantity: 1 }],
      idempotencyKey: 'contrato-pix-1',
      pixExpiraEmSegundos: 1800,
    });
    const exp = charge.expiresAt?.toMillis() ?? 0;
    expect(exp).toBeGreaterThanOrEqual(antes + 1800 * 1000 - 5000);
    expect(exp).toBeLessThanOrEqual(Date.now() + 1800 * 1000 + 5000);
    // Replay: MESMA expiração
    const replay = await mock.createCharge({
      orderId: 'ped-contrato', tenantId: TENANT_ID, amount: 18990,
      paymentMethod: 'pix',
      customer: { name: 'X', email: 'x@exemplo.com.br' },
      items: [{ id: 'i', description: 'd', amount: 18990, quantity: 1 }],
      idempotencyKey: 'contrato-pix-1',
      pixExpiraEmSegundos: 1800,
    });
    expect(replay.expiresAt?.toMillis()).toBe(exp);
    // Cartão com o parâmetro é bug de chamador — contrato lança
    await expect(
      mock.createCharge({
        orderId: 'ped-contrato-2', tenantId: TENANT_ID, amount: 100,
        paymentMethod: 'credit_card',
        customer: { name: 'X', email: 'x@exemplo.com.br' },
        items: [{ id: 'i', description: 'd', amount: 100, quantity: 1 }],
        idempotencyKey: 'contrato-card-1',
        pixExpiraEmSegundos: 1800,
      })
    ).rejects.toThrow(/só existe no PIX/);
  });
});
