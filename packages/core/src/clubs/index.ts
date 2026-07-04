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
