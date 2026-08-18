// =============================================================================
// Helpers PUROS do formulário de lote (S300 · E04 · ADR-012). Sem React/DOM —
// 100% testável. É a FIAÇÃO DE MONEY-CONFIG que a Fable-review deve olhar:
//   - preço em R$ → cent-exato (arredondarCentavos) para passar `moneyCentExato`
//     na Rule; a UI nunca inventa sub-centavo;
//   - janela `inicioEm`/`fimEm` via datetime-local PINADO em `FUSO_EVENTO`
//     (America/Sao_Paulo — S300-T4 review · achado #2): a parede digitada é
//     lida/exibida SEMPRE no fuso do produto (dataHoraLocalParaDate/
//     dataHoraLocalISO do core), nunca no fuso do navegador — organizador em
//     Manaus e tabela pinada veem a MESMA hora, e a virada (S300-T2) recebe o
//     instante absoluto certo;
//   - validação = KERNEL (`loteShapeValido` + `validarLotesModalidade`), nunca
//     regra de lote reinventada aqui. A Rule é a autoridade final; isto é o
//     pré-check read-your-writes (a Rule não itera irmãos, por isso a
//     não-sobreposição é checada aqui contra os lotes já carregados).
//
// `vendidos` NUNCA entra no payload (∑ de Function). O congelamento pós-venda
// (RN-200/300) é `loteImutavel` — a UI desabilita os campos comerciais.
// =============================================================================

import {
  MSG_FACE_MINIMA_VENDA_PAGA,
  capacidadeDoLote,
  dataHoraLocalISO,
  dataHoraLocalParaDate,
  faceMinimaVendaPagaValida,
  isDataHoraLocalISO,
  loteAtivo,
  loteEncerrado,
  loteEsgotado,
  loteShapeValido,
  mensagemContagemInvalida,
  mensagemValorInvalido,
  parseContagemPtBr,
  parseValorPtBr,
  validarLotesModalidade,
  type CapacidadeLote,
  type Lote,
  type Timestamp,
} from '@leela/core';
import type { SalvarLoteInput } from '@leela/api-client';
import { formatDataHoraCurta } from '../../_lib/format';

/** Campos comerciais que a Rule CONGELA quando o lote já vendeu (espelho). */
export const CAMPOS_CONGELADOS_APOS_VENDA = [
  'preco',
  'inicioEm',
  'fimEm',
  'quantidadeLimite',
  'ordem',
] as const;

/**
 * Mensagem exibida quando o lote está congelado por já ter vendido.
 *
 * HONESTIDADE DO ESTADO (BUILD-LOTES-UX · frente C): a mensagem antiga dizia
 * que "preço, janela, vaga e ordem ficam bloqueados" e parava aí — o
 * organizador via quatro portas fechadas sem saber que UMA delas tem chave. A
 * vaga TEM caminho autorizado pós-venda (`ajustarCapacidadeLote` — RN-304, com
 * motivo na auditoria); o preço é o único bloqueio que a RN-200 canônica
 * enuncia; janela e ordem estão travadas por uma extensão que só existe na Rule
 * (`loteComercialImutavelSeVendido`) e aguarda selo do dono da regra.
 */
export const MSG_LOTE_VENDIDO =
  'Lote com venda: o preço fica bloqueado (RN-200). A vaga se ajusta em "Ajustar capacidade", ' +
  'com motivo na auditoria (RN-304). Janela e ordem seguem bloqueadas — mudança pendente de selo da regra.';

/** Valores brutos do formulário (strings dos inputs). */
export interface LoteFormValues {
  nome: string;
  ordem: string;
  /** datetime-local `YYYY-MM-DDTHH:mm`. */
  inicioEm: string;
  /** datetime-local `YYYY-MM-DDTHH:mm`. */
  fimEm: string;
  quantidadeLimite: string;
  /** Preço em R$ ("99,90"). */
  preco: string;
}

/** Payload completo (criação/edição de lote SEM venda). */
export type LotePayloadCompleto = Omit<SalvarLoteInput, 'tenantId'>;

