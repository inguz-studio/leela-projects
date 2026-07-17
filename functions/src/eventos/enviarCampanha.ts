// =============================================================================
// functions/src/eventos/enviarCampanha.ts
//
// Cloud Function callable: dispara uma campanha do evento (LEELA-S401-T4 ·
// E06-L2-T2). Contrato (espelho do épico):
//   enviarCampanha({ eventoId, campanhaId })
//     -> { ok: true, alcance, jaEnviada }
//      | { bloqueado: 'limite_push', pushNaJanela }
//      | { bloqueado: 'segmento_vazio' }
//
// CASCA FINA sobre o envelope compartilhado (E06-L1-T1 · Camada B —
// `shared/comunicacaoEnvio.ts`): idempotência de reenvio, limite RN-133
// (janela deslizante 7d, email-only não consome cota — RN-131) e o carimbo
// status='enviado' + enviadoEm + alcance rodam na MESMA transação.
//
// ALCANCE (aceite E06-L2-T2): `todos_inscritos` → recontagem REAL via
// count() de inscritos ativos DENTRO da tx; segmento específico →
// fotografia `segmento.tamanhoEstimado` (mesmo contrato do clube).
//
// DISPARO FÍSICO = MOCK (padrão PaymentProvider/ADR-006, decisão 7 do
// brief): nenhuma integração de push/email real. O "disparo" é o registro
// no LOG DE COMUNICAÇÃO (FABLE-G · RN-219): fan-out de
// `registrarComunicacao` por destinatário × canal, com docId DETERMINÍSTICO
// `{inscritoRef}_{campanhaId}_{canal}` — reprocessar colide no doc e NÃO
// duplica (a existência do doc É o hasSent). O agregado
// `comunicacoesResumo/current` recomputa via trigger onComunicacaoWrite
// (FABLE-G) — nada a fazer aqui. A aba Comunicação (E06-L3) passa a listar
// estes envios.
//
// CRASH-SAFETY do fan-out: o carimbo vem ANTES do fan-out (o limite RN-133
// e o carimbo são transacionais e não podem depender de N writes). Se o
// processo cair no meio do fan-out, o RETRY cai no ramo 'ja_enviado' e o
// fan-out RODA DE NOVO (idempotente por docId — os já registrados retornam
// 'ja_registrada'): logs faltantes são curados sem duplicar nenhum.
//
// SEGMENTO VAZIO (postura antagonista do lote): 0 destinatários → NÃO
// dispara, NÃO carimba, NÃO consome cota (resolvido ANTES do envelope).
//
// PII (Schneier): a resolução de destinatários usa `.select()` SEM campos —
// só docIds trafegam (nome/CPF nunca saem para decidir um fan-out); o log
// carrega assunto + templateRef, NUNCA corpo (parseLogComunicacao rejeita
// corpo — invariante preservada porque registrarComunicacao parseia ANTES
// do write). Erros sem PII.
//
// Autorização: papel de escrita do tenant (RN-401) + evento do PRÓPRIO
// tenant (RN-400) — padrão das callables de eventos do repo (a spec fala
// "organizadorId == uid"; o modelo de auth vigente é claims de tenant,
// mesma decisão de registrarEntrega/estimarAlcance).
// =============================================================================

import * as admin from 'firebase-admin';
import { https } from 'firebase-functions/v1';
import * as logger from 'firebase-functions/logger';
import {
  CHAVE_LOG_COMUNICACAO_RE,
  COLECAO_CAMPANHAS,
  STATUS_INSCRITO,
  disparoVencido,
  inscritoAtivo,
  truncarPush,
  type AuthClaims,
  type CanalCampanha,
  type SegmentoCampanha,
  type StatusInscrito,
} from '@leela/core';
import {
  executarEnvioComunicacao,
  type EnvioResultado,
} from '../shared/comunicacaoEnvio';
import { registrarComunicacao } from './logComunicacao';
import {
  assertTenantAtivo,
  assertTenantWriter,
  type EventoCaller,
} from './criarEvento';

