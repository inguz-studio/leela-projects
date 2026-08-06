// =============================================================================
// functions/src/platform/promoverParaProfissional.ts
//
// Cloud Function callable: virar profissional a partir da área do cliente
// (E12 · S1234-T1 · RN-512, com destino na RN-514).
//
// Contrato:
//   promoverParaProfissional({ aceiteTermo: true })
//     -> { statusOnboarding: 'aguardando_convite', jaExistia: boolean }
//
// -----------------------------------------------------------------------------
// POR QUE ESTA FUNCTION EXISTE
// -----------------------------------------------------------------------------
// A área do cliente mandava a participante LOGADA para o `/cadastrar` do
// painel, que chama `criarContaComEmail`. O e-mail dela já existe no Auth, o
// Firebase devolve `auth/email-already-in-use` e a máscara anti-enumeração —
// que está certa e não muda — engole o erro. Ela ficava sem caminho.
//
// A RN-512 diz o que fazer no lugar: virar profissional é PROMOÇÃO da conta
// que já existe. Esta Function é o gesto de promoção, e ela é a única peça de
// servidor que a ponte precisa.
//
// -----------------------------------------------------------------------------
// O QUE ELA NÃO CONCEDE — e é isto que faz dela uma ponte, não um portão
// -----------------------------------------------------------------------------
// Nenhum custom claim é tocado aqui. Não há `setCustomUserClaims` neste
// arquivo, e não pode passar a haver: a promoção NÃO dá tenant, NÃO dá papel e
// NÃO dá capacidade de plataforma. O que ela concede é o documento
// `profissionais/{uid}` que a guarda de conta órfã do `destinoPosLogin`
// procura — e o destino, por construção da RN-510, é a VITRINE, que não faz
// consulta tenant-scoped nenhuma. O pior desfecho de um abuso é alguém ver a
// vitrine. A prova disso é teste em nome próprio (S1234-T3), não presunção.
//
// -----------------------------------------------------------------------------
// O TERMO NÃO NASCE AQUI (RN-466)
// -----------------------------------------------------------------------------
// O termo do profissional já existe: `TERMO_LGPD_VERSAO`/`TERMO_LGPD_FINALIDADE`
// do core, o MESMO que o `criarPerfilOrganizador` carimba em
// `profissionais/{uid}.consentimentoLgpd`. Criar constante nova aqui seria a
// segunda autoridade sobre o mesmo texto, e no dia em que ele mudasse uma das
// duas superfícies carimbaria a versão errada — a divergência que a RN-466
// existe para impedir.
//
// O INSTANTE É DO SERVIDOR (RN-446). Aceite datado pelo cliente é recusado, e
// não silenciosamente ignorado: um payload que traga data ou versão do termo é
// uma tela tentando carimbar consentimento, e ela não tem autoridade para isso.
//
// -----------------------------------------------------------------------------
// IDEMPOTÊNCIA NÃO É HIGIENE AQUI (RN-512, fluxo C)
// -----------------------------------------------------------------------------
// A área do cliente é uma tela de leitura. Um duplo clique não pode produzir
// dois estados de onboarding, nem recoletar consentimento já carimbado
// (RN-467). A decisão "existe ou não" acontece DENTRO de uma transação — duas
// chamadas simultâneas são serializadas pelo Firestore, uma escreve e a outra
// relê o doc pronto e devolve `jaExistia: true`. Um `get` seguido de `set`
// fora de transação deixaria a janela em que as duas leem "não existe".
//
// -----------------------------------------------------------------------------
// A LEITURA DA RN-449 QUE ELA HERDA
// -----------------------------------------------------------------------------
// A recusa da conta de administração usa o PAPEL LITERAL (`role ===
// 'platform_admin'`), e não `isPlatformAdmin`. É a mesma leitura pinada em
// `apps/landing/lib/portaOrganizador.ts`: a pergunta é "esta conta é SÓ da
// plataforma?", não "esta conta administra a plataforma?". Desde a PAPEL-DUPLO
// a administração é CAPACIDADE e coexiste com papel operacional — o dono é
// `tenant_owner` da produtora dele E administra a plataforma. Com
// `isPlatformAdmin` ele seria recusado aqui, e a ponte perderia exatamente a
// conta mais legítima do sistema.
//
// Zero PII em log: uid e flags.
// =============================================================================

