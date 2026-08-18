// =============================================================================
// functions/src/eventos/editarModalidadesEvento.ts
//
// Cloud Function callable: A PORTA ÚNICA da lista de modalidades do evento
// (LEELA-S316-T1/T2/T3 · E04 · RN-500, RN-501, RN-502, RN-505).
//
// Até aqui `evento.modalidades[]` era escrito UMA vez, na criação
// (`criarEvento.ts`), e o contrato de atualização o excluía por escrito
// (`api-client/eventos/configuracoesEvento.ts`). Quem digitava "21k" errado só
// consertava refazendo o evento. Esta é a porta que faltava.
//
// POR QUE UMA FUNCTION E NÃO ESCRITA DIRETA, com o custo declarado. A Rule
// `percursosEditaveis` (firestore.rules) JÁ autoriza o cliente enquanto
// `qtdInscritos == 0`, então acrescentar poderia ser um `setDoc`. Foi recusado
// por três medições:
//   1. `modalidades[]` e `percursos[].nome` são DUAS cópias do mesmo fato no
//      mesmo documento, e mantê-las em sincronia exige ler antes de escrever —
//      ler-checar-escrever no cliente é a corrida entre duas abas;
//   2. a recusa de nome duplicado precisa do estado atual;
//   3. uma porta só é o que garante trilha de auditoria para as TRÊS operações.
//
// ⛔ RN-505 — A EDIÇÃO NUNCA ESCREVE A PARTIR DA PROJEÇÃO DEGRADADA. O cliente
// manda o NOME e a operação, jamais a lista inteira. `eventoDegradado`
// (api-client/eventos/queries.ts) devolve `modalidades: []` incondicionalmente
// para um doc que não parseia, e um editor que gravasse "a lista que eu vi"
// apagaria modalidades boas — passando em todas as Rules, porque lista vazia é
// lista válida. Aqui a lista sai do documento, lido dentro da transação, e o
// acréscimo usa `arrayUnion`, que não apaga o que outra aba escreveu.
//
// GUARDS (servidor autoritativo — o Admin SDK bypassa as Rules, então cada
// trava que a Rule aplicaria é reimplementada aqui, por dever, não por zelo):
//   - papel: SÓ tenant_owner (`assertTenantOwner`) — espelho da postura do
//     `ajustarCapacidadeLote`: a lista de modalidades é decisão do dono;
//   - tenant: evento do PRÓPRIO tenant (RN-400) + tenant ativo (RN-402);
//   - fronteira temporal (RN-500 · MODAL-1, decidido em 09/08): `qtdInscritos
//     == 0`, checado POR CONTA PRÓPRIA. `qtdInscritos` conta qualquer status
//     (RN-487), então uma cobrança PIX viva já fecha a lista — e é assim de
//     propósito: quem está com o checkout aberto tem a compra RECUSADA
//     (saleState fecha a venda sem lote para o nome), nunca cobrada errado;
//   - kernel puro: `packages/core/src/eventos/modalidades.ts` — a MESMA recusa
//     que a tela mostra antes de enviar.
//
// RN-501 · RENOMEAR É MIGRAÇÃO ATÔMICA, NUNCA EDIÇÃO DE CAMPO. Cinco
// referências mudam num único commit: `modalidades[]`, `percursos[].nome`,
// `Lote.modalidade`, `Kit.modalidades[]` e `campanha.segmento.referencia`.
// Duas escritas separadas NÃO são uma versão mais barata: entre elas todo lote
// da modalidade aponta para um nome fora da lista, e a
// `modalidadeExisteNoEventoPai` (chamada no create E no update) transforma isso
// em documento INUTILIZADO — nenhuma escrita passa mais, inclusive a que
// fecharia a janela. Aqui as cinco vivem na mesma transação; falha no meio não
// deixa nada escrito.
//
// O docId do lote NÃO é recriado. Ele embute o nome da modalidade
// (`loteForm.novoLoteId`) e mover uma chave primária que `pedidos/{id}.itens[]
// .loteId` referencia ensinaria ao código um gesto que fica errado no dia em
// que alguém relaxar a fronteira. O resíduo é cosmético — nenhuma tela mostra
// docId de lote — e que os lotes NOVOS parem de embutir o nome é a S316-T6.
//
// RN-502 · REMOVER RECUSA NOMEANDO QUEM IMPEDE. Remover é a única das três
// operações sem destino: renomear leva as referências junto, remover as
// deixaria apontando para o vazio, e o vazio não é benigno — tirar o nome da
// lista INUTILIZA os lotes daquela modalidade, inclusive para a escrita que
// consertaria a modalidade deles. A recusa lista CADA lote, kit e campanha
// pelo nome, e chega à tela como mensagem — nunca "falha ao salvar", que é o
// defeito de endereço que a review da SEAL-LOTES já corrigiu uma vez
// (`2a97a592`) e que não pode renascer aqui.
//
// AUDITORIA (RN-304): toda operação EFETIVADA grava em `auditoriaAcessos`
// (quem, quando, evento, operação, de → para, motivo), FORA da transação e
// APÓS o commit. Falha do registro pós-commit é logada alto; o
// `logger.info` final preserva quem/de→para/MOTIVO mesmo nesse caso.
// =============================================================================

