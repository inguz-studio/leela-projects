// =============================================================================
// functions/src/eventos/editarModalidadesEvento.ts
//
// Cloud Function callable: A PORTA ÚNICA da lista de modalidades do evento
// (LEELA-S316 · E04 · RN-578, RN-501, RN-502, RN-505 — a RN-500 foi REVOGADA
// pelo dono em 28/08, V2708-25, e a revogação está marcada na própria regra).
//
// Até aqui `evento.modalidades[]` era escrito UMA vez, na criação
// (`criarEvento.ts`), e o contrato de atualização o excluía por escrito
// (`api-client/eventos/configuracoesEvento.ts`). Esta é a porta que faltava —
// e desde 28/08 ela também é a porta do CICLO DE VIDA (RN-578).
//
// AS SEIS OPERAÇÕES, e a fronteira de cada uma (RN-578 — a fronteira desceu
// do EVENTO para A MODALIDADE):
//   - acrescentar — SEMPRE permitido, mesmo com inscritos/vendas no evento.
//     As únicas recusas são as do nome (kernel) e o teto de 20.
//   - renomear / remover — só enquanto A MODALIDADE não tem venda. "Venda" =
//     inscrição de QUALQUER status (inclusive PIX pendente — espírito da
//     RN-487) OU lote com `vendidos`/`reservas` > 0, as duas fontes checadas
//     DENTRO da transação. O nome faz parte do que o comprador comprou
//     (`inscrito.modalidade`), e a migração da RN-501 não alcança inscritos —
//     por isso modalidade vendida não renomeia nem some: inativa/oculta.
//   - inativar / ocultar / reativar — SEMPRE permitidos. Escrevem SOMENTE os
//     dois arrays de estado (`modalidadesInativas`/`modalidadesOcultas`,
//     mutuamente exclusivos por construção) + `atualizadoEm`. NUNCA tocam
//     inscrito, pedido, lote, contador ou aprovisionamento — inativar não é
//     estorno: o vendido permanece válido, visível e entregável.
//
// ⛔ RN-505 — A EDIÇÃO NUNCA ESCREVE A PARTIR DA PROJEÇÃO DEGRADADA. O cliente
// manda o NOME e a operação, jamais a lista inteira. Aqui a lista sai do
// documento, lido dentro da transação, e o acréscimo usa `arrayUnion`.
//
// GUARDS (servidor autoritativo — o Admin SDK bypassa as Rules):
//   - papel: SÓ tenant_owner (`assertTenantOwner`);
//   - tenant: evento do PRÓPRIO tenant (RN-400) + tenant ativo (RN-402);
//   - fronteira POR MODALIDADE (RN-578), checada POR CONTA PRÓPRIA dentro da
//     transação — este teste é a prova da lane: removê-lo tem de deixar o
//     caso da modalidade vendida VERMELHO em renomear/remover;
//   - kernel puro: `packages/core/src/eventos/modalidades.ts` — a MESMA
//     recusa que a tela mostra antes de enviar.
//
// RN-501 · RENOMEAR É MIGRAÇÃO ATÔMICA, NUNCA EDIÇÃO DE CAMPO. As referências
// mudam num único commit: `modalidades[]`, `percursos[].nome`,
// `Lote.modalidade`, `Kit.modalidades[]`, `campanha.segmento.referencia` — e,
// desde a RN-578, os dois arrays de estado migram JUNTO no mesmo patch do
// evento. O docId do lote NÃO é recriado (ver S316-T6).
//
// RN-502 · REMOVER RECUSA NOMEANDO QUEM IMPEDE — inalterada. Remover também
// LIMPA o nome dos dois arrays de estado: estado de modalidade que não existe
// é lixo.
//
// MOTIVO OPCIONAL (V2708-26, 28/08): o dono cortou a exigência de motivo dos
// fluxos do organizador. O campo é aceito e GRAVADO QUANDO VIER (teto 500);
// a trilha (RN-304) continua registrando quem/quando/operação/de→para.
// ⛔ O motivo da porta da PLATAFORMA (RN-376 — estornos/admin) não foi tocado.
//
// AUDITORIA (RN-304): toda operação EFETIVADA grava em `auditoriaAcessos`
// FORA da transação e APÓS o commit; falha do registro é logada alto.
// =============================================================================

