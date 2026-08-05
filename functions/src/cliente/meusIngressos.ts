// =============================================================================
// functions/src/cliente/meusIngressos.ts
//
// `getMeusIngressos` — os ingressos do PRÓPRIO dono da conta, já separados em
// próximos e passados (S1222-T1 · RN-451 · RN-452).
//
// O RECORTE É DO SERVIDOR, e a fila escreve isso com todas as letras. Não é
// preciosismo: a data do evento é `Timestamp` do Firestore, e deixar o
// navegador decidir "já passou?" põe o fuso e o relógio da máquina da pessoa
// dentro de uma regra de negócio. Duas pessoas veriam listas diferentes do
// mesmo dado, e a que estivesse com o relógio adiantado perderia a corrida da
// manhã seguinte da lista de "próximos".
//
// DUAS FONTES, PORQUE UMA SÓ MENTE:
//
//   (1) os inscritos dos pedidos DESTA conta — quem comprou vê o que comprou,
//       inclusive os ingressos das outras pessoas da compra (é ele quem tem de
//       repassar o QR da família);
//   (2) os inscritos cuja `pessoaRef` é uma ficha REIVINDICADA por esta conta
//       — quem RECEBEU um ingresso comprado por outra pessoa vê o próprio
//       ingresso mesmo sem nunca ter pago nada.
//
// Só (1) apagaria o participante presenteado. Só (2) apagaria o pagador que
// não se inscreveu (compra para terceiros não amarra ficha de pessoa — está
// escrito como limitação no `contaSemFriccao`). A união é a lista honesta; a
// deduplicação é por `{eventoId}/{inscritoId}`, que é a chave real do doc.
//
// A FONTE (2) EXIGE ÍNDICE DE GRUPO. `collectionGroup('inscritos')` filtrando
// `pessoaRef` precisa de um `fieldOverride` COLLECTION_GROUP em
// `firestore.indexes.json` — que esta task acrescenta. O Emulator não cobra
// índice, então o teste NÃO prova o deploy: sem `firebase deploy --only
// firestore:indexes` a query lança `FAILED_PRECONDITION` em produção. Por isso
// ela é isolada num try/catch que NÃO engole o problema: a lista continua com
// a fonte (1) e o resultado vem marcado `listaCompleta: false`, para a tela
// dizer que pode estar faltando coisa. Silenciar viraria a lista vazia que
// mente, e é justamente o que a RN-451 proíbe.
//
// O LINK DO INGRESSO É CUNHADO AQUI DENTRO (RN-452 · RN-423). Mesmo token
// assinado que o e-mail já entrega, mesma amarração ao `qrToken` vigente — a
// chave NUNCA desce para o cliente, e nenhuma superfície de credencial nova
// nasce. Sem keyring ou sem base pública o link vem `null` e a tela mostra o
// ingresso sem link: link quebrado gasta a confiança de quem já pagou.
// =============================================================================

import * as admin from 'firebase-admin';
import { https, runWith } from 'firebase-functions/v1';
import * as logger from 'firebase-functions/logger';
import { isCodigoIngressoValido, isStatusInscrito, type StatusInscrito } from '@leela/core';
import { basePublica, urlIngressoPorLink } from '../eventos/basePublica';
import { assinarLinkIngresso } from '../eventos/linkIngresso';
import { obterQrKeyring } from '../eventos/qrToken';
import {
  callerDoToken,
  resolverContaDoCliente,
  type CallerAreaCliente,
  type Db,
  type EstadoAreaCliente,
} from './gateAreaCliente';
import { lerPedidosDaConta, lerResumoDosEventos, type ResumoEventoArea } from './leituraArea';

/** Um ingresso na lista da área do cliente. */
export interface IngressoDaConta {
  inscritoId: string;
  eventoId: string;
  eventoNome: string;
  eventoSlug: string;
  /** Data da experiência em ISO 8601. null = evento sem data legível. */
  eventoDataIso: string | null;
  eventoLocal: string;
  /** Nome do TITULAR do ingresso (pode não ser o dono da conta). */
  titular: string;
  modalidade: string;
  status: StatusInscrito;
  /** Código legível do ingresso (RN-396). null = ainda não emitido. */
  codigoIngresso: string | null;
  /** true = `qrToken` gravado, ingresso emitido. */
  emitido: boolean;
  /** URL assinada da página do ingresso (RN-452). null = sem link possível. */
  linkIngresso: string | null;
}

