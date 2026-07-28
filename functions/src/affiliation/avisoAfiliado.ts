// =============================================================================
// functions/src/affiliation/avisoAfiliado.ts
//
// AVISOS AO AFILIADO (LEELA-S706-T1 · RN-386): "registraram um repasse para
// você" e "sua comissão chegou a X". Dois gatilhos, um mecanismo.
//
// NADA DE CANAL NOVO. O disparo reusa o que já existe e já é provado:
//   - `registrarComunicacao` (RN-219) — hasSent+markSent ATÔMICOS sobre um
//     docId determinístico. A não-duplicação do aviso nasce do MODELO, não de
//     uma tabela de controle: reprocessar o mesmo repasse deriva o mesmo id,
//     colide, e o segundo e-mail não sai;
//   - `selectEmailProvider` (RN-137) — fail-closed sem `BREVO_API_KEY`;
//   - `templates.ts` — o catálogo, com escaping e layout já resolvidos.
//
// O AVISO NUNCA É PRÉ-CONDIÇÃO DO DINHEIRO. Estas funções são chamadas DEPOIS
// da transação que registrou o repasse (ou a comissão) e não lançam: qualquer
// falha vira log estruturado e status `falhou` no próprio registro de
// comunicação. Um provedor de e-mail fora do ar não pode desfazer um repasse
// que o organizador já pagou por fora.
//
// CHAVE DO AVISO DE REPASSE — por que não é o `repasseId` cru. A chave do log
// é validada por `CHAVE_LOG_COMUNICACAO_RE`, que PROÍBE `_` (é o separador do
// docId `{ref}_{chave}_{canal}`) e limita o tamanho a 64. `REPASSE_ID_RE`
// aceita `_` e até 64 caracteres, então `repasse_{repasseId}` da spec é
// literalmente impossível de gravar sem afrouxar a regra que impede colisão de
// fronteira entre os componentes do docId. Sanear o id (`_` → `-`) colapsaria
// dois repasses distintos (`a_b` e `a-b`) na MESMA chave e mataria o aviso do
// segundo — num campo de dinheiro isso é inaceitável. A chave é, então, um
// digest determinístico do repasseId: injetiva na prática, sempre válida,
// sempre do mesmo tamanho, e RECOMPUTÁVEL por quem tiver o repasseId em mãos
// (suporte deriva a chave, não adivinha).
// =============================================================================

import { createHash } from 'crypto';
import * as admin from 'firebase-admin';
import * as logger from 'firebase-functions/logger';
import {
  chaveAvisoMarco,
  COLECAO_AFILIADOS,
  validarEmail,
  type EmailProvider,
} from '@leela/core';
import {
  aplicarEventoProvedorNoLog,
  registrarComunicacao,
} from '../eventos/logComunicacao';
import {
  renderAvisoMarcoComissaoEmail,
  renderAvisoRepasseComissaoEmail,
} from '../email/templates';

type Db = admin.firestore.Firestore;

/** Referências de template no catálogo (gravadas no log, nunca o corpo). */
export const TEMPLATE_AVISO_REPASSE = 'avisoRepasseComissao';
export const TEMPLATE_AVISO_MARCO = 'avisoMarcoComissao';

export type StatusAvisoAfiliado =
  | 'enviado'
  | 'ja_avisado'
  | 'pendente_chave'
  | 'falha_envio'
  | 'sem_destinatario'
  | 'sem_afiliado';

export interface ResultadoAvisoAfiliado {
  status: StatusAvisoAfiliado;
  /** docId do log de comunicação, quando houve registro. */
  comunicacaoId?: string;
  /** Chave de idempotência usada (útil para suporte correlacionar). */
  chave?: string;
}

/**
 * Chave de idempotência do aviso de repasse — determinística e sempre válida
 * para o log (ver cabeçalho). @pure
 */
export function chaveAvisoRepasse(repasseId: string): string {
  if (typeof repasseId !== 'string' || repasseId.length === 0) {
    throw new Error('chaveAvisoRepasse: repasseId vazio');
  }
  const digest = createHash('sha256').update(repasseId, 'utf8').digest('hex');
  return `repasse-${digest.slice(0, 32)}`;
}

// ---------------------------------------------------------------------------
// Contexto do destinatário
// ---------------------------------------------------------------------------

interface DestinoAfiliado {
  email: string;
  nomeAfiliado: string;
  nomeEvento: string;
}

