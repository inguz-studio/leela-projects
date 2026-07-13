// =============================================================================
// Lógica pura do form de Configurações gerais (LEELA-S304-T2 · E04-L5).
// Validação inline + derivações — sem React, testável isolado. Só os campos
// gerais que o model `Evento` (@leela/core) suporta (grep-provado): `nome`,
// `local`, `usaChip` (RN-207), `capacidade` (RN-210). `data`/`modalidades`/
// `percursos` NÃO entram (travados após a 1ª venda + editados no fluxo de
// criação/lotes) — exibidos read-only na tela.
// =============================================================================

import { modoTaxaDoEvento, type ModoTaxa } from '@leela/core';
import { DOMINIO_LEELA } from '../../pagina-vendas/_lib/paginaVendasView';

/** Estado controlado do form (capacidade como string do input; converte no submit). */
export interface ConfigGeraisValues {
  nome: string;
  local: string;
  usaChip: boolean;
  capacidade: string;
  /**
   * RN-347 — repassar a taxa da plataforma ao comprador? `true` ⇔ `taxaModo`
   * 'repassada'; `false` ⇔ 'incorporada'. Deriva de `modoTaxaDoEvento` na
   * leitura e vira `taxaModo` no submit (só quando o modo ainda é editável —
   * a 1ª venda congela o campo nas Rules; ver ConfigGeraisForm).
   */
  repassarTaxa: boolean;
}

/** Erros por campo — chave ausente = campo válido. */
export interface ErrosConfigGerais {
  nome?: string;
  capacidade?: string;
}

/**
 * URL pública read-only do evento — SEMPRE com o placeholder `{DOMINIO_LEELA}`,
 * jamais o host legado `be-hero.com.br` (o domínio real é config de outra
 * camada, ainda inexistente — LACUNA registrada). Espelha `seoInicial` da
 * página de vendas (fonte única do placeholder). @pure
 */
export function urlPublicaEvento(slug: string): string {
  return `${DOMINIO_LEELA}/${slug}`;
}

/**
 * Converte o campo de capacidade (string do input) para o valor do model:
 * inteiro > 0 ou `null` (vazio/desconhecida — RN-210). @pure
 */
export function capacidadeParaNumero(capacidade: string): number | null {
  const cap = capacidade.trim();
  if (cap.length === 0) return null;
  const n = Number(cap);
  return Number.isInteger(n) && n > 0 ? n : null;
}

/** Preenche o form a partir de um evento (capacidade `null` → campo vazio). @pure */
export function valoresDoEvento(evento: {
  nome: string;
  local: string;
  usaChip: boolean;
  capacidade?: number | null;
  taxaModo?: ModoTaxa;
}): ConfigGeraisValues {
  return {
    nome: evento.nome,
    local: evento.local,
    usaChip: evento.usaChip,
    capacidade:
      typeof evento.capacidade === 'number' && evento.capacidade > 0
        ? String(evento.capacidade)
        : '',
    // Fonte única do modo vigente (ausente ⇒ 'incorporada', RN-347).
    repassarTaxa: modoTaxaDoEvento(evento) === 'repassada',
  };
}

/**
 * Converte o toggle de repasse no `taxaModo` do contrato (RN-347). @pure
 */
export function taxaModoDoForm(repassarTaxa: boolean): ModoTaxa {
  return repassarTaxa ? 'repassada' : 'incorporada';
}

/**
 * Valida o form. `nome` obrigatório; `capacidade`, quando preenchida, precisa
 * ser inteiro > 0. Campo obrigatório vazio bloqueia o submit (§2.12). @pure
 */
export function validaConfigGerais(v: ConfigGeraisValues): {
  valido: boolean;
  erros: ErrosConfigGerais;
} {
  const erros: ErrosConfigGerais = {};
  if (v.nome.trim().length === 0) {
    erros.nome = 'Informe o nome do evento.';
  }
  const cap = v.capacidade.trim();
  if (cap.length > 0) {
    const n = Number(cap);
    if (!Number.isInteger(n) || n <= 0) {
      erros.capacidade = 'Capacidade deve ser um número inteiro maior que zero.';
    }
  }
  return { valido: Object.keys(erros).length === 0, erros };
}
