// =============================================================================
// functions/src/platform/liberarAcessoOrganizador.ts
//
// Callable `liberarAcessoOrganizador` (ADMIN-VISAO onda 5 · S1615-T3 · RN-548
// · RN-551 · história S1616).
//
// A SEGUNDA PORTA da aprovação: o administrador libera uma conta que está
// esperando, SEM código. A primeira porta é o resgate (RN-414, intocada).
//
// -----------------------------------------------------------------------------
// DUAS PORTAS, UM DESTINO SÓ (RN-548)
// -----------------------------------------------------------------------------
// As duas terminam no MESMO estado terminal, produzido pelo MESMO núcleo:
// `provisionTenantCore`. Não existe segunda máquina de aprovação aqui — este
// arquivo é a porta, não o motor. O que ele faz é o que a porta tem de fazer:
// resolve a conta, aplica a MESMA régua de elegibilidade
// (`contaElegivelParaPapelDeOrganizador`), semeia o endereço da organização e
// entrega ao núcleo. Tudo o que vem depois — tenant `ativo`, doc `'ativo'` com
// `tenantId` e `papeis`, claims `tenant_owner`+`tenantId` com refresh revogado,
// rollback compensatório — é do núcleo, byte a byte igual ao resgate.
//
// O que MUDA de propósito entre as portas, e é rastro e não estado: o
// `callerUid` que o núcleo carimba em `tenants/{slug}.atualizadoPor`. No
// resgate é a própria pessoa; aqui é o ADMINISTRADOR, porque foi ele quem agiu.
// A RN-551 quer exatamente isso registrado — quem, quando, sobre quem, por qual
// porta.
//
// -----------------------------------------------------------------------------
// A EXCEÇÃO `athlete` — POR QUE ELA É A MESMA, E NÃO UMA NOVA
// -----------------------------------------------------------------------------
// `onCreateUser` dá claim `athlete` por default a TODA conta nova (RN-411),
// inclusive à do organizador que acabou de se cadastrar. O
// `provisionTenantCore` recusa promover conta com papel conflitante (guarda do
// review Onda1 #2), e sem uma autorização explícita isso barraria TODA
// liberação — o caso legítimo mais comum do produto viraria erro.
//
// A autorização usada é `ProvisionOptions.autoCadastroUid`, com o uid do ALVO.
// O nome da opção fala do resgate (a conta provisionando para si mesma) e aqui
// quem age é o administrador — a leitura precisa ficar escrita, e fica: o
// CONJUNTO de contas que atravessa é EXATAMENTE o mesmo dos dois lados, porque
// a régua é a mesma função (`contaElegivelParaPapelDeOrganizador`, aplicada
// AQUI antes da chamada) e a exceção do núcleo continua estreita — só `athlete`
// LIMPO, nunca `athlete` com `demotedFromRole`, nunca papel algum além disso.
// Nenhuma permissão nova é criada; o que muda é quem aperta o botão.
//
// Renomear a opção para algo como `promocaoAutorizadaParaUid` seria o conserto
// certo, e ele mora em `provisionTenant.ts` — arquivo com histórico, fora do
// território desta lane. Fica declarado aqui e no relatório.
//
// -----------------------------------------------------------------------------
// A RECUSA TEM NOME (RN-548)
// -----------------------------------------------------------------------------
// O portão do código responde a TODOS os "não" com a mesma frase, e está certo:
// lá do outro lado pode haver alguém tentando adivinhar códigos (RN-414,
// anti-enumeração). Aqui não há o que enumerar e quem chama é o operador da
// plataforma — devolver "não deu" a quem precisa consertar o estado seria
// esconder o trabalho dele. Cada recusa vem com `details.motivo` e uma frase de
// operador.
//
// -----------------------------------------------------------------------------
// RASTRO (RN-551)
// -----------------------------------------------------------------------------
// Todo desfecho identificado entra em `auditoriaAcessos` com a porta nomeada —
// concedido E negado —, gravado FORA de transação e ANTES do throw. Sem export
// (a RN-540 vale para o rastro). Sem uid autenticado não há a quem atribuir a
// tentativa: `unauthenticated` não registra.
// =============================================================================

