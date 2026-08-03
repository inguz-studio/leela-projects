/**
 * autoCadastroOrganizadorRules.integration.test.ts — LEELA-S030-T2
 *
 * ATAQUE à Rule de auto-cadastro em `profissionais/{uid}` (RN-411/412).
 *
 * É a única escrita de cliente que a coleção passou a aceitar, e ela decide
 * duas coisas caras: que a conta nasce SEM vínculo de tenant e que o
 * consentimento LGPD sai carimbado com versão e instante do SERVIDOR.
 *
 * Cobre:
 *   - a pessoa cria o PRÓPRIO doc com shape completo;
 *   - doc de OUTRO uid negado; anônimo negado;
 *   - `tenantId`, `papeis` ou qualquer campo extra negado (`hasOnly`);
 *   - `statusOnboarding` diferente de `aguardando_convite` negado;
 *   - e-mail de terceiro no próprio doc negado (o provisionamento resolve
 *     owner POR E-MAIL — um e-mail forjado aqui é sequestro de identidade);
 *   - consentimento ausente, incompleto ou com data de CLIENTE negado;
 *   - UPDATE e DELETE do próprio doc negados depois de criado.
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
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';
import {
  deleteDoc,
  doc,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import { TERMO_LGPD_FINALIDADE, TERMO_LGPD_VERSAO } from '@leela/core';

const PROJECT_ID = 'demo-leela';
const RULES_PATH = resolve(__dirname, '../../../firestore.rules');

const CANDIDATO_UID = 'uid-candidato-organizador';
const CANDIDATO_EMAIL = 'francisco@demo-leela.dev';
const OUTRO_UID = 'uid-outro-candidato';

let testEnv: RulesTestEnvironment;

function ctxCandidato(claims: Record<string, unknown> = {}) {
  return testEnv.authenticatedContext(CANDIDATO_UID, {
    email: CANDIDATO_EMAIL,
    email_verified: false,
    ...claims,
  });
}

/** Payload canônico do `/cadastrar` (espelho de `criarPerfilOrganizador`). */
function perfil(overrides: Record<string, unknown> = {}) {
  return {
    id: CANDIDATO_UID,
    nome: 'Francisco Rodarte',
    email: CANDIDATO_EMAIL,
    telefone: '48999998888',
    organizacao: 'Rodarte Experiencias',
    statusOnboarding: 'aguardando_convite',
    consentimentoLgpd: {
      versao: TERMO_LGPD_VERSAO,
      finalidade: TERMO_LGPD_FINALIDADE,
      aceitoEm: serverTimestamp(),
    },
    criadoEm: serverTimestamp(),
    atualizadoEm: serverTimestamp(),
    ...overrides,
  };
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
});

beforeEach(async () => {
  await testEnv.clearFirestore();
});

afterAll(async () => {
  await testEnv?.cleanup();
});

describe('auto-cadastro — caminho feliz', () => {
  it('a pessoa cria o próprio doc', async () => {
    const db = ctxCandidato().firestore();
    await assertSucceeds(setDoc(doc(db, 'profissionais', CANDIDATO_UID), perfil()));
  });

  it('e-mail com caixa diferente da conta passa (comparação case-insensitive)', async () => {
    const db = ctxCandidato().firestore();
    await assertSucceeds(
      setDoc(
        doc(db, 'profissionais', CANDIDATO_UID),
        perfil({ email: CANDIDATO_EMAIL.toUpperCase() })
      )
    );
  });
});

describe('auto-cadastro — identidade', () => {
  it('criar doc de OUTRO uid é negado', async () => {
    const db = ctxCandidato().firestore();
    await assertFails(
      setDoc(doc(db, 'profissionais', OUTRO_UID), perfil({ id: OUTRO_UID }))
    );
  });

  it('`id` divergente do docId é negado', async () => {
    const db = ctxCandidato().firestore();
    await assertFails(
      setDoc(doc(db, 'profissionais', CANDIDATO_UID), perfil({ id: OUTRO_UID }))
    );
  });

  it('e-mail de TERCEIRO no próprio doc é negado', async () => {
    const db = ctxCandidato().firestore();
    await assertFails(
      setDoc(
        doc(db, 'profissionais', CANDIDATO_UID),
        perfil({ email: 'marina@demo-leela.dev' })
      )
    );
  });

  it('anônimo é negado', async () => {
    const db = testEnv.unauthenticatedContext().firestore();
    await assertFails(setDoc(doc(db, 'profissionais', CANDIDATO_UID), perfil()));
  });

  it('conta sem e-mail no token é negada (fail-closed)', async () => {
    const db = testEnv.authenticatedContext(CANDIDATO_UID, {}).firestore();
    await assertFails(setDoc(doc(db, 'profissionais', CANDIDATO_UID), perfil()));
  });
});