import * as admin from 'firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { https } from 'firebase-functions/v1';
import * as logger from 'firebase-functions/logger';
import { TERMO_LGPD_FINALIDADE, TERMO_LGPD_VERSAO } from '@leela/core';

// ---------------------------------------------------------------------------
// Contratos
// ---------------------------------------------------------------------------

export interface PromoverParaProfissionalInput {
  /** Aceite do termo do profissional, colhido na tela (RN-466). */
  aceiteTermo: boolean;
}

export interface PromoverParaProfissionalResult {
  /** Sempre `aguardando_convite` (RN-411) — a ponte não ativa ninguém. */
  statusOnboarding: 'aguardando_convite';
  /** true = a conta já alcançava o painel profissional; nada foi escrito. */
  jaExistia: boolean;
}

/**
 * As recusas, nomeadas. Viajam em `details.motivo` para que a tela escolha a
 * frase sem reconstruir a regra a partir do código HTTP — e para que nenhuma
 * delas precise sair como `internal`, que é a lição do DEF-B da ONBOARD-REV.
 */
export type MotivoRecusaPromocao =
  | 'sem_sessao'
  | 'sessao_anonima'
  | 'conta_de_plataforma'
  | 'aceite_ausente'
  | 'aceite_datado_pelo_cliente';

/** O chamador, já destrinchado do token. */
export interface CallerPromocao {
  uid: string;
  /** Provedor `anonymous` (ou ausente) — sessão do checkout, não da ponte. */
  ehAnonimo: boolean;
  email: string | null;
  /** `name` do token, quando existe. Nunca inventado a partir do e-mail. */
  nome: string | null;
  /** Papel LITERAL da claim. Ver a nota da RN-449 no topo. */
  role: string | null;
  /** Tenant carimbado na claim, quando existe. */
  tenantId: string | null;
}

type Db = admin.firestore.Firestore;

const COLECAO_PROFISSIONAIS = 'profissionais';

/** Recusa tipada, com motivo legível pela tela. Nunca `internal`. */
function recusa(
  code: 'unauthenticated' | 'permission-denied' | 'failed-precondition' | 'invalid-argument',
  motivo: MotivoRecusaPromocao,
  mensagem: string
): https.HttpsError {
  return new https.HttpsError(code, mensagem, { motivo });
}

/**
 * Campos que o cliente NÃO pode mandar junto do aceite (RN-446). A presença de
 * qualquer um deles é uma tela tentando datar ou versionar o consentimento —
 * quem data é o servidor, e aceite datado pelo titular não vale como prova.
 */
const CAMPOS_DE_CARIMBO = ['aceitoEm', 'aceitoem', 'versao', 'consentimentoLgpd', 'criadoEm'];

/**
 * Traduz o token de um callable para o contrato do chamador. Isolado do
 * `onCall` para que o core seja testável sem emulator — e porque a checagem de
 * anônimo é exatamente o tipo de linha que some numa segunda tradução.
 */
export function callerDaPromocao(auth: {
  uid: string;
  token: {
    email?: string;
    name?: string;
    role?: unknown;
    tenantId?: unknown;
    firebase?: { sign_in_provider?: string };
  };
}): CallerPromocao {
  const provider = auth.token.firebase?.sign_in_provider;
  return {
    uid: auth.uid,
    // Provedor ausente é tratado como anônimo (fail-closed): token sem
    // procedência declarada não prova identidade nomeada.
    ehAnonimo: provider === undefined || provider === 'anonymous',
    email: typeof auth.token.email === 'string' ? auth.token.email : null,
    nome: typeof auth.token.name === 'string' ? auth.token.name : null,
    role: typeof auth.token.role === 'string' ? auth.token.role : null,
    tenantId: typeof auth.token.tenantId === 'string' ? auth.token.tenantId : null,
  };
}

// ---------------------------------------------------------------------------
// Core
// ---------------------------------------------------------------------------