import * as admin from 'firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { https } from 'firebase-functions/v1';
import * as logger from 'firebase-functions/logger';
import {
  MSG_MODALIDADES_CONGELADAS,
  isOperacaoModalidade,
  modalidadesEditaveis,
  normalizarNomeModalidade,
  validarAcrescentarModalidade,
  validarNomeModalidade,
  validarRemoverModalidade,
  validarRenomearModalidade,
  type AuthClaims,
  type OperacaoModalidade,
  type ReferenciasDaModalidade,
} from '@leela/core';
import { assertTenantOwner } from '../finance/atores';
import { assertTenantAtivo, type EventoCaller } from './criarEvento';
import { AUDITORIA_ACESSOS_COL } from '../finance/getBankDetailsForPayout';

type Db = admin.firestore.Firestore;

// ---------------------------------------------------------------------------
// Contratos
// ---------------------------------------------------------------------------

export interface EditarModalidadesEventoInput {
  eventoId: string;
  operacao: OperacaoModalidade;
  /** `acrescentar`: o nome novo. `renomear`/`remover`: o nome ATUAL. */
  modalidade: string;
  /** Só em `renomear`: o nome de destino. */
  novoNome?: string;
  /** Motivo da operação (auditoria — obrigatório, 3–500 caracteres). */
  motivo: string;
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
  /** Presente só em `renomear`. */
  migracao?: MigracaoModalidade;
}

export const MOTIVO_MODALIDADE_MIN = 3;
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
    erros.push('"operacao" deve ser acrescentar, renomear ou remover.');
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

  const motivo = input['motivo'];
  if (typeof motivo !== 'string' || motivo.trim().length < MOTIVO_MODALIDADE_MIN) {
    erros.push(
      `"motivo" é obrigatório (mínimo ${MOTIVO_MODALIDADE_MIN} caracteres — auditoria).`,
    );
  } else if (motivo.trim().length > MOTIVO_MODALIDADE_MAX) {
    erros.push(`"motivo" excede ${MOTIVO_MODALIDADE_MAX} caracteres.`);
  }

  return erros;
}

// ---------------------------------------------------------------------------
// Leitura das duas listas a partir do DOCUMENTO (nunca do cliente — RN-505)
// ---------------------------------------------------------------------------

/** Percurso como vive no doc do evento (preço-base legado, consultado por nome). */
interface PercursoBruto {
  nome: string;
  preco: number;
}

