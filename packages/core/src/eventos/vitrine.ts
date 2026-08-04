// =============================================================================
// packages/core/src/eventos/vitrine.ts
//
// A régua ÚNICA de "este evento está vendendo?" (VITRINE-FIX).
//
// POR QUE ESTE ARQUIVO EXISTE. A pergunta "dá para comprar?" tinha DUAS
// respostas no produto, e elas discordavam:
//
//   - o SERVIDOR, em `resolverItem` (checkout/saleState.ts), cobra assim:
//     lote ativo → senão, preço legado do percurso SE a modalidade não tem
//     nenhum lote → senão, venda fechada;
//   - a VITRINE, em `apps/landing/lib/estadoVenda.ts`, decidia só pelos lotes
//     e nunca soube do preço legado. Evento sem lote virava "Inscrições
//     encerradas" mesmo com o servidor pronto para cobrar.
//
// O ramo que faltava não é detalhe: `criarEvento` EXIGE `percursos` (mínimo 1)
// e não cria lote nenhum. Todo evento que nasce pela porta do produto é,
// portanto, legado-only — publicado assim, o servidor vende e a vitrine diz
// que acabou.
//
// A régua não é inventada aqui. Ela é `precoVigente` (eventos/lote.ts), que já
// carregava o parâmetro `precoLegado` desde a evolução de schema da ADR-012 —
// era a landing que o omitia na chamada. Este módulo compõe sobre ele para que
// vitrine, painel e checkout leiam a MESMA resposta.
//
// Puro e sem I/O: tudo entra por parâmetro (incl. o instante `agora`).
// =============================================================================

import { loteEsgotado, precoVigente, type Lote } from './lote';

/**
 * Estado público de venda do evento.
 * - `aberto`    → pelo menos uma modalidade é vendável no instante.
 * - `esgotado`  → prova no futuro, nada vendável, e a janela corrente de toda
 *                 modalidade com lotes está sem vaga (vendidos ≥ limite).
 * - `encerrado` → demais casos (prova passada, janelas vencidas, sem preço).
 */
export type EstadoVenda = 'aberto' | 'encerrado' | 'esgotado';

/** Os campos do lote que a régua de venda realmente lê. */
export type LoteVitrine = Pick<
  Lote,
  'ordem' | 'inicioEm' | 'fimEm' | 'vendidos' | 'quantidadeLimite' | 'preco'
>;

/**
 * Uma modalidade do ponto de vista da venda: seus lotes E o preço-base legado
 * (`percurso.preco`) quando existe. `precoLegado` ausente e zero lotes = a
 * modalidade não tem preço nenhum, e o servidor também recusaria a venda.
 */
export interface ModalidadeVitrine {
  modalidade: string;
  lotes: readonly LoteVitrine[];
  /** `percurso.preco` do doc do evento (S201) — quando o evento o tem. */
  precoLegado?: number;
}

/** Preço-base legado de uma modalidade, como vive em `evento.percursos`. */
export interface PercursoPreco {
  nome: string;
  preco: number;
}

/**
 * Junta os dois modelos de preço do evento numa entrada só por modalidade.
 *
 * Existe para que o encontro entre `lotes` e `percursos` aconteça em UM lugar:
 * a vitrine pública e o painel do organizador precisam da mesma resposta, e
 * foi justamente uma segunda montagem — a da landing, que não lia `percursos`
 * — que produziu o defeito da VITRINE-FIX.
 *
 * Entrada já normalizada (quem lê o Firestore faz o parse defensivo antes):
 * percurso sem preço numérico e lote de modalidade desconhecida ficam de fora.
 * @pure
 */
export function modalidadesVitrine(params: {
  modalidades: readonly string[];
  percursos?: readonly PercursoPreco[] | undefined;
  lotes: readonly (LoteVitrine & { modalidade: string })[];
}): ModalidadeVitrine[] {
  const legado = new Map<string, number>();
  for (const p of params.percursos ?? []) {
    if (typeof p.preco === 'number' && Number.isFinite(p.preco) && p.preco >= 0) {
      legado.set(p.nome, p.preco);
    }
  }
  const porModalidade = new Map<string, LoteVitrine[]>();
  for (const l of params.lotes) {
    const arr = porModalidade.get(l.modalidade) ?? [];
    arr.push(l);
    porModalidade.set(l.modalidade, arr);
  }
  return params.modalidades.map((nome) => {
    const preco = legado.get(nome);
    return {
      modalidade: nome,
      lotes: porModalidade.get(nome) ?? [],
      ...(preco !== undefined ? { precoLegado: preco } : {}),
    };
  });
}

/**
 * O preço que a vitrine deve anunciar para esta modalidade agora, ou `null`
 * quando não há venda. Delega 100% a `precoVigente` — é a mesma conta que o
 * checkout faz em `resolverItem`, com os mesmos três ramos. @pure
 */
export function precoVitrine(m: ModalidadeVitrine, agora: Date): number | null {
  return precoVigente({
    lotesDaModalidade: m.lotes,
    agora,
    ...(m.precoLegado !== undefined ? { precoLegado: m.precoLegado } : {}),
  });
}