// ---------------------------------------------------------------------------
// Contratos
// ---------------------------------------------------------------------------

export interface EnviarCampanhaInput {
  eventoId: string;
  campanhaId: string;
}

export type EnviarCampanhaResult =
  | { ok: true; alcance: number; jaEnviada: boolean }
  | { bloqueado: 'limite_push'; pushNaJanela: number }
  | { bloqueado: 'segmento_vazio' }
  /** Só no caminho do CRON (exigirAgendadoVencido): a campanha deixou de
      estar 'agendado'/vencida entre a varredura e a tx (fix TOCTOU) */
  | { bloqueado: 'nao_elegivel' };

/** Status ativos — derivados de `inscritoAtivo` (fonte única, RN-204). */
const STATUS_ATIVOS: readonly StatusInscrito[] = STATUS_INSCRITO.filter(
  (status) => inscritoAtivo({ status })
);

/** Fan-out em lotes (emulator/8GB friendly; cada registro é uma tx curta). */
const FANOUT_LOTE = 20;

// ---------------------------------------------------------------------------
// Núcleo (testável com Admin SDK contra o Emulator; callable é wrapper fino)
// ---------------------------------------------------------------------------

export async function enviarCampanhaCore(
  db: admin.firestore.Firestore,
  rawInput: unknown,
  caller: EventoCaller,
  agora: Date = new Date()
): Promise<EnviarCampanhaResult> {
  const tenantId = assertTenantWriter(caller.claims);

  const input = rawInput as Partial<EnviarCampanhaInput> | null;
  const eventoId = input?.eventoId;
  const campanhaId = input?.campanhaId;
  if (typeof eventoId !== 'string' || eventoId.length === 0) {
    throw new https.HttpsError('invalid-argument', '"eventoId" é obrigatório.');
  }
  if (typeof campanhaId !== 'string' || campanhaId.length === 0) {
    throw new https.HttpsError(
      'invalid-argument',
      '"campanhaId" é obrigatório.'
    );
  }
  // A chave de idempotência do log É o campanhaId (RN-219) — id incompatível
  // com a regex do docId falharia DEPOIS do carimbo; barra ANTES (fail-fast).
  if (!CHAVE_LOG_COMUNICACAO_RE.test(campanhaId)) {
    throw new https.HttpsError(
      'failed-precondition',
      'campanhaId incompatível com a chave de idempotência do log ' +
        '(sem "_"; alfanumérico/hífen — RN-219).'
    );
  }

  await assertTenantAtivo(db, tenantId);

  const eventoRef = db.collection('eventos').doc(eventoId);
  const eventoSnap = await eventoRef.get();
  if (!eventoSnap.exists) {
    throw new https.HttpsError('not-found', `Evento '${eventoId}' não existe.`);
  }
  if (eventoSnap.get('tenantId') !== tenantId) {
    throw new https.HttpsError(
      'permission-denied',
      'Evento pertence a outro tenant (RN-400).'
    );
  }

  return executarDisparoCampanha(db, eventoRef, campanhaId, tenantId, agora);
}

// ---------------------------------------------------------------------------
// DISPARO compartilhado (callable + scheduler ADR-015 · SCHED-T1)
// ---------------------------------------------------------------------------

/**
 * Miolo do disparo — TUDO após a autorização: leitura da campanha, resolução
 * de destinatários, envelope transacional (idempotência + RN-133 + carimbo)
 * e fan-out no log. Extraído para o cron `dispatchCampanhasAgendadas`
 * (SCHED-T1) reusar o MESMO pipeline do disparo manual — nunca um segundo
 * mecanismo de envio. Pré-condições do caller:
 *   - callable: claims de tenant writer + tenant ativo + evento do tenant
 *     (enviarCampanhaCore acima);
 *   - cron: evento/tenant relidos e tenant ATIVO verificado por varredura
 *     (Admin SDK — a autoridade é o sistema, não um usuário).
 */
