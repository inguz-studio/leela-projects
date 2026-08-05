// =============================================================================
// functions/src/cliente/meusClubes.ts
//
// `getMeusClubesEConvites` — os clubes em que a conta é membro e a caixa de
// entrada dos convites de promotor e de influenciador (S1222-T4 · RN-451).
//
// POR QUE CALLABLE. Igual às outras três da área: `clubes/{id}/membros` é
// fechada ao participante nas Rules — `allow read: if isPlatformAdmin() ||
// isTenantMember(tenantDoClubePai())`, com o comentário da própria Rule
// dizendo "membros NUNCA são públicos, mesmo em clube com visibilidade
// 'publica'". Um token `athlete` não lê nem o próprio vínculo. A saída é a
// mesma da B1: callable do próprio dono da conta, Rules intocadas.
//
// AS DUAS MÁQUINAS DE CONVITE NÃO SÃO A MESMA COISA, e nenhuma delas foi
// escrita para ser lida pelo convidado:
//
//   (1) INFLUENCIADOR (RN-316) — `eventos/{e}/afiliados/{refCodigo}`, com
//       `tipo: 'pessoa_fisica'` e `responsavelEmail` como chave do convite;
//   (2) PROMOTOR / assessoria parceira (E18) — DOIS documentos: a parceria em
//       `tenants/{t}/parceirosAssessoria/{id}` e o convite propriamente dito em
//       `clubes/{clubeId}/convites/{emailMinusculo}`, amarrados por
//       `parceriaRef` e marcados com `origem: 'assessoria_parceira'`.
//
// O QUE ESTA CAIXA NÃO FAZ, POR CONTRATO DA SPEC. Ela não aceita convite. Os
// dois docs guardam apenas o HASH do token (`tokenAceiteHash`, SHA-256,
// comparado em tempo constante no aceite), então o link NÃO é reconstituível
// aqui — e é bom que não seja: a fila escreve "a área lista o que chegou; ela
// não vira um segundo mecanismo de aceite. Duplicar o aceite duplicaria a
// superfície de credencial". A caixa mostra que o convite existe e manda a
// pessoa ao link do e-mail, que é a única credencial que existe.
//
// A FRONTEIRA POSSE-EMAIL-1 NÃO SE MOVE. O convite pendente é endereçado a um
// E-MAIL — `responsavelUid` só é carimbado NO ACEITE —, então não existe
// leitura possível por uid. O e-mail usado aqui é o do TOKEN, já exigido
// `email_verified` NATIVO pelo `resolverContaDoCliente`, e nunca um parâmetro
// do chamador. O Firebase provou posse antes da primeira leitura; a caixa é
// estritamente mais fechada que a fronteira que o item de painel discute, e o
// que ela mostra a quem provou posse do e-mail é o que já foi ENVIADO àquele
// mesmo e-mail. Nenhuma informação nova atravessa.
//
// TETO SEMPRE COM `orderBy`, E O `orderBy` É `__name__` DE PROPÓSITO (⚔ F1 da
// REV-AREACLIENTE). Limite sem ordem devolve os N primeiros por `__name__` e
// faz a ordenação em memória trabalhar sobre o conjunto errado — foi o defeito
// da F1 e ele não se repete aqui. Mas ordenar por DATA seria pior neste dado:
// documento sem o campo do `orderBy` não entra no resultado, e estas coleções
// são escritas por máquinas diferentes (o reenvio de convite faz `merge` sem
// `criadoEm`; o membro de seed e o de mutation não têm os mesmos campos). Um
// corte declarado é honesto; uma perda calada é o defeito que esta rodada
// existe para não repetir. `__name__` existe em todo documento, lê-se TETO+1
// para SABER que cortou, e a ordenação de exibição roda em memória sobre o
// conjunto COMPLETO quando não houve corte — que é quando ela vale.
//
// Zero PII em log (LGPD): só uid, contagens e flags.
// =============================================================================