import * as admin from 'firebase-admin';
import { https } from 'firebase-functions/v1';
import * as logger from 'firebase-functions/logger';
import {
  derivarSlugOrganizacao,
  isPlatformAdmin,
  type AuthClaims,
  type ProvisionInput,
} from '@leela/core';
import { registrarAcessoAuditado } from '../shared/auditoriaAcessos';
import {
  contaElegivelParaPapelDeOrganizador,
  type ClaimsDeElegibilidade,
} from './elegibilidadeOrganizador';
import { provisionTenantCore } from './provisionTenant';

type Db = admin.firestore.Firestore;

// ---------------------------------------------------------------------------
// Contratos
// ---------------------------------------------------------------------------

/** Família do acesso na trilha (RN-551) — é por ela que a consulta filtra. */
export const TIPO_ACESSO_LIBERACAO = 'aprovacao_organizador';

/**
 * A porta por onde a aprovação passou (RN-551). O resgate do código carimba a
 * própria trilha dele (`resgate_convite_organizador` no log); esta constante é
 * a da porta administrativa, e existe para que a consulta ao livro saiba
 * separar as duas sem adivinhar por campo ausente.
 */
export const PORTA_LIBERACAO_DIRETA = 'liberacao_direta';

/** Os "não" que a porta administrativa NOMEIA (o operador não é atacante). */
export type MotivoRecusaLiberacao =
  /** Não existe conta no Auth com esse uid. */
  | 'conta_inexistente'
  /** A conta não tem e-mail — o provisionamento resolve owner POR e-mail. */
  | 'conta_sem_email'
  /** A régua da RN-414 recusa o papel que a conta carrega. */
  | 'conta_inelegivel'
  /** Nada no cadastro vira endereço de organização (mesma lição do PONTE-NOME-1). */
  | 'sem_nome_para_endereco';

export interface LiberarAcessoInput {
  /** uid da conta que espera liberação (`profissionais/{id}`). */
  contaUid: string;
}

export interface LiberarAcessoResult {
  tenantId: string;
  ownerUid: string;
  /** true = a conta já estava integralmente provisionada (retry idempotente). */
  replay: boolean;
}

export type ResultadoLiberacao =
  | 'concedido'
  | 'negado_papel'
  | `negado_${MotivoRecusaLiberacao}`;

interface Caller {
  uid: string;
  claims: AuthClaims;
}

/** Teto de sufixos ao desempatar endereço (`castelo`, `castelo-2`, …). */
const MAX_SUFIXO_SLUG = 50;

// ---------------------------------------------------------------------------
// Auditoria (RN-551 — fora de tx, antes de qualquer throw)
// ---------------------------------------------------------------------------

async function registrarAto(
  db: Db,
  registro: {
    contaUid: string;
    uid: string;
    papel: string;
    resultado: ResultadoLiberacao;
    tenantId?: string;
  }
): Promise<void> {
  // Só ids, papel, porta e desfecho — nunca nome, e-mail ou telefone.
  const { tenantId, ...resto } = registro;
  await registrarAcessoAuditado(
    db,
    TIPO_ACESSO_LIBERACAO,
    {
      ...resto,
      porta: PORTA_LIBERACAO_DIRETA,
      ...(tenantId !== undefined ? { tenantId } : {}),
    },
    TIPO_ACESSO_LIBERACAO
  );
}

/** Recusa nomeada: `details.motivo` para a tela, frase de operador na message. */
function recusa(
  motivo: MotivoRecusaLiberacao,
  frase: string
): https.HttpsError {
  return new https.HttpsError('failed-precondition', frase, { motivo });
}

// ---------------------------------------------------------------------------
// Endereço da organização
// ---------------------------------------------------------------------------

