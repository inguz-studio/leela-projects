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