import * as admin from 'firebase-admin';
import { createHash } from 'crypto';
import { FieldPath } from 'firebase-admin/firestore';
import { https } from 'firebase-functions/v1';
import * as logger from 'firebase-functions/logger';
import { COLECAO_AFILIADOS } from '@leela/core';
import {
  callerDoToken,
  resolverContaDoCliente,
  type CallerAreaCliente,
  type Db,
  type EstadoAreaCliente,
} from './gateAreaCliente';
import { isoDoCampo, millisDoCampo } from './leituraArea';

// ---------------------------------------------------------------------------
// Contratos
// ---------------------------------------------------------------------------

/** Papel dentro do clube (RN-103). */
export type PapelNoClube = 'owner' | 'admin' | 'membro';

/** Status do vínculo, DERIVADO por data pela Function (RN-102). */
export type StatusNoClube = 'ativo' | 'novo' | 'inativo';

/** Um clube em que esta conta é membro. */
export interface ClubeDaConta {
  /** Chave estável de render — opaca, ver `chaveOpaca`. */
  chave: string;
  nome: string;
  papel: PapelNoClube;
  status: StatusNoClube;
  /** Desde quando, ISO 8601. null = carimbo ilegível. */
  entrouEmIso: string | null;
}

/** De qual das duas máquinas o convite veio. */
export type TipoConvite = 'influenciador' | 'promotor';

/**
 * Em que pé está o convite. `expirado` e `aceito` existem porque sumir com
 * eles produziria a lista vazia que mente (RN-451): quem recebeu um convite e
 * não o encontra na caixa conclui que o convite nunca chegou.
 */
export type EstadoConvite = 'pendente' | 'expirado' | 'aceito';

/** Uma linha da caixa de convites. */
export interface ConviteDaConta {
  /** Chave estável de render — opaca, ver `chaveOpaca`. */
  chave: string;
  tipo: TipoConvite;
  estado: EstadoConvite;
  /** Nome da experiência (influenciador) ou do clube (promotor). */
  origemNome: string;
  /** Quando o convite foi enviado, ISO 8601. */
  convidadoEmIso: string | null;
  /** Prazo do link, ISO 8601. null = sem prazo declarado no doc. */
  expiraEmIso: string | null;
}

export interface GetMeusClubesEConvitesResult {
  estado: EstadoAreaCliente;
  clubes: ClubeDaConta[];
  convites: ConviteDaConta[];
  /** false = a lista de clubes foi cortada ou falhou; a tela precisa dizer. */
  clubesCompletos: boolean;
  /** false = a caixa de convites foi cortada ou falhou; a tela precisa dizer. */
  convitesCompletos: boolean;
}

/**
 * Tetos de leitura. Uma pessoa com mais de 50 clubes, ou 50 convites de uma
 * mesma natureza, é caso de paginação — e a lista DIZ que cortou em vez de
 * fingir que aquilo é tudo.
 */
export const TETO_CLUBES_DA_CONTA = 50;
export const TETO_CONVITES_DA_CONTA = 50;

/** Marca do convite de assessoria parceira em `clubes/{id}/convites` (E18). */
const ORIGEM_ASSESSORIA = 'assessoria_parceira';

// ---------------------------------------------------------------------------
// Auxiliares
// ---------------------------------------------------------------------------

/**
 * Chave de render derivada do CAMINHO do documento, não do id.
 *
 * O `refCodigo` do afiliado e o `parceriaId` são ids internos que a tela não
 * mostra, e o princípio escrito no cabeçalho do `minhasCompras.ts` vale aqui:
 * a lista devolve o que a lista mostra. Mandar id não renderizado através da
 * fronteira é como um campo vaza para um log sem ninguém querer. O hash é
 * estável entre leituras (a mesma linha mantém a mesma chave) e não volta a
 * ser caminho nenhum.
 */
function chaveOpaca(path: string): string {
  return createHash('sha256').update(path, 'utf8').digest('hex').slice(0, 16);
}

function texto(valor: unknown, max = 120): string {
  return typeof valor === 'string' ? valor.slice(0, max) : '';
}

function ehPapel(v: unknown): v is PapelNoClube {
  return v === 'owner' || v === 'admin' || v === 'membro';
}

