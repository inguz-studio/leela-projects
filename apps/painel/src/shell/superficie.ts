// =============================================================================
// Superfície do painel — qual "casa" a rota atual habita, e o que isso liga.
//
// A decisão do dono (2026-08-09, `leela-specs/02-rodadas/2026-08-09-redesign-ds/
// 00-decisao.md`) é de PRODUTO, não de estilo: o painel do organizador roda o
// tema brasa com a camada glass LIGADA; a administração da plataforma roda com
// a camada DESLIGADA, fundo preto opaco, "para eu conseguir diferenciar". Quem
// abre as duas no mesmo dia precisa saber em que painel está antes de ler
// qualquer rótulo.
//
// O mecanismo é o atributo `data-glass` no <html> — o contrato que o design
// system publicou na lane TOKENS (`[data-glass="on"]` remapeia
// `--surface-raised`, `--surface-overlay`, `--elevation-2`, `--card-blur` e
// `--page-glow` para os pares de vidro, com fallback `@supports` quando o
// browser não tem `backdrop-filter`). Nenhum componente sabe que glass existe:
// eles seguem lendo os MESMOS tokens de sempre.
//
// Este módulo é PURO de propósito. A derivação "rota → superfície → estado do
// vidro" é a regra de negócio da decisão, e regra se testa sem DOM, sem router
// e sem renderizar nada. O efeito colateral (escrever no <html>) mora no
// componente vizinho `SuperficieDoPainel`.
// =============================================================================

/**
 * As duas casas do painel. `organizador` cobre TUDO que não é administração da
 * plataforma — inclusive as jornadas de conta (`/entrar`, `/cadastrar`…), que
 * são a porta do produto do organizador e não uma terceira superfície.
 */
export type SuperficieDoPainel = 'organizador' | 'plataforma';

/** Valor do atributo `data-glass` no <html>. */
export type EstadoDoVidro = 'on' | 'off';

/** Nome do atributo — uma constante para o teste não repetir o literal. */
export const ATRIBUTO_VIDRO = 'data-glass';

/**
 * A superfície de um pathname. `/plataforma` e tudo abaixo dela é a área do
 * super-admin (a mesma raiz que `shellSidebarSections` usa para trocar a
 * navegação e que `PlatformGuard` protege); o resto é o organizador.
 *
 * O casamento é por SEGMENTO, não por prefixo de string: `/plataformas-legais`
 * não é a área admin, e `startsWith('/plataforma')` sozinho diria que é.
 * @pure
 */
export function superficieDaRota(pathname: string): SuperficieDoPainel {
  return pathname === '/plataforma' || pathname.startsWith('/plataforma/')
    ? 'plataforma'
    : 'organizador';
}

/**
 * O estado do vidro de cada superfície — a decisão do dono, em uma linha.
 * @pure
 */
export function vidroDaSuperficie(superficie: SuperficieDoPainel): EstadoDoVidro {
  return superficie === 'plataforma' ? 'off' : 'on';
}

/** Atalho `rota → estado do vidro` (o que o efeito realmente precisa). @pure */
export function vidroDaRota(pathname: string): EstadoDoVidro {
  return vidroDaSuperficie(superficieDaRota(pathname));
}