/**
 * Payload de edição de lote VENDIDO (review S300-T4 #1): a Rule congela os
 * campos comerciais, então SÓ `nome` viaja — nada de re-enviar janela/preço
 * "iguais" e depender de alinhamento de minuto para o diff dar vazio.
 */
export type LotePayloadVendido = Pick<LotePayloadCompleto, 'nome'>;

export type LotePayload = LotePayloadCompleto | LotePayloadVendido;

// ---------------------------------------------------------------------------
// Erro POR CAMPO (BUILD-LOTES-UX · frente A)
// ---------------------------------------------------------------------------
//
// CAUSA-RAIZ que isto conserta: `validarFormLote` devolvia UMA string e o
// `LoteModal` pendurava essa string no `errorMessage` do input de PREÇO — o
// último campo do formulário. Qualquer erro (vaga vazia, ordem inválida,
// janela invertida) acendia "Preço da inscrição". O organizador que deixou a
// vaga em branco com o preço 120,00 preenchido via o erro no campo certo do
// ponto de vista do código e no campo errado do ponto de vista dele.
//
// Agora a validação devolve a LISTA de pendências, uma por campo, ordenada
// pela ordem VISUAL do formulário. O modal acende cada campo com o seu texto
// (`aria-invalid` + `aria-describedby` vêm do primitivo Input do DS) e move o
// foco para o primeiro. `erro` continua exposto como a 1ª mensagem para quem
// só quer o resumo.

/** Campos editáveis do formulário de lote — chaves de erro. */
export type CampoLote =
  | 'nome'
  | 'ordem'
  | 'quantidadeLimite'
  | 'inicioEm'
  | 'fimEm'
  | 'preco';

/** Alvo de um erro: um campo, ou o formulário (invariante sem campo único). */
export type AlvoErroLote = CampoLote | 'formulario';

export interface ErroLote {
  campo: AlvoErroLote;
  mensagem: string;
}

/**
 * ORDEM VISUAL dos campos no `LoteModal` — define qual pendência o usuário vê
 * primeiro e para onde o foco vai. Mudou o layout do modal? Mude aqui junto.
 */
export const ORDEM_CAMPOS_LOTE: readonly CampoLote[] = [
  'nome',
  'ordem',
  'quantidadeLimite',
  'inicioEm',
  'fimEm',
  'preco',
];

export type ResultadoValidacao =
  | { ok: true; input: LotePayload }
  | {
      ok: false;
      /** Uma pendência por campo, em ordem visual (erros de formulário por último). */
      erros: readonly ErroLote[];
      /** 1ª mensagem — resumo/compatibilidade. */
      erro: string;
    };

/** Índice de ordenação de um alvo de erro (formulário sempre por último). @pure */
function pesoDoAlvo(alvo: AlvoErroLote): number {
  const i = ORDEM_CAMPOS_LOTE.indexOf(alvo as CampoLote);
  return i === -1 ? ORDEM_CAMPOS_LOTE.length : i;
}

/** Fecha o resultado de falha: ordena por ordem visual e expõe a 1ª mensagem. @pure */
function falha(erros: readonly ErroLote[]): ResultadoValidacao {
  const ordenados = [...erros].sort((a, b) => pesoDoAlvo(a.campo) - pesoDoAlvo(b.campo));
  return { ok: false, erros: ordenados, erro: ordenados[0]?.mensagem ?? 'Formulário inválido.' };
}

/**
 * Erro vindo do SERVIDOR (Rule/Function), não do formulário — REV-LOTES ·
 * achado #2 da frente A.
 *
 * A frente A deu endereço ao erro de VALIDAÇÃO e deixou o outro caminho como
 * estava: o `catch` do salvamento engolia o erro inteiro e mostrava um toast
 * "Falha ao salvar o lote". É a mesma queixa do dono num lugar diferente —
 * a tela sabia o que houve e não contava. Recusa de Rule tem causa conhecida
 * e enumerável (congelamento pós-venda, modalidade inexistente, tenant sem
 * permissão), então ela vira texto acionável ancorado no formulário; o resto
 * preserva a mensagem original em vez de descartá-la. @pure
 */