export async function executarDisparoCampanha(
  db: admin.firestore.Firestore,
  eventoRef: admin.firestore.DocumentReference,
  campanhaId: string,
  tenantId: string,
  agora: Date,
  opts: { exigirAgendadoVencido?: boolean } = {}
): Promise<EnviarCampanhaResult> {
  const eventoId = eventoRef.id;
  const campanhasCol = eventoRef.collection(COLECAO_CAMPANHAS);
  const campanhaSnap = await campanhasCol.doc(campanhaId).get();
  if (!campanhaSnap.exists) {
    throw new https.HttpsError(
      'not-found',
      `Campanha '${campanhaId}' não existe no evento '${eventoId}'.`
    );
  }

  const segmento = (campanhaSnap.get('segmento') ?? {}) as SegmentoCampanha;
  const canal = (campanhaSnap.get('canal') ?? []) as CanalCampanha[];
  const titulo = (campanhaSnap.get('titulo') ?? '') as string;

  // ── Destinatários do segmento (docIds APENAS — PII mínima) ───────────────
  const destinatarios = await resolverDestinatarios(eventoRef, segmento);

  // Segmento vazio: não dispara, não carimba, não consome cota.
  if (destinatarios.length === 0 && campanhaSnap.get('status') !== 'enviado') {
    return { bloqueado: 'segmento_vazio' };
  }

  // ── Envelope transacional compartilhado (RN-133 + idempotência + carimbo) ─
  const resultado: EnvioResultado = await executarEnvioComunicacao(
    db,
    campanhasCol,
    campanhaId,
    async (tx, snap) => {
      const seg = (snap.get('segmento') ?? {}) as SegmentoCampanha;
      if (seg.tipo === 'todos_inscritos') {
        // Recontagem REAL dentro da tx (aceite E06-L2-T2)
        let total = 0;
        for (const status of STATUS_ATIVOS) {
          const c = await tx.get(
            eventoRef
              .collection('inscritos')
              .where('status', '==', status)
              .count()
          );
          total += c.data().count;
        }
        return total;
      }
      // Segmento específico: fotografia da estimativa (mesmo contrato do clube)
      return seg.tamanhoEstimado ?? 0;
    },
    agora,
    // Guarda anti-TOCTOU do CRON (review O3-L4 #1), avaliada no snap FRESCO
    // dentro da tx: entre a varredura e o disparo o organizador pode ter
    // voltado a campanha p/ rascunho ou ADIADO o agendamento — nesse caso
    // NÃO envia, NÃO carimba, NÃO consome cota. Decisão 17 (RN-136): a
    // janela válida é (agora − tolerância, agora] — `agendadoPara` reeditado
    // p/ um passado além da tolerância entre a query e a tx também NÃO envia
    // (o cron marca 'vencido' na varredura seguinte). O disparo manual
    // (callable) não passa a guarda (enviar rascunho é o job do botão).
    opts.exigirAgendadoVencido === true
      ? (snap) => {
          if (snap.get('status') !== 'agendado') return false;
          const quando = snap.get('agendadoPara') as
            | { toMillis?: () => number }
            | null
            | undefined;
          if (typeof quando?.toMillis !== 'function') return false;
          const momentoMs = quando.toMillis();
          return (
            momentoMs <= agora.getTime() &&
            !disparoVencido(momentoMs, agora.getTime())
          );
        }
      : undefined
  );

  if (resultado.motivo === 'nao_elegivel') {
    return { bloqueado: 'nao_elegivel' };
  }
  if (resultado.motivo === 'comunicado_invalido') {
    throw new https.HttpsError(
      'not-found',
      `Campanha '${campanhaId}' não existe no evento '${eventoId}'.`
    );
  }
  if (resultado.motivo === 'limite_push_semana') {
    // RN-133: NÃO carimba, NÃO gera log, não consome nada.
    return {
      bloqueado: 'limite_push',
      pushNaJanela: resultado.pushNaJanela ?? 0,
    };
  }

  // ── Disparo físico MOCK = fan-out no LOG (RN-219) ────────────────────────
  // Roda no 'ok' E no 'ja_enviado': retry após crash no meio do fan-out cura
  // logs faltantes; os existentes colidem no docId ('ja_registrada') e NADA
  // duplica. Assunto = título truncado por code point (o log não carrega
  // corpo — PII mínima).
  const assunto = truncarPush(titulo);
  let novosRegistros = 0;
  for (let i = 0; i < destinatarios.length; i += FANOUT_LOTE) {
    const lote = destinatarios.slice(i, i + FANOUT_LOTE);
    const resultados = await Promise.all(
      lote.flatMap((inscritoId) =>
        canal.map((c) =>
          registrarComunicacao(
            db,
            eventoId,
            {
              destinatario: { tipo: 'inscrito', ref: inscritoId },
              canal: c,
              tipo: 'campanha',
              chaveRef: campanhaId,
              assunto,
              templateRef: campanhaId,
            },
            agora
          )
        )
      )
    );
    novosRegistros += resultados.filter((r) => r.registrada).length;
  }

  const alcanceFinal = (await campanhasCol.doc(campanhaId).get()).get(
    'alcance'
  ) as number;

  // Sem PII no log — só ids e números agregados (LGPD)
  logger.info('campanha_enviada', {
    tenantId,
    eventoId,
    campanhaId,
    jaEnviada: resultado.motivo === 'ja_enviado',
    alcance: alcanceFinal,
    destinatarios: destinatarios.length,
    canais: canal.length,
    novosRegistros,
  });

  return {
    ok: true,
    alcance: alcanceFinal,
    jaEnviada: resultado.motivo === 'ja_enviado',
  };
}