/**
 * Lê `modalidades[]` do doc cru, tolerando lixo (o doc pode ser o mesmo que
 * faz o `parseEvento` falhar — é justamente esse o caso da RN-505). Elemento
 * que não é string não-vazia é IGNORADO, nunca corrige e nunca lança: a
 * operação mexe no nome pedido e devolve o resto como está.
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

  await assertTenantAtivo(db, tenantId);

  const eventoRef = db.collection('eventos').doc(input.eventoId);
  const lotesCol = eventoRef.collection('lotes');
  const kitsCol = eventoRef.collection('kits');
  const campanhasCol = eventoRef.collection('campanhas');

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

    // FRONTEIRA TEMPORAL, checada POR CONTA PRÓPRIA (o Admin SDK não passa
    // pela Rule `percursosEditaveis`). Este teste é a prova da tarefa: removê-lo
    // tem de deixar o caso do evento vendido VERMELHO.
    const qtdInscritos = eventoSnap.get('qtdInscritos');
    const vendas = typeof qtdInscritos === 'number' && Number.isFinite(qtdInscritos)
      ? qtdInscritos
      : 0;
    if (!modalidadesEditaveis(vendas)) {
      throw new https.HttpsError('failed-precondition', MSG_MODALIDADES_CONGELADAS);
    }

    // As duas listas saem do DOCUMENTO, nunca do cliente (RN-505).
    const modalidades = lerModalidades(eventoSnap.get('modalidades'));
    const percursos = lerPercursos(eventoSnap.get('percursos'));

    // Quem aponta para o nome — lido dentro da transação nas três famílias.
    // `acrescentar` não precisa, e pagar três queries por um append seria
    // custo sem veredito.
    const precisaDasReferencias = input.operacao !== 'acrescentar';
    const [lotesSnap, kitsSnap, campanhasSnap] = precisaDasReferencias
      ? await Promise.all([
          tx.get(lotesCol.where('modalidade', '==', nome)),
          tx.get(kitsCol.where('modalidades', 'array-contains', nome)),
          tx.get(campanhasCol.where('segmento.referencia', '==', nome)),
        ])
      : [null, null, null];

    const refs: ReferenciasDaModalidade = {
      lotes: (lotesSnap?.docs ?? []).map((d) => (d.get('nome') as string) ?? d.id),
      kits: (kitsSnap?.docs ?? []).map((d) => (d.get('nome') as string) ?? d.id),
      campanhas: (campanhasSnap?.docs ?? []).map((d) => (d.get('nome') as string) ?? d.id),
    };

    // ---- VEREDITO (kernel puro — a MESMA recusa que a tela mostra).
    if (input.operacao === 'acrescentar') {
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
        de: '',
        para: nome,
      };
    }

    if (input.operacao === 'renomear') {
      const recusa = validarRenomearModalidade(modalidades, nome, novoNome);
      if (recusa !== null) throw new https.HttpsError('failed-precondition', recusa);

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
      const modalidadesNovas = modalidades.map((m) => (m === nome ? novoNome : m));
      const percursosNovos = percursos.map((p) =>
        p.nome === nome ? { ...p, nome: novoNome } : p,
      );
      tx.update(eventoRef, {
        modalidades: modalidadesNovas,
        percursos: percursosNovos,
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
        de: nome,
        para: novoNome,
        migracao: {
          lotes: lotesSnap?.size ?? 0,
          kits: kitsSnap?.size ?? 0,
          campanhas: campanhasSnap?.size ?? 0,
        },
      };
    }

    // remover
    const recusa = validarRemoverModalidade(modalidades, nome, refs);
    if (recusa !== null) throw new https.HttpsError('failed-precondition', recusa);

    const modalidadesNovas = modalidades.filter((m) => m !== nome);
    const percursosNovos = percursos.filter((p) => p.nome !== nome);
    tx.update(eventoRef, {
      modalidades: modalidadesNovas,
      percursos: percursosNovos,
      atualizadoEm: FieldValue.serverTimestamp(),
    });
    return { alterado: true, modalidades: modalidadesNovas, de: nome, para: '' };
  });

  // AUDITORIA pós-commit (RN-304). Falha aqui não desfaz a operação: loga alto.
  try {
    await db.collection(AUDITORIA_ACESSOS_COL).add({
      tipo: TIPO_AUDITORIA_MODALIDADES,
      tenantId,
      eventoId: input.eventoId,
      operacao: input.operacao,
      de: resultado.de,
      para: resultado.para,
      motivo: input.motivo.trim(),
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

  // Fallback COMPLETO: se o write da auditoria falhar, o Cloud Logging preserva
  // quem/de→para/MOTIVO/tenant/papel — a razão da operação nunca some.
  logger.info('editar_modalidades_evento', {
    eventoId: input.eventoId,
    tenantId,
    operacao: input.operacao,
    de: resultado.de,
    para: resultado.para,
    motivo: input.motivo.trim(),
    uid: caller.uid,
    papel: caller.claims.role ?? 'desconhecido',
    ...(resultado.migracao ? { migracao: resultado.migracao } : {}),
  });

  return {
    eventoId: input.eventoId,
    operacao: input.operacao,
    alterado: resultado.alterado,
    modalidades: resultado.modalidades,
    ...(resultado.migracao ? { migracao: resultado.migracao } : {}),
  };
}

// ---------------------------------------------------------------------------
// Callable
// ---------------------------------------------------------------------------

/** `editarModalidadesEvento` — a porta única do organizador (owner-only, RN-500). */
export const editarModalidadesEvento = https.onCall(async (data: unknown, context) => {
  if (!context.auth) {
    throw new https.HttpsError('unauthenticated', 'Requer autenticação.');
  }
  return editarModalidadesEventoCore(admin.firestore(), data, {
    uid: context.auth.uid,
    claims: context.auth.token as unknown as AuthClaims,
  });
});