/**
 * Semente do endereço: organização do cadastro; nome; local-part do e-mail.
 * Espelha `sementeDoSlug` do resgate — a mesma ordem, para que as duas portas
 * cunhem o MESMO endereço a partir do MESMO cadastro.
 *
 * A cópia é deliberada e declarada: o original é `static` de
 * `resgatarConviteOrganizador.ts`, arquivo que esta lane não pode editar
 * (território = arquivos novos). Extrair as duas para um módulo compartilhado é
 * o conserto certo e cabe à lane que possui aquele arquivo. Isto NÃO é a
 * duplicação que a RN-548 proíbe: aquela é da máquina de aprovação, e a máquina
 * continua sendo uma só (`provisionTenantCore`).
 */
function sementeDoEndereco(
  organizacao: unknown,
  nome: unknown,
  email: string
): string {
  for (const bruto of [organizacao, nome, email.split('@')[0]]) {
    const slug = derivarSlugOrganizacao(bruto);
    if (slug.length > 0) return slug;
  }
  return '';
}

/**
 * Endereço LIVRE a partir da semente. `tenantId == slug` (determinístico), então
 * precisa ser único; o desempate é numérico e estável. Corrida entre duas
 * liberações simultâneas com o mesmo nome ainda é resolvida pelo
 * `provisionTenantCore` (que devolve `already-exists`) — aqui só evitamos o
 * caso comum.
 */
async function enderecoLivre(db: Db, base: string): Promise<string> {
  for (let i = 1; i <= MAX_SUFIXO_SLUG; i++) {
    const candidato = i === 1 ? base : `${base}-${i}`;
    const snap = await db.collection('tenants').doc(candidato).get();
    if (!snap.exists) return candidato;
  }
  throw new https.HttpsError(
    'resource-exhausted',
    'Não foi possível derivar um endereço livre para a organização — escolha outro nome de produtora antes de liberar.'
  );
}

// ---------------------------------------------------------------------------
// Núcleo (testável com Admin SDK contra o Emulator)
// ---------------------------------------------------------------------------