import * as admin from 'firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { https } from 'firebase-functions/v1';
import * as logger from 'firebase-functions/logger';
import {
  estadoModalidade,
  isOperacaoEstado,
  isOperacaoModalidade,
  msgModalidadeComVenda,
  normalizarNomeModalidade,
  validarAcrescentarModalidade,
  validarNomeModalidade,
  validarRemoverModalidade,
  validarRenomearModalidade,
  validarTransicaoModalidade,
  type AuthClaims,
  type EstadoModalidade,
  type OperacaoModalidade,
  type ReferenciasDaModalidade,
} from '@leela/core';
import { assertTenantOwner } from '../finance/atores';
import { assertTenantAtivo, type EventoCaller } from './criarEvento';
import { AUDITORIA_ACESSOS_COL } from '../shared/auditoriaAcessos';

type Db = admin.firestore.Firestore;

// ---------------------------------------------------------------------------
// Contratos
// ---------------------------------------------------------------------------

export interface EditarModalidadesEventoInput {
  eventoId: string;
  operacao: OperacaoModalidade;
  /**
   * `acrescentar`: o nome novo. `renomear`/`remover`/`inativar`/`ocultar`/
   * `reativar`: o nome ATUAL.
   */
  modalidade: string;
  /** Só em `renomear`: o nome de destino. */
  novoNome?: string;
  /** Motivo — OPCIONAL desde V2708-26 (grava se vier; teto 500). */
  motivo?: string;
}

/** Quantos documentos a renomeação migrou, por família (RN-501). */
export interface MigracaoModalidade {
  lotes: number;
  kits: number;
  campanhas: number;
}

export interface EditarModalidadesEventoResult {
  eventoId: string;
  operacao: OperacaoModalidade;
  /** false = no-op declarado (nada gravado). */
  alterado: boolean;
  /** A lista DEPOIS da operação, lida do documento — autoritativa. */
  modalidades: string[];
  /** Estado DEPOIS da operação (RN-578) — autoritativo, para a UI espelhar. */
  modalidadesInativas: string[];
  modalidadesOcultas: string[];
  /** Presente só em `renomear`. */
  migracao?: MigracaoModalidade;
}

export const MOTIVO_MODALIDADE_MAX = 500;

/** Tipo do registro de auditoria deste fluxo (discriminador na coleção). */
export const TIPO_AUDITORIA_MODALIDADES = 'editar_modalidades_evento';

/**
 * Teto de documentos migrados numa renomeação. A transação do Firestore aceita
 * até 500 escritas; aqui o teto é menor de propósito, para a recusa ser
 * NOMEADA em vez de virar erro opaco do SDK no evento gigante. Nenhum evento
 * real chega perto: é rede de segurança, não regra de produto.
 */
export const MIGRACAO_DOCS_MAX = 400;

/** Valida o input bruto — lista de erros (vazia = válido). @pure */
export function validarEditarModalidadesInput(raw: unknown): string[] {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return ['Input é obrigatório.'];
  }
  const input = raw as Record<string, unknown>;
  const erros: string[] = [];

  // Ids com '/' fariam `.doc()` lançar (vira 'internal' opaco) — rejeitar aqui
  // devolve 'invalid-argument' honesto (mesmo molde do ajustarCapacidadeLote).
  if (
    typeof input['eventoId'] !== 'string' ||
    input['eventoId'].length === 0 ||
    input['eventoId'].includes('/')
  ) {
    erros.push('"eventoId" é obrigatório (sem "/").');
  }

  if (!isOperacaoModalidade(input['operacao'])) {
    erros.push(
      '"operacao" deve ser acrescentar, renomear, remover, inativar, ocultar ou reativar.',
    );
  }

  const modalidade = input['modalidade'];
  if (typeof modalidade !== 'string') {
    erros.push('"modalidade" é obrigatória.');
  } else {
    const erroNome = validarNomeModalidade(modalidade);
    if (erroNome !== null) erros.push(erroNome);
  }

  if (input['operacao'] === 'renomear') {
    const novo = input['novoNome'];
    if (typeof novo !== 'string') {
      erros.push('"novoNome" é obrigatório em renomear.');
    } else {
      const erroNovo = validarNomeModalidade(novo);
      if (erroNovo !== null) erros.push(erroNovo);
    }
  }

  // Motivo OPCIONAL (V2708-26): ausente/vazio passa; presente tem teto e tipo.
  const motivo = input['motivo'];
  if (motivo !== undefined && motivo !== null) {
    if (typeof motivo !== 'string') {
      erros.push('"motivo", quando presente, deve ser texto.');
    } else if (motivo.trim().length > MOTIVO_MODALIDADE_MAX) {
      erros.push(`"motivo" excede ${MOTIVO_MODALIDADE_MAX} caracteres.`);
    }
  }

  return erros;
}

