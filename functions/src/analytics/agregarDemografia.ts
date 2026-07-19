// =============================================================================
// functions/src/analytics/agregarDemografia.ts
//
// Demografia AGREGADA do evento por Cloud Function (LEELA-BEPEND-T1 · E11
// §RN-820).
//
// Doc mantido: `eventos/{eventoId}/demografia/current` — escrita EXCLUSIVA
// de Function (Rules: write false; leitura = isTenantWriter/platform_admin).
// A tela Financeiro→Análise de vendas LÊ este doc — nunca varre inscritos no
// cliente (RN-820/§2.12); substitui o mock honesto de idade/sexo.
//
// PII (LGPD) — a fronteira é AQUI: a fonte é o bloco `[reg]` dos inscritos
// (dadosPessoais.nascimento/genero), lida SERVER-SIDE com projeção `select()`
// restrita aos DOIS campos (nem CPF nem telefone entram na memória desta
// Function). O doc materializado carrega SÓ contagens por bucket — nenhuma
// data de nascimento, nenhum id de inscrito, nada individual. O painel só
// enxerga o agregado.
//
// FULL RECOMPUTE idempotente (padrão agregarFinanceiro/agregarEstoque/
// updateSaldoRepasse): recontagem via computeDemografia (@leela/core — NUNCA
// reimplementado aqui) sobre os inscritos CONFIRMADOS, numa transação
// (snapshot-consistente). Determinismo da idade: referência = DATA CIVIL DO
// EVENTO (`dataLocalISO(evento.data)`), não "agora" — reprocessar N vezes
// produz o MESMO doc; quando nada mudou, NENHUMA escrita acontece (no-op
// comparado campo a campo — `atualizadoEm` intocado prova a idempotência).
//
// Inscrito sem `[reg]` (checkout mínimo E12/legado) conta em `semNascimento`/
// `semGenero` — a UI mostra a lacuna honesta, nunca número inventado.
//
// Gatilho: onWrite de `eventos/{e}/inscritos/{i}` → recomputa (convive com
// onInscritoWrite/onInscritoWriteEstoque — agregados independentes no mesmo
// path). O write de `demografia/current` NÃO redispara — sem loop.
// LIMITAÇÃO DOCUMENTADA: mudança da DATA do evento só reflete no próximo
// write de inscrito (a referência da idade vive no doc e é visível).
// =============================================================================

import * as admin from 'firebase-admin';
import { FieldPath, FieldValue } from 'firebase-admin/firestore';
import * as functions from 'firebase-functions/v1';
import * as logger from 'firebase-functions/logger';
import {
  computeDemografia,
  dataLocalISO,
  demografiaInalterada,
  FAIXAS_ETARIAS,
  GENEROS_INSCRITO,
  type DemografiaContagens,
  type FaixaEtaria,
  type GeneroInscrito,
  type InscritoDemografiaInput,
  type MatrizFaixaGenero,
} from '@leela/core';

type Db = admin.firestore.Firestore;

/** Nome da subcoleção do agregado demográfico (E11 §RN-820). */
export const COLECAO_DEMOGRAFIA = 'demografia';

// ---------------------------------------------------------------------------
// Projeção do doc atual → contagens (para o no-op de idempotência)
// ---------------------------------------------------------------------------

function toCount(v: unknown): number {
  return typeof v === 'number' && Number.isFinite(v) && v >= 0 ? v : -1;
}

/**
 * Reconstrói `DemografiaContagens` do doc persistido (campo faltante/lixo ⇒
 * contagem -1, que NUNCA iguala um recompute válido — doc corrompido é
 * reescrito, não preservado). Doc no shape PRÉ-RN822 (6 faixas grossas, sem
 * `faixaXGenero`) cai exatamente aqui: as chaves novas faltam ⇒ -1 ⇒ o
 * full-recompute REESCREVE no shape novo (migração por recompute).
 */
function contagensDoDoc(
  snap: FirebaseFirestore.DocumentSnapshot
): DemografiaContagens {
  const faixasRaw = (snap.get('faixasEtarias') ?? {}) as Record<string, unknown>;
  const faixasEtarias = {} as Record<FaixaEtaria, number>;
  for (const f of FAIXAS_ETARIAS) faixasEtarias[f] = toCount(faixasRaw[f]);
  const generoRaw = (snap.get('porGenero') ?? {}) as Record<string, unknown>;
  const porGenero = {} as Record<GeneroInscrito, number>;
  for (const g of GENEROS_INSCRITO) porGenero[g] = toCount(generoRaw[g]);
  const matrizRaw = (snap.get('faixaXGenero') ?? {}) as Record<string, unknown>;
  const faixaXGenero = {} as MatrizFaixaGenero;
  for (const f of FAIXAS_ETARIAS) {
    const linhaRaw = (matrizRaw[f] ?? {}) as Record<string, unknown>;
    const linha = {} as Record<GeneroInscrito, number>;
    for (const g of GENEROS_INSCRITO) linha[g] = toCount(linhaRaw[g]);
    faixaXGenero[f] = linha;
  }
  return {
    totalConfirmados: toCount(snap.get('totalConfirmados')),
    faixasEtarias,
    semNascimento: toCount(snap.get('semNascimento')),
    porGenero,
    semGenero: toCount(snap.get('semGenero')),
    faixaXGenero,
    referencia: typeof snap.get('referencia') === 'string' ? (snap.get('referencia') as string) : '',
  };
}

// ---------------------------------------------------------------------------
// Recomputação (núcleo — testável com Admin SDK contra o Emulator)
// ---------------------------------------------------------------------------

