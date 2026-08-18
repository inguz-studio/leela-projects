// =============================================================================
// packages/core/src/eventos/modalidades.ts
//
// RN-500 / RN-501 / RN-502 — a lista de modalidades do evento passa a ter dono
// (E04 · S316, re-ancorada pela leva 22 de 17/08 no desenho pai/filho:
// modalidade é o pai, lote é o filho).
//
// O QUE ESTE MÓDULO É: o kernel PURO das três operações. Ele não escreve, não
// lê Firestore e não sabe o que é uma transação — devolve a recusa NOMEADA ou
// `null`. Os três consumidores usam o mesmo veredito, e é isso que impede a
// tela de dizer uma coisa e o servidor outra:
//   1. `functions/src/eventos/editarModalidadesEvento.ts` — a porta única e
//      autoritativa (Admin SDK bypassa Rules; o guard vive lá, com este kernel);
//   2. `apps/painel/.../lotes/ModalidadeModal.tsx` — recusa antes de enviar,
//      no campo, para o organizador não pagar uma ida ao servidor por um nome
//      vazio ou duplicado;
//   3. os testes das duas pontas, que afirmam o MESMO texto.
//
// POR QUE A MODALIDADE NÃO TEM ENTIDADE: ela é uma string num array do doc do
// evento, e o mesmo nome fica gravado em cinco lugares (`modalidades[]`,
// `percursos[].nome`, `Lote.modalidade`, `Kit.modalidades[]` e
// `campanha.segmento.referencia`). Isso é anterior a esta rodada e não é
// consertado aqui — a RN-501 responde a isso migrando os cinco num commit só,
// e este kernel é quem sabe QUAIS são os cinco.
//
// ⛔ NENHUM CATÁLOGO NOVO NASCE AQUI. `SUGESTOES_MODALIDADE_EVENTO` é a lista
// que a criação de evento já usava (`novo/EventoForm.tsx:74`), movida para cá
// para virar fonte ÚNICA das três línguas que hoje descrevem modalidade
// (criação, esta tela e o editor de kit) — a unificação que a onda A adiou de
// propósito para a onda C. Ela é SUGESTÃO, nunca vocabulário fechado: a
// RN-500 trata a modalidade do evento como string livre ("Kids 1k",
// "Trail 15k"), e fechar a lista quebraria evento vivo. Os catálogos fechados
// que existem no produto descrevem OUTRO fato — `MODALIDADES_CLUBE`
// (clubs/clube-opcoes) e os pilares da RN-114 (clubs/catalogo-acoes) falam de
// ESPORTE, e a modalidade do evento fala de DISTÂNCIA/percurso. Não se
// misturam, e nenhum dos dois é recriado aqui.
// =============================================================================

/** As três operações da porta única (RN-500). */
export type OperacaoModalidade = 'acrescentar' | 'renomear' | 'remover';

/** Operações válidas — ordem de leitura, não de precedência. */
export const OPERACOES_MODALIDADE: readonly OperacaoModalidade[] = [
  'acrescentar',
  'renomear',
  'remover',
];

/** Type guard da operação (o payload chega como `unknown` na Function). @pure */
export function isOperacaoModalidade(v: unknown): v is OperacaoModalidade {
  return typeof v === 'string' && (OPERACOES_MODALIDADE as readonly string[]).includes(v);
}

/**
 * Teto do nome da modalidade. Não é regra de negócio do dono: é anti
 * doc-bomba, no mesmo espírito do teto de 30 janelas do cronograma. O nome vai
 * para o rótulo do chip, para a coluna da tabela e para a página pública —
 * acima disso nenhuma superfície lê bem.
 */
export const MODALIDADE_NOME_MAX = 60;

/**
 * Teto de modalidades por evento. **O número já existia** — é o
 * `MODALIDADES_MAX` que o `criarEvento` aplica desde sempre
 * (`functions/src/eventos/criarEvento.ts`), trazido para o core para a criação
 * e o acréscimo não derivarem: um evento que nasce com teto 20 e cresce sem
 * teto é a mesma regra dizendo duas coisas.
 */
export const MODALIDADES_MAX = 20;

/**
 * Sugestões de modalidade — as quatro distâncias que a criação de evento já
 * oferecia. **Sugestão, não vocabulário fechado** (ver o cabeçalho).
 */
export const SUGESTOES_MODALIDADE_EVENTO: readonly string[] = ['5k', '10k', '21k', '42k'];