/** Esta modalidade pode ser comprada no instante `agora`? @pure */
export function modalidadeVendavel(m: ModalidadeVitrine, agora: Date): boolean {
  return precoVitrine(m, agora) !== null;
}

/**
 * Estado público de venda do evento (RN-300/RN-301 · ADR-012).
 *
 * Diferença para a versão que morava na landing: "aberto" passou a significar
 * VENDÁVEL (`precoVigente !== null`), não "tem lote ativo". Para evento com
 * lotes e sem preço legado as duas definições coincidem exatamente — por isso
 * a mudança não mexe em quem já vende hoje. @pure
 */
export function deriveEstadoVenda(
  modalidades: readonly ModalidadeVitrine[],
  dataEvento: Date,
  agora: Date,
): EstadoVenda {
  // A prova PASSADA vem antes de tudo. A régua anterior perguntava "tem lote
  // ativo?" primeiro e sobrevivia porque a janela do lote termina antes do
  // evento; o preço legado NÃO tem janela, então um evento legado já realizado
  // ficaria "Inscrições abertas" para sempre. Um evento que já aconteceu nunca
  // vende — e isso não é um caso hipotético, foi um teste desta lane que o
  // pegou.
  if (agora.getTime() >= dataEvento.getTime()) return 'encerrado';

  if (modalidades.some((m) => modalidadeVendavel(m, agora))) return 'aberto';

  // Nada vendável e prova no futuro: é `esgotado` só quando a causa é falta de
  // VAGA — em toda modalidade com lotes, a janela que cobre `agora` existe e
  // está esgotada por quantidade. Sem lote nenhum em lugar nenhum a causa é
  // outra (falta de preço), e o rótulo honesto continua sendo `encerrado`.
  const temLotes = modalidades.some((m) => m.lotes.length > 0);
  if (!temLotes) return 'encerrado';

  const esgotadoPorQuantidade = modalidades.every((m) => {
    if (m.lotes.length === 0) return true;
    return m.lotes.some((l) => {
      const cobreAgora =
        agora.getTime() >= l.inicioEm.toMillis() && agora.getTime() < l.fimEm.toMillis();
      return cobreAgora && loteEsgotado(l);
    });
  });

  return esgotadoPorQuantidade ? 'esgotado' : 'encerrado';
}

// ---------------------------------------------------------------------------
// O sinal ao organizador
// ---------------------------------------------------------------------------

/**
 * Por que a vitrine não está vendendo. Existe para que "publicado mas não
 * vendável" deixe de ser um estado silencioso: o organizador publica, o painel
 * diz publicado, e sem isto nada no produto conta que a página não vende.
 */
export type MotivoVitrineFechada =
  /** A prova já aconteceu. Esperado, não é defeito. */
  | 'evento_passou'
  /** Nenhuma modalidade tem lote nem preço-base. O servidor também recusaria. */
  | 'sem_preco'
  /** Havia vaga e acabou. */
  | 'esgotado'
  /** As janelas de lote venceram e nenhuma nova foi aberta. */
  | 'lotes_encerrados';

export interface DiagnosticoVitrine {
  /** A página pública consegue vender agora? */
  vende: boolean;
  estado: EstadoVenda;
  /** `null` quando vende. */
  motivo: MotivoVitrineFechada | null;
  /**
   * Modalidades sem preço NENHUM (nem lote, nem legado) — a lista acionável:
   * é exatamente o que falta cadastrar para a página voltar a vender.
   */
  modalidadesSemPreco: string[];
}

/**
 * Diagnóstico da vitrine para o painel do organizador. Mesma régua da página
 * pública (chama `deriveEstadoVenda`), mais o MOTIVO e a lista do que falta —
 * um estado só, lido de dois lugares, que é o que impede a vitrine e o painel
 * de voltarem a divergir. @pure
 */
export function diagnosticoVitrine(
  modalidades: readonly ModalidadeVitrine[],
  dataEvento: Date,
  agora: Date,
): DiagnosticoVitrine {
  const estado = deriveEstadoVenda(modalidades, dataEvento, agora);
  const modalidadesSemPreco = modalidades
    .filter((m) => m.lotes.length === 0 && m.precoLegado === undefined)
    .map((m) => m.modalidade);

  if (estado === 'aberto') {
    // Vende — mas pode vender PARCIALMENTE (uma modalidade sem preço no meio
    // de outras que vendem). A lista sai mesmo assim; quem chama decide se
    // avisa. Esconder isso reproduziria o silêncio que este módulo corrige.
    return { vende: true, estado, motivo: null, modalidadesSemPreco };
  }

  const motivo: MotivoVitrineFechada =
    agora.getTime() >= dataEvento.getTime()
      ? 'evento_passou'
      : estado === 'esgotado'
        ? 'esgotado'
        : modalidadesSemPreco.length === modalidades.length
          ? 'sem_preco'
          : 'lotes_encerrados';

  return { vende: false, estado, motivo, modalidadesSemPreco };
}