function ehStatus(v: unknown): v is StatusNoClube {
  return v === 'ativo' || v === 'novo' || v === 'inativo';
}

/**
 * Nomes de clube por id, em point read com Admin SDK.
 *
 * Precisa existir porque `clubes/{id}` só é legível pelo cliente quando a
 * visibilidade é pública ou indexável: um clube privado chegaria à tela sem
 * nome se a lista dependesse do SDK do navegador.
 */
async function lerNomes(
  db: Db,
  colecao: 'clubes' | 'eventos',
  ids: readonly string[]
): Promise<Map<string, string>> {
  const unicos = [...new Set(ids)].filter((id) => id.length > 0);
  const mapa = new Map<string, string>();
  if (unicos.length === 0) return mapa;
  try {
    const snaps = await db.getAll(...unicos.map((id) => db.collection(colecao).doc(id)));
    for (const snap of snaps) {
      if (!snap.exists) continue;
      mapa.set(snap.id, texto(snap.get('nome')));
    }
  } catch (err) {
    // ⚔ REV-B4 · a resolução de NOME é enfeite; a lista é o dado. Este
    // `getAll` estava FORA do `try` das três queries, então uma
    // indisponibilidade de point read subia pelo `Promise.all` do núcleo, o
    // callable devolvia `internal` e o `Promise.all` da tela
    // (`AreaDoCliente.tsx`) mandava a ÁREA INTEIRA para o estado de falha —
    // levando junto compras e ingressos, que não têm nada com isso. O desenho
    // declarado é o oposto: "são leituras independentes, e derrubar as duas
    // por causa de uma esconderia o convite que a pessoa precisa ver".
    // Sem nome, a linha continua aparecendo com o rótulo genérico da tela.
    logger.error('area_cliente_nomes_falhou', {
      colecao,
      qtd: unicos.length,
      alerta: true,
      err: err instanceof Error ? err.message : String(err),
    });
  }
  return mapa;
}

/** Nomes de clube por id. */
async function lerNomesDeClubes(
  db: Db,
  clubeIds: readonly string[]
): Promise<Map<string, string>> {
  return lerNomes(db, 'clubes', clubeIds);
}

/** Nomes de experiência por id — mesma disciplina, para o convite de afiliado. */
async function lerNomesDeEventos(
  db: Db,
  eventoIds: readonly string[]
): Promise<Map<string, string>> {
  return lerNomes(db, 'eventos', eventoIds);
}

/** Convite vencido? Sem prazo no doc, não se afirma vencimento. */
function expirou(expiraEmMillis: number | null, agoraMillis: number): boolean {
  return expiraEmMillis !== null && expiraEmMillis <= agoraMillis;
}

// ---------------------------------------------------------------------------
// Os clubes da conta
// ---------------------------------------------------------------------------

interface LeituraClubes {
  clubes: ClubeDaConta[];
  completa: boolean;
}

/**
 * `collectionGroup('membros')` filtrado por `atletaId == uid`.
 *
 * O escopo vem do TOKEN, nunca de input — o mesmo invariante que o
 * `getMinhasAfiliacoes` (`affiliation/readers.ts`) declara para a query
 * equivalente do influenciador. Iterar `clubes` seria o padrão do
 * `membrosAggregates`, mas aquilo é cron que precisa varrer tudo de qualquer
 * jeito; aqui a varredura da plataforma inteira pagaria por dois ou três
 * vínculos de uma pessoa, a cada abertura de tela.
 */