/**
 * Normaliza o nome digitado: apara as pontas e colapsa espaço interno. NÃO
 * mexe em caixa nem em acento — "21K" e "21k" são nomes diferentes de
 * propósito, porque a igualdade que vale é a do `modalidadeExisteNoEventoPai`
 * das Rules, que é comparação de string crua. Fazer casefold aqui deixaria a
 * tela aceitar o que o servidor recusa. @pure
 */
export function normalizarNomeModalidade(nome: string): string {
  return nome.replace(/\s+/g, ' ').trim();
}

/**
 * O nome é válido em si (sem olhar a lista)? Devolve a recusa ou `null`.
 * @pure
 */
export function validarNomeModalidade(nome: string): string | null {
  const limpo = normalizarNomeModalidade(nome);
  if (limpo.length === 0) return 'O nome da modalidade não pode ficar vazio.';
  if (limpo.length > MODALIDADE_NOME_MAX) {
    return `O nome da modalidade tem no máximo ${MODALIDADE_NOME_MAX} caracteres.`;
  }
  // '/' viraria parte de um docId de lote enquanto a chave carregar o nome
  // (S316-T6 tira isso dos lotes NOVOS; os antigos seguem com o nome dentro).
  if (limpo.includes('/')) return 'O nome da modalidade não pode conter "/".';
  return null;
}

/** Acrescentar: nome válido, ainda não presente, e a lista cabe. @pure */
export function validarAcrescentarModalidade(
  modalidades: readonly string[],
  nome: string,
): string | null {
  const erroNome = validarNomeModalidade(nome);
  if (erroNome !== null) return erroNome;
  const limpo = normalizarNomeModalidade(nome);
  if (modalidades.includes(limpo)) {
    return `A modalidade "${limpo}" já está na lista deste evento.`;
  }
  if (modalidades.length >= MODALIDADES_MAX) {
    return `Este evento já tem ${MODALIDADES_MAX} modalidades, que é o limite.`;
  }
  return null;
}

/**
 * Renomear: o nome antigo existe, o novo é válido e ainda NÃO está na lista.
 *
 * Renomear para um nome já presente é **fusão de modalidades** — dois
 * conjuntos de lotes disputando a sequência de virada e a invariante da RN-300.
 * Ninguém pediu, e a recusa é explícita em vez de silenciosa (RN-501). @pure
 */
export function validarRenomearModalidade(
  modalidades: readonly string[],
  de: string,
  para: string,
): string | null {
  const deLimpo = normalizarNomeModalidade(de);
  if (!modalidades.includes(deLimpo)) {
    return `A modalidade "${deLimpo}" não está na lista deste evento.`;
  }
  const erroNome = validarNomeModalidade(para);
  if (erroNome !== null) return erroNome;
  const paraLimpo = normalizarNomeModalidade(para);
  if (paraLimpo === deLimpo) {
    return 'O nome novo é igual ao atual.';
  }
  if (modalidades.includes(paraLimpo)) {
    return (
      `A modalidade "${paraLimpo}" já existe neste evento. ` +
      'Juntar duas modalidades numa só não é renomear — os lotes das duas ' +
      'disputariam a mesma sequência de virada.'
    );
  }
  return null;
}

/**
 * Quem aponta para a modalidade, pelo nome. As três listas chegam do servidor
 * (a tela só conhece os lotes) e existem para que a recusa da RN-502 nomeie
 * **cada um**, nunca "há itens vinculados".
 */
export interface ReferenciasDaModalidade {
  /** Nomes dos lotes daquela modalidade. */
  lotes: readonly string[];
  /** Nomes dos kits com a modalidade em `Kit.modalidades[]`. */
  kits: readonly string[];
  /** Nomes das campanhas com `segmento.tipo === 'por_modalidade'` apontando. */
  campanhas: readonly string[];
}

/** Nenhuma referência? (a remoção só passa aqui). @pure */
export function semReferencias(refs: ReferenciasDaModalidade): boolean {
  return refs.lotes.length === 0 && refs.kits.length === 0 && refs.campanhas.length === 0;
}

/** "2 lotes (Lote 1, Lote 2)" — o pedaço nomeado da recusa. @pure */
function trechoReferencias(rotuloSing: string, rotuloPlur: string, nomes: readonly string[]): string {
  const rotulo = nomes.length === 1 ? rotuloSing : rotuloPlur;
  return `${nomes.length} ${rotulo} (${nomes.join(', ')})`;
}