/**
 * E-mail do afiliado + nome do evento. `null` quando não há para quem mandar
 * (afiliado sumiu, ou é um clube sem e-mail de responsável cadastrado) — caso
 * normal, não erro: o aviso simplesmente não acontece.
 *
 * RN-318/RN-172: só o que o próprio aviso precisa sai daqui. Nenhum dado de
 * comprador, nenhum dado de outro afiliado.
 */
async function destinoDoAfiliado(
  db: Db,
  eventoId: string,
  afiliadoId: string
): Promise<DestinoAfiliado | null> {
  const afiliadoSnap = await db
    .collection('eventos')
    .doc(eventoId)
    .collection(COLECAO_AFILIADOS)
    .doc(afiliadoId)
    .get();
  if (!afiliadoSnap.exists) return null;

  const emailRaw = afiliadoSnap.get('responsavelEmail') as string | undefined;
  if (typeof emailRaw !== 'string' || !validarEmail(emailRaw)) return null;

  const eventoSnap = await db.collection('eventos').doc(eventoId).get();
  return {
    email: emailRaw.trim().toLowerCase(),
    nomeAfiliado: (afiliadoSnap.get('nome') as string | undefined) ?? '',
    nomeEvento: (eventoSnap.get('nome') as string | undefined) ?? 'seu evento',
  };
}

/**
 * markSent → envia → degrada. O miolo comum dos dois avisos.
 *
 * Registrar ANTES de enviar é at-most-once, a política que a RN-219 escolheu:
 * um aviso que não chegou é melhor que cinco cópias do mesmo aviso de dinheiro.
 * Falha de envio marca o registro como `falhou` (com motivo SEM PII) — a
 * pendência fica visível no log em vez de virar retry cego.
 */
async function dispararAviso(
  db: Db,
  args: {
    eventoId: string;
    afiliadoId: string;
    chave: string;
    templateRef: string;
    assunto: string;
    html: string;
    texto: string;
    tag: string;
    email: string;
    nomeAfiliado: string;
  },
  emailProvider: EmailProvider | null
): Promise<ResultadoAvisoAfiliado> {
  const { eventoId, afiliadoId, chave, templateRef, assunto } = args;

  if (emailProvider === null) {
    // Fail-closed (RN-137): NÃO registra. Registrar aqui queimaria a chave de
    // um envio que nunca existiu e o aviso ficaria suprimido para sempre no
    // dia em que a chave chegasse.
    logger.info('aviso_afiliado_pendente_chave', { eventoId, afiliadoId, chave });
    return { status: 'pendente_chave', chave };
  }

  const registro = await registrarComunicacao(db, eventoId, {
    destinatario: { tipo: 'afiliado', ref: afiliadoId },
    canal: 'email',
    tipo: 'transacional',
    chaveRef: chave,
    assunto: assunto.slice(0, 150),
    templateRef,
  });
  if (!registro.registrada) {
    logger.info('aviso_afiliado_nao_reenviado', {
      eventoId,
      afiliadoId,
      chave,
      motivo: registro.motivo,
    });
    return {
      status: registro.motivo === 'ja_registrada' ? 'ja_avisado' : 'sem_destinatario',
      comunicacaoId: registro.comunicacaoId,
      chave,
    };
  }

  try {
    await emailProvider.sendTransactional({
      to: {
        email: args.email,
        ...(args.nomeAfiliado.length > 0 ? { nome: args.nomeAfiliado } : {}),
      },
      assunto: args.assunto,
      html: args.html,
      texto: args.texto,
      tag: args.tag,
    });
    logger.info('aviso_afiliado_enviado', { eventoId, afiliadoId, chave, templateRef });
    return { status: 'enviado', comunicacaoId: registro.comunicacaoId, chave };
  } catch (err) {
    // O log registra a FALHA (RN-386): o afiliado não foi avisado e isso fica
    // dito, sem tocar no dinheiro que já foi registrado.
    await aplicarEventoProvedorNoLog(db, eventoId, registro.comunicacaoId, {
      tipo: 'falhou',
      em: admin.firestore.Timestamp.fromDate(new Date()),
      falhaMotivo: 'provider_erro',
    }).catch(() => undefined);
    logger.error('aviso_afiliado_falhou', {
      eventoId,
      afiliadoId,
      chave,
      err: err instanceof Error ? err.message.slice(0, 200) : String(err),
    });
    return { status: 'falha_envio', comunicacaoId: registro.comunicacaoId, chave };
  }
}