export async function lerClubesDaConta(
  db: Db,
  uid: string
): Promise<LeituraClubes> {
  let snap;
  try {
    snap = await db
      .collectionGroup('membros')
      .where('atletaId', '==', uid)
      .orderBy(FieldPath.documentId())
      .limit(TETO_CLUBES_DA_CONTA + 1)
      .get();
  } catch (err) {
    // Índice de grupo ausente (deploy pendente) ou indisponibilidade. A caixa
    // de convites NÃO morre junto: são duas leituras independentes, e derrubar
    // as duas por causa de uma esconderia o convite que a pessoa precisa ver.
    logger.error('area_cliente_clubes_falhou', {
      uid,
      alerta: true,
      err: err instanceof Error ? err.message : String(err),
    });
    return { clubes: [], completa: false };
  }

  const completa = snap.size <= TETO_CLUBES_DA_CONTA;
  const docs = snap.docs.slice(0, TETO_CLUBES_DA_CONTA);
  const clubeIds = docs.map((d) => d.ref.parent.parent?.id ?? '');
  const nomes = await lerNomesDeClubes(db, clubeIds);

  const clubes: ClubeDaConta[] = [];
  for (const doc of docs) {
    const clubeId = doc.ref.parent.parent?.id;
    if (clubeId === undefined || clubeId.length === 0) continue;
    const papel = doc.get('papel');
    const status = doc.get('status');
    clubes.push({
      chave: chaveOpaca(doc.ref.path),
      // Clube apagado depois do vínculo continua sendo um vínculo; a tela
      // resolve o nome ausente, e sumir com a linha seria a lista que mente.
      nome: nomes.get(clubeId) ?? '',
      papel: ehPapel(papel) ? papel : 'membro',
      // Status fora do enum degrada para 'ativo': o vínculo existe, e o enum
      // torto de um doc antigo não é motivo para chamar alguém de inativo.
      status: ehStatus(status) ? status : 'ativo',
      entrouEmIso: isoDoCampo(doc.get('entrouEm')),
    });
  }

  // Ordenação de EXIBIÇÃO, em memória e sobre o conjunto completo: o mais
  // recente primeiro, desempate estável pela chave.
  clubes.sort((a, b) => {
    const ma = a.entrouEmIso === null ? 0 : Date.parse(a.entrouEmIso);
    const mb = b.entrouEmIso === null ? 0 : Date.parse(b.entrouEmIso);
    if (mb !== ma) return mb - ma;
    return a.chave < b.chave ? -1 : 1;
  });

  return { clubes, completa };
}

// ---------------------------------------------------------------------------
// A caixa de convites — máquina (1), influenciador (RN-316)
// ---------------------------------------------------------------------------

interface LeituraConvites {
  convites: ConviteDaConta[];
  completa: boolean;
}

export async function lerConvitesDeInfluenciador(
  db: Db,
  uid: string,
  email: string,
  agoraMillis: number
): Promise<LeituraConvites> {
  let snap;
  try {
    snap = await db
      .collectionGroup(COLECAO_AFILIADOS)
      .where('responsavelEmail', '==', email)
      .orderBy(FieldPath.documentId())
      .limit(TETO_CONVITES_DA_CONTA + 1)
      .get();
  } catch (err) {
    logger.error('area_cliente_convites_influenciador_falhou', {
      uid,
      alerta: true,
      err: err instanceof Error ? err.message : String(err),
    });
    return { convites: [], completa: false };
  }

  const completa = snap.size <= TETO_CONVITES_DA_CONTA;
  const docs = snap.docs.slice(0, TETO_CONVITES_DA_CONTA);
  const eventoIds = docs.map((d) => d.ref.parent.parent?.id ?? '');
  const nomes = await lerNomesDeEventos(db, eventoIds);

  const convites: ConviteDaConta[] = [];
  for (const doc of docs) {
    const eventoId = doc.ref.parent.parent?.id;
    if (eventoId === undefined || eventoId.length === 0) continue;
    // Afiliado do tipo 'clube' não é convite de pessoa: ele nasce ativo, sem
    // e-mail e sem token (a entidade documenta os dois ciclos). A igualdade de
    // e-mail acima já o excluiria; a checagem é explícita porque o dia em que
    // alguém carimbar `responsavelEmail` num afiliado de clube não pode virar
    // um convite fantasma na caixa de outra pessoa.
    if (doc.get('tipo') !== 'pessoa_fisica') continue;

    const status = doc.get('status');
    if (status !== 'convite_pendente' && status !== 'ativo') continue;
    // ⚔ REV-B4 · `ativo` NÃO é sinônimo de "aceitou". O `salvarAfiliado`
    // (RN-316) cria o afiliado PF já `ativo`, sem token e sem convite nenhum,
    // quando o e-mail JÁ tem conta VERIFICADA — que é o caso comum de quem
    // abre esta tela. Sem esta linha, a caixa dizia "Você já aceitou este
    // convite" para quem nunca recebeu convite e nunca aceitou nada: a tela
    // que mente, com outra roupa. `aceitoEm` é carimbado SÓ pelo aceite por
    // token (`provisionAfiliado.ts`), então ele é a prova do ato. Vínculo
    // direto continua visível onde ele é — `getMinhasAfiliacoes`.
    if (status === 'ativo' && millisDoCampo(doc.get('aceitoEm')) === null) continue;

    const expiraEmMillis = millisDoCampo(doc.get('expiraEm'));
    const estado: EstadoConvite =
      status === 'ativo'
        ? 'aceito'
        : expirou(expiraEmMillis, agoraMillis)
          ? 'expirado'
          : 'pendente';

    convites.push({
      chave: chaveOpaca(doc.ref.path),
      tipo: 'influenciador',
      estado,
      origemNome: nomes.get(eventoId) ?? '',
      convidadoEmIso: isoDoCampo(doc.get('criadoEm')),
      expiraEmIso: isoDoCampo(doc.get('expiraEm')),
    });
  }
  return { convites, completa };
}