/**
 * A promoção, sem o wrapper de transporte. Recebe o db e o chamador já lidos.
 */
export async function promoverParaProfissionalCore(
  db: Db,
  caller: CallerPromocao,
  rawInput: unknown
): Promise<PromoverParaProfissionalResult> {
  // ── 1. O aceite, antes de tudo (RN-446/RN-466) ─────────────────────────
  const input = (rawInput ?? {}) as Record<string, unknown>;
  for (const campo of CAMPOS_DE_CARIMBO) {
    if (input[campo] !== undefined) {
      throw recusa(
        'invalid-argument',
        'aceite_datado_pelo_cliente',
        'O aceite é registrado pelo servidor. Recarregue a página e tente de novo.'
      );
    }
  }
  if (input['aceiteTermo'] !== true) {
    throw recusa(
      'invalid-argument',
      'aceite_ausente',
      'Aceite o termo do profissional para continuar.'
    );
  }

  // ── 2. A sessão precisa ser NOMEADA ────────────────────────────────────
  // Sem e-mail cai aqui pelo mesmo motivo do anônimo: promover uma conta sem
  // endereço criaria um profissional que o time Leela não tem como alcançar.
  const email = caller.email?.trim().toLowerCase() ?? '';
  if (caller.ehAnonimo || email.length === 0) {
    throw recusa(
      'failed-precondition',
      'sessao_anonima',
      'Entre com o e-mail da sua conta para conhecer o painel profissional.'
    );
  }

  // ── 3. RN-449 — administração da plataforma não acumula ────────────────
  if (caller.role === 'platform_admin') {
    throw recusa(
      'permission-denied',
      'conta_de_plataforma',
      'Esta conta administra a plataforma e não vira conta de profissional.'
    );
  }

  // ── 4. Quem já tem tenant já é profissional: sucesso sem escrita ───────
  // A conta com tenant tem o doc desde o `provisionTenant`; escrever
  // `aguardando_convite` por cima rebaixaria quem já está ativo.
  if (caller.tenantId !== null && caller.tenantId.length > 0) {
    logger.info('promocao_profissional', { uid: caller.uid, jaExistia: true, viaTenant: true });
    return { statusOnboarding: 'aguardando_convite', jaExistia: true };
  }

  // ── 5. A criação, dentro da transação que decide o duplo clique ────────
  const ref = db.collection(COLECAO_PROFISSIONAIS).doc(caller.uid);
  const jaExistia = await db.runTransaction<boolean>(async (tx) => {
    const snap = await tx.get(ref);
    if (snap.exists) return true; // RN-467: consentimento carimbado não se recolhe.

    tx.set(ref, {
      id: caller.uid,
      nome: caller.nome?.trim() ?? '',
      email,
      // A ponte não tem formulário. Os dois campos ficam vazios de propósito e
      // o resgate do código já sabe cair no nome e depois no e-mail
      // (`sementeDoSlug`) — a pessoa preenche o perfil dela no painel.
      telefone: '',
      organizacao: '',
      statusOnboarding: 'aguardando_convite',
      consentimentoLgpd: {
        versao: TERMO_LGPD_VERSAO,
        finalidade: TERMO_LGPD_FINALIDADE,
        aceitoEm: FieldValue.serverTimestamp(),
      },
      criadoEm: FieldValue.serverTimestamp(),
      atualizadoEm: FieldValue.serverTimestamp(),
    });
    return false;
  });

  logger.info('promocao_profissional', { uid: caller.uid, jaExistia, viaTenant: false });
  return { statusOnboarding: 'aguardando_convite', jaExistia };
}

// ---------------------------------------------------------------------------
// Callable
// ---------------------------------------------------------------------------

/** A ponte da área do cliente para o painel profissional (RN-512). */
export const promoverParaProfissional = https.onCall(async (data: unknown, context) => {
  if (!context.auth) {
    throw recusa('unauthenticated', 'sem_sessao', 'Entre na sua conta para continuar.');
  }
  return promoverParaProfissionalCore(
    admin.firestore(),
    callerDaPromocao(context.auth as Parameters<typeof callerDaPromocao>[0]),
    data
  );
});