/**
 * Recomputa a demografia agregada do evento DO ZERO e persiste em
 * `eventos/{eventoId}/demografia/current`. Tudo numa transação (leituras e
 * escrita do MESMO snapshot). Quando nada mudou, zero write (idempotente).
 *
 * @returns as contagens recomputadas, ou null quando o evento não existe.
 */
export async function recomputarDemografiaEvento(
  db: Db,
  eventoId: string
): Promise<DemografiaContagens | null> {
  return db.runTransaction(async (tx) => {
    const eventoRef = db.collection('eventos').doc(eventoId);
    const eventoSnap = await tx.get(eventoRef);
    if (!eventoSnap.exists) return null;

    const tenantId = (eventoSnap.get('tenantId') as string) ?? '';

    // Referência da idade = data CIVIL do evento (determinístico entre
    // recomputes). Evento sem `data` legível não fabrica referência — usa o
    // sentinela '' e TODOS caem em semNascimento (idadeCivil rejeita).
    const dataRaw = eventoSnap.get('data') as { toDate?: () => Date } | undefined;
    const referenciaISO =
      dataRaw !== undefined && typeof dataRaw?.toDate === 'function'
        ? dataLocalISO(dataRaw.toDate())
        : '';

    // SÓ os dois campos demográficos saem do storage (select projetado):
    // CPF/telefone/contato de emergência/restrições NUNCA entram na memória
    // desta Function — superfície mínima de PII (LGPD).
    const inscritosSnap = await tx.get(
      eventoRef
        .collection('inscritos')
        .where('status', '==', 'confirmado')
        .select(
          new FieldPath('dadosPessoais', 'nascimento'),
          new FieldPath('dadosPessoais', 'genero')
        )
    );
    const inscritos: InscritoDemografiaInput[] = inscritosSnap.docs.map((d) => ({
      nascimento: d.get(new FieldPath('dadosPessoais', 'nascimento')),
      genero: d.get(new FieldPath('dadosPessoais', 'genero')),
    }));

    const computado = computeDemografia(inscritos, referenciaISO);

    const demografiaRef = eventoRef.collection(COLECAO_DEMOGRAFIA).doc('current');
    const atualSnap = await tx.get(demografiaRef);
    if (
      atualSnap.exists &&
      atualSnap.get('tenantId') === tenantId &&
      demografiaInalterada(contagensDoDoc(atualSnap), computado)
    ) {
      return computado; // no-op — zero write (idempotente)
    }

    tx.set(demografiaRef, {
      tenantId,
      ...computado,
      atualizadoEm: FieldValue.serverTimestamp(),
    });
    return computado;
  });
}

// ---------------------------------------------------------------------------
// REPROCESSO (RN-822): full-recompute de TODOS os `demografia/current`
// ---------------------------------------------------------------------------

/**
 * Reprocessa a demografia agregada de TODOS os eventos — a operação que anda
 * JUNTO com o redeploy do RN-822 (premissa de deploy: Function nova + este
 * reprocesso são UMA operação; docs no shape antigo — 6 faixas grossas, sem
 * `faixaXGenero` — só migram aqui ou no próximo write de inscrito).
 *
 * IDEMPOTENTE por construção: cada evento passa por
 * `recomputarDemografiaEvento` (full recompute + no-op quando nada mudou) —
 * rodar N vezes produz o mesmo estado e a 2ª rodada não escreve nada.
 * Sequencial de propósito (operação administrativa pontual — sem rajada de
 * transações concorrentes contra a base).
 *
 * Execução (runbook): Admin SDK com credencial do projeto, após o deploy:
 *   const { reprocessarDemografiaTodosEventos } =
 *     require('./lib/functions/src/analytics/agregarDemografia');
 *   await reprocessarDemografiaTodosEventos(admin.firestore());
 */
export async function reprocessarDemografiaTodosEventos(
  db: Db
): Promise<{ eventos: number; falhas: string[] }> {
  // Só ids saem do storage (select vazio = nenhum campo) — zero PII aqui.
  const eventosSnap = await db.collection('eventos').select().get();
  const falhas: string[] = [];
  for (const docSnap of eventosSnap.docs) {
    try {
      await recomputarDemografiaEvento(db, docSnap.id);
    } catch (err) {
      falhas.push(docSnap.id);
      logger.error('demografia_reprocesso_falha', { eventoId: docSnap.id, err });
    }
  }
  logger.info('demografia_reprocesso_concluido', {
    eventos: eventosSnap.size,
    falhas: falhas.length,
  });
  return { eventos: eventosSnap.size, falhas };
}

// ---------------------------------------------------------------------------
// Gatilho (Cloud Functions v1 — mesmo runtime dos módulos existentes)
// ---------------------------------------------------------------------------

/**
 * onWrite de inscrito → recomputa a demografia agregada do evento.
 * At-least-once safe (full recompute — reprocessar não duplica). Convive com
 * onInscritoWrite (financeiro) e onInscritoWriteEstoque (aprovisionamento):
 * gatilhos independentes no mesmo path, agregados diferentes.
 */
export const onInscritoWriteDemografia = functions.firestore
  .document('eventos/{eventoId}/inscritos/{inscritoId}')
  .onWrite(async (_change, context) => {
    const eventoId = context.params['eventoId'] as string;
    try {
      const contagens = await recomputarDemografiaEvento(admin.firestore(), eventoId);
      if (contagens) {
        // Sem PII no log — id do evento + contagens agregadas (LGPD)
        logger.info('demografia_evento_recomputada', {
          eventoId,
          totalConfirmados: contagens.totalConfirmados,
          semNascimento: contagens.semNascimento,
          semGenero: contagens.semGenero,
        });
      }
    } catch (err) {
      logger.error('demografia_evento_falha', { eventoId, err });
      throw err;
    }
  });