// ---------------------------------------------------------------------------
// A caixa de convites — máquina (2), promotor / assessoria parceira (E18)
// ---------------------------------------------------------------------------

export async function lerConvitesDePromotor(
  db: Db,
  uid: string,
  email: string,
  agoraMillis: number
): Promise<LeituraConvites> {
  let snap;
  try {
    snap = await db
      .collectionGroup('convites')
      .where('email', '==', email)
      .orderBy(FieldPath.documentId())
      .limit(TETO_CONVITES_DA_CONTA + 1)
      .get();
  } catch (err) {
    logger.error('area_cliente_convites_promotor_falhou', {
      uid,
      alerta: true,
      err: err instanceof Error ? err.message : String(err),
    });
    return { convites: [], completa: false };
  }

  const completa = snap.size <= TETO_CONVITES_DA_CONTA;
  const docs = snap.docs.slice(0, TETO_CONVITES_DA_CONTA);
  const clubeIds = docs.map((d) => d.ref.parent.parent?.id ?? '');
  const nomes = await lerNomesDeClubes(db, clubeIds);

  const convites: ConviteDaConta[] = [];
  for (const doc of docs) {
    // ⚠️ EXISTEM DUAS SUBCOLEÇÕES `convites` NO BANCO, de entidades
    // diferentes: `clubes/{id}/convites/{email}` (esta) e
    // `desafios/{id}/convites/{uid}` (jornada), e o `collectionGroup` alcança
    // as duas. A igualdade de `email` já exclui a segunda por construção — o
    // doc de desafio é chaveado por uid e não tem o campo —, mas a exclusão
    // seria ACIDENTAL, e uma exclusão acidental é a que morre no dia em que
    // alguém acrescentar um campo. O pai é conferido explicitamente.
    if (doc.ref.parent.parent?.parent.id !== 'clubes') continue;

    // Só o convite de PROMOTOR (assessoria parceira, E18) entra na caixa. O
    // convite de MEMBRO COMUM de clube (E05-S104) mora nesta mesma coleção e
    // se distingue pela AUSÊNCIA da origem — e ele não é listado de propósito:
    // não existe, hoje, Function que transforme `convites/{email}` em
    // `membros/{id}`. Listá-lo seria desenhar um cartão que promete uma
    // entrada que o produto não tem. Está registrado no handoff da lane como
    // item de painel do dono.
    if (doc.get('origem') !== ORIGEM_ASSESSORIA) continue;
    // A amarração com a parceria é parte da identidade do convite E18 (o
    // aceite confere os dois). Convite sem ela é doc pela metade.
    if (typeof doc.get('parceriaRef') !== 'string') continue;

    const clubeId = doc.ref.parent.parent?.id;
    if (clubeId === undefined || clubeId.length === 0) continue;

    const status = doc.get('status');
    if (status !== 'pendente' && status !== 'aceito') continue;

    const expiraEmMillis = millisDoCampo(doc.get('expiraEm'));
    const estado: EstadoConvite =
      status === 'aceito'
        ? 'aceito'
        : expirou(expiraEmMillis, agoraMillis)
          ? 'expirado'
          : 'pendente';

    convites.push({
      chave: chaveOpaca(doc.ref.path),
      tipo: 'promotor',
      estado,
      origemNome: nomes.get(clubeId) ?? '',
      // O reenvio idempotente (RN-106) faz `merge` e nem sempre reescreve
      // `criadoEm`; `enviadoEm` é o carimbo que toda escrita atualiza.
      convidadoEmIso: isoDoCampo(doc.get('enviadoEm') ?? doc.get('criadoEm')),
      expiraEmIso: isoDoCampo(doc.get('expiraEm')),
    });
  }
  return { convites, completa };
}

