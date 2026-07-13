// =============================================================================
// Lógica pura do editor de campanha do evento (S401-T3 · E06-L3). Modela o
// estado do form, faz a ponte com `validarCampanha` (core · RN-134/135), gera o
// preview de push (truncarPush 160 — RN-134) e monta o `SegmentoCampanha` da
// taxonomia do evento. Sem React/DOM: 100% testável.
//
// REUSO (fonte única): `PUSH_MAX_CHARS`/`truncarPush`/`contarChars` e
// `validarCampanha` vêm de `@leela/core` — NÃO reimplemento o corte de 160 nem a
// contagem por code point. A estimativa ao vivo é round-trip de callable
// (`estimarAlcance`), então NÃO vive aqui (o evento não mantém agregados como o
// clube — item 8 do brief); a tela injeta a porta.
// =============================================================================

import type {
  Campanha,
  CampanhaInput,
  CanalCampanha,
  SegmentoCampanha,
  TipoSegmentoCampanha,
} from '@leela/core';
import {
  contarChars,
  PUSH_MAX_CHARS,
  truncarPush,
  validarCampanha,
} from '@leela/core';

/** Quando enviar: agora (dispara já) ou agendar (status agendado — RN-130). */
export type QuandoEnviar = 'agora' | 'agendar';

export interface CampanhaFormValues {
  titulo: string;
  conteudo: string;
  canais: CanalCampanha[];
  segmentoTipo: TipoSegmentoCampanha;
  /** Referência do segmento (modalidade livre, kit RN-202 ou status RN-204). */
  segmentoRef: string;
  /** Imagem de capa — só vale no e-mail (RN-135). */
  capaUrl: string;
  quando: QuandoEnviar;
  /** ISO `yyyy-mm-dd` — usado quando quando == 'agendar'. */
  agendadoData: string;
  /** `HH:mm` — usado quando quando == 'agendar'. */
  agendadoHora: string;
}

export const VALORES_INICIAIS_CAMPANHA: CampanhaFormValues = {
  titulo: '',
  conteudo: '',
  canais: ['push'],
  segmentoTipo: 'todos_inscritos',
  segmentoRef: '',
  capaUrl: '',
  quando: 'agora',
  agendadoData: '',
  agendadoHora: '',
};

export function toggleCanalForm(
  values: CampanhaFormValues,
  canal: CanalCampanha,
): CampanhaFormValues {
  const canais = values.canais.includes(canal)
    ? values.canais.filter((c) => c !== canal)
    : [...values.canais, canal];
  return { ...values, canais };
}

// ---------------------------------------------------------------------------
// Ponte com o core
// ---------------------------------------------------------------------------

/** Monta o segmento a partir do form (referência só quando não é 'todos'). */
export function buildSegmento(values: CampanhaFormValues): SegmentoCampanha {
  if (values.segmentoTipo === 'todos_inscritos') return { tipo: 'todos_inscritos' };
  const ref = values.segmentoRef.trim();
  return ref ? { tipo: values.segmentoTipo, referencia: ref } : { tipo: values.segmentoTipo };
}

/** Monta o `CampanhaInput` (validação do core — RN-134/135 + taxonomia). */
export function buildCampanhaInput(values: CampanhaFormValues): CampanhaInput {
  const base: CampanhaInput = {
    titulo: values.titulo.trim(),
    conteudo: values.conteudo.trim(),
    canal: values.canais,
    segmento: buildSegmento(values),
  };
  if (values.capaUrl.trim()) base.capaUrl = values.capaUrl.trim();
  return base;
}

/** Valida a campanha (delegando ao core) + o agendamento da tela. @pure */
export function validarCampanhaForm(values: CampanhaFormValues): string[] {
  const erros = validarCampanha(buildCampanhaInput(values));
  if (values.quando === 'agendar' && (!values.agendadoData || !values.agendadoHora)) {
    erros.push('defina data e hora do agendamento');
  }
  return erros;
}

export function podeSalvarForm(values: CampanhaFormValues): boolean {
  return validarCampanhaForm(values).length === 0;
}

// ---------------------------------------------------------------------------
// Preview
// ---------------------------------------------------------------------------

export interface PreviewCampanha {
  push: string;
  pushTruncado: boolean;
  temPush: boolean;
  temEmail: boolean;
  /** Capa só vale no e-mail (RN-135). */
  capaUrl: string | null;
}

export function previewCampanha(values: CampanhaFormValues): PreviewCampanha {
  const conteudo = values.conteudo;
  return {
    push: truncarPush(conteudo),
    pushTruncado: contarChars(conteudo) > PUSH_MAX_CHARS,
    temPush: values.canais.includes('push'),
    temEmail: values.canais.includes('email'),
    capaUrl:
      values.canais.includes('email') && values.capaUrl.trim()
        ? values.capaUrl.trim()
        : null,
  };
}

// ---------------------------------------------------------------------------
// Mapeamento Campanha → form (edição)
// ---------------------------------------------------------------------------

/** Timestamp → par (yyyy-mm-dd, HH:mm) em hora LOCAL — inverso do submit. */
function tsParaDataHora(ts: Campanha['agendadoPara']): { data: string; hora: string } {
  if (!ts || typeof ts.toDate !== 'function') return { data: '', hora: '' };
  const d = ts.toDate();
  const pad = (n: number): string => String(n).padStart(2, '0');
  return {
    data: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
    hora: `${pad(d.getHours())}:${pad(d.getMinutes())}`,
  };
}

export function campanhaToForm(c: Campanha): CampanhaFormValues {
  const agendado = c.status === 'agendado' ? tsParaDataHora(c.agendadoPara) : { data: '', hora: '' };
  return {
    titulo: c.titulo,
    conteudo: c.conteudo,
    canais: [...c.canal],
    segmentoTipo: c.segmento.tipo,
    segmentoRef: c.segmento.referencia ?? '',
    capaUrl: c.capaUrl ?? '',
    quando: c.status === 'agendado' ? 'agendar' : 'agora',
    agendadoData: agendado.data,
    agendadoHora: agendado.hora,
  };
}
