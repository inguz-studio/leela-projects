// =============================================================================
// functions/src/checkout/reenviarEmailsPedido.ts
//
// REENVIO IDEMPOTENTE DOS E-MAILS DE UM PEDIDO (F2 · P0 do DIAG-PIXREAL).
//
// O buraco que este arquivo fecha: quando o provedor RECUSA a entrega, o
// pedido fica pago, o ingresso fica emitido e NINGUÉM tem como reentregar a
// mensagem. Foi o que aconteceu no primeiro pagamento real (04/08): a Brevo
// respondeu 401 nos dois e-mails do pedido por causa da trava de IPs
// autorizados da conta, e o ingresso `T93N7F` ficou represado dentro do banco.
// Não havia ferramenta de reenvio porque os dois caminhos existentes são
// idempotentes NO SENTIDO CONTRÁRIO:
//   - a emissão pula inscrito que já tem `qrToken` (e é assim que tem de ser);
//   - o e-mail de compra é at-most-once por pedido (RN-219) — a chave já foi
//     queimada pelo envio que falhou, então re-chamar devolve `ja_enviado`;
//   - o e-mail da conta só sai para conta RECÉM-CRIADA, e o carimbo
//     `contaSemFriccao` já está no pedido, então re-chamar devolve
//     `ja_processado`.
//
// O QUE ESTA FERRAMENTA NÃO FAZ (a linha que a mantém segura):
//   - NÃO emite ingresso. Lê os `qrToken`/`codigoIngresso` que já existem
//     (`lerIngressosVivosDoPedido`) e entrega os MESMOS. Re-assinar produziria
//     um token diferente depois de uma rotação de chave e mataria o ingresso
//     no balcão por `qr_divergente`, além de invalidar o link do e-mail antigo
//     (RN-420);
//   - NÃO manda lista pela metade. Inscrito confirmado sem ingresso ⇒
//     `ingresso_incompleto` e nada sai: emissão incompleta é caso da varredura
//     (`varrerIngressosOrfaos`), que emite o que falta e fecha o e-mail;
//   - NÃO avisa "sua conta foi criada" para conta que já existia — isso seria
//     mentira e cheiro de phishing (a mesma regra do `nao_aplicavel` do
//     `contaSemFriccao`);
//   - NÃO é pública, NÃO é do organizador. Só `platform_admin`: o e-mail
//     carrega a CREDENCIAL de entrada do evento (o QR) e o link de definir
//     senha da conta. Quem consegue disparar isto contra um pedido alheio
//     consegue mandar a credencial de outra pessoa para o endereço do pedido.
//
// AS DUAS TRANCAS DA IDEMPOTÊNCIA (a pergunta "rodar 2× duplica?"):
//   1. CHAVE DA OPERAÇÃO (`reenvioId`, obrigatória). O extrato
//      `reenviosEmail/{pedidoId}__{reenvioId}` é criado ANTES do envio, dentro
//      da transação. Repetir a chamada com a MESMA chave — retry de timeout,
//      duplo clique da ferramenta, re-entrega de um job — devolve o desfecho
//      gravado sem enviar nada. Registrar-antes-de-enviar é at-most-once, a
//      MESMA política que a RN-219 escolheu: melhor um e-mail que não chegou
//      (e o admin dispara outro, conscientemente, com chave nova) do que duas
//      cópias da credencial de todo mundo.
//   2. JANELA DE REENVIO (10 min, por PEDIDO). A chave sozinha só protege
//      contra retry — não contra um segundo operador, ou o mesmo operador
//      gerando uma chave nova, disparando de novo em cima do mesmo pedido. O
//      carimbo `pedidos/{id}.reenvioEmails.ultimoEm` é lido DENTRO da mesma
//      transação, então duas chamadas concorrentes com chaves diferentes não
//      passam as duas. `forcar: true` atravessa a janela de propósito e fica
//      registrado como tal.
//
// AUDITORIA: todo desfecho — inclusive a NEGAÇÃO por papel — vira registro em
// `auditoriaAcessos` (o mesmo padrão do `getBankDetailsForPayout`), e o extrato
// `reenviosEmail` guarda quem/quando/o quê/como terminou. Nenhum dos dois
// carrega e-mail, nome ou token (LGPD — só ids e status).
//
// `reenviosEmail` NÃO tem `match` em firestore.rules DE PROPÓSITO: cai no
// deny-by-default, como `ingressosPendentes`. É registro operacional sem
// leitor cliente, e um cliente que escrevesse aqui poderia inventar um
// reenvio "já processado" e bloquear o reenvio de verdade.
//
// ONDE MORA O ESTADO DESTA OPERAÇÃO (regra durável — lane FIX-PROJECAO): a
// RN-469 abriu `pedidos/{id}` ao COMPRADOR, e Rules decidem o DOCUMENTO, não a
// projeção. Logo, TODO campo novo no doc do pedido nasce visível a ele. O
// carimbo daqui carrega só o que o próprio código precisa ler do pedido
// (`ultimoEm`, para a janela) mais um contador opaco (`total`); a identidade da
// operação — a chave, quem disparou, o desfecho — fica no extrato e na
// auditoria, que nenhum cliente lê. Campo operacional novo vai para lá, não
// para cá.
// =============================================================================