// ---------------------------------------------------------------------------
// Núcleo (testável com Admin SDK contra o Emulator; callable é wrapper fino)
// ---------------------------------------------------------------------------

export async function getMeusClubesEConvitesCore(
  db: Db,
  caller: CallerAreaCliente,
  agora: Date = new Date()
): Promise<GetMeusClubesEConvitesResult> {
  const resolucao = await resolverContaDoCliente(db, caller);
  if (resolucao.estado !== 'ok') {
    return {
      estado: resolucao.estado,
      clubes: [],
      convites: [],
      clubesCompletos: true,
      convitesCompletos: true,
    };
  }

  const agoraMillis = agora.getTime();
  const { email, uid } = resolucao.conta;

  // As três leituras são independentes e vão juntas: são a MESMA aba, e servir
  // uma de cada vez faria a tela piscar em três tempos.
  const [clubes, influenciador, promotor] = await Promise.all([
    lerClubesDaConta(db, uid),
    lerConvitesDeInfluenciador(db, uid, email, agoraMillis),
    lerConvitesDePromotor(db, uid, email, agoraMillis),
  ]);

  const convites = [...influenciador.convites, ...promotor.convites];
  // Pendente primeiro — é a única linha sobre a qual ainda cabe uma ação —,
  // depois expirado, depois aceito; dentro de cada grupo, o mais recente na
  // frente, com desempate estável.
  const PESO: Record<EstadoConvite, number> = { pendente: 0, expirado: 1, aceito: 2 };
  convites.sort((a, b) => {
    if (PESO[a.estado] !== PESO[b.estado]) return PESO[a.estado] - PESO[b.estado];
    const ma = a.convidadoEmIso === null ? 0 : Date.parse(a.convidadoEmIso);
    const mb = b.convidadoEmIso === null ? 0 : Date.parse(b.convidadoEmIso);
    if (mb !== ma) return mb - ma;
    return a.chave < b.chave ? -1 : 1;
  });

  logger.info('area_cliente_clubes_convites', {
    uid: caller.uid,
    qtdClubes: clubes.clubes.length,
    qtdConvites: convites.length,
    clubesCompletos: clubes.completa,
    convitesCompletos: influenciador.completa && promotor.completa,
  }); // sem PII

  return {
    estado: 'ok',
    clubes: clubes.clubes,
    convites,
    clubesCompletos: clubes.completa,
    convitesCompletos: influenciador.completa && promotor.completa,
  };
}

// ---------------------------------------------------------------------------
// Callable
// ---------------------------------------------------------------------------

/** Meus Clubes e a caixa de convites do próprio dono da conta (RN-451). */
export const getMeusClubesEConvites = https.onCall(async (_data: unknown, context) => {
  if (!context.auth) {
    throw new https.HttpsError('unauthenticated', 'Requer autenticação.');
  }
  return getMeusClubesEConvitesCore(
    admin.firestore(),
    callerDoToken(context.auth as Parameters<typeof callerDoToken>[0])
  );
});
