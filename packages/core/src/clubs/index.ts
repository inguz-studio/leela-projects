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

export type { EstadoBR, LocalizacaoClube } from './clube-opcoes';
export {
  CATEGORIAS_CLUBE,
  MODALIDADES_CLUBE,
  ESTADOS_BR,
  isCategoriaClube,
  isModalidadeClube,
  localizacaoValida,
  formatarLocalizacaoClube,
} from './clube-opcoes';

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
  DesafioAnexo,
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

// Parcerias — captura de valor (S107-T1 · RN-120/122/123/125)
export type {
  TipoParceria,
  StatusParceria,
  ModeloComercial,
  TermosEspelho,
  Parceria,
  ParceriaEventoAfiliado,
  ParceriaPatrocinador,
} from './parceria';
export {
  TIPOS_PARCERIA,
  STATUS_PARCERIA,
  MODELOS_COMERCIAIS,
  isTipoParceria,
  isStatusParceria,
  isModeloComercial,
  isParceriaEventoAfiliado,
  isParceriaPatrocinador,
  CAMPOS_AGREGADOS_PARCERIA,
  CAMPOS_ESPELHO_PARCERIA,
  dentroDaJanelaAtribuicao,
} from './parceria';

// Comunicados — comunicação segmentada (S108-T1 · RN-130…135)
export type {
  StatusComunicado,
  CanalComunicado,
  OrigemComunicado,
  TipoSegmento,
  Segmento,
  Comunicado,
} from './comunicado';
export {
  STATUS_COMUNICADO,
  CANAIS_COMUNICADO,
  ORIGENS_COMUNICADO,
  TIPOS_SEGMENTO,
  TIPOS_SEGMENTO_SEM_REFERENCIA,
  isStatusComunicado,
  isCanalComunicado,
  isOrigemComunicado,
  isTipoSegmento,
  segmentoDispensaReferencia,
  CAMPOS_FUNCTION_COMUNICADO,
  PUSH_MAX_CHARS,
  PUSH_SEMANA_MAX,
  temCanalPush,
} from './comunicado';

// Validações de formulário do comunicado (S109-T1 · RN-134/135)
export type { ComunicadoInput } from './comunicado-validacao';
export {
  COMUNICADO_TITULO_MIN,
  COMUNICADO_CONTEUDO_MIN,
  validarComunicado,
  truncarPush,
} from './comunicado-validacao';

// Segmentação — estimativa de alcance (S109-T1)
export type { AgregadosSegmentacao } from './segmentacao';
export { estimarAlcance } from './segmentacao';
