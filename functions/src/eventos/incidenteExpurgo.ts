// =============================================================================
// functions/src/eventos/incidenteExpurgo.ts
//
// FALHA DE EXPURGO LGPD VIRA INCIDENTE (BUILD-EXPURGO · trace
// leela-pixreal-diag-20260804).
//
// O que este módulo conserta: o cron `expurgarSaude` falhava TODO DIA em
// produção com `FAILED_PRECONDITION` — a query exige um índice composto de
// `eventos(status, data)` que nunca esteve em `firestore.indexes.json` — e a
// falha existia só como uma linha `E` no meio de centenas. Ninguém foi
// avisado. Descobriram por acaso, oito dias depois, lendo `functions:log`
// atrás de outra coisa.
//
// É a MESMA família do incidente que originou esta rodada: o pagamento que
// entrou, o e-mail que não saiu e o sistema que seguiu verde. Só que aqui o
// que fica sem acontecer é uma OBRIGAÇÃO LEGAL — dado pessoal sensível
// (LGPD Art. 11, RN-147) que deveria ter sido apagado e não foi.
//
// O CONSERTO É UM CAMPO, NÃO UMA FERRAMENTA NOVA — doutrina de
// `email/incidenteEmail.ts`, espelhada de propósito para que uma política de
// alerta só precise aprender um formato. Toda falha de expurgo passa a
// carregar `alerta: "expurgo_lgpd_falhou"` e `severidade: "critico"`. A
// política casa o CAMPO (`jsonPayload.alerta="expurgo_lgpd_falhou"`), nunca a
// mensagem, porque texto de erro de provedor muda e campo estruturado não.
//
// O QUE ESTE MÓDULO NÃO FAZ, DE PROPÓSITO: não cria canal de alerta, não
// chama pager, não sobe serviço. Custo de infra recorrente é decisão do CTO
// humano, não desta lane — aqui fica o GANCHO pronto, no formato estável que
// a política vai casar.
//
// A CAUSA VEM CLASSIFICADA porque as duas saídas do runbook são opostas:
// `indice_ausente` é conserto de ARQUIVO (declarar o índice e deployar
// índices), qualquer outra coisa é investigação. E quando o Firestore manda o
// link de criação do índice, ele vai INTEIRO num campo próprio: truncá-lo
// junto do erro destruiria a única coisa acionável da linha.
//
// PII NUNCA entra: ids de evento, contagens e a mensagem do erro TRUNCADA.
// Conteúdo de dado de saúde não é logado em lugar nenhum — seria o inverso do
// que o expurgo existe para fazer.
// =============================================================================

import * as logger from 'firebase-functions/logger';

/** Valor que a política de alerta casa. Mudar isto quebra o alerta. */
export const ALERTA_EXPURGO_LGPD = 'expurgo_lgpd_falhou';

/** Qual expurgo de retenção falhou — o rótulo que o runbook usa. */
export type TipoExpurgo = 'saude';

/**
 * Por que falhou, no nível em que o runbook decide o que fazer.
 *
 * `indice_ausente` — `FAILED_PRECONDITION` de índice: a query existe, o
 * índice não. Conserto é `firestore.indexes.json` + deploy de índices, e
 * NENHUM dado foi apagado nesta execução.
 * `desconhecida` — qualquer outra coisa; leia `err` antes de agir.
 */
export type CausaExpurgo = 'indice_ausente' | 'desconhecida';

export interface IncidenteExpurgo {
  tipo: TipoExpurgo;
  erro: unknown;
}

/** Máximo do link de criação de índice — a URL do Firestore passa de 200. */
const MAX_URL = 500;

function mensagemDoErro(erro: unknown): string {
  return erro instanceof Error ? erro.message : String(erro);
}

/**
 * Classifica a causa a partir da mensagem do erro. PURO.
 *
 * O gRPC 9 (`FAILED_PRECONDITION`) sozinho não basta: o Firestore usa o mesmo
 * código para pré-condição de transação. O que identifica índice ausente é o
 * par código + "requires an index", que é estável na mensagem do SDK.
 */
export function classificarCausaExpurgo(erro: unknown): CausaExpurgo {
  const msg = mensagemDoErro(erro);
  const ehPrecondicao = /FAILED_PRECONDITION/i.test(msg);
  const falaDeIndice = /requires an index|needs an index|create_composite/i.test(msg);
  return ehPrecondicao && falaDeIndice ? 'indice_ausente' : 'desconhecida';
}

/**
 * Extrai o link de criação do índice que o Firestore manda dentro do erro.
 * PURO. Devolve `null` quando não há link — é o caso normal fora de
 * `indice_ausente`.
 */
export function urlDoIndiceFaltante(erro: unknown): string | null {
  const encontrado = /https:\/\/console\.(?:firebase|cloud)\.google\.com\/\S+/i.exec(
    mensagemDoErro(erro)
  );
  if (encontrado === null) return null;
  // A mensagem costuma fechar o link com pontuação da frase.
  return encontrado[0].replace(/[.,)\]]+$/, '').slice(0, MAX_URL);
}

/**
 * Monta o payload do incidente. PURO — é o contrato que a política de alerta
 * casa, e é por isso que ele é testável sem emulator e sem espionar o logger.
 */
export function montarIncidenteExpurgo(
  incidente: IncidenteExpurgo
): Record<string, unknown> {
  const { erro } = incidente;
  const indiceUrl = urlDoIndiceFaltante(erro);
  return {
    alerta: ALERTA_EXPURGO_LGPD,
    severidade: 'critico',
    canal: 'retencao',
    tipo: incidente.tipo,
    causa: classificarCausaExpurgo(erro),
    ...(indiceUrl !== null ? { indiceUrl } : {}),
    err: mensagemDoErro(erro).slice(0, 200),
  };
}

/**
 * Registra a falha do expurgo como INCIDENTE.
 *
 * @param evento nome do log — o runbook consulta por ele; mudar o nome não
 *   quebra o alerta (que casa o campo), mas quebra consulta salva.
 */
export function registrarIncidenteExpurgo(
  evento: string,
  incidente: IncidenteExpurgo
): void {
  logger.error(evento, montarIncidenteExpurgo(incidente));
}