import * as admin from 'firebase-admin';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { https, runWith } from 'firebase-functions/v1';
import * as logger from 'firebase-functions/logger';
import type { AuthClaims, EmailProvider } from '@leela/core';
import {
  entregarEmailIngressos,
  lerDestinatarioEmailIngressos,
  registrarStatusEmailIngressos,
} from '../email/enviarIngressos';
import { registrarIncidenteEmail } from '../email/incidenteEmail';
import { selectEmailProvider } from '../email/selectEmailProvider';
import { lerIngressosVivosDoPedido } from '../eventos/emitirIngressos';
import {
  reabrirIngressoPendente,
  registrarIngressoPendente,
} from '../eventos/ingressosPendentes';
import { registrarAcessoAuditado } from '../shared/auditoriaAcessos';
import type { FinanceCaller } from '../finance/atores';
import {
  contaSemFriccaoAuthAdmin,
  entregarEmailContaCriada,
  type ContaSemFriccaoAuth,
} from './contaSemFriccao';

type Db = admin.firestore.Firestore;

// ---------------------------------------------------------------------------
// Contratos
// ---------------------------------------------------------------------------

/** Extrato dos reenvios — server-only (sem `match` nas Rules). */
export const REENVIOS_EMAIL_COL = 'reenviosEmail';

/**
 * Janela em que o MESMO pedido não aceita um segundo reenvio sem `forcar`.
 * Dez minutos é o tempo de um humano perceber que o e-mail não chegou, olhar
 * a caixa de spam e decidir de novo — abaixo disso, o segundo disparo é quase
 * sempre dedo nervoso, não decisão.
 */
export const JANELA_REENVIO_MS = 10 * 60 * 1000;

/** Formato da chave de operação: id opaco de 8 a 64 caracteres seguros. */
const REENVIO_ID_RE = /^[A-Za-z0-9][A-Za-z0-9_-]{7,63}$/;

export type AlvoReenvio = 'ingresso' | 'conta';

export const ALVOS_REENVIO: readonly AlvoReenvio[] = ['ingresso', 'conta'];

export type StatusAlvoReenvio =
  /** Entregue ao provedor nesta chamada. */
  | 'enviado'
  /** O provedor recusou (a falha fica no extrato, o pedido segue intocado). */
  | 'falha_envio'
  /** Sem chave de e-mail configurada — fail-closed RN-137. */
  | 'pendente_chave'
  /** O pedido não tem nenhum ingresso emitido ainda. */
  | 'sem_ingresso'
  /** Há inscrito confirmado SEM ingresso: caso da varredura, não do reenvio. */
  | 'ingresso_incompleto'
  /** Pedido sem e-mail de responsável válido. */
  | 'sem_destinatario'
  /** Não se aplica (ex.: a conta do comprador já existia antes da compra). */
  | 'nao_aplicavel';

export interface ReenviarEmailsInput {
  pedidoId: string;
  /** Chave da OPERAÇÃO — repetir a chamada com ela não reenvia (tranca 1). */
  reenvioId: string;
  /** Default: os dois e-mails do pedido. */
  alvos?: AlvoReenvio[];
  /** Atravessa a janela de 10 minutos, conscientemente (tranca 2). */
  forcar?: boolean;
}

