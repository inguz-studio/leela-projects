// =============================================================================
// packages/core/src/comunicacao — primitivas agnósticas de comunicação
// (E06-L1-T1 · Camada A). Fonte única de canal/status/origem, constantes de
// segurança de push (RN-133/134) e miolo de validação de formulário.
// Consumidores: clubs/comunicado* (re-export — API estável), eventos/campanha
// (E06), comms/logComunicacao (canal do log).
// =============================================================================

export type {
  StatusComunicado,
  CanalComunicado,
  OrigemComunicado,
} from './canal';
export {
  STATUS_COMUNICADO,
  CANAIS_COMUNICADO,
  ORIGENS_COMUNICADO,
  isStatusComunicado,
  isCanalComunicado,
  isOrigemComunicado,
  PUSH_MAX_CHARS,
  PUSH_SEMANA_MAX,
  temCanalPush,
  contarChars,
  truncarPush,
} from './canal';

export type { ComunicacaoBaseInput } from './validacao-base';
export {
  COMUNICACAO_TITULO_MIN,
  COMUNICACAO_CONTEUDO_MIN,
  validarComunicacaoBase,
} from './validacao-base';