export async function liberarAcessoOrganizadorCore(
  db: Db,
  auth: admin.auth.Auth,
  rawInput: unknown,
  caller: Caller
): Promise<LiberarAcessoResult> {
  const input = rawInput as Partial<LiberarAcessoInput> | null;
  const contaUidBruto = input?.contaUid;

  const papel =
    typeof caller.claims.role === 'string' ? caller.claims.role : 'desconhecido';

  // ── Autorização (RN-401): predicado do core, as DUAS pernas ─────────────
  // A negativa é REGISTRADA — metade do rastro da RN-551.
  if (!isPlatformAdmin(caller.claims)) {
    await registrarAto(db, {
      contaUid: typeof contaUidBruto === 'string' ? contaUidBruto : 'ausente',
      uid: caller.uid,
      papel,
      resultado: 'negado_papel',
    });
    throw new https.HttpsError(
      'permission-denied',
      'Apenas platform_admin libera acesso de organizador — tentativa registrada (RN-551).'
    );
  }

  // Validação DEPOIS da autorização e ANTES de qualquer leitura.
  if (typeof contaUidBruto !== 'string' || contaUidBruto.length === 0) {
    throw new https.HttpsError('invalid-argument', '"contaUid" é obrigatório.');
  }
  const contaUid = contaUidBruto;
  const base = { contaUid, uid: caller.uid, papel };

  // ── A conta existe e tem e-mail ────────────────────────────────────────
  let usuario: admin.auth.UserRecord;
  try {
    usuario = await auth.getUser(contaUid);
  } catch {
    await registrarAto(db, { ...base, resultado: 'negado_conta_inexistente' });
    throw recusa(
      'conta_inexistente',
      'Não existe conta com esse identificador. A pessoa pode ter sido removida do Auth depois de aparecer na fila.'
    );
  }

  const email = usuario.email;
  if (typeof email !== 'string' || email.length === 0) {
    await registrarAto(db, { ...base, resultado: 'negado_conta_sem_email' });
    throw recusa(
      'conta_sem_email',
      'A conta precisa ter e-mail para receber acesso ao painel — o provisionamento amarra o owner ao tenant pelo endereço de e-mail.'
    );
  }

  // ── A MESMA régua de elegibilidade das duas portas (RN-548) ────────────
  // Sem segundo critério: não se confere `statusOnboarding` aqui. Acrescentar
  // uma condição que a outra porta não tem seria começar a construir a segunda
  // máquina de aprovação que a RN-548 proíbe — e o papel `tenant_owner` já é
  // recusado por esta régua, que é o caso que um teto de estado pegaria.
  const claimsDaConta = (usuario.customClaims ?? {}) as ClaimsDeElegibilidade;
  if (!contaElegivelParaPapelDeOrganizador(claimsDaConta)) {
    await registrarAto(db, { ...base, resultado: 'negado_conta_inelegivel' });
    const papelDaConta =
      typeof claimsDaConta.role === 'string' ? claimsDaConta.role : 'sem papel';
    throw recusa(
      'conta_inelegivel',
      `A conta carrega o papel '${papelDaConta}' e por isso não pode virar dona de uma produtora por esta porta (RN-414). ` +
        'Trate a conta antes — a régua é a mesma do resgate por código.'
    );
  }

  // ── Endereço da organização, a partir do cadastro ──────────────────────
  const profSnap = await db.collection('profissionais').doc(contaUid).get();
  const organizacao = profSnap.get('organizacao') as unknown;
  const nomePessoa = (profSnap.get('nome') as unknown) ?? undefined;

  const semente = sementeDoEndereco(organizacao, nomePessoa, email);
  if (semente.length === 0) {
    // Mesma lição do PONTE-NOME-1: recusar em vez de descartar em silêncio. O
    // endereço é cunhado UMA vez e vira identificador permanente.
    await registrarAto(db, { ...base, resultado: 'negado_sem_nome_para_endereco' });
    throw recusa(
      'sem_nome_para_endereco',
      'Nem a organização, nem o nome, nem o e-mail da conta viram um endereço válido para a produtora. Complete o cadastro antes de liberar.'
    );
  }

  const nomeTenant =
    typeof organizacao === 'string' && organizacao.trim().length >= 2
      ? organizacao.trim()
      : typeof nomePessoa === 'string' && nomePessoa.trim().length >= 2
        ? nomePessoa.trim()
        : (email.split('@')[0] ?? 'Organizador');

  const tenantId = await enderecoLivre(db, semente);

  // ── A MÁQUINA ÚNICA (RN-548/RN-403) ────────────────────────────────────
  const provisionInput: ProvisionInput = {
    nome: nomeTenant.slice(0, 80),
    slug: tenantId,
    tipo: 'produtor',
    ownerEmail: email,
    ...(typeof nomePessoa === 'string' && nomePessoa.trim().length > 0
      ? { ownerNome: nomePessoa.trim() }
      : {}),
  };

  const resultado = await provisionTenantCore(
    db,
    auth,
    provisionInput,
    // Quem AGIU é o administrador — é o uid dele que fica carimbado em
    // `tenants/{slug}.atualizadoPor`. É rastro (RN-551), não estado.
    caller.uid,
    undefined,
    // Ver o cabeçalho: a autorização da promoção `athlete` LIMPO → owner, com o
    // uid do ALVO. Mesma exceção estreita do resgate, mesmo conjunto de contas.
    { autoCadastroUid: contaUid }
  );

  await registrarAto(db, {
    ...base,
    resultado: 'concedido',
    tenantId: resultado.tenantId,
  });

  logger.info('liberacao_acesso_organizador', {
    callerUid: caller.uid,
    contaUid,
    tenantId: resultado.tenantId,
    replay: resultado.replay,
  });

  return resultado;
}

// ---------------------------------------------------------------------------
// Callable
// ---------------------------------------------------------------------------

/**
 * `liberarAcessoOrganizador` — a porta administrativa da aprovação, chamada
 * pelo modo Fila de `/plataforma/contas`.
 */
export const liberarAcessoOrganizador = https.onCall(
  async (data: unknown, context) => {
    if (!context.auth) {
      // Sem uid não há a quem atribuir a tentativa — nega sem registro.
      throw new https.HttpsError('unauthenticated', 'Requer autenticação.');
    }
    return liberarAcessoOrganizadorCore(admin.firestore(), admin.auth(), data, {
      uid: context.auth.uid,
      claims: context.auth.token as unknown as AuthClaims,
    });
  }
);