export interface GetMeusIngressosResult {
  estado: EstadoAreaCliente;
  /** Data do evento no futuro (ou sem data legível), da mais próxima adiante. */
  proximos: IngressoDaConta[];
  /** Data do evento no passado, do mais recente para trás. */
  passados: IngressoDaConta[];
  /**
   * false = a busca por ficha de pessoa falhou (índice de grupo ausente) e a
   * lista pode estar incompleta. A tela DIZ isso; não finge lista cheia.
   */
  listaCompleta: boolean;
  /**
   * false = NENHUM link de ingresso pôde ser cunhado nesta resposta, porque
   * faltou configuração no runtime — o keyring de assinatura (`QR_TOKEN_KEYS`)
   * ou a base pública (`LEELA_PUBLIC_URL`). As duas produzem o mesmo buraco na
   * tela e por isso respondem à mesma pergunta. Verdade DIFERENTE de
   * `listaCompleta`: ali faltam linhas, aqui falta o caminho até o ingresso.
   * Existe para que a falha de configuração seja visível na tela, e não só num
   * log que ninguém lê — foi assim que o `asaasWebhook` engoliu 04/08.
   */
  linksDisponiveis: boolean;
}

/** Teto de fichas por consulta `in` (limite do Firestore é 30; a conta tem ≤10). */
const TETO_IN_PESSOAS = 30;

interface InscritoLocalizado {
  eventoId: string;
  snap: admin.firestore.DocumentSnapshot;
}

// ---------------------------------------------------------------------------
// Núcleo (testável com Admin SDK contra o Emulator)
// ---------------------------------------------------------------------------