// ---------------------------------------------------------------------------
// Leitura das listas a partir do DOCUMENTO (nunca do cliente — RN-505)
// ---------------------------------------------------------------------------

/** Percurso como vive no doc do evento (preço-base legado, consultado por nome). */
interface PercursoBruto {
  nome: string;
  preco: number;
}

/**
 * Lê uma lista de nomes do doc cru, tolerando lixo (o doc pode ser o mesmo que
 * faz o `parseEvento` falhar — é justamente esse o caso da RN-505). Elemento
 * que não é string não-vazia é IGNORADO, nunca corrige e nunca lança.
 */
function lerModalidades(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((m): m is string => typeof m === 'string' && m.trim().length > 0);
}

/** Lê `percursos[]` do doc cru, com a mesma tolerância. */
function lerPercursos(raw: unknown): PercursoBruto[] {
  if (!Array.isArray(raw)) return [];
  const out: PercursoBruto[] = [];
  for (const p of raw) {
    if (!p || typeof p !== 'object' || Array.isArray(p)) continue;
    const item = p as Record<string, unknown>;
    const nome = item['nome'];
    const preco = item['preco'];
    if (typeof nome !== 'string' || nome.trim().length === 0) continue;
    out.push({ nome, preco: typeof preco === 'number' && Number.isFinite(preco) ? preco : 0 });
  }
  return out;
}

// ---------------------------------------------------------------------------
// Núcleo (testável com Admin SDK contra o Emulator; callable é wrapper fino)
// ---------------------------------------------------------------------------

