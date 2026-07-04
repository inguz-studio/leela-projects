// =============================================================================
// packages/core/src/clubs — barrel do módulo Clubs (LEELA-E05)
// =============================================================================

export type {
  Clube,
  ClubeInput,
  PapelClube,
  VisibilidadeClube,
  ModeloEntradaClube,
} from './clube';
export {
  CLUBE_NOME_MAX,
  CLUBE_DESCRICAO_MAX,
  validarSlugClube,
  validarClube,
} from './clube';

export {
  ALFABETO_CODIGO_CONVITE,
  TAMANHO_CODIGO_CONVITE,
  gerarCodigoConvite,
  validarCodigoConvite,
} from './codigo-convite';

export type {
  Membro,
  PapelMembro,
  StatusMembro,
  EntradaVia,
} from './membro';
export {
  MEMBRO_NOVO_DIAS,
  MEMBRO_INATIVO_DIAS,
  derivarStatus,
  contaComoAtivo,
} from './membro';

export type { Pilar, CatalogoAcao } from './catalogo-acoes';
export {
  PILARES,
  isPilar,
  CATALOGO_ACOES,
  TOTAL_ACOES_CATALOGO,
  ACOES_POR_PILAR,
  getAcaoCatalogo,
} from './catalogo-acoes';

export type {
  ModeloDesafio,
  StatusDesafio,
  RecompensaTipo,
  VisibilidadeDesafio,
  ProgressoPilar,
  Desafio,
  AcaoDesafio,
} from './desafio';
export {
  MODELOS_DESAFIO,
  STATUS_DESAFIO,
  RECOMPENSAS_DESAFIO,
  VISIBILIDADES_DESAFIO,
  isModeloDesafio,
  isStatusDesafio,
  isRecompensaTipo,
  isVisibilidadeDesafio,
  CAMPOS_AGREGADOS_DESAFIO,
  contaComoDesafioAtivo,
} from './desafio';

export type { ResultadoConvite } from './convite';
export {
  CONVITE_MIN_EMAILS,
  CONVITE_MAX_EMAILS,
  validarEmail,
  parseEmails,
  validarConvite,
} from './convite';

// Motor de pontuação (S106-T1 · RN-115)
export type { RegistroAcao, ResultadoPontuacao } from './pontuacao';
export {
  BONUS_3_PILARES_DIA,
  BONUS_5_DIAS_SEMANA,
  DIAS_MINIMOS_BONUS_SEMANA,
  chaveDia,
  chaveSemanaIso,
  pontosDoRegistro,
  calcularPontos,
} from './pontuacao';

// Validação de publicação de desafio por modelo (S106-T1 · RN-110/111)
export type { DesafioParaPublicar } from './desafio-validacao';
export { validarPublicacao, podePublicar } from './desafio-validacao';

// Copy de vínculo Desafio ↔ Evento (S106-T1 · RN-113)
export { copyPreparacao } from './evento-vinculo';
