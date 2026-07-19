// =============================================================================
// functions/src/checkout/pessoaRegistry.ts
//
// Registry de PESSOA por CPF (LEELA-CK2-T1 · RN-173 · DEC-0719 item 24d).
//
// UNICIDADE À PROVA DE CORRIDA (Kleppmann — mesma disciplina do registry de
// @handle/salvarPerfil): o docId de `pessoas/{id}` é DETERMINÍSTICO do CPF
// canônico, e o upsert roda DENTRO da transação do checkout (leitura do doc
// na fase de leitura + escrita na fase de escrita). Dois checkouts
// concorrentes com o MESMO CPF: o isolamento da transação serializa — um
// commita o create, o outro re-executa (retry otimista do Admin SDK), lê o
// doc existente e cai no ramo de merge. NUNCA nascem dois docs da mesma
// pessoa; NUNCA um create cego colide com ALREADY_EXISTS.
//
// DERIVAÇÃO DO ID (minimização — path sem PII): HMAC-SHA256 com o MESMO
// pepper secreto do CRM (`CRM_ID_PEPPER`, hardening A3 — REUSO deliberado:
// um único segredo de ops), em DOMÍNIO de mensagem próprio (`pessoa:cpf:`)
// — chave do CRM e chave de pessoa nunca correlacionam por igualdade.
// Fail-closed: sem pepper, LANÇA (herda o contrato de crmIdPepper).
//
// ANTI-HIJACK (ver core/pedidos/pessoa.ts): contaUid é first-claim (só
// escreve quando null); dadosConhecidos só atualizam se a pessoa não foi
// reivindicada OU o caller autenticado É a conta dona.
// =============================================================================

import { createHmac } from 'node:crypto';
import type * as admin from 'firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import {
  COLECAO_PESSOAS,
  PESSOA_ID_PREFIXO_CPF,
  mesclarDadosConhecidosPessoa,
  normalizarCpf,
  normalizarTelefone,
  parseEnderecoPedido,
  type DadosConhecidosPessoa,
  type EnderecoPedido,
} from '@leela/core';
import { crmIdPepper } from '../crm/agregarClientes';
import type {
  CheckoutCaller,
  CreateInscricaoChargeInput,
} from './createInscricaoCharge';

type Tx = admin.firestore.Transaction;
type Db = admin.firestore.Firestore;

// ---------------------------------------------------------------------------
// Derivação do docId
// ---------------------------------------------------------------------------

/**
 * DocId da pessoa: `cpf_{HMAC-SHA256(pepper, "pessoa:cpf:{cpf11}")[0:32]}`.
 * Determinístico por CPF SOB O MESMO pepper (trocar o pepper troca todas as
 * chaves — só é seguro sem dado real, mesma ressalva do CRM A3). O CPF nunca
 * aparece em path/log; vive só DENTRO do doc (Function-only). @pure-ish
 */
export function pessoaDocIdDoCpf(cpfRaw: string): string {
  const cpf = normalizarCpf(cpfRaw);
  const digest = createHmac('sha256', crmIdPepper())
    .update(`pessoa:cpf:${cpf}`)
    .digest('hex')
    .slice(0, 32);
  return `${PESSOA_ID_PREFIXO_CPF}${digest}`;
}

// ---------------------------------------------------------------------------
// Plano de upsert (derivação pura do input — testável sem emulator)
// ---------------------------------------------------------------------------

/** O que um checkout escreve numa pessoa (uma entrada por CPF distinto). */
export interface PlanoPessoa {
  pessoaId: string;
  /** CPF canônico (11 dígitos) — persistido no doc, nunca no path. */
  cpf: string;
  /** Dados coletados NESTE checkout para esta pessoa (merge no doc). */
  dados: Partial<DadosConhecidosPessoa>;
  /**
   * uid a reivindicar como conta (first-claim) — presente SÓ quando o caller
   * é AUTENTICADO NÃO-ANÔNIMO e esta pessoa é o PRÓPRIO responsável-inscrito
   * (nunca se reivindica conta comprando para terceiro).
   */
  claimContaUid?: string;
}

/**
 * Deriva o plano de upsert do input JÁ VALIDADO do checkout: uma entrada por
 * CPF DISTINTO (o mesmo CPF repetido no pedido colapsa — última ocorrência
 * vence nos dados) + o mapa inscritoIndex → pessoaId (para carimbar
 * `pessoaRef` nos docs de inscrito). @pure (fora o HMAC do id)
 */