export interface ReenviarEmailsResult {
  pedidoId: string;
  reenvioId: string;
  eventoId: string | null;
  /** false = replay da mesma chave; nada foi enviado NESTA chamada. */
  executado: boolean;
  motivo?: 'ja_processado';
  /**
   * Estado do extrato da operação. `reservado` num REPLAY significa que a
   * chamada anterior morreu entre o commit da reserva e a entrega — o
   * operador precisa enxergar isso, senão "já processado" com `resultados`
   * vazio é indistinguível de "terminou sem nada para enviar".
   */
  estado?: EstadoReenvio;
  /** Desfecho por alvo pedido. */
  resultados: Partial<Record<AlvoReenvio, StatusAlvoReenvio>>;
  /** Quantos ingressos foram para o e-mail (0 quando nada saiu). */
  ingressos: number;
  forcado: boolean;
}

/** Estado do extrato `reenviosEmail/{pedidoId}__{reenvioId}`. */
export type EstadoReenvio = 'reservado' | 'concluido' | 'falhou';

export type ResultadoReenvioAuditado =
  | 'executado'
  | 'replay'
  | 'falhou'
  | 'negado_papel'
  | 'negado_pedido_inexistente'
  | 'negado_pedido_nao_pago'
  | 'negado_janela';

// ---------------------------------------------------------------------------
// Auditoria (fora de transação, ANTES de qualquer throw — padrão RN-354)
// ---------------------------------------------------------------------------

async function registrarAcessoReenvio(
  db: Db,
  registro: {
    pedidoId: string;
    reenvioId: string;
    uid: string;
    papel: string;
    resultado: ResultadoReenvioAuditado;
  }
): Promise<void> {
  // Sem PII: só ids, papel e desfecho.
  await registrarAcessoAuditado(
    db,
    'reenvio_emails_pedido',
    registro,
    'reenvio_emails_acesso'
  );
}

// ---------------------------------------------------------------------------
// Reserva da operação (as duas trancas, na MESMA transação)
// ---------------------------------------------------------------------------

type Reserva =
  | { tipo: 'reservado' }
  | { tipo: 'ja_processado'; doc: admin.firestore.DocumentData }
  | { tipo: 'em_janela'; faltamMs: number };

