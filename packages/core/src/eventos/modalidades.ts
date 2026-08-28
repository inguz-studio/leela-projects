// =============================================================================
// packages/core/src/eventos/modalidades.ts
//
// RN-578 / RN-501 / RN-502 — o ciclo de vida da modalidade do evento
// (E04 · S316, re-ancorada pela leva 22 de 17/08 no desenho pai/filho:
// modalidade é o pai, lote é o filho; re-fundada em 28/08 pela RN-578, que
// nasceu da REVOGAÇÃO da RN-500 pelo dono — V2708-25).
//
// A FRONTEIRA MUDOU DE DONO (RN-578): deixou de ser do EVENTO (`qtdInscritos
// == 0`, a RN-500 revogada) e passou a ser DA MODALIDADE:
//   - acrescentar: SEMPRE permitido, mesmo com inscritos/vendas no evento;
//   - renomear/remover: só enquanto A MODALIDADE não tem inscrição (qualquer
//     status — espírito da RN-487) nem venda em lote;
//   - inativar/ocultar/reativar: SEMPRE permitidos — suspendem/retomam a
//     OFERTA sem tocar em nada que já foi vendido.
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
// RN-578 trata a modalidade do evento como string livre ("Kids 1k",
// "Trail 15k"), e fechar a lista quebraria evento vivo. Os catálogos fechados
// que existem no produto descrevem OUTRO fato — `MODALIDADES_CLUBE`
// (clubs/clube-opcoes) e os pilares da RN-114 (clubs/catalogo-acoes) falam de
// ESPORTE, e a modalidade do evento fala de DISTÂNCIA/percurso. Não se
// misturam, e nenhum dos dois é recriado aqui.
// =============================================================================

/**
 * As seis operações da porta única (RN-578): as três estruturais (mexem na
 * LISTA) e as três de estado (mexem na OFERTA, nunca no vendido).
 */
export type OperacaoModalidade =
  | 'acrescentar'
  | 'renomear'
  | 'remover'
  | 'inativar'
  | 'ocultar'
  | 'reativar';

/** Operações válidas — ordem de leitura, não de precedência. */
export const OPERACOES_MODALIDADE: readonly OperacaoModalidade[] = [
  'acrescentar',
  'renomear',
  'remover',
  'inativar',
  'ocultar',
  'reativar',
];

/** As operações que mudam SÓ o estado da oferta (RN-578). */
export const OPERACOES_ESTADO_MODALIDADE: readonly OperacaoModalidade[] = [
  'inativar',
  'ocultar',
  'reativar',
];

/** A operação mexe só no estado (inativar/ocultar/reativar)? @pure */
export function isOperacaoEstado(op: OperacaoModalidade): boolean {
  return (OPERACOES_ESTADO_MODALIDADE as readonly string[]).includes(op);
}

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
// O estado da modalidade (RN-578 — nasceu da revogação da RN-500 em 28/08)
// ---------------------------------------------------------------------------

/**
 * Estado da OFERTA de uma modalidade:
 *   - `ativa`   — vitrine oferta, checkout aceita (default);
 *   - `inativa` — venda de NOVAS inscrições suspensa; o vendido fica intacto;
 *   - `oculta`  — some da vitrine pública; o vendido fica intacto.
 * Para o COMPRADOR, inativa e oculta são o mesmo fato ("não disponível") e a
 * recusa do checkout usa UMA frase — o vocabulário interno nunca vaza (mesma
 * régua da RN-504 para "kit desligado").
 */
export type EstadoModalidade = 'ativa' | 'inativa' | 'oculta';

/**
 * Deriva o estado a partir dos dois arrays do doc do evento
 * (`modalidadesInativas`/`modalidadesOcultas`). Eles são mutuamente exclusivos
 * por construção (toda transição escreve um e limpa o outro); num doc
 * corrompido com o nome nos dois, **oculta prevalece** — é o estado mais
 * restritivo (fail-closed). Campo ausente = array vazio = tudo ativa, e é
 * assim que todo evento existente entra na RN-578 sem migração. @pure
 */
export function estadoModalidade(
  nome: string,
  inativas: readonly string[],
  ocultas: readonly string[],
): EstadoModalidade {
  if (ocultas.includes(nome)) return 'oculta';
  if (inativas.includes(nome)) return 'inativa';
  return 'ativa';
}

/**
 * As modalidades que a VITRINE PÚBLICA oferta: só as ativas, na ordem do
 * documento. A landing (página do evento, home e checkout) filtra por aqui;
 * o painel do organizador NÃO — ele mostra todas, marcadas. @pure
 */
export function modalidadesOfertaveis(
  modalidades: readonly string[],
  inativas: readonly string[],
  ocultas: readonly string[],
): string[] {
  return modalidades.filter((m) => estadoModalidade(m, inativas, ocultas) === 'ativa');
}

/**
 * A recusa do CHECKOUT para modalidade não-ativa (RN-578, fail-closed). UMA
 * frase para inativa e oculta — quem compra não conhece o vocabulário interno,
 * e oculta nem deveria saber que existe. @pure
 */
export function msgModalidadeIndisponivel(nome: string): string {
  return (
    `A modalidade "${nome}" não está disponível para novas inscrições ` +
    'neste evento.'
  );
}

/** Transição de estado: a modalidade precisa existir na lista. @pure */
export function validarTransicaoModalidade(
  modalidades: readonly string[],
  nome: string,
): string | null {
  const limpo = normalizarNomeModalidade(nome);
  if (!modalidades.includes(limpo)) {
    return `A modalidade "${limpo}" não está na lista deste evento.`;
  }
  return null;
}

// ---------------------------------------------------------------------------
// A fronteira POR MODALIDADE (RN-578 — substitui a fronteira do evento da
// RN-500 revogada, que congelava a lista inteira em `qtdInscritos > 0`)
// ---------------------------------------------------------------------------

/**
 * A recusa de renomear/remover uma modalidade que JÁ VENDEU. "Venda" aqui é
 * inscrição de QUALQUER status (inclusive PIX pendente — o espírito da RN-487
 * na granularidade da modalidade) ou lote com `vendidos`/`reservas` > 0. O
 * nome faz parte do que o comprador comprou (`inscrito.modalidade` grava a
 * string), e a migração da RN-501 não alcança inscritos/pedidos — por isso o
 * caminho vivo é inativar a antiga e acrescentar a nova, dois gestos sempre
 * permitidos. @pure
 */
export function msgModalidadeComVenda(
  nome: string,
  operacao: 'renomear' | 'remover',
): string {
  const gesto = operacao === 'renomear' ? 'renomeada' : 'removida';
  return (
    `A modalidade "${nome}" já tem inscrição registrada (inclusive PIX ` +
    `pendente) e não pode ser ${gesto} — o nome faz parte do que já foi ` +
    'vendido (RN-578). Para parar de vender, inative ou oculte a modalidade; ' +
    'para trocar o nome da oferta, inative esta e adicione uma nova.'
  );
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