export async function getMeusIngressosCore(
  db: Db,
  caller: CallerAreaCliente,
  agoraMillis: number = Date.now()
): Promise<GetMeusIngressosResult> {
  const resolucao = await resolverContaDoCliente(db, caller);
  if (resolucao.estado !== 'ok') {
    return {
      estado: resolucao.estado,
      proximos: [],
      passados: [],
      listaCompleta: true,
      linksDisponiveis: true,
    };
  }
  const conta = resolucao.conta;

  // ── Fonte (1): os inscritos dos pedidos desta conta ───────────────────────
  const pedidos = await lerPedidosDaConta(db, conta);
  const porChave = new Map<string, InscritoLocalizado>();
  const refs: admin.firestore.DocumentReference[] = [];
  const chavesEsperadas: string[] = [];
  for (const pedido of pedidos) {
    const inscritoRefs = pedido.snap.get('inscritoRefs') as unknown;
    if (!Array.isArray(inscritoRefs)) continue;
    for (const inscritoId of inscritoRefs) {
      if (typeof inscritoId !== 'string' || inscritoId.length === 0) continue;
      const chave = `${pedido.eventoId}/${inscritoId}`;
      if (chavesEsperadas.includes(chave)) continue;
      chavesEsperadas.push(chave);
      refs.push(db.doc(`eventos/${pedido.eventoId}/inscritos/${inscritoId}`));
    }
  }
  if (refs.length > 0) {
    const snaps = await db.getAll(...refs);
    for (const snap of snaps) {
      if (!snap.exists) continue;
      const eventoId = snap.ref.parent.parent?.id;
      if (eventoId === undefined) continue;
      porChave.set(`${eventoId}/${snap.id}`, { eventoId, snap });
    }
  }

  // ── Fonte (2): os inscritos das fichas reivindicadas por esta conta ───────
  //
  // ⚔ REV-AREACLIENTE · o `slice(0, TETO_IN_PESSOAS)` abaixo é INALCANÇÁVEL:
  // `pessoaIds` já vem com no máximo `TETO_PESSOAS_POR_CONTA` (10) e o teto do
  // `in` é 30. O corte real acontece LÁ, e era ele que estava mudo. Fica como
  // guarda do limite do Firestore para o dia em que o teto de fichas subir.
  let listaCompleta = !conta.pessoasTruncadas;
  if (conta.pessoasTruncadas) {
    logger.warn('area_cliente_pessoas_truncadas', {
      uid: caller.uid,
      teto: conta.pessoaIds.length,
    });
  }
  if (conta.pessoaIds.length > 0) {
    try {
      const grupo = await db
        .collectionGroup('inscritos')
        .where('pessoaRef', 'in', conta.pessoaIds.slice(0, TETO_IN_PESSOAS))
        .get();
      for (const snap of grupo.docs) {
        const eventoId = snap.ref.parent.parent?.id;
        if (eventoId === undefined) continue;
        porChave.set(`${eventoId}/${snap.id}`, { eventoId, snap });
      }
    } catch (err) {
      // Índice de grupo ausente (deploy pendente) ou indisponibilidade: a
      // lista degrada para a fonte (1) e DECLARA que degradou.
      listaCompleta = false;
      logger.error('area_cliente_ingressos_por_pessoa_falhou', {
        uid: caller.uid,
        err: err instanceof Error ? err.message : String(err),
      });
    }
  }

  const eventos = await lerResumoDosEventos(
    db,
    [...porChave.values()].map((i) => i.eventoId)
  );
  // O ring vem do binding declarado no `runWith` abaixo. `null` AQUI não é
  // caso degradado de dado: é o segredo faltando no runtime, e é o defeito que
  // custou o primeiro PIX real (o `asaasWebhook` de 04/08 subiu verde, leu
  // `null` e não emitiu ingresso nem erro). Por isso não é `warn` de rodapé:
  // é ERRO nomeado, e a resposta CARREGA o fato até a tela.
  //
  // O que este caminho NÃO faz, e a review deve atacar a escolha: não lança
  // `failed-precondition`. Derrubar a leitura inteira apagaria da tela os
  // ingressos que a pessoa pagou por causa de uma variável de ambiente — seria
  // o incidente de 04/08 visto do outro lado. A pessoa vê o ingresso e o
  // código; o que falta é o atalho, e a tela diz que falta.
  const keyring = obterQrKeyring();
  // ⚔ REV-AREACLIENTE · SÃO DUAS CONFIGURAÇÕES, e faltar qualquer uma produz o
  // MESMO resultado na tela: nenhum link. Até aqui só o keyring era medido, e
  // a base pública ausente (`LEELA_PUBLIC_URL`/`NEXT_PUBLIC_LEELA_URL`) fazia
  // `urlIngressoPorLink` devolver `null` para TODOS os itens — sem log, sem
  // `alerta`, e com `linksDisponiveis: true` mentindo para a tela. O cartão
  // então dizia "O ingresso está no e-mail da compra", que é falso exatamente
  // nessa configuração: sem base o e-mail TAMBÉM sai sem link (D-ING-8). Era o
  // 04/08 inteiro de novo — falha de configuração calada, com a tela afirmando
  // um caminho que não existe.
  const base = basePublica();
  const linksDisponiveis = keyring !== null && base !== null;
  if (!linksDisponiveis) {
    logger.error('area_cliente_link_ingresso_indisponivel', {
      uid: caller.uid,
      alerta: true,
      keyringAusente: keyring === null,
      basePublicaAusente: base === null,
      detalhe:
        'Nenhum link de ingresso pôde ser assinado: falta QR_TOKEN_KEYS e/ou ' +
        'LEELA_PUBLIC_URL no runtime.',
    });
  }

  const proximos: Array<{ ordem: number; item: IngressoDaConta }> = [];
  const passados: Array<{ ordem: number; item: IngressoDaConta }> = [];
  for (const { eventoId, snap } of porChave.values()) {
    const evento = eventos.get(eventoId);
    const item = montarIngresso(eventoId, snap, evento, keyring, caller.uid);
    const quando = evento?.dataMillis ?? null;
    // Sem data legível o ingresso entra em PRÓXIMOS: um ingresso que talvez
    // ainda valha não pode ser arquivado por falta de carimbo.
    if (quando === null || quando >= agoraMillis) {
      proximos.push({ ordem: quando ?? Number.MAX_SAFE_INTEGER, item });
    } else {
      passados.push({ ordem: quando, item });
    }
  }
  proximos.sort((a, b) => a.ordem - b.ordem);
  passados.sort((a, b) => b.ordem - a.ordem);

  logger.info('area_cliente_ingressos', {
    uid: caller.uid,
    proximos: proximos.length,
    passados: passados.length,
    listaCompleta,
    linksDisponiveis,
  }); // sem PII

  return {
    estado: 'ok',
    proximos: proximos.map((p) => p.item),
    passados: passados.map((p) => p.item),
    listaCompleta,
    linksDisponiveis,
  };
}