async function reservarReenvio(
  db: Db,
  args: {
    pedidoId: string;
    reenvioId: string;
    eventoId: string | null;
    alvos: readonly AlvoReenvio[];
    forcar: boolean;
    caller: FinanceCaller;
    agora: Date;
  }
): Promise<Reserva> {
  const reservaRef = db
    .collection(REENVIOS_EMAIL_COL)
    .doc(`${args.pedidoId}__${args.reenvioId}`);
  const pedidoRef = db.collection('pedidos').doc(args.pedidoId);

  return db.runTransaction(async (tx) => {
    const reservaSnap = await tx.get(reservaRef);
    if (reservaSnap.exists) {
      // Tranca 1: a MESMA chave nunca envia duas vezes.
      return { tipo: 'ja_processado' as const, doc: reservaSnap.data() ?? {} };
    }

    // Tranca 2: janela por PEDIDO, lida DENTRO da transação — duas chamadas
    // concorrentes com chaves diferentes não passam as duas.
    //
    // ⚠ REV-F2F5 (review antagonista): a comparação NÃO pode exigir
    // `decorrido >= 0`. `agora` é o relógio de QUEM CHAMA, capturado ANTES da
    // transação; `ultimoEm` é escrito pelo SERVIDOR no commit do PRIMEIRO
    // reenvio. Na corrida de dois operadores — o caso exato que esta tranca
    // existe para cobrir, porque a chave sozinha só protege contra retry — o
    // perdedor re-lê o doc no retry e enxerga um `ultimoEm` POSTERIOR ao seu
    // `agora`. Com o `>= 0`, `decorrido` negativo pulava a janela inteira e o
    // segundo e-mail saía com a credencial de todo mundo (dois admins em
    // paralelo = 2 envios, provado em `reenvioEmailsPedido.ataque.test.ts`).
    // Relógio dessincronizado entre a instância e o Firestore produzia o mesmo
    // bypass, sem corrida nenhuma. Timestamp no futuro agora conta como DENTRO
    // da janela: fail-closed é a direção segura, e `forcar` segue sendo a
    // saída consciente.
    const pedidoSnap = await tx.get(pedidoRef);
    const ultimo = pedidoSnap.get('reenvioEmails.ultimoEm') as
      | Timestamp
      | undefined;
    if (!args.forcar && ultimo instanceof Timestamp) {
      const decorrido = args.agora.getTime() - ultimo.toMillis();
      if (decorrido < JANELA_REENVIO_MS) {
        return {
          tipo: 'em_janela' as const,
          faltamMs: JANELA_REENVIO_MS - Math.max(decorrido, 0),
        };
      }
    }

    tx.create(reservaRef, {
      pedidoId: args.pedidoId,
      reenvioId: args.reenvioId,
      eventoId: args.eventoId,
      alvos: [...args.alvos],
      forcado: args.forcar,
      solicitadoPor: args.caller.uid,
      papel:
        typeof args.caller.claims.role === 'string'
          ? args.caller.claims.role
          : 'desconhecido',
      estado: 'reservado',
      criadoEm: FieldValue.serverTimestamp(),
    });
    // Caminho de campo pontilhado: carimba SEM sobrescrever o resto do doc.
    //
    // ⚠ `ultimoReenvioId` NÃO entra aqui (lane FIX-PROJECAO). O doc do pedido é
    // lido pelo COMPRADOR desde a RN-469, e as Rules decidem o DOCUMENTO, não a
    // projeção — não existe filtrar campo. `reenvioId` é string escolhida pelo
    // OPERADOR: quem nomear a chave por chamado ("reenvio-ticket-4471",
    // "reenvio-reclamacao-procon") publica vocabulário interno na tela de quem
    // comprou. A chave já vive onde precisa viver, duas vezes: no docId E no
    // campo `reenvioId` do extrato `reenviosEmail/{pedidoId}__{reenvioId}`
    // (server-only, sem `match` nas Rules) e em `auditoriaAcessos`. O que fica
    // no pedido é o mínimo do qual o próprio código depende: `ultimoEm`, que a
    // janela da tranca 2 lê na transação, e `total`, contador opaco.
    tx.update(pedidoRef, {
      'reenvioEmails.ultimoEm': FieldValue.serverTimestamp(),
      'reenvioEmails.total': FieldValue.increment(1),
      atualizadoEm: FieldValue.serverTimestamp(),
    });
    return { tipo: 'reservado' as const };
  });
}

// ---------------------------------------------------------------------------
// Núcleo (testável com Admin SDK contra o Emulator)
// ---------------------------------------------------------------------------

export interface ReenvioDeps {
  /** `null` = fail-closed RN-137 (sem chave, nada sai). */
  emailProvider: EmailProvider | null;
  /** Porta do Auth — o link de definir senha é gerado na hora. */
  auth: ContaSemFriccaoAuth;
  agora?: Date;
}