// ---------------------------------------------------------------------------
// Resolução de destinatários (docIds apenas — `.select()` sem campos)
// ---------------------------------------------------------------------------

async function resolverDestinatarios(
  eventoRef: admin.firestore.DocumentReference,
  segmento: SegmentoCampanha
): Promise<string[]> {
  const inscritos = eventoRef.collection('inscritos');

  const idsDe = async (q: FirebaseFirestore.Query): Promise<string[]> =>
    (await q.select().get()).docs.map((d) => d.id);

  switch (segmento.tipo) {
    case 'todos_inscritos': {
      const listas = await Promise.all(
        STATUS_ATIVOS.map((s) => idsDe(inscritos.where('status', '==', s)))
      );
      return listas.flat();
    }
    case 'por_modalidade':
    case 'por_kit': {
      const campo = segmento.tipo === 'por_kit' ? 'kit' : 'modalidade';
      const ref = segmento.referencia ?? '';
      const listas = await Promise.all(
        STATUS_ATIVOS.map((s) =>
          idsDe(
            inscritos.where(campo, '==', ref).where('status', '==', s)
          )
        )
      );
      return listas.flat();
    }
    case 'por_status':
      return idsDe(
        inscritos.where('status', '==', segmento.referencia ?? '')
      );
    default:
      // Segmento fora da taxonomia V1 (doc legado/corrompido) — fail-fast.
      throw new https.HttpsError(
        'failed-precondition',
        `Segmento '${String((segmento as { tipo?: string }).tipo)}' fora da ` +
          'taxonomia V1 de campanha.'
      );
  }
}

// ---------------------------------------------------------------------------
// Callable
// ---------------------------------------------------------------------------

/** `enviarCampanha` — callable do editor/lista de campanhas (E06-L3 consome). */
export const enviarCampanha = https.onCall(async (data: unknown, context) => {
  if (!context.auth) {
    throw new https.HttpsError('unauthenticated', 'Requer autenticação.');
  }
  return enviarCampanhaCore(admin.firestore(), data, {
    uid: context.auth.uid,
    claims: context.auth.token as unknown as AuthClaims,
  });
});
