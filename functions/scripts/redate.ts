// =============================================================================
// functions/scripts/redate.ts — re-datação das escritas de seed (extraída de
// prod-seed-leela-hub.ts na lane CHECKOUT-UX, task A1 / T-SEED-2).
//
// Por que este arquivo existe: o patch de re-datação estava inline no runner de
// produção e, por isso, não podia ser exercitado por um dry-run. A extração é
// puramente mecânica — mesma lógica, mesmo comportamento — e habilita o
// `redate-dry-run.ts`, que prova o deslocamento contra as classes REAIS do
// `@google-cloud/firestore` sem tocar a rede.
//
// DEFEITO CORRIGIDO (T-SEED-2): o patch cobre três protótipos de escrita
// (`DocumentReference.set`, `WriteBatch.set`, `CollectionReference.add`). No
// `@google-cloud/firestore@7.11.6`, `DocumentReference.set()` é implementado
// POR CIMA de `WriteBatch.set()` (reference/document-reference.js:341-351):
// abre um WriteBatch, chama `.set` e faz commit. Logo, todo payload escrito por
// `ref.set(...)` atravessava os DOIS patches e levava `redate()` DUAS vezes
// (+270 dias em vez de +135). Provado nos cupons de produção: `HEROI10`/`CORRA50`
// (via `batch.set`) vieram +135 d; `RITMOFORTE10` (via `upsert` → `ref.set`)
// veio +270 d, abrindo só em 28/09/2026.
//
// FIX: `redate()` é IDEMPOTENTE. O objeto/array devolvido carrega um marcador
// de Symbol não-enumerável; uma segunda passagem sobre o mesmo payload devolve
// o valor intacto. Symbol não é enumerado por `Object.entries`/`for..in` e não
// é serializado pelo Firestore — o marcador não vaza para o documento.
//
// Por que idempotência em vez de "remover o patch de DocumentReference.set":
// remover assume que a implementação interna da lib continuará roteando
// `ref.set` por `WriteBatch.set`. Isso é detalhe de implementação e pode mudar
// de versão. A idempotência está correta nas DUAS topologias — com ou sem o
// roteamento interno — e por isso não cria dívida de acoplamento a versão.
//
// Ferramenta de script, nunca código de produção (fora de src/ ⇒ fora de
// build/lint/vitest de produção).
// =============================================================================

import {
  DocumentReference,
  CollectionReference,
  WriteBatch,
  Timestamp,
} from 'firebase-admin/firestore';

/** Relógio de referência do dataset (o LEELA_CLOCK do preview local). */
export const REF_CLOCK_UTC = Date.UTC(2026, 2, 15); // 2026-03-15

const DIA_MS = 86_400_000;

/** Offset em dias inteiros entre o relógio de referência do dataset e `hoje`. */
export function offsetDias(hoje: Date = new Date()): number {
  const hojeUtc = Date.UTC(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
  return Math.round((hojeUtc - REF_CLOCK_UTC) / DIA_MS);
}

const RE_DATA_SO = /^\d{4}-\d{2}-\d{2}$/;
const RE_DATA_HORA = /^\d{4}-\d{2}-\d{2}T\d{2}:/;

/**
 * Marcador de payload já re-datado. Symbol não-enumerável: invisível para
 * `Object.entries`, para `JSON.stringify` e para o serializador do Firestore.
 */
const JA_REDATADO = Symbol.for('leela.seed.redate.aplicado');

function marcar<T extends object>(valor: T): T {
  Object.defineProperty(valor, JA_REDATADO, {
    value: true,
    enumerable: false,
    writable: false,
    configurable: true,
  });
  return valor;
}

/** True quando o valor já passou por `redate()` nesta mesma escrita. */
export function jaRedatado(valor: unknown): boolean {
  return (
    valor !== null &&
    typeof valor === 'object' &&
    (valor as Record<symbol, unknown>)[JA_REDATADO] === true
  );
}

export type Redate = (valor: unknown) => unknown;

/**
 * Cria a função de re-datação para um offset em milissegundos.
 * IDEMPOTENTE: aplicar duas vezes ao mesmo payload devolve o mesmo resultado.
 */
export function criarRedate(offsetMs: number): Redate {
  function shiftDataSo(s: string): string {
    const [y, m, d] = s.split('-').map(Number);
    const dt = new Date(
      Date.UTC(y as number, (m as number) - 1, d as number) + offsetMs
    );
    return dt.toISOString().slice(0, 10);
  }

  /** Desloca ISO datetime preservando representação -03:00 (padrão do seed). */
  function shiftDataHora(s: string): string | null {
    const ms = Date.parse(s);
    if (Number.isNaN(ms)) return null;
    const local = new Date(ms + offsetMs - 3 * 3_600_000);
    return `${local.toISOString().slice(0, 19)}-03:00`;
  }

  return function redate(valor: unknown): unknown {
    // Guarda de idempotência — ANTES de qualquer processamento (T-SEED-2).
    if (jaRedatado(valor)) return valor;

    if (valor instanceof Timestamp) {
      return Timestamp.fromMillis(valor.toMillis() + offsetMs);
    }
    if (valor instanceof Date) {
      return new Date(valor.getTime() + offsetMs);
    }
    if (typeof valor === 'string') {
      if (RE_DATA_SO.test(valor)) return shiftDataSo(valor);
      if (RE_DATA_HORA.test(valor)) return shiftDataHora(valor) ?? valor;
      return valor;
    }
    if (Array.isArray(valor)) return marcar(valor.map(redate));
    if (
      valor !== null &&
      typeof valor === 'object' &&
      Object.getPrototypeOf(valor) === Object.prototype
    ) {
      const out: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(valor)) out[k] = redate(v);
      return marcar(out);
    }
    // FieldValue (serverTimestamp/delete), DocumentReference, Buffer etc.:
    // intocados — o Firestore resolve/serializa como sempre.
    return valor;
  };
}

/**
 * Patch de protótipo: toda escrita dos seeds passa por `redate()`.
 * Devolve um `desinstalar()` — usado pelo dry-run para não vazar o patch.
 */
export function instalarRedatePatch(offsetMs: number): () => void {
  const redate = criarRedate(offsetMs);

  const dSet = DocumentReference.prototype.set;
  (DocumentReference.prototype as unknown as Record<string, unknown>)['set'] =
    function patchedSet(this: DocumentReference, data: unknown, opts?: unknown) {
      return opts === undefined
        ? (dSet as Function).call(this, redate(data))
        : (dSet as Function).call(this, redate(data), opts);
    };

  const bSet = WriteBatch.prototype.set;
  (WriteBatch.prototype as unknown as Record<string, unknown>)['set'] =
    function patchedBatchSet(
      this: WriteBatch,
      ref: unknown,
      data: unknown,
      opts?: unknown
    ) {
      return opts === undefined
        ? (bSet as Function).call(this, ref, redate(data))
        : (bSet as Function).call(this, ref, redate(data), opts);
    };

  const cAdd = CollectionReference.prototype.add;
  (CollectionReference.prototype as unknown as Record<string, unknown>)['add'] =
    function patchedAdd(this: CollectionReference, data: unknown) {
      return (cAdd as Function).call(this, redate(data));
    };

  return function desinstalar(): void {
    (DocumentReference.prototype as unknown as Record<string, unknown>)['set'] = dSet;
    (WriteBatch.prototype as unknown as Record<string, unknown>)['set'] = bSet;
    (CollectionReference.prototype as unknown as Record<string, unknown>)['add'] = cAdd;
  };
}