function montarIngresso(
  eventoId: string,
  snap: admin.firestore.DocumentSnapshot,
  evento: ResumoEventoArea | undefined,
  keyring: ReturnType<typeof obterQrKeyring>,
  uid: string
): IngressoDaConta {
  const qrToken = snap.get('qrToken') as unknown;
  const emitido = typeof qrToken === 'string' && qrToken.length > 0;
  const codigo = snap.get('codigoIngresso') as unknown;
  const statusBruto = snap.get('status') as unknown;
  const tenantId = (snap.get('tenantId') as string | undefined) ?? evento?.tenantId ?? '';

  let linkIngresso: string | null = null;
  if (emitido && keyring !== null && tenantId.length > 0) {
    try {
      const token = assinarLinkIngresso(
        { inscritoId: snap.id, eventoId, tenantId },
        qrToken as string,
        keyring
      );
      linkIngresso = urlIngressoPorLink(token);
    } catch (err) {
      // Assinatura de UM link não derruba a lista de todo mundo — mesma
      // disciplina do e-mail de ingressos.
      logger.warn('area_cliente_link_ingresso_falhou', {
        uid,
        eventoId,
        err: err instanceof Error ? err.name : 'erro',
      });
    }
  }

  return {
    inscritoId: snap.id,
    eventoId,
    eventoNome: evento?.nome ?? '',
    eventoSlug: evento?.slug ?? eventoId,
    eventoDataIso: evento?.dataIso ?? null,
    eventoLocal: evento?.local ?? '',
    titular: (snap.get('atletaNome') as string | undefined) ?? '',
    modalidade: (snap.get('modalidade') as string | undefined) ?? '',
    status: isStatusInscrito(statusBruto) ? statusBruto : 'pendente',
    codigoIngresso: isCodigoIngressoValido(codigo) ? (codigo as string) : null,
    emitido,
    linkIngresso,
  };
}

// ---------------------------------------------------------------------------
// Callable
// ---------------------------------------------------------------------------

/**
 * Ingressos do próprio dono da conta, em próximos e passados (RN-451).
 *
 * ⚠️ `QR_TOKEN_KEYS` (PIXREAL-FIX T5 · a classe de defeito que originou esta
 * rodada). Esta function ASSINA o link do ingresso, e no Cloud Functions o
 * secret só chega a quem o declara. Sem este binding a function sobe verde, o
 * `obterQrKeyring()` devolve `null` e a tela do dono mostra ingresso sem
 * caminho — exatamente o `asaasWebhook` de 04/08, que engoliu o dinheiro sem
 * emitir ingresso NEM erro. O Emulator não pega isto (lá tudo enxerga tudo);
 * quem pega é `secretsBinding.contract.test.ts`.
 */
export const getMeusIngressos = runWith({
  secrets: ['QR_TOKEN_KEYS'],
}).https.onCall(async (_data: unknown, context) => {
  if (!context.auth) {
    throw new https.HttpsError('unauthenticated', 'Requer autenticação.');
  }
  return getMeusIngressosCore(
    admin.firestore(),
    callerDoToken(context.auth as Parameters<typeof callerDoToken>[0])
  );
});