describe('auto-cadastro — o que a conta NÃO pode declarar', () => {
  it('`tenantId` é negado (vínculo é do resgate — RN-414)', async () => {
    const db = ctxCandidato().firestore();
    await assertFails(
      setDoc(
        doc(db, 'profissionais', CANDIDATO_UID),
        perfil({ tenantId: 'castelo-producoes' })
      )
    );
  });

  it('`papeis` é negado', async () => {
    const db = ctxCandidato().firestore();
    await assertFails(
      setDoc(doc(db, 'profissionais', CANDIDATO_UID), perfil({ papeis: ['organizador'] }))
    );
  });

  it('campo extra qualquer é negado (`hasOnly`)', async () => {
    const db = ctxCandidato().firestore();
    await assertFails(
      setDoc(doc(db, 'profissionais', CANDIDATO_UID), perfil({ cpf: '52998224725' }))
    );
  });

  it('`statusOnboarding: ativo` é negado', async () => {
    const db = ctxCandidato().firestore();
    await assertFails(
      setDoc(
        doc(db, 'profissionais', CANDIDATO_UID),
        perfil({ statusOnboarding: 'ativo' })
      )
    );
  });
});

describe('auto-cadastro — consentimento LGPD (RN-412)', () => {
  it('sem consentimento é negado', async () => {
    const db = ctxCandidato().firestore();
    const semConsentimento = perfil() as Record<string, unknown>;
    delete semConsentimento['consentimentoLgpd'];
    await assertFails(
      setDoc(doc(db, 'profissionais', CANDIDATO_UID), semConsentimento)
    );
  });

  it('consentimento sem versão ou sem finalidade é negado', async () => {
    const db = ctxCandidato().firestore();
    await assertFails(
      setDoc(
        doc(db, 'profissionais', CANDIDATO_UID),
        perfil({
          consentimentoLgpd: { versao: '', finalidade: TERMO_LGPD_FINALIDADE, aceitoEm: serverTimestamp() },
        })
      )
    );
    await assertFails(
      setDoc(
        doc(db, 'profissionais', CANDIDATO_UID),
        perfil({
          consentimentoLgpd: { versao: TERMO_LGPD_VERSAO, finalidade: '', aceitoEm: serverTimestamp() },
        })
      )
    );
  });

  it('aceite datado pelo CLIENTE é negado (só serverTimestamp)', async () => {
    const db = ctxCandidato().firestore();
    await assertFails(
      setDoc(
        doc(db, 'profissionais', CANDIDATO_UID),
        perfil({
          consentimentoLgpd: {
            versao: TERMO_LGPD_VERSAO,
            finalidade: TERMO_LGPD_FINALIDADE,
            aceitoEm: '2020-01-01',
          },
        })
      )
    );
  });
});

describe('auto-cadastro — dados fora do contrato', () => {
  it('telefone com máscara ou fora de 10–13 dígitos é negado', async () => {
    const db = ctxCandidato().firestore();
    for (const ruim of ['(48) 99999-8888', '999', '1'.repeat(14)]) {
      await assertFails(
        setDoc(doc(db, 'profissionais', CANDIDATO_UID), perfil({ telefone: ruim }))
      );
    }
  });

  it('nome e organização fora do tamanho são negados', async () => {
    const db = ctxCandidato().firestore();
    await assertFails(
      setDoc(doc(db, 'profissionais', CANDIDATO_UID), perfil({ nome: 'F' }))
    );
    await assertFails(
      setDoc(doc(db, 'profissionais', CANDIDATO_UID), perfil({ organizacao: 'x'.repeat(81) }))
    );
  });
});

describe('auto-cadastro — o doc é create-only para o cliente', () => {
  it('update e delete do próprio doc são negados', async () => {
    const db = ctxCandidato().firestore();
    const ref = doc(db, 'profissionais', CANDIDATO_UID);
    await assertSucceeds(setDoc(ref, perfil()));
    await assertFails(updateDoc(ref, { organizacao: 'Outra Produtora' }));
    await assertFails(updateDoc(ref, { statusOnboarding: 'ativo' }));
    await assertFails(deleteDoc(ref));
  });
});
