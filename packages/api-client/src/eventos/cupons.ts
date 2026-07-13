// =============================================================================
// packages/api-client/src/eventos/cupons.ts
//
// CRUD de `eventos/{eventoId}/cupons/{cupomId}` — cupom simples E04 · S300-T5
// (kernel S300-T1 · ADR-012). Cupom SEM afiliado (o wiring cupom→afiliado vivia
// em S301/S302, cortados na Onda 2). docId = código NORMALIZADO (unicidade por
// chave — o Firestore garante a unicidade do docId; ver `cupom.ts` do core).
//
// Escrita DIRETA do organizador é permitida pelas Rules (tenant writer), como
// lotes/kits — o cupom é CONFIGURAÇÃO comercial. Guardas que a Rule impõe e que
// esta camada respeita:
//   - `usos` (≡ usosFeitos) = ∑ de escrita EXCLUSIVA de Cloud Function (checkout,
//     E12): o cliente NUNCA o envia (a Rule nega create!=0 e qualquer update que
//     o toque). Por isso `SalvarCupomInput` não tem o campo.
//   - `codigo` é IMUTÁVEL após a criação (é o docId; a Rule congela no update) —
//     a UI desabilita o campo em edição.
//   - shape validado pelo KERNEL (`shapeCupomValido` na Rule espelha o core):
//     código A-Z0-9 3..20, tipo percentual|fixo, valor cent-exato > 0
//     (percentual ≤ 100), tetoUso null|int≥1, janela inicioEm<fimEm.
//
// Vigência/desconto NÃO se recalculam aqui — a derivação (cupomVigente,
// descontoDoCupom) é do core e é APLICADA no checkout (E12). Esta camada só
// lê/escreve o documento.
// =============================================================================

import {
  Timestamp,
  collection,
  deleteDoc,
  doc,
  getDocs,
  serverTimestamp,
  setDoc,
  type Firestore,
} from 'firebase/firestore';
import { parseCupom, type Cupom, type TipoCupom } from '@leela/core';

/**
 * Lista os cupons de um evento. Sem `orderBy` (dispensa índice): a lista é
 * pequena (cupons por evento) e o desempate por `codigo` é client-side (sort
 * estável). A Rule restringe a leitura ao organizador/administrador — enumerar
 * cupons vaza descontos (ativo comercial).
 */
export async function listarCupons(db: Firestore, eventoId: string): Promise<Cupom[]> {
  const snap = await getDocs(collection(db, 'eventos', eventoId, 'cupons'));
  return snap.docs
    .map((d) => parseCupom(d.id, d.data()))
    .sort((a, b) => a.codigo.localeCompare(b.codigo, 'pt-BR'));
}

/**
 * Payload de escrita de cupom (sem `usos` — ∑ de Function). Janela em `Date`
 * puro: a conversão para `Timestamp` do Firestore mora AQUI (a UI não importa
 * firebase). `codigo` já vem NORMALIZADO (trim + UPPER) da camada de form e é o
 * docId — `salvarCupom` recebe o mesmo valor em `cupomId`.
 */
export interface SalvarCupomInput {
  /** Isolamento multi-tenant (ADR-009) — deve casar com o tenant do evento pai. */
  tenantId: string;
  /** Código normalizado (== docId) — único por evento, A-Z0-9 3..20. */
  codigo: string;
  /** Tipo de desconto: `percentual` (% do valor) ou `fixo` (R$ abatidos). */
  tipo: TipoCupom;
  /** Valor do desconto — % (0<v≤100) quando percentual, R$ (>0) quando fixo. */
  valor: number;
  /** Teto de usos (≡ usosMax) — int ≥ 1 ou `null` = ilimitado. */
  tetoUso: number | null;
  /** Início da janela de validade. */
  inicioEm: Date;
  /** Fim da janela de validade (fimEm > inicioEm). */
  fimEm: Date;
}

/**
 * Cria/atualiza um cupom (merge). `criar` inclui `criadoEm` só na criação —
 * merge nunca reescreve o carimbo original numa edição. `cupomId` DEVE ser o
 * código normalizado (docId == codigo — invariante do kernel).
 *
 * NUNCA envia `usos`: é ∑ de Cloud Function (checkout, E12). `codigo` vai no
 * payload para satisfazer o shape da Rule; num update ele é idêntico ao atual
 * (imutável), então o congelamento de `codigo` na Rule nunca vê diff.
 */
export async function salvarCupom(
  db: Firestore,
  eventoId: string,
  cupomId: string,
  input: SalvarCupomInput,
  criar: boolean
): Promise<void> {
  const data: Record<string, unknown> = {
    id: cupomId,
    tenantId: input.tenantId,
    codigo: input.codigo,
    tipo: input.tipo,
    valor: input.valor,
    tetoUso: input.tetoUso,
    inicioEm: Timestamp.fromDate(input.inicioEm),
    fimEm: Timestamp.fromDate(input.fimEm),
    atualizadoEm: serverTimestamp(),
  };
  if (criar) {
    data['criadoEm'] = serverTimestamp();
  }
  await setDoc(doc(db, 'eventos', eventoId, 'cupons', cupomId), data, { merge: true });
}

/**
 * Remove um cupom. A Rule só permite quando `usos == 0` (cupom já aplicado é
 * trilha comercial — sumir com ele órfanaria a auditoria do checkout). O cliente
 * também bloqueia na UI; aqui a chamada segue e a Rule é a rede de segurança.
 */
export async function removerCupom(
  db: Firestore,
  eventoId: string,
  cupomId: string
): Promise<void> {
  await deleteDoc(doc(db, 'eventos', eventoId, 'cupons', cupomId));
}