// ---------------------------------------------------------------------------
// Gatilho 1 — repasse registrado
// ---------------------------------------------------------------------------

export interface AvisoRepasseInput {
  eventoId: string;
  afiliadoId: string;
  /** Chave de idempotência do repasse (vira a chave do aviso por digest). */
  repasseId: string;
  /** Valor repassado agora (R$ cent-exato). */
  valor: number;
  /** Saldo de comissão que sobrou DEPOIS deste repasse. */
  saldoRestante: number;
}

/**
 * Avisa o afiliado de que um repasse foi registrado para ele.
 * NUNCA lança — o resultado do repasse não depende deste aviso.
 */
export async function avisarRepasseRegistrado(
  db: Db,
  input: AvisoRepasseInput,
  emailProvider: EmailProvider | null
): Promise<ResultadoAvisoAfiliado> {
  const chave = chaveAvisoRepasse(input.repasseId);
  try {
    const destino = await destinoDoAfiliado(db, input.eventoId, input.afiliadoId);
    if (destino === null) {
      logger.info('aviso_repasse_sem_destinatario', {
        eventoId: input.eventoId,
        afiliadoId: input.afiliadoId,
      });
      return { status: 'sem_destinatario', chave };
    }
    const rendered = renderAvisoRepasseComissaoEmail({
      nomeAfiliado: destino.nomeAfiliado,
      nomeEvento: destino.nomeEvento,
      valor: input.valor,
      saldoRestante: input.saldoRestante,
    });
    return await dispararAviso(
      db,
      {
        eventoId: input.eventoId,
        afiliadoId: input.afiliadoId,
        chave,
        templateRef: TEMPLATE_AVISO_REPASSE,
        assunto: rendered.assunto,
        html: rendered.html,
        texto: rendered.texto,
        tag: 'aviso-repasse-comissao',
        email: destino.email,
        nomeAfiliado: destino.nomeAfiliado,
      },
      emailProvider
    );
  } catch (err) {
    logger.error('aviso_repasse_erro', {
      eventoId: input.eventoId,
      afiliadoId: input.afiliadoId,
      err: err instanceof Error ? err.message.slice(0, 200) : String(err),
    });
    return { status: 'falha_envio', chave };
  }
}

// ---------------------------------------------------------------------------
// Gatilho 2 — marco de comissão
// ---------------------------------------------------------------------------

export interface AvisoMarcoInput {
  eventoId: string;
  afiliadoId: string;
  /** Marco alcançado (`faixaCruzada` do core — 0 = primeira comissão). */
  faixa: number;
  /** Comissão acumulada DEPOIS da conversão que cruzou o marco. */
  acumulada: number;
}

/**
 * Avisa o afiliado de que a comissão dele cruzou um marco.
 * NUNCA lança — a confirmação da venda não depende deste aviso.
 */
export async function avisarMarcoComissao(
  db: Db,
  input: AvisoMarcoInput,
  emailProvider: EmailProvider | null
): Promise<ResultadoAvisoAfiliado> {
  const chave = chaveAvisoMarco(input.faixa);
  try {
    const destino = await destinoDoAfiliado(db, input.eventoId, input.afiliadoId);
    if (destino === null) {
      logger.info('aviso_marco_sem_destinatario', {
        eventoId: input.eventoId,
        afiliadoId: input.afiliadoId,
      });
      return { status: 'sem_destinatario', chave };
    }
    const rendered = renderAvisoMarcoComissaoEmail({
      nomeAfiliado: destino.nomeAfiliado,
      nomeEvento: destino.nomeEvento,
      faixa: input.faixa,
      acumulada: input.acumulada,
    });
    return await dispararAviso(
      db,
      {
        eventoId: input.eventoId,
        afiliadoId: input.afiliadoId,
        chave,
        templateRef: TEMPLATE_AVISO_MARCO,
        assunto: rendered.assunto,
        html: rendered.html,
        texto: rendered.texto,
        tag: 'aviso-marco-comissao',
        email: destino.email,
        nomeAfiliado: destino.nomeAfiliado,
      },
      emailProvider
    );
  } catch (err) {
    logger.error('aviso_marco_erro', {
      eventoId: input.eventoId,
      afiliadoId: input.afiliadoId,
      err: err instanceof Error ? err.message.slice(0, 200) : String(err),
    });
    return { status: 'falha_envio', chave };
  }
}
