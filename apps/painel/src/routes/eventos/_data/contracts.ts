// =============================================================================
// Porta tipada da mutation `criarEvento` (contrato consumido, não inventado).
//
// A Function `criarEvento` e o wrapper `packages/api-client/src/eventos/
// mutations.ts` são do lote E03-L2 (Fable), EM CONSTRUÇÃO. Aqui declaramos
// a interface esperada (spec S201-T2: `criarEvento(input) -> {eventoId, slug}`)
// para o form submeter contra ela; em teste injeta-se um mock desta porta.
//
// ⚠ BLOQUEIO/CONTRATO p/ L2: a spec S201-T2 define a SAÍDA
// (`{eventoId, slug}`) mas não a forma da ENTRADA. O shape de `CriarEventoInput`
// abaixo é a proposta do L3 — o L2 deve confirmar/implementar exatamente estes
// campos em `mutations.ts` (ou avisar divergência). Ver SUMMARY §Bloqueios.
// =============================================================================

/** Percurso com preço independente (S201-T1). Preço em reais. */
export interface CriarEventoPercurso {
  nome: string;
  preco: number;
}

export interface CriarEventoInput {
  nome: string;
  descricao?: string;
  /** ISO `yyyy-mm-dd`. O servidor converte para Timestamp. */
  data: string;
  local: string;
  modalidades: string[];
  percursos: CriarEventoPercurso[];
}

/** Contrato de saída definido pela spec S201-T2. */
export interface CriarEventoResult {
  eventoId: string;
  slug: string;
}

/**
 * Porta de criação de evento. O form depende DESTA função (injeção), não da
 * implementação concreta — mantém a tela testável sem Firebase e desacoplada
 * do lote L2.
 */
export type CriarEventoFn = (input: CriarEventoInput) => Promise<CriarEventoResult>;