/**
 * A recusa da RN-502, nomeando cada lote, kit e campanha que impedem. O texto
 * é o mesmo na Function e na tela, e é ele que chega ao organizador — **nunca**
 * "falha ao salvar", que é o defeito de endereço que a review da SEAL-LOTES já
 * corrigiu uma vez (`2a97a592`) e que não pode renascer aqui. @pure
 */
export function mensagemRecusaRemocao(
  modalidade: string,
  refs: ReferenciasDaModalidade,
): string {
  const partes: string[] = [];
  if (refs.lotes.length > 0) partes.push(trechoReferencias('lote', 'lotes', refs.lotes));
  if (refs.kits.length > 0) partes.push(trechoReferencias('kit', 'kits', refs.kits));
  if (refs.campanhas.length > 0) {
    partes.push(trechoReferencias('campanha', 'campanhas', refs.campanhas));
  }
  const lista =
    partes.length === 1
      ? partes[0]
      : `${partes.slice(0, -1).join(', ')} e ${partes[partes.length - 1]}`;
  return (
    `Ainda não dá para remover "${modalidade}": ${lista} ${
      partes.length === 1 && refs.lotes.length + refs.kits.length + refs.campanhas.length === 1
        ? 'aponta'
        : 'apontam'
    } para ela. ` + 'Apague ou mude cada um e remova depois.'
  );
}

/** Remover: a modalidade existe e ninguém aponta para ela (RN-502). @pure */
export function validarRemoverModalidade(
  modalidades: readonly string[],
  nome: string,
  refs: ReferenciasDaModalidade,
): string | null {
  const limpo = normalizarNomeModalidade(nome);
  if (!modalidades.includes(limpo)) {
    return `A modalidade "${limpo}" não está na lista deste evento.`;
  }
  if (!semReferencias(refs)) return mensagemRecusaRemocao(limpo, refs);
  return null;
}

// ---------------------------------------------------------------------------
// A fronteira temporal (RN-500 · MODAL-1, decidido em 09/08)
// ---------------------------------------------------------------------------

/**
 * A recusa quando o evento já vendeu. `qtdInscritos` conta QUALQUER status
 * (RN-487), então uma cobrança PIX viva já fecha a lista — e é assim de
 * propósito: quem estiver com o checkout aberto tem a compra **recusada**,
 * nunca cobrada por um preço que mudou de nome no meio.
 */
export const MSG_MODALIDADES_CONGELADAS =
  'Este evento já tem inscrição registrada, e a lista de modalidades fica ' +
  'congelada a partir da primeira (inclusive PIX pendente). Preço e vaga de ' +
  'cada lote continuam editáveis.';

/** A lista é editável neste evento? (fronteira "sem venda" — RN-500). @pure */
export function modalidadesEditaveis(qtdInscritos: number): boolean {
  return qtdInscritos === 0;
}

// ---------------------------------------------------------------------------
// Compat do acervo — lote apontando para modalidade fora da lista (S316-T4)
// ---------------------------------------------------------------------------

/**
 * Modalidades que APARECEM na tela, na ordem: primeiro as do evento, na ordem
 * do documento; depois as que só existem nos lotes.
 *
 * POR QUE ISTO EXISTE, e é a decisão de compat desta lane: a tela antiga
 * varria `evento.modalidades` e filtrava os lotes por nome, então **um lote
 * cuja modalidade saiu da lista simplesmente sumia da tela** — sem erro, sem
 * aviso, com o preço dele ainda no documento. A Rule
 * `modalidadeExisteNoEventoPai` deixa esse lote inutilizado para escrita, o
 * que torna o sumiço pior: o organizador não vê nem consegue consertar.
 *
 * Aqui ele volta a aparecer, num bloco próprio, marcado. **Nenhum documento é
 * migrado** — a leitura passa a ser honesta, que é a mesma disciplina da
 * RN-559 e da RN-576 ("a regra morde na escrita, nunca na leitura"). @pure
 */
export function modalidadesDaTela(
  modalidadesDoEvento: readonly string[],
  modalidadesDosLotes: readonly string[],
): { nome: string; orfa: boolean }[] {
  const doEvento = modalidadesDoEvento.map((nome) => ({ nome, orfa: false }));
  const vistas = new Set(modalidadesDoEvento);
  const orfas: { nome: string; orfa: boolean }[] = [];
  for (const nome of modalidadesDosLotes) {
    if (vistas.has(nome)) continue;
    vistas.add(nome);
    orfas.push({ nome, orfa: true });
  }
  return [...doEvento, ...orfas];
}
