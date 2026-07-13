// =============================================================================
// Lógica pura do editor de comunicado (S109-T2). Modela o estado do form, faz a
// ponte com validarComunicado (core · RN-134/135), gera o preview de push
// (truncarPush 160) e estima o alcance do segmento (estimarAlcance). Sem
// React/DOM: 100% testável.
// =============================================================================

import type {
  AgregadosSegmentacao,
  CanalComunicado,
  Comunicado,
  ComunicadoInput,
  Segmento,
  TipoSegmento,
} from '@leela/core';
import {
  estimarAlcance,
  PUSH_MAX_CHARS,
  segmentoDispensaReferencia,
  truncarPush,
  validarComunicado,
} from '@leela/core';

export type Agendamento = 'agora' | 'agendar';

export interface ComunicadoFormValues {
  titulo: string;
  conteudo: string;
  canais: CanalComunicado[];
  segmentoTipo: TipoSegmento;
  /** Referência do segmento (desafioId, pilar ou janela). */
  segmentoRef: string;
  capaUrl: string;
  agendamento: Agendamento;
  /** ISO `yyyy-mm-dd` — usado quando agendamento == 'agendar'. */
  agendadoData: string;
  /** `HH:mm` — usado quando agendamento == 'agendar'. */
  agendadoHora: string;
}

export const VALORES_INICIAIS_COMUNICADO: ComunicadoFormValues = {
  titulo: '',
  conteudo: '',
  canais: ['push'],
  segmentoTipo: 'todos',
  segmentoRef: '',
  capaUrl: '',
  agendamento: 'agora',
  agendadoData: '',
  agendadoHora: '',
};

export function toggleCanalForm(
  values: ComunicadoFormValues,
  canal: CanalComunicado,
): ComunicadoFormValues {
  const canais = values.canais.includes(canal)
    ? values.canais.filter((c) => c !== canal)
    : [...values.canais, canal];
  return { ...values, canais };
}

// ---------------------------------------------------------------------------
// Ponte com o core
// ---------------------------------------------------------------------------

/**
 * Monta o segmento a partir do form. `todos` e `novos_membros` DISPENSAM
 * referência (fonte única do predicado no core: `segmentoDispensaReferencia`,
 * CONS-4-T2) — os demais a incluem quando informada.
 */
export function buildSegmento(values: ComunicadoFormValues): Segmento {
  if (segmentoDispensaReferencia(values.segmentoTipo)) return { tipo: values.segmentoTipo };
  return values.segmentoRef.trim()
    ? { tipo: values.segmentoTipo, referencia: values.segmentoRef.trim() }
    : { tipo: values.segmentoTipo };
}

/** Monta o ComunicadoInput (validação do core). */
export function buildComunicadoInput(values: ComunicadoFormValues): ComunicadoInput {
  const base: ComunicadoInput = {
    titulo: values.titulo.trim(),
    conteudo: values.conteudo.trim(),
    canal: values.canais,
    segmento: buildSegmento(values),
  };
  if (values.capaUrl.trim()) base.capaUrl = values.capaUrl.trim();
  return base;
}

/** Valida o comunicado (delegando ao core — RN-134/135). */
export function validarComunicadoForm(values: ComunicadoFormValues): string[] {
  const erros = validarComunicado(buildComunicadoInput(values));
  if (values.agendamento === 'agendar' && (!values.agendadoData || !values.agendadoHora)) {
    erros.push('defina data e hora do agendamento');
  }
  return erros;
}

export function podeEnviarForm(values: ComunicadoFormValues): boolean {
  return validarComunicadoForm(values).length === 0;
}

// ---------------------------------------------------------------------------
// Preview
// ---------------------------------------------------------------------------

export interface PreviewComunicado {
  push: string;
  pushTruncado: boolean;
  temPush: boolean;
  temEmail: boolean;
  /** Capa só vale no email (RN-135). */
  capaUrl: string | null;
}

export function previewComunicado(values: ComunicadoFormValues): PreviewComunicado {
  const conteudo = values.conteudo;
  const push = truncarPush(conteudo);
  return {
    push,
    pushTruncado: Array.from(conteudo).length > PUSH_MAX_CHARS,
    temPush: values.canais.includes('push'),
    temEmail: values.canais.includes('email'),
    capaUrl: values.canais.includes('email') && values.capaUrl.trim() ? values.capaUrl.trim() : null,
  };
}

/**
 * Estima o alcance do segmento a partir dos agregados do clube. Retorna null
 * quando a referência não resolve (a tela mostra "—").
 */
export function estimativaSegmento(
  values: ComunicadoFormValues,
  agregados: AgregadosSegmentacao,
): number | null {
  return estimarAlcance(buildSegmento(values), agregados);
}

// ---------------------------------------------------------------------------
// Mapeamento Comunicado → form (edição)
// ---------------------------------------------------------------------------

/** Timestamp → par (yyyy-mm-dd, HH:mm) em hora LOCAL — inverso exato do
    `new Date(\`${data}T${hora}\`)` que o submit monta (fix S2: editar um
    agendado não pode descartar a data original). */
function tsParaDataHora(ts: Comunicado['agendadoPara']): { data: string; hora: string } {
  if (!ts || typeof ts.toDate !== 'function') return { data: '', hora: '' };
  const d = ts.toDate();
  const pad = (n: number): string => String(n).padStart(2, '0');
  return {
    data: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
    hora: `${pad(d.getHours())}:${pad(d.getMinutes())}`,
  };
}

export function comunicadoToForm(c: Comunicado): ComunicadoFormValues {
  const agendado = c.status === 'agendado' ? tsParaDataHora(c.agendadoPara) : { data: '', hora: '' };
  return {
    titulo: c.titulo,
    conteudo: c.conteudo,
    canais: [...c.canal],
    segmentoTipo: c.segmento.tipo,
    segmentoRef: c.segmento.referencia ?? '',
    capaUrl: c.capaUrl ?? '',
    agendamento: c.status === 'agendado' ? 'agendar' : 'agora',
    agendadoData: agendado.data,
    agendadoHora: agendado.hora,
  };
}