export function planejarPessoasDoCheckout(
  input: CreateInscricaoChargeInput,
  caller: CheckoutCaller
): { planos: PlanoPessoa[]; pessoaIdPorInscrito: string[] } {
  const porId = new Map<string, PlanoPessoa>();
  const pessoaIdPorInscrito: string[] = [];

  // Endereço do pedido (comprador) — canônico via parse do core; só entra
  // nos dados da pessoa do RESPONSÁVEL-inscrito (endereço é do pagador).
  let enderecoCanonico: EnderecoPedido | undefined;
  if (input.endereco !== undefined) {
    enderecoCanonico = parseEnderecoPedido('PlanoPessoa', input.endereco);
  }

  input.inscritos.forEach((inscrito, i) => {
    const cpf = normalizarCpf(inscrito.cpf);
    const pessoaId = pessoaDocIdDoCpf(cpf);
    pessoaIdPorInscrito.push(pessoaId);
    const ehResponsavel = input.responsavelIndex === i;

    const dados: Partial<DadosConhecidosPessoa> = {
      nome: inscrito.nome.trim(),
      ...(inscrito.nascimento !== undefined
        ? { nascimento: inscrito.nascimento }
        : {}),
      // RN-154 (CK2-T2): gênero declarado alimenta o prefill da própria
      // pessoa ('nao_informado' não apaga declaração anterior — merge core).
      ...(inscrito.genero !== undefined ? { genero: inscrito.genero } : {}),
    };
    if (ehResponsavel) {
      if (typeof input.responsavel.telefone === 'string') {
        dados.telefone = normalizarTelefone(input.responsavel.telefone);
      }
      if (enderecoCanonico !== undefined) dados.endereco = enderecoCanonico;
    }

    const plano: PlanoPessoa = {
      pessoaId,
      cpf,
      // Mesmo CPF 2× no pedido: mescla os dados das ocorrências.
      dados: { ...(porId.get(pessoaId)?.dados ?? {}), ...dados },
    };
    // First-claim da conta: SÓ caller autenticado não-anônimo comprando a
    // PRÓPRIA inscrição (responsável-inscrito). Anônimo nunca vira conta
    // (o vínculo dele nasce no T3, com a conta real criada por e-mail).
    const claimAnterior = porId.get(pessoaId)?.claimContaUid;
    if (caller.ehAnonimo === false && ehResponsavel) {
      plano.claimContaUid = caller.uid;
    } else if (claimAnterior !== undefined) {
      plano.claimContaUid = claimAnterior;
    }
    porId.set(pessoaId, plano);
  });

  return { planos: [...porId.values()], pessoaIdPorInscrito };
}

// ---------------------------------------------------------------------------
// Upsert transacional (chamado DENTRO da tx de criarDocsDeCheckout)
// ---------------------------------------------------------------------------

/** Snapshot lido na fase de leitura da tx (um por plano). */
export interface LeituraPessoa {
  plano: PlanoPessoa;
  snap: admin.firestore.DocumentSnapshot;
}

/** Fase de LEITURA: lê os docs de pessoa dos planos (antes de toda escrita). */
export async function lerPessoasNaTx(
  db: Db,
  tx: Tx,
  planos: PlanoPessoa[]
): Promise<LeituraPessoa[]> {
  return Promise.all(
    planos.map(async (plano) => ({
      plano,
      snap: await tx.get(db.collection(COLECAO_PESSOAS).doc(plano.pessoaId)),
    }))
  );
}

/**
 * Fase de ESCRITA: aplica o upsert de cada pessoa lida.
 *   - doc NOVO → create com dados deste checkout (+ claim, se houver);
 *   - doc EXISTENTE → merge:
 *       · contaUid: escreve SÓ se null e há claim (first-claim; conta
 *         divergente NUNCA é sobrescrita — anti-hijack);
 *       · dadosConhecidos: atualiza SÓ se a pessoa não foi reivindicada OU
 *         o claim deste checkout É a conta dona (dados da vítima intocados
 *         em compra de terceiro com CPF alheio).
 * Idempotente: replay do mesmo input produz o mesmo estado final.
 */
export function upsertPessoasNaTx(
  db: Db,
  tx: Tx,
  leituras: LeituraPessoa[]
): void {
  const agora = FieldValue.serverTimestamp();
  for (const { plano, snap } of leituras) {
    const ref = db.collection(COLECAO_PESSOAS).doc(plano.pessoaId);
    if (!snap.exists) {
      tx.create(ref, {
        id: plano.pessoaId,
        cpf: plano.cpf,
        contaUid: plano.claimContaUid ?? null,
        dadosConhecidos: mesclarDadosConhecidosPessoa(undefined, plano.dados),
        criadoEm: agora,
        atualizadoEm: agora,
      });
      continue;
    }
    const contaUidAtual = snap.get('contaUid') as string | null | undefined;
    const reivindicada =
      typeof contaUidAtual === 'string' && contaUidAtual.length > 0;
    const update: Record<string, unknown> = {};
    if (!reivindicada && plano.claimContaUid !== undefined) {
      update['contaUid'] = plano.claimContaUid;
    }
    const podeAtualizarDados =
      !reivindicada || contaUidAtual === plano.claimContaUid;
    if (podeAtualizarDados) {
      const atualRaw = snap.get('dadosConhecidos');
      const atual =
        atualRaw !== null && typeof atualRaw === 'object' && !Array.isArray(atualRaw)
          ? (atualRaw as DadosConhecidosPessoa)
          : undefined;
      update['dadosConhecidos'] = mesclarDadosConhecidosPessoa(atual, plano.dados);
    }
    if (Object.keys(update).length > 0) {
      update['atualizadoEm'] = agora;
      tx.update(ref, update);
    }
  }
}