export async function editarModalidadesEventoCore(
  db: Db,
  rawInput: unknown,
  caller: EventoCaller,
): Promise<EditarModalidadesEventoResult> {
  // GUARD de papel: SÓ tenant_owner (staff/promoter/athlete negados).
  const tenantId = assertTenantOwner(caller.claims);

  const erros = validarEditarModalidadesInput(rawInput);
  if (erros.length > 0) {
    throw new https.HttpsError(
      'invalid-argument',
      `EditarModalidadesEventoInput inválido: ${erros.join(' ')}`,
    );
  }
  const input = rawInput as unknown as EditarModalidadesEventoInput;
  const nome = normalizarNomeModalidade(input.modalidade);
  const novoNome =
    input.operacao === 'renomear' ? normalizarNomeModalidade(input.novoNome ?? '') : '';
  const motivo = typeof input.motivo === 'string' ? input.motivo.trim() : '';

  await assertTenantAtivo(db, tenantId);

  const eventoRef = db.collection('eventos').doc(input.eventoId);
  const lotesCol = eventoRef.collection('lotes');
  const kitsCol = eventoRef.collection('kits');
  const campanhasCol = eventoRef.collection('campanhas');
  const inscritosCol = eventoRef.collection('inscritos');

  const resultado = await db.runTransaction(async (tx) => {
    // ---- LEITURAS (todas antes de qualquer escrita — contrato do Firestore).
    const eventoSnap = await tx.get(eventoRef);
    if (!eventoSnap.exists) {
      throw new https.HttpsError('not-found', `Evento '${input.eventoId}' não existe.`);
    }
    if (eventoSnap.get('tenantId') !== tenantId) {
      throw new https.HttpsError(
        'permission-denied',
        'Evento pertence a outro tenant (RN-400).',
      );
    }

    // As listas saem do DOCUMENTO, nunca do cliente (RN-505).
    const modalidades = lerModalidades(eventoSnap.get('modalidades'));
    const percursos = lerPercursos(eventoSnap.get('percursos'));
    const inativas = lerModalidades(eventoSnap.get('modalidadesInativas'));
    const ocultas = lerModalidades(eventoSnap.get('modalidadesOcultas'));

    // ------------------------------------------------------------------
    // Operações de ESTADO (RN-578): inativar / ocultar / reativar.
    // Sempre permitidas; escrevem SÓ os dois arrays. Repetição é no-op.
    // ------------------------------------------------------------------
    if (isOperacaoEstado(input.operacao)) {
      const recusa = validarTransicaoModalidade(modalidades, nome);
      if (recusa !== null) throw new https.HttpsError('failed-precondition', recusa);

      const estadoAtual = estadoModalidade(nome, inativas, ocultas);
      const estadoNovo: EstadoModalidade =
        input.operacao === 'inativar'
          ? 'inativa'
          : input.operacao === 'ocultar'
            ? 'oculta'
            : 'ativa';

      if (estadoAtual === estadoNovo) {
        // No-op declarado — nada gravado, nunca erro (transição idempotente).
        return {
          alterado: false,
          modalidades,
          inativas,
          ocultas,
          de: estadoAtual,
          para: estadoNovo,
        };
      }

      // Mutuamente exclusivos por construção: toda transição escreve um array
      // e limpa o outro. ⛔ NADA além dos dois arrays + atualizadoEm — o teste
      // que prova que inativar não toca inscrito/pedido/lote depende disto.
      tx.update(eventoRef, {
        modalidadesInativas:
          estadoNovo === 'inativa' ? FieldValue.arrayUnion(nome) : FieldValue.arrayRemove(nome),
        modalidadesOcultas:
          estadoNovo === 'oculta' ? FieldValue.arrayUnion(nome) : FieldValue.arrayRemove(nome),
        atualizadoEm: FieldValue.serverTimestamp(),
      });

      const inativasNovas =
        estadoNovo === 'inativa'
          ? [...inativas.filter((m) => m !== nome), nome]
          : inativas.filter((m) => m !== nome);
      const ocultasNovas =
        estadoNovo === 'oculta'
          ? [...ocultas.filter((m) => m !== nome), nome]
          : ocultas.filter((m) => m !== nome);
      return {
        alterado: true,
        modalidades,
        inativas: inativasNovas,
        ocultas: ocultasNovas,
        de: estadoAtual,
        para: estadoNovo,
      };
    }

    // ------------------------------------------------------------------
    // Operações ESTRUTURAIS: acrescentar / renomear / remover.
    // ------------------------------------------------------------------

    // Quem aponta para o nome — lido dentro da transação nas três famílias.
    // `acrescentar` não precisa, e pagar as queries por um append seria custo
    // sem veredito.
    const precisaDasReferencias = input.operacao !== 'acrescentar';
    const [lotesSnap, kitsSnap, campanhasSnap, inscritoSnap] = precisaDasReferencias
      ? await Promise.all([
          tx.get(lotesCol.where('modalidade', '==', nome)),
          tx.get(kitsCol.where('modalidades', 'array-contains', nome)),
          tx.get(campanhasCol.where('segmento.referencia', '==', nome)),
          // FRONTEIRA POR MODALIDADE (RN-578): UMA inscrição da modalidade, de
          // QUALQUER status (inclusive PIX pendente — espírito da RN-487), já
          // fecha renomear/remover. limit(1): só a existência decide.
          tx.get(inscritosCol.where('modalidade', '==', nome).limit(1)),
        ])
      : [null, null, null, null];

    const refs: ReferenciasDaModalidade = {
      lotes: (lotesSnap?.docs ?? []).map((d) => (d.get('nome') as string) ?? d.id),
      kits: (kitsSnap?.docs ?? []).map((d) => (d.get('nome') as string) ?? d.id),
      campanhas: (campanhasSnap?.docs ?? []).map((d) => (d.get('nome') as string) ?? d.id),
    };

    // "Modalidade com venda" (RN-578): inscrição de qualquer status OU lote
    // com vendidos/reservas > 0 — defesa em profundidade: as duas fontes,
    // dentro da MESMA transação.
    const loteComVenda = (lotesSnap?.docs ?? []).some((d) => {
      const vendidos = d.get('vendidos');
      const reservas = d.get('reservas');
      return (
        (typeof vendidos === 'number' && vendidos > 0) ||
        (typeof reservas === 'number' && reservas > 0)
      );
    });
    const modalidadeComVenda = (inscritoSnap?.size ?? 0) > 0 || loteComVenda;

    // ---- VEREDITO (kernel puro — a MESMA recusa que a tela mostra).
    if (input.operacao === 'acrescentar') {
      // RN-578: acrescentar é SEMPRE permitido — nenhuma fronteira de venda.
      const recusa = validarAcrescentarModalidade(modalidades, nome);
      if (recusa !== null) throw new https.HttpsError('failed-precondition', recusa);

      // `arrayUnion` não apaga o que outra aba escreveu (RN-505). O percurso
      // é objeto, e a igualdade estrutural do `arrayUnion` não serve para
      // dedupe por nome — por isso ele vai por leitura-e-checagem.
      const jaTemPercurso = percursos.some((p) => p.nome === nome);
      const patch: Record<string, unknown> = {
        modalidades: FieldValue.arrayUnion(nome),
        atualizadoEm: FieldValue.serverTimestamp(),
      };
      if (!jaTemPercurso) {
        // preco 0 = "a definir" — mesmo default da criação do evento, onde os
        // percursos nascem derivados das modalidades com preço zero. O preço
        // de verdade mora no lote (RN-300).
        patch['percursos'] = [...percursos, { nome, preco: 0 }];
      }
      tx.update(eventoRef, patch);
      return {
        alterado: true,
        modalidades: [...modalidades, nome],
        inativas,
        ocultas,
        de: '',
        para: nome,
      };
    }

    if (input.operacao === 'renomear') {
      const recusa = validarRenomearModalidade(modalidades, nome, novoNome);
      if (recusa !== null) throw new https.HttpsError('failed-precondition', recusa);

      // FRONTEIRA POR MODALIDADE (RN-578): modalidade vendida não renomeia —
      // o nome faz parte do que o comprador comprou, e a migração da RN-501
      // não alcança inscritos/pedidos. Remover esta guarda tem de deixar o
      // caso vendido VERMELHO no teste.
      if (modalidadeComVenda) {
        throw new https.HttpsError(
          'failed-precondition',
          msgModalidadeComVenda(nome, 'renomear'),
        );
      }

      const totalDocs =
        (lotesSnap?.size ?? 0) + (kitsSnap?.size ?? 0) + (campanhasSnap?.size ?? 0);
      if (totalDocs > MIGRACAO_DOCS_MAX) {
        throw new https.HttpsError(
          'failed-precondition',
          `A modalidade "${nome}" tem ${totalDocs} documentos apontando para ela, ` +
            `acima do teto de ${MIGRACAO_DOCS_MAX} de uma migração atômica. ` +
            'Fale com o suporte antes de renomear.',
        );
      }

      // PAI ANTES DOS FILHOS — e no mesmo commit. Numa transação do Firestore
      // as escritas são aplicadas juntas, então a ordem aqui é de leitura, não
      // de efeito: o que importa é que NÃO existam duas escritas separadas,
      // porque entre elas a `modalidadeExisteNoEventoPai` inutilizaria os lotes.
      // Os DOIS arrays de estado migram junto (RN-578): estado é da modalidade,
      // e ela mudou de nome.
      const modalidadesNovas = modalidades.map((m) => (m === nome ? novoNome : m));
      const percursosNovos = percursos.map((p) =>
        p.nome === nome ? { ...p, nome: novoNome } : p,
      );
      const inativasNovas = inativas.map((m) => (m === nome ? novoNome : m));
      const ocultasNovas = ocultas.map((m) => (m === nome ? novoNome : m));
      tx.update(eventoRef, {
        modalidades: modalidadesNovas,
        percursos: percursosNovos,
        modalidadesInativas: inativasNovas,
        modalidadesOcultas: ocultasNovas,
        atualizadoEm: FieldValue.serverTimestamp(),
      });

      for (const d of lotesSnap?.docs ?? []) {
        // ⛔ O docId NÃO é recriado (ver o cabeçalho). Só o campo migra.
        tx.update(d.ref, { modalidade: novoNome, atualizadoEm: FieldValue.serverTimestamp() });
      }
      for (const d of kitsSnap?.docs ?? []) {
        const atuais = lerModalidades(d.get('modalidades'));
        tx.update(d.ref, {
          modalidades: atuais.map((m) => (m === nome ? novoNome : m)),
          atualizadoEm: FieldValue.serverTimestamp(),
        });
      }
      for (const d of campanhasSnap?.docs ?? []) {
        // Escrita cirúrgica no campo aninhado — não reescreve o segmento
        // inteiro, para não apagar `tipo` nem o que outra lane acrescentar.
        tx.update(d.ref, {
          'segmento.referencia': novoNome,
          atualizadoEm: FieldValue.serverTimestamp(),
        });
      }

      return {
        alterado: true,
        modalidades: modalidadesNovas,
        inativas: inativasNovas,
        ocultas: ocultasNovas,
        de: nome,
        para: novoNome,
        migracao: {
          lotes: lotesSnap?.size ?? 0,
          kits: kitsSnap?.size ?? 0,
          campanhas: campanhasSnap?.size ?? 0,
        },
      };
    }

    // remover — NUNCA com venda na modalidade (RN-578: "só não pode apagar"
    // protege o vendido). A guarda vem ANTES da RN-502: a razão mais forte
    // primeiro — apagar lotes/kits não abriria caminho nenhum.
    if (modalidadeComVenda) {
      throw new https.HttpsError(
        'failed-precondition',
        msgModalidadeComVenda(nome, 'remover'),
      );
    }
    const recusa = validarRemoverModalidade(modalidades, nome, refs);
    if (recusa !== null) throw new https.HttpsError('failed-precondition', recusa);

    const modalidadesNovas = modalidades.filter((m) => m !== nome);
    const percursosNovos = percursos.filter((p) => p.nome !== nome);
    tx.update(eventoRef, {
      modalidades: modalidadesNovas,
      percursos: percursosNovos,
      // Limpeza de estado (RN-578): estado de modalidade que não existe é lixo.
      modalidadesInativas: FieldValue.arrayRemove(nome),
      modalidadesOcultas: FieldValue.arrayRemove(nome),
      atualizadoEm: FieldValue.serverTimestamp(),
    });
    return {
      alterado: true,
      modalidades: modalidadesNovas,
      inativas: inativas.filter((m) => m !== nome),
      ocultas: ocultas.filter((m) => m !== nome),
      de: nome,
      para: '',
    };
  });

  // AUDITORIA pós-commit (RN-304). Falha aqui não desfaz a operação: loga alto.
  // Motivo entra QUANDO VEIO (V2708-26) — a trilha continua dizendo quem,
  // quando, o quê e de→para, que é o que ela precisa saber.
  if (resultado.alterado) {
    try {
      await db.collection(AUDITORIA_ACESSOS_COL).add({
        tipo: TIPO_AUDITORIA_MODALIDADES,
        tenantId,
        eventoId: input.eventoId,
        operacao: input.operacao,
        modalidade: nome,
        de: resultado.de,
        para: resultado.para,
        ...(motivo.length > 0 ? { motivo } : {}),
        uid: caller.uid,
        papel: caller.claims.role ?? 'desconhecido',
        em: FieldValue.serverTimestamp(),
        ...(resultado.migracao ? { migracao: resultado.migracao } : {}),
      });
    } catch (err) {
      logger.error('auditoria_editar_modalidades_falhou', {
        eventoId: input.eventoId,
        operacao: input.operacao,
        uid: caller.uid,
        err: err instanceof Error ? err.message : String(err),
      });
    }
  }

  // Fallback COMPLETO: se o write da auditoria falhar, o Cloud Logging preserva
  // quem/de→para/tenant/papel (e o motivo, quando veio).
  logger.info('editar_modalidades_evento', {
    eventoId: input.eventoId,
    tenantId,
    operacao: input.operacao,
    modalidade: nome,
    alterado: resultado.alterado,
    de: resultado.de,
    para: resultado.para,
    ...(motivo.length > 0 ? { motivo } : {}),
    uid: caller.uid,
    papel: caller.claims.role ?? 'desconhecido',
    ...(resultado.migracao ? { migracao: resultado.migracao } : {}),
  });

  return {
    eventoId: input.eventoId,
    operacao: input.operacao,
    alterado: resultado.alterado,
    modalidades: resultado.modalidades,
    modalidadesInativas: resultado.inativas,
    modalidadesOcultas: resultado.ocultas,
    ...(resultado.migracao ? { migracao: resultado.migracao } : {}),
  };
}

// ---------------------------------------------------------------------------
// Callable
// ---------------------------------------------------------------------------

/** `editarModalidadesEvento` — a porta única do organizador (owner-only, RN-578). */
export const editarModalidadesEvento = https.onCall(async (data: unknown, context) => {
  if (!context.auth) {
    throw new https.HttpsError('unauthenticated', 'Requer autenticação.');
  }
  return editarModalidadesEventoCore(admin.firestore(), data, {
    uid: context.auth.uid,
    claims: context.auth.token as unknown as AuthClaims,
  });
});