export function mensagemErroServidor(erro: unknown): string {
  const codigo =
    typeof erro === 'object' && erro !== null && 'code' in erro
      ? String((erro as { code: unknown }).code)
      : '';
  if (codigo.includes('permission-denied')) {
    return (
      'O servidor recusou a gravação. As causas possíveis são: o lote já vendeu e preço, ' +
      'janela e ordem estão congelados (RN-200/300 — a vaga se ajusta em "Ajustar capacidade"); ' +
      'o preço ficou entre R$ 0,01 e R$ 9,99, e a venda paga mínima é R$ 10,00 (RN-559); ' +
      'a modalidade não existe mais no evento; ou a sua conta não tem permissão de escrita neste evento.'
    );
  }
  const detalhe = erro instanceof Error && erro.message.trim().length > 0 ? ` (${erro.message.trim()})` : '';
  return `Não foi possível salvar o lote${detalhe}. Nada foi gravado — tente de novo.`;
}

/** Mensagem de um campo no resultado de validação (null quando o campo está ok). @pure */
export function erroDoCampo(
  resultado: ResultadoValidacao,
  campo: AlvoErroLote,
): string | null {
  if (resultado.ok) return null;
  return resultado.erros.find((e) => e.campo === campo)?.mensagem ?? null;
}

// ---------------------------------------------------------------------------
// Dinheiro
// ---------------------------------------------------------------------------