export async function reenviarEmailsDoPedidoCore(
  db: Db,
  rawInput: unknown,
  caller: FinanceCaller,
  deps: ReenvioDeps
): Promise<ReenviarEmailsResult> {
  const input = rawInput as Partial<ReenviarEmailsInput> | null;
  const pedidoId = input?.pedidoId;
  const reenvioId = input?.reenvioId;
  if (typeof pedidoId !== 'string' || pedidoId.length === 0) {
    throw new https.HttpsError('invalid-argument', '"pedidoId" é obrigatório.');
  }
  if (typeof reenvioId !== 'string' || !REENVIO_ID_RE.test(reenvioId)) {
    throw new https.HttpsError(
      'invalid-argument',
      '"reenvioId" é obrigatório: 8 a 64 caracteres [A-Za-z0-9_-]. É a chave que impede o mesmo reenvio de sair duas vezes — gere um id novo só para um reenvio NOVO.'
    );
  }
  const pedidos: unknown[] = Array.isArray(input?.alvos) ? input.alvos : [];
  const alvos: AlvoReenvio[] =
    pedidos.length > 0
      ? ALVOS_REENVIO.filter((a) => pedidos.includes(a))
      : [...ALVOS_REENVIO];
  if (alvos.length === 0) {
    throw new https.HttpsError(
      'invalid-argument',
      '"alvos" aceita apenas "ingresso" e "conta".'
    );
  }
  const forcar = input?.forcar === true;
  const agora = deps.agora ?? new Date();
  const papel =
    typeof caller.claims.role === 'string' ? caller.claims.role : 'desconhecido';
  const base = { pedidoId, reenvioId, uid: caller.uid, papel };

  // 1. Papel — a negação também é REGISTRADA (padrão do acesso auditado).
  if (caller.claims.role !== 'platform_admin') {
    await registrarAcessoReenvio(db, { ...base, resultado: 'negado_papel' });
    throw new https.HttpsError(
      'permission-denied',
      'Apenas platform_admin reenvia e-mails de um pedido — o e-mail carrega a credencial do ingresso; acesso registrado.'
    );
  }

  // 2. O pedido precisa existir e estar PAGO. Reenviar ingresso de pedido não
  //    pago entregaria credencial de quem não comprou.
  const pedidoSnap = await db.collection('pedidos').doc(pedidoId).get();
  if (!pedidoSnap.exists) {
    await registrarAcessoReenvio(db, {
      ...base,
      resultado: 'negado_pedido_inexistente',
    });
    throw new https.HttpsError('not-found', `Pedido '${pedidoId}' não existe.`);
  }
  const statusPedido = pedidoSnap.get('status') as string | undefined;
  if (statusPedido !== 'pago') {
    await registrarAcessoReenvio(db, {
      ...base,
      resultado: 'negado_pedido_nao_pago',
    });
    throw new https.HttpsError(
      'failed-precondition',
      `Só pedido 'pago' reenvia e-mail (está '${statusPedido ?? 'sem status'}').`
    );
  }
  const eventoId = (pedidoSnap.get('eventoId') as string | undefined) ?? null;

  // 3. Reserva (as duas trancas).
  const reserva = await reservarReenvio(db, {
    pedidoId,
    reenvioId,
    eventoId,
    alvos,
    forcar,
    caller,
    agora,
  });
  if (reserva.tipo === 'ja_processado') {
    await registrarAcessoReenvio(db, { ...base, resultado: 'replay' });
    logger.info('reenvio_emails_replay', { pedidoId, reenvioId });
    return {
      pedidoId,
      reenvioId,
      eventoId: (reserva.doc['eventoId'] as string | null) ?? eventoId,
      executado: false,
      motivo: 'ja_processado',
      resultados:
        (reserva.doc['resultados'] as Partial<
          Record<AlvoReenvio, StatusAlvoReenvio>
        >) ?? {},
      ingressos: (reserva.doc['ingressos'] as number | undefined) ?? 0,
      forcado: reserva.doc['forcado'] === true,
      estado: (reserva.doc['estado'] as EstadoReenvio | undefined) ?? 'reservado',
    };
  }
  if (reserva.tipo === 'em_janela') {
    await registrarAcessoReenvio(db, { ...base, resultado: 'negado_janela' });
    throw new https.HttpsError(
      'failed-precondition',
      `Este pedido já recebeu um reenvio há menos de ${Math.round(
        JANELA_REENVIO_MS / 60_000
      )} minutos (faltam ${Math.ceil(reserva.faltamMs / 1000)}s). Use "forcar" se o segundo envio é mesmo intencional.`
    );
  }

  // 4. Entrega (fora de transação — a reserva já garantiu at-most-once).
  //
  // ⚠ REV-F2F5: o bloco inteiro é guardado. A etapa de entrega faz quatro
  // leituras do Firestore FORA dos try/catch de cada alvo (os ingressos vivos,
  // o destinatário, o pedido e o evento do e-mail da conta), e um
  // `UNAVAILABLE`/`DEADLINE_EXCEEDED` ali — rotina em Cloud Functions —
  // escapava com a reserva JÁ commitada: o extrato ficava em `reservado` para
  // sempre, sem `resultados` e sem `concluidoEm`, com a janela do pedido já
  // queimada. O operador via um erro, o replay da mesma chave devolvia vazio,
  // e o único caminho de volta era `forcar` com chave nova — que DUPLICA a
  // credencial se a entrega tinha acontecido. Fechar o extrato com `falhou`
  // antes de propagar transforma a adivinhação em leitura.
  const resultados: Partial<Record<AlvoReenvio, StatusAlvoReenvio>> = {};
  let ingressosEnviados = 0;

  try {
    if (alvos.includes('ingresso')) {
      const r = await reenviarIngresso(db, pedidoId, eventoId, deps.emailProvider);
      resultados.ingresso = r.status;
      ingressosEnviados = r.ingressos;
    }
    if (alvos.includes('conta')) {
      resultados.conta = await reenviarContaCriada(
        db,
        pedidoId,
        eventoId,
        pedidoSnap.get('contaSemFriccao') as Record<string, unknown> | undefined,
        deps
      );
    }
  } catch (err) {
    await fecharExtratoReenvio(db, pedidoId, reenvioId, {
      estado: 'falhou',
      resultados,
      ingressos: ingressosEnviados,
      erro: err instanceof Error ? err.message.slice(0, 200) : String(err),
    });
    await registrarAcessoReenvio(db, { ...base, resultado: 'falhou' });
    logger.error('reenvio_emails_interrompido', {
      pedidoId,
      eventoId,
      reenvioId,
      ...resultados,
      err: err instanceof Error ? err.message.slice(0, 200) : String(err),
    });
    throw err;
  }

  // 5. Desfecho no extrato + log estruturado (sem PII).
  await fecharExtratoReenvio(db, pedidoId, reenvioId, {
    estado: 'concluido',
    resultados,
    ingressos: ingressosEnviados,
  });
  await registrarAcessoReenvio(db, { ...base, resultado: 'executado' });
  logger.info('reenvio_emails_pedido', {
    pedidoId,
    eventoId,
    reenvioId,
    alvos,
    forcado: forcar,
    ingressos: ingressosEnviados,
    ...resultados,
  });

  return {
    pedidoId,
    reenvioId,
    eventoId,
    executado: true,
    resultados,
    ingressos: ingressosEnviados,
    forcado: forcar,
    estado: 'concluido',
  };
}

/**
 * Fecha o extrato da operação. NUNCA lança: quando ele é chamado do caminho de
 * erro, deixar uma segunda exceção por cima da primeira apagaria a causa real.
 */
async function fecharExtratoReenvio(
  db: Db,
  pedidoId: string,
  reenvioId: string,
  desfecho: {
    estado: EstadoReenvio;
    resultados: Partial<Record<AlvoReenvio, StatusAlvoReenvio>>;
    ingressos: number;
    erro?: string;
  }
): Promise<void> {
  try {
    await db
      .collection(REENVIOS_EMAIL_COL)
      .doc(`${pedidoId}__${reenvioId}`)
      .set(
        {
          estado: desfecho.estado,
          resultados: desfecho.resultados,
          ingressos: desfecho.ingressos,
          ...(desfecho.erro !== undefined ? { erro: desfecho.erro } : {}),
          concluidoEm: FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
  } catch (err) {
    logger.error('reenvio_emails_extrato_nao_fechado', {
      pedidoId,
      reenvioId,
      estado: desfecho.estado,
      err: err instanceof Error ? err.message.slice(0, 200) : String(err),
    });
  }
}

// ---------------------------------------------------------------------------
// Os dois alvos
// ---------------------------------------------------------------------------

async function reenviarIngresso(
  db: Db,
  pedidoId: string,
  eventoId: string | null,
  emailProvider: EmailProvider | null
): Promise<{ status: StatusAlvoReenvio; ingressos: number }> {
  if (eventoId === null) return { status: 'sem_ingresso', ingressos: 0 };

  // LEITURA PURA: os tokens que já existem, jamais uma emissão nova.
  const vivos = await lerIngressosVivosDoPedido(db, pedidoId);
  if (vivos.semIngresso.length > 0) {
    // Lista parcial NUNCA sai (mesma razão da RN-219 no caminho automático):
    // quem ficou de fora nunca receberia o ingresso. A varredura emite o que
    // falta e fecha o e-mail; depois disso o reenvio funciona.
    //
    // ⚠ REV-F2F5: "a varredura resolve" só era verdade quando existia
    // `ingressosPendentes/{pedidoId}` — e o gerador mais provável deste estado
    // NÃO abria pendência nenhuma. `emitirIngressosDoPedido` não contava
    // inscrito não-confirmado nem como falha nem como recusa, então
    // `dispararEmissaoIngressosPosConfirmacao` fechava a janela com `falhas: 0`
    // e nada era registrado; se o inscrito confirmasse DEPOIS (transferência,
    // acerto manual, reprocesso), ele ficava confirmado e sem ingresso, o cron
    // varria uma coleção que não tinha o pedido, e o reenvio recusava PARA
    // SEMPRE apontando para uma ferramenta que não ia agir. A pendência é
    // aberta AQUI, no ponto em que o sistema descobre o buraco — mesmo padrão
    // do "registro no ponto da falha" do item 54. É best-effort de propósito
    // (Directive da F5: o acessório não derruba o principal) e idempotente por
    // `pedidoId`.
    //
    // A OUTRA PONTA JÁ ESTÁ FECHADA (RF2-1, lane BUILD-RF2-1): o caminho
    // automático passou a contar o inscrito que ainda pode confirmar
    // (`aguardando`), a segurar o e-mail e a abrir a pendência na própria
    // janela da confirmação. Este registro aqui continua sendo necessário e
    // não vira redundância: ele cobre o pedido que ficou incompleto ANTES do
    // fix, e qualquer buraco que a emissão não tenha como enxergar. Duas
    // detecções do mesmo pedido acumulam em `deteccoes`, nunca duplicam.
    logger.warn('reenvio_ingresso_incompleto', {
      pedidoId,
      eventoId,
      semIngresso: vivos.semIngresso.length,
    });
    try {
      await registrarIngressoPendente(db, {
        pedidoId,
        eventoId,
        motivo: 'emissao_incompleta',
        falhas: vivos.semIngresso.length,
        detalhe: 'detectado_pelo_reenvio',
      });
      // ⚠ REV-RF2-1: registrar não bastava. Uma pendência que JÁ ESGOTOU as
      // oito passagens é pulada pela varredura para sempre — e, com o RF2-1, a
      // espera por um inscrito que ainda pode confirmar virou gerador rotineiro
      // de pendência, destravada por uma ação humana que passa das duas horas
      // sem esforço. O pedido do operador é a informação NOVA que a máquina não
      // tinha: re-arma UMA janela de oito passagens para que
      // `emitirIngressosDoPedido` volte a rodar e a pessoa saia com ingresso.
      // Sem isto, esta mesma mensagem manda o operador para uma ferramenta que
      // não vai agir — exatamente o beco que a REV-F2F5 fechou.
      const reaberta = await reabrirIngressoPendente(db, pedidoId, {
        detalhe: 'reaberta_pelo_reenvio',
      });
      if (reaberta) {
        logger.warn('reenvio_pendencia_reaberta', { pedidoId, eventoId });
      }
    } catch (err) {
      logger.error('reenvio_pendencia_nao_registrada', {
        pedidoId,
        eventoId,
        err: err instanceof Error ? err.message.slice(0, 200) : String(err),
      });
    }
    return { status: 'ingresso_incompleto', ingressos: 0 };
  }
  if (vivos.ingressos.length === 0) {
    return { status: 'sem_ingresso', ingressos: 0 };
  }
  if (emailProvider === null) {
    logger.info('reenvio_ingresso_pendente_chave', { pedidoId, eventoId });
    return { status: 'pendente_chave', ingressos: 0 };
  }

  const destinatario = await lerDestinatarioEmailIngressos(db, pedidoId, eventoId);
  if (destinatario === null) return { status: 'sem_destinatario', ingressos: 0 };

  try {
    await entregarEmailIngressos(
      { pedidoId, eventoId, ingressos: vivos.ingressos, destinatario },
      emailProvider
    );
    // O carimbo do pedido passa a contar a verdade (F5): o mesmo campo que a
    // consulta "quem pagou e não recebeu" lê.
    await registrarStatusEmailIngressos(db, pedidoId, 'enviado');
    return { status: 'enviado', ingressos: vivos.ingressos.length };
  } catch (err) {
    registrarIncidenteEmail('reenvio_ingresso_falhou', {
      tipo: 'reenvio_ingressos',
      pedidoId,
      eventoId,
      erro: err,
    });
    await registrarStatusEmailIngressos(db, pedidoId, 'falha_envio');
    return { status: 'falha_envio', ingressos: 0 };
  }
}

async function reenviarContaCriada(
  db: Db,
  pedidoId: string,
  eventoId: string | null,
  carimbo: Record<string, unknown> | undefined,
  deps: ReenvioDeps
): Promise<StatusAlvoReenvio> {
  // Só quem RECEBEU o e-mail de conta nova pode recebê-lo de novo. Conta que
  // já existia antes da compra nunca teve esse e-mail — mandar agora seria
  // avisar de um fato que não aconteceu (o `nao_aplicavel` do contaSemFriccao).
  if (carimbo === undefined || carimbo['contaCriada'] !== true) {
    return 'nao_aplicavel';
  }
  if (deps.emailProvider === null) {
    logger.info('reenvio_conta_pendente_chave', { pedidoId });
    return 'pendente_chave';
  }

  const pedidoSnap = await db.collection('pedidos').doc(pedidoId).get();
  const emailRaw = pedidoSnap.get('responsavel.email') as string | undefined;
  if (typeof emailRaw !== 'string' || emailRaw.trim().length === 0) {
    return 'sem_destinatario';
  }
  const email = emailRaw.trim().toLowerCase();
  const nome = (pedidoSnap.get('responsavel.nome') as string | undefined) ?? '';
  const nomeEvento =
    eventoId === null
      ? 'seu evento'
      : ((await db.collection('eventos').doc(eventoId).get()).get('nome') as
          | string
          | undefined) ?? 'seu evento';

  try {
    await entregarEmailContaCriada(
      { email, nome, nomeEvento },
      deps.auth,
      deps.emailProvider
    );
  } catch (err) {
    registrarIncidenteEmail('reenvio_conta_falhou', {
      tipo: 'reenvio_conta',
      pedidoId,
      eventoId,
      erro: err,
    });
    return 'falha_envio';
  }

  // ⚠ REV-F2F5: o carimbo fica FORA do try da entrega, e engole o próprio erro.
  // Antes ele dividia o `catch` com o envio, então um `update` que falhasse
  // depois de o e-mail ter SAÍDO devolvia `falha_envio` para uma credencial
  // entregue — e `falha_envio` é o gatilho do incidente crítico da F5 e a
  // deixa que leva o runbook a reenviar. Mentir para o lado do "não entregou"
  // custa uma SEGUNDA entrega do link de definir senha. É a mesma postura já
  // escolhida em `registrarStatusEmailIngressos` e a Directive do commit da
  // F5: o carimbo é ACESSÓRIO e nunca decide o desfecho do envio.
  try {
    await db.collection('pedidos').doc(pedidoId).update({
      'contaSemFriccao.emailStatus': 'enviado',
      'contaSemFriccao.reenviadoEm': FieldValue.serverTimestamp(),
      atualizadoEm: FieldValue.serverTimestamp(),
    });
  } catch (err) {
    logger.warn('reenvio_conta_status_nao_carimbado', {
      pedidoId,
      err: err instanceof Error ? err.message.slice(0, 200) : String(err),
    });
  }
  return 'enviado';
}

// ---------------------------------------------------------------------------
// Callable
// ---------------------------------------------------------------------------

export const reenviarEmailsDoPedido = runWith({
  // Os dois secrets do caminho: assinatura do link do ingresso e chave do
  // provedor. Sem `QR_TOKEN_KEYS` o e-mail sai sem link (degradação prevista
  // na RN-423); sem `BREVO_API_KEY` nada sai (fail-closed RN-137).
  secrets: ['QR_TOKEN_KEYS', 'BREVO_API_KEY'],
}).https.onCall(async (data: unknown, context) => {
  if (!context.auth) {
    // Sem uid não há a quem atribuir a tentativa — nega sem registro (a
    // auditoria é de ACESSO IDENTIFICADO, como no dado bancário).
    throw new https.HttpsError('unauthenticated', 'Requer autenticação.');
  }
  return reenviarEmailsDoPedidoCore(
    admin.firestore(),
    data,
    {
      uid: context.auth.uid,
      claims: context.auth.token as unknown as AuthClaims,
    },
    {
      emailProvider: selectEmailProvider(),
      auth: contaSemFriccaoAuthAdmin(),
    }
  );
});