/** Arredonda a 2 casas (cent-exato) — condição de `moneyCentExato` na Rule. @pure */
export function arredondarCentavos(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * Parse de preço em R$ vindo do input ("99,90", "1.234,56", "99.90") → número
 * cent-exato. `null` quando ilegível, ambíguo ou negativo. @pure
 *
 * Lê pelo `parseValorPtBr` do core (FIX-PARSE-DINHEIRO): o `replace(',', '.')`
 * que morava aqui transformava "1.234,56" em "1.234.56", e o `parseFloat`
 * parava no segundo ponto e devolvia 1.234 — R$ 1,23 no lugar de mil duzentos e
 * trinta e quatro reais, sem erro nenhum na tela.
 */
export function parsePrecoReais(s: string): number | null {
  const lido = parseValorPtBr(s);
  if (!lido.ok || lido.valor < 0) return null;
  return lido.centavos / 100;
}

// ---------------------------------------------------------------------------
// Datas ↔ datetime-local
// ---------------------------------------------------------------------------

/** Date → valor de `<input type="datetime-local">` PINADO em FUSO_EVENTO. @pure */
export function dateParaInputLocal(d: Date): string {
  return dataHoraLocalISO(d);
}

/** Timestamp → valor de datetime-local (vazio quando ausente/ilegível). @pure */
export function timestampParaInputLocal(ts: Timestamp | null | undefined): string {
  if (!ts || typeof ts.toDate !== 'function') return '';
  return dateParaInputLocal(ts.toDate());
}

/**
 * Valor de datetime-local → instante, com a parede interpretada em
 * FUSO_EVENTO (nunca no fuso do navegador); `null` quando vazio/inválido.
 * @pure
 */
export function inputLocalParaDate(s: string): Date | null {
  if (!isDataHoraLocalISO(s)) return null;
  return dataHoraLocalParaDate(s);
}

// ---------------------------------------------------------------------------
// Estado do lote (derivação do KERNEL — nada recalculado à mão)
// ---------------------------------------------------------------------------

/** Lote congelado para o cliente por já ter vendido (RN-200/300). @pure */
export function loteImutavel(lote: Pick<Lote, 'vendidos'>): boolean {
  return lote.vendidos > 0;
}

/**
 * loteId de um lote NOVO — chave OPACA (S316-T6 · E04).
 *
 * A chave era `${modalidade}-lote-${ordem}`, e o nome da modalidade morava
 * DENTRO da chave primária. Isso vira resíduo assim que a modalidade pode ser
 * renomeada (RN-501): a renomeação migra o CAMPO `modalidade` dos lotes e
 * deixa o docId com o nome velho — cosmético, porque nenhuma tela mostra docId
 * de lote, mas é dívida.
 *
 * ⛔ A dívida NÃO é paga renomeando documento existente. Apagar e recriar o
 * lote moveria uma chave primária que `pedidos/{id}.itens[].loteId` referencia
 * e por onde a virada reconta (`functions/src/eventos/virarLote.ts`). Hoje
 * seria inofensivo, porque a operação só existe antes da primeira venda — e é
 * exatamente por isso que construí-la assim é pior: ensinaria ao código um
 * gesto que fica errado no dia em que alguém relaxar a fronteira.
 *
 * Então a chave opaca vale só para quem NASCER daqui em diante. Os lotes
 * antigos seguem com o nome dentro do id, legíveis e intocados.
 *
 * A `modalidade` continua no parâmetro por compatibilidade de assinatura e
 * porque ela é o que dá contexto ao prefixo legível; ela não entra mais no id.
 * @pure
 */
export function novoLoteId(_modalidade: string, ordem: number): string {
  const c = globalThis.crypto;
  const sufixo =
    c && typeof c.randomUUID === 'function'
      ? c.randomUUID()
      : `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
  return `lote-${ordem}-${sufixo}`;
}

/** Próxima `ordem` sugerida para uma modalidade (max + 1, mínimo 1). @pure */
export function proximaOrdem(lotesDaModalidade: readonly Pick<Lote, 'ordem'>[]): number {
  return lotesDaModalidade.reduce((max, l) => Math.max(max, l.ordem), 0) + 1;
}

// ---------------------------------------------------------------------------
// Capacidade PREVISTA (BUILD-LOTES-UX · frente D)
// ---------------------------------------------------------------------------

/**
 * Painel `configurado / vendido / disponível` do lote considerando o total que
 * o organizador ESTÁ DIGITANDO agora, não o que está gravado.
 *
 * A aritmética é a do kernel (`capacidadeDoLote`): disponível = configurado −
 * vendido, nunca negativo. É o caso que o dono descreveu: 50 configurados com
 * 19 vendidos; ao trocar o total para 20, o disponível vira 1 — não 31. O
 * número que muda é o TOTAL, e o disponível é consequência dele.
 *
 * `lote` null = lote novo (nada vendido ainda). Total ilegível cai no total
 * gravado — o painel nunca pisca em branco enquanto se digita. @pure
 */
export function capacidadePrevista(
  lote: Pick<Lote, 'quantidadeLimite' | 'vendidos'> | null,
  totalDigitado: string,
): CapacidadeLote {
  const vendidos = lote?.vendidos ?? 0;
  // A prévia lê a MESMA pontuação do submit (FIX-PARSE-MILHAR): com
  // `parseInt` o painel mostrava "1 disponível" para quem digitava "1.000" e
  // gravava outra coisa — a tela e o payload precisam contar a mesma história.
  const digitado = parseContagemPtBr(totalDigitado);
  const configurado = digitado.ok && digitado.valor >= 0
    ? digitado.valor
    : (lote?.quantidadeLimite ?? 0);
  return capacidadeDoLote({ quantidadeLimite: configurado, vendidos });
}

export interface EstadoLoteBadge {
  label: string;
  /** Variante do Badge do DS. */
  variant: 'vitoria' | 'vulcao' | 'alerta' | 'neutro';
}

/**
 * Rótulo/variante de estado de um lote no instante `agora`, DERIVADO do kernel
 * (loteAtivo/loteEsgotado/loteEncerrado) — a UI não reimplementa a virada. @pure
 */
export function estadoLoteBadge(
  lote: Lote,
  lotesDaModalidade: readonly Lote[],
  agora: Date,
): EstadoLoteBadge {
  const ativo = loteAtivo(lotesDaModalidade, agora);
  if (ativo && ativo.id === lote.id) return { label: 'Ativo', variant: 'vitoria' };
  if (loteEsgotado(lote)) return { label: 'Esgotado', variant: 'vulcao' };
  if (loteEncerrado(lote, agora)) return { label: 'Encerrado', variant: 'neutro' };
  if (agora.getTime() < lote.inicioEm.toMillis()) return { label: 'Agendado', variant: 'alerta' };
  return { label: 'Aguardando', variant: 'neutro' };
}

// ---------------------------------------------------------------------------
// Desativar o lote — encerrar a venda AGORA (BUILD-LOTES-UX · frente E)
// ---------------------------------------------------------------------------
//
// O modelo de lote NÃO tem flag `ativo` (ver `Lote` no core): o estado
// ativo/encerrado é DERIVADO da janela e do contador (`loteEncerrado` =
// `agora ≥ fimEm` OU `vendidos ≥ quantidadeLimite`). Inventar um campo novo
// exigiria core + Rules + Function, e criaria uma SEGUNDA fonte de verdade
// para um estado que já se computa. Então desativar usa as duas portas que a
// derivação já abre, escolhendo pela existência de venda:
//
//   vendidos = 0  → grava `fimEm = agora`. A janela fecha, o lote encerra por
//                   data. Reversível: sem venda o lote é editável inteiro, é
//                   só pôr um fim novo no futuro.
//   vendidos > 0  → `ajustarCapacidadeLote(capacidade = vendidos)` (RN-304, a
//                   única porta autorizada pós-venda). O lote encerra por
//                   quantidade, no mesmo instante. Reversível: subir a
//                   capacidade reabre as vagas.
//
// Em nenhum dos dois caminhos algo toca inscrito: `vendidos`, `encerradoEm` e
// `encerradoMotivo` são escrita exclusiva da Function de virada, que só conta
// inscritos confirmados/estornados e carimba o lote — ela não escreve na
// inscrição. Quem já comprou continua comprado; o próximo lote da modalidade
// assume por hand-off (`loteAtivo`), se houver.

/** Motivo carimbado na auditoria quando a desativação passa pela capacidade (RN-304). */
export const MOTIVO_DESATIVACAO_LOTE =
  'Desativação do lote pelo organizador: venda encerrada antes do fim da janela.';

/** Como a desativação será executada neste lote (decide pela existência de venda). */
export type ViaDesativacao = 'janela' | 'capacidade';

/**
 * Desativar faz sentido neste lote agora? Só enquanto ele ainda vende — lote
 * já encerrado (por data ou esgotamento) não tem venda para interromper.
 *
 * Sem venda, a via é a janela, e ela exige `fimEm > inicioEm` (shape do kernel
 * e da Rule): um lote AGENDADO, cuja janela ainda nem abriu, não pode receber
 * `fimEm = agora`. Ele também não está vendendo nada — quem quiser tirá-lo do
 * caminho usa Remover, que a Rule libera justamente por não haver venda. @pure
 */
export function loteDesativavel(lote: Lote, agora: Date): boolean {
  if (loteEncerrado(lote, agora)) return false;
  if (lote.vendidos > 0) return true;
  return agora.getTime() > lote.inicioEm.toMillis();
}

/** Via de desativação deste lote (venda existente manda no caminho). @pure */
export function viaDesativacao(lote: Pick<Lote, 'vendidos'>): ViaDesativacao {
  return lote.vendidos > 0 ? 'capacidade' : 'janela';
}

/**
 * Payload que fecha a janela do lote AGORA (via `janela`, lote sem venda).
 * Encurtar o fim nunca cria sobreposição com irmão — a janela só diminui —,
 * por isso este caminho não repassa pelo invariante de sequência. @pure
 */
export function payloadDesativarPelaJanela(lote: Lote, agora: Date): LotePayloadCompleto {
  return {
    modalidade: lote.modalidade,
    ordem: lote.ordem,
    nome: lote.nome,
    inicioEm: lote.inicioEm.toDate(),
    fimEm: agora,
    quantidadeLimite: lote.quantidadeLimite,
    preco: lote.preco,
  };
}

// ---------------------------------------------------------------------------
// Timestamp-like (só toMillis/toDate) para alimentar as validações do core
// ---------------------------------------------------------------------------

function tsLike(d: Date): Timestamp {
  return {
    seconds: Math.floor(d.getTime() / 1000),
    nanoseconds: 0,
    toDate: () => d,
    toMillis: () => d.getTime(),
  };
}

// ---------------------------------------------------------------------------
// Validação do formulário — shape do core + invariante cross-lote do core
// ---------------------------------------------------------------------------

export interface ValidarFormParams {
  values: LoteFormValues;
  /** Modalidade dona do lote (contexto do grupo — ADR-012). */
  modalidade: string;
  /** Id do lote em edição (excluído dos irmãos); null quando criando. */
  loteId: string | null;
  /** Todos os lotes do evento (para checar sobreposição na modalidade). */
  lotesDoEvento: readonly Lote[];
  /**
   * Lote em edição já vendeu (loteImutavel)? Então SÓ o nome é validado e SÓ
   * o nome entra no payload (RN-200/300 — review S300-T4 #1). Default false.
   */
  congelado?: boolean;
}

/**
 * Valida o formulário e devolve o payload (sem tenantId) ou a 1ª mensagem de
 * erro. Ordem: campos básicos → shape do lote (core) → invariante de sequência
 * da modalidade (core, contra os irmãos já carregados). Nenhuma regra de lote é
 * inventada aqui — só se aplica o kernel. @pure
 */
export function validarFormLote(params: ValidarFormParams): ResultadoValidacao {
  const { values, modalidade, loteId, lotesDoEvento, congelado = false } = params;
  const erros: ErroLote[] = [];

  const nome = values.nome.trim();
  if (nome.length === 0) erros.push({ campo: 'nome', mensagem: 'Informe o nome do lote.' });

  // Lote VENDIDO: payload mínimo — só o nome (review S300-T4 #1). Os campos
  // comerciais estão desabilitados na UI e congelados na Rule; validar/enviar
  // os valores carregados seria (a) depender de minuto-alinhamento para o
  // diff dar vazio e (b) bloquear um rename por problema pré-existente nos
  // irmãos (sobreposição legada travaria até a troca de nome).
  if (congelado) {
    return erros.length > 0 ? falha(erros) : { ok: true, input: { nome } };
  }

  // TODAS as pendências de campo são coletadas na mesma passada: o organizador
  // vê de uma vez tudo o que falta, cada aviso no seu próprio campo, em vez de
  // corrigir um, salvar, e descobrir o próximo (frente A).
  // Ordem e vaga pelo parser único de contagem (FIX-PARSE-MILHAR): com
  // `parseInt` o separador de milhar não sobrevivia — "1.000" virava 1, um
  // inteiro que a guarda abaixo aprovava, e o lote nascia com UMA vaga.
  //
  // PARSE-1: o motivo da recusa deixa de ser descartado. Texto ILEGÍVEL usa a
  // frase do parser, que diz o que fazer; a guarda de faixa continua inteira e
  // fala quando há número para julgar. As duas nunca competem — texto que o
  // parser recusou não chega a ter valor.
  //
  // O motivo `vazio` é a exceção, e é a mesma exceção do `CapacidadeModal`: a
  // frase do parser ("Informe uma quantidade.") não diz DE QUAL campo se trata,
  // e o conserto da frente A foi exatamente pôr o nome do campo no aviso. Campo
  // em branco continua com a frase daqui.
  const ordemLida = parseContagemPtBr(values.ordem);
  const ordem = ordemLida.ok ? ordemLida.valor : Number.NaN;
  if (!ordemLida.ok && ordemLida.motivo !== 'vazio') {
    erros.push({ campo: 'ordem', mensagem: mensagemContagemInvalida(ordemLida.motivo) });
  } else if (!Number.isInteger(ordem) || ordem < 1) {
    erros.push({ campo: 'ordem', mensagem: 'A ordem deve ser um inteiro ≥ 1.' });
  }

  const vagaLida = parseContagemPtBr(values.quantidadeLimite);
  const quantidadeLimite = vagaLida.ok ? vagaLida.valor : Number.NaN;
  if (!vagaLida.ok && vagaLida.motivo !== 'vazio') {
    erros.push({
      campo: 'quantidadeLimite',
      mensagem: mensagemContagemInvalida(vagaLida.motivo),
    });
  } else if (!Number.isInteger(quantidadeLimite) || quantidadeLimite < 1) {
    erros.push({
      campo: 'quantidadeLimite',
      mensagem: 'A vaga (quantidade limite) deve ser um inteiro ≥ 1.',
    });
  }

  const inicioEm = inputLocalParaDate(values.inicioEm);
  const fimEm = inputLocalParaDate(values.fimEm);
  if (!inicioEm) {
    erros.push({ campo: 'inicioEm', mensagem: 'Informe o início da janela de venda.' });
  }
  if (!fimEm) {
    erros.push({ campo: 'fimEm', mensagem: 'Informe o fim da janela de venda.' });
  }
  if (inicioEm && fimEm && fimEm.getTime() <= inicioEm.getTime()) {
    erros.push({ campo: 'fimEm', mensagem: 'O fim da janela deve ser depois do início.' });
  }

  // PARSE-1: idem no preço. "Preço inválido (use R$ ≥ 0)" era a resposta para
  // pontuação torta, para letra e para campo em branco — três problemas
  // diferentes com a mesma frase. Agora a frase de faixa fica só com o negativo.
  const precoLido = parseValorPtBr(values.preco);
  const preco = parsePrecoReais(values.preco);
  if (!precoLido.ok && precoLido.motivo !== 'vazio') {
    erros.push({ campo: 'preco', mensagem: mensagemValorInvalido(precoLido.motivo) });
  } else if (preco === null) {
    erros.push({ campo: 'preco', mensagem: 'Preço inválido (use R$ ≥ 0).' });
  } else if (!faceMinimaVendaPagaValida(preco)) {
    // RN-559 — a venda PAGA tem face mínima de R$ 10,00 (decisão do dono em
    // 2026-08-11). O organizador descobre AQUI, no campo, antes de mandar; a
    // Rule é a autoridade e recusaria depois, com o toast genérico de servidor.
    // R$ 0,00 passa: gratuidade não é venda.
    erros.push({ campo: 'preco', mensagem: MSG_FACE_MINIMA_VENDA_PAGA });
  }

  if (erros.length > 0 || !inicioEm || !fimEm || preco === null) return falha(erros);

  // Shape do lote pelo KERNEL (mesma checagem que a Rule faz no shape).
  const shapeOk = loteShapeValido({
    modalidade,
    ordem,
    nome,
    inicioEm: tsLike(inicioEm),
    fimEm: tsLike(fimEm),
    quantidadeLimite,
    preco,
  });
  if (!shapeOk) return falha([{ campo: 'formulario', mensagem: 'Dados do lote inconsistentes.' }]);

  // Invariante de sequência da modalidade (ADR-012 · RN-300) contra os irmãos
  // já carregados — a Rule NÃO itera coleção, por isso este pré-check vive aqui.
  const irmaos = lotesDoEvento.filter(
    (l) => l.modalidade === modalidade && l.id !== loteId,
  );
  const projetado = [
    ...irmaos.map((l) => ({
      modalidade: l.modalidade,
      ordem: l.ordem,
      inicioEm: l.inicioEm,
      fimEm: l.fimEm,
    })),
    { modalidade, ordem, inicioEm: tsLike(inicioEm), fimEm: tsLike(fimEm) },
  ];
  // O KERNEL continua sendo o juiz (nenhuma regra de lote é reinventada aqui);
  // o que a camada de tela acrescenta é o ENDEREÇO do conflito — qual lote e
  // qual vigência (frente B).
  const erroSequencia = validarLotesModalidade(projetado);
  if (erroSequencia) {
    const conflito = conflitoDeJanela(irmaos, ordem, inicioEm, fimEm);
    if (conflito) {
      return falha([{ campo: 'inicioEm', mensagem: mensagemConflitoJanela(conflito) }]);
    }
    // Conflito que NÃO envolve a janela projetada (ex.: ordem duplicada, ou
    // sobreposição pré-existente entre dois irmãos): a mensagem do kernel é a
    // mais honesta que temos — nomear um lote aqui seria apontar o culpado errado.
    return falha([{ campo: 'formulario', mensagem: erroSequencia }]);
  }

  return {
    ok: true,
    input: { modalidade, ordem, nome, inicioEm, fimEm, quantidadeLimite, preco },
  };
}

// ---------------------------------------------------------------------------
// Endereço do conflito de janela (BUILD-LOTES-UX · frente B)
// ---------------------------------------------------------------------------
//
// A regra estava certa e a mensagem era cega: `validarLotesModalidade` diz
// "lotes 1 e 2 têm janelas sobrepostas" sem dizer ONDE começa e termina a
// vigência do lote que está no caminho — o organizador tinha de sair da tela,
// abrir o outro lote e anotar as datas. Aqui a camada de tela pega o irmão que
// o kernel reprovou e escreve a janela dele por extenso, no fuso do produto.
//
// Vazamento: o irmão é um lote do MESMO evento e da MESMA modalidade, lido
// pela mesma tela com a mesma permissão (Rules: membro do tenant / papel
// organizador-administrador). Nome e janela já estão na tabela atrás do modal
// — a mensagem não revela nada novo.

export type TipoConflitoJanela = 'sobreposicao' | 'cronologia';

export interface ConflitoJanela {
  irmao: Lote;
  tipo: TipoConflitoJanela;
}

/**
 * Acha o irmão cuja vigência entra em conflito com a janela projetada.
 * `sobreposicao` = as janelas se cruzam. `cronologia` = não se cruzam, mas a
 * sequência anda para trás (lote de ordem maior terminando antes de um de
 * ordem menor começar). `null` quando a janela projetada não é a culpada. @pure
 */
export function conflitoDeJanela(
  irmaos: readonly Lote[],
  ordem: number,
  inicioEm: Date,
  fimEm: Date,
): ConflitoJanela | null {
  const inicio = inicioEm.getTime();
  const fim = fimEm.getTime();

  const sobreposto = irmaos.find(
    (l) => inicio < l.fimEm.toMillis() && l.inicioEm.toMillis() < fim,
  );
  if (sobreposto) return { irmao: sobreposto, tipo: 'sobreposicao' };

  const foraDeOrdem = irmaos.find(
    (l) =>
      (l.ordem < ordem && fim <= l.inicioEm.toMillis()) ||
      (l.ordem > ordem && l.fimEm.toMillis() <= inicio),
  );
  if (foraDeOrdem) return { irmao: foraDeOrdem, tipo: 'cronologia' };

  return null;
}

/** Vigência de um lote por extenso, no fuso do produto. @pure */
export function janelaPorExtenso(lote: Pick<Lote, 'inicioEm' | 'fimEm'>): string {
  return `${formatDataHoraCurta(lote.inicioEm)} até ${formatDataHoraCurta(lote.fimEm)}`;
}

/** Mensagem de conflito COM o endereço: nome do lote + vigência exata. @pure */
export function mensagemConflitoJanela(conflito: ConflitoJanela): string {
  const { irmao, tipo } = conflito;
  const vigencia = `${janelaPorExtenso(irmao)} (horário de Brasília)`;
  if (tipo === 'sobreposicao') {
    return (
      `A janela fica sobreposta à do lote "${irmao.nome}" (L${irmao.ordem}), que vende de ` +
      `${vigencia}. Comece depois do fim dele, ou termine antes do início dele.`
    );
  }
  return (
    `A sequência da modalidade andaria para trás: o lote "${irmao.nome}" (L${irmao.ordem}) vende de ` +
    `${vigencia}. Na modalidade, quem tem ordem maior vende depois — ajuste a janela ou a ordem.`
  );
}
